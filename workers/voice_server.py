"""Run with: python3 -m workers.voice_server. GPU dependencies live in other venvs."""
import hmac
import json
import os
import re
import shutil
import threading
from concurrent.futures import ThreadPoolExecutor
from email.parser import BytesParser
from email.policy import default
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from uuid import uuid4
from .spec import TaskSpec, ValidationError
def new_id(): return uuid4().hex
from .pipeline import PipelineConfig,PipelineError,run_pipeline

MAX_BODY = 66*1024*1024


def parse_upload(body,content_type):
    if not content_type.startswith("multipart/form-data;"):
        raise ValidationError("需要 multipart/form-data")
    message = BytesParser(policy=default).parsebytes(("Content-Type: "+content_type+"\r\nMIME-Version: 1.0\r\n\r\n").encode()+body)
    if not message.is_multipart(): raise ValidationError("无效 multipart")
    parts = {}
    for part in message.iter_parts():
        name = part.get_param("name",header="Content-Disposition")
        if name not in {"source","reference","spec"} or name in parts:
            raise ValidationError("缺少字段、重复字段或不支持的字段")
        data = part.get_payload(decode=True)
        if not data: raise ValidationError("不能上传空文件")
        parts[name] = data
    if set(parts)!={"source","reference","spec"}: raise ValidationError("需要 source、reference 和 spec")
    if len(parts["source"])>32*1024*1024 or len(parts["reference"])>32*1024*1024 or len(parts["spec"])>32768:
        raise ValidationError("字段超过大小限制")
    spec = TaskSpec.from_dict(json.loads(parts["spec"]))
    return spec.to_dict(),parts["source"],parts["reference"]


class VoiceService:
    def __init__(self,root,config):
        self.root=Path(root).resolve();self.root.mkdir(parents=True,exist_ok=True)
        self.config=config;self.jobs={};self.lock=threading.RLock()
        self.pool=ThreadPoolExecutor(max_workers=1,thread_name_prefix="voice-gpu")

    def submit(self,spec,source,reference):
        with self.lock:
            if sum(j["status"] in {"queued","running","canceling"} for j in self.jobs.values())>=4:
                raise ValidationError("Worker 队列已满，请稍后重试")
            job_id=new_id();folder=self.root/job_id;folder.mkdir(mode=0o700)
            (folder/"input.audio").write_bytes(source);(folder/"ref.audio").write_bytes(reference)
            (folder/"input.audio").chmod(0o600);(folder/"ref.audio").chmod(0o600)
            self.jobs[job_id]={"id":job_id,"status":"queued","stage":"queued","message":"等待 GPU", "error":None,"artifacts":{}}
            self.pool.submit(self.run,job_id,spec)
            return dict(self.jobs[job_id])

    def canceled(self,job_id):
        with self.lock:return self.jobs[job_id]["status"] in {"canceling","canceled"}

    def run(self,job_id,spec):
        folder=self.root/job_id
        try:
            with self.lock:
                if self.canceled(job_id):raise InterruptedError()
                self.jobs[job_id]["status"]="running"
            def stage(key,message):
                with self.lock:self.jobs[job_id].update(stage=key,message=message)
            artifacts=run_pipeline(self.config,folder,folder/"input.audio",folder/"ref.audio",spec,stage,lambda:self.canceled(job_id))
            with self.lock:
                if self.canceled(job_id):raise InterruptedError()
                self.jobs[job_id].update(status="succeeded",stage="done",message="歌声转换完成",artifacts={name:str(path) for name,path in artifacts.items()})
        except InterruptedError:
            with self.lock:self.jobs[job_id].update(status="canceled",message="已取消")
        except Exception as exc:
            error=str(exc) if isinstance(exc,PipelineError) else "Worker 执行异常，请检查日志"
            with self.lock:self.jobs[job_id].update(status="failed",error=error,message=error)
        finally:
            # Raw reference uploads are not needed for replay. Keep model logs and stems.
            for filename in ["input.audio","ref.audio","reference.wav"]:
                (folder/filename).unlink(missing_ok=True)

    def public(self,job_id):
        with self.lock:
            job=self.jobs.get(job_id)
            if not job:return None
            return dict(job,artifacts={name:"/v1/jobs/"+job_id+"/audio/"+name for name in job["artifacts"]})


def make_handler(service,key):
    class Handler(BaseHTTPRequestHandler):
        def authorized(self):
            return not key or hmac.compare_digest(self.headers.get("Authorization",""),"Bearer "+key)
        def respond(self,data,status=200):
            raw=json.dumps(data,ensure_ascii=False).encode();self.send_response(status)
            self.send_header("Content-Type","application/json; charset=utf-8");self.send_header("Content-Length",str(len(raw)))
            self.end_headers();self.wfile.write(raw)
        def do_GET(self):
            if not self.authorized():return self.respond({"error":"Unauthorized"},401)
            if self.path=="/health":
                checks=service.config.checks()
                return self.respond({"service":"MusicCraft Voice Worker","protocol":"async-v1","ready":all(checks.values()),"checks":checks,
                                     "note":"检查路径与程序，不代表模型已下载或效果已验证"})
            match=re.fullmatch(r"/v1/jobs/([a-f0-9]{32})(?:/audio/([a-z_]+))?",self.path)
            if not match:return self.respond({"error":"Not found"},404)
            job=service.public(match[1])
            if not job:return self.respond({"error":"Job not found; Worker may have restarted"},404)
            if not match[2]:return self.respond(job)
            with service.lock:filename=service.jobs[match[1]]["artifacts"].get(match[2])
            if job["status"]!="succeeded" or not filename:return self.respond({"error":"Audio unavailable"},404)
            path=Path(filename)
            if not path.is_relative_to(service.root):return self.respond({"error":"Invalid path"},400)
            self.send_response(200);self.send_header("Content-Type","audio/wav");self.send_header("Content-Length",str(path.stat().st_size))
            self.end_headers()
            with path.open("rb") as f:shutil.copyfileobj(f,self.wfile)
        def do_POST(self):
            if not self.authorized():return self.respond({"error":"Unauthorized"},401)
            match=re.fullmatch(r"/v1/jobs/([a-f0-9]{32})/cancel",self.path)
            if match:
                with service.lock:
                    job=service.jobs.get(match[1])
                    if not job:return self.respond({"error":"Not found"},404)
                    if job["status"] in {"queued","running"}:job["status"]="canceling"
                return self.respond(service.public(match[1]))
            if self.path!="/v1/jobs":return self.respond({"error":"Not found"},404)
            try:
                length=int(self.headers.get("Content-Length","0"))
                if not 1<=length<=MAX_BODY:raise ValidationError("请求过大或为空")
                body=self.rfile.read(length)
                if len(body)!=length:raise ValidationError("上传不完整")
                spec,source,reference=parse_upload(body,self.headers.get("Content-Type",""))
                return self.respond(service.submit(spec,source,reference),202)
            except (ValueError,ValidationError,TypeError,UnicodeError) as exc:return self.respond({"error":str(exc)},400)
        def log_message(self,*args):pass
    return Handler


def main():
    host=os.getenv("VOICE_HOST","127.0.0.1");key=os.getenv("VOICE_WORKER_API_KEY","")
    if host not in {"127.0.0.1","localhost"} and not key:
        raise SystemExit("非本机监听必须配置 VOICE_WORKER_API_KEY")
    service=VoiceService(os.getenv("VOICE_DATA_DIR","voice-data"),PipelineConfig.from_env())
    server=ThreadingHTTPServer((host,int(os.getenv("VOICE_PORT","8010"))),make_handler(service,key))
    print("Voice Worker listening on",server.server_address,flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:
        server.server_close()
        with service.lock:
            for job in service.jobs.values():
                if job["status"] in {"queued","running"}:job["status"]="canceling"
        service.pool.shutdown(wait=True)


if __name__=="__main__":main()
