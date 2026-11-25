"""Real Demucs -> Seed-VC CLI -> FFmpeg pipeline; no synthetic fallback."""
import json
import os
import signal
import shutil
import subprocess
import sys
import time
import wave
from dataclasses import dataclass
from pathlib import Path


class PipelineError(RuntimeError):
    pass


@dataclass
class PipelineConfig:
    seed_repo: Path
    seed_python: str = sys.executable
    demucs_python: str = sys.executable
    ffmpeg: str = "ffmpeg"
    device: str = "cuda"
    timeout: int = 1200

    @classmethod
    def from_env(cls):
        return cls(Path(os.getenv("SEED_VC_DIR","modelsrc/seed-vc")).resolve(),
                   os.getenv("SEED_VC_PYTHON",sys.executable),os.getenv("DEMUCS_PYTHON",sys.executable),
                   os.getenv("MUSICCRAFT_FFMPEG","ffmpeg"),os.getenv("VOICE_DEVICE","cuda"),
                   int(os.getenv("VOICE_PIPELINE_TIMEOUT","1200")))

    def checks(self):
        checks={"ffmpeg":bool(shutil.which(self.ffmpeg)),"seed_repo":(self.seed_repo/"inference.py").is_file(),
                "seed_python":bool(shutil.which(self.seed_python)),"demucs_python":bool(shutil.which(self.demucs_python))}
        for name,python,modules in [("seed_dependencies",self.seed_python,["torch","librosa","transformers","yaml"]),
                                    ("demucs_dependencies",self.demucs_python,["torch","demucs"])]:
            try:
                code="import importlib.util,sys;sys.exit(0 if all(importlib.util.find_spec(x) is not None for x in "+repr(modules)+") else 1)"
                checks[name]=subprocess.run([python,"-c",code],capture_output=True,timeout=2).returncode==0
            except (OSError,subprocess.SubprocessError):checks[name]=False
        return checks


def stop_process(process):
    if process.poll() is None:
        try:
            if os.name == "posix":
                os.killpg(process.pid, signal.SIGTERM)
            else:
                process.terminate()
            process.wait(timeout=5)
        except (ProcessLookupError, subprocess.TimeoutExpired):
            try:
                if os.name == "posix": os.killpg(process.pid,signal.SIGKILL)
                else: process.kill()
            except ProcessLookupError:
                pass
            process.wait()


def run_command(args, log, timeout=1200, cwd=None, canceled=lambda:False):
    """Explicit argv, bounded runtime and cancellation of the whole process group."""
    started = time.monotonic()
    with open(log,"ab") as output:
        try:
            process = subprocess.Popen(args,cwd=cwd,stdout=output,stderr=subprocess.STDOUT,
                                       stdin=subprocess.DEVNULL,start_new_session=os.name == "posix")
        except OSError:
            raise PipelineError("无法启动推理程序，请运行 GPU 环境检查") from None
        try:
            while process.poll() is None:
                if canceled(): raise InterruptedError("任务已取消")
                if time.monotonic()-started > timeout: raise PipelineError("推理步骤超时，请检查 GPU 和模型权重下载")
                time.sleep(0.2)
            if process.returncode:
                raise PipelineError("推理步骤失败，请查看 Worker 对应任务目录中的 pipeline.log")
        finally:
            stop_process(process)


def mix_filter(vocal_gain_db=0):
    # Ubuntu 22.04's FFmpeg lacks alimiter's newer latency option. At the fixed
    # 44.1 kHz rate, attack=5 ms buffers 220 frames and delays audio by 219 frames.
    # The padded vocal input flushes the tail; trim the delay before setting PTS.
    return ("[0:a]aformat=sample_rates=44100:channel_layouts=stereo,volume="+str(vocal_gain_db)+"dB,apad[v];"
            "[1:a]aformat=sample_rates=44100:channel_layouts=stereo[b];"
            "[v][b]amix=inputs=2:duration=longest:normalize=0,volume=0.8,aresample=44100,"
            "alimiter=limit=0.95:level=false:attack=5:release=50,"
            "atrim=start_sample=219,asetpts=PTS-STARTPTS[m]")


def run_pipeline(config, folder, source, reference, spec, stage=lambda key,message:None, canceled=lambda:False, runner=run_command):
    folder = Path(folder).resolve()
    folder.mkdir(parents=True,exist_ok=True)
    log = folder/"pipeline.log"
    executable = shutil.which(config.ffmpeg)
    if not executable or not (config.seed_repo/"inference.py").is_file():
        raise PipelineError("缺少 FFmpeg 或 Seed-VC 仓库，请先运行 deploy/setup_gpu.sh")
    def run(args,cwd=None):
        if canceled(): raise InterruptedError("任务已取消")
        runner(args,log,timeout=config.timeout,cwd=cwd,canceled=canceled)
    clip = folder/"source.wav"
    ref = folder/"reference.wav"
    duration = spec.get("duration",20)
    stage("normalize","解码并裁剪源歌曲和参考录音")
    run([executable,"-nostdin","-v","error","-y","-ss",str(spec.get("clip_start",0)),"-i",str(source),
         "-t",str(duration),"-vn","-ar","44100","-ac","2","-c:a","pcm_s16le",str(clip)])
    run([executable,"-nostdin","-v","error","-y","-i",str(reference),"-t","20","-vn","-ar","44100","-ac","1","-c:a","pcm_s16le",str(ref)])
    for audio,minimum in [(clip,3),(ref,3)]:
        try:
            with wave.open(str(audio),"rb") as wav:
                if wav.getnframes()/wav.getframerate() < minimum:
                    raise PipelineError("原曲片段和参考声音均需要至少 3 秒；检查起点和上传文件")
        except (wave.Error,EOFError,FileNotFoundError):
            raise PipelineError("解码没有产生有效 WAV") from None
    with wave.open(str(clip),"rb") as wav:
        duration=wav.getnframes()/wav.getframerate()
    stage("separate","Demucs 分离原唱与伴奏")
    separation = folder/"separated"
    run([config.demucs_python,"-m","demucs","--two-stems=vocals","-n","htdemucs","-d",config.device,
         "-o",str(separation),str(clip)])
    vocals = separation/"htdemucs"/"source"/"vocals.wav"
    backing = separation/"htdemucs"/"source"/"no_vocals.wav"
    if not vocals.is_file() or not backing.is_file():
        raise PipelineError("Demucs 没有产生预期的人声和伴奏音轨")
    stage("convert","Seed-VC 按参考声音转换歌声，保持原音高")
    converted_dir = folder/"converted"
    converted_dir.mkdir(exist_ok=True)
    run([config.seed_python,str(config.seed_repo/"inference.py"),"--source",str(vocals),"--target",str(ref),
         "--output",str(converted_dir),"--diffusion-steps","30","--length-adjust","1.0",
         "--inference-cfg-rate","0.7","--f0-condition","True","--auto-f0-adjust","False",
         "--semi-tone-shift","0","--fp16","True" if config.device=="cuda" else "False"],cwd=str(config.seed_repo))
    candidates = sorted(converted_dir.glob("*.wav"))
    if len(candidates)!=1:
        raise PipelineError("Seed-VC 输出数量异常，请核对当前版本的输出格式")
    stage("mix","对齐转换歌声与原伴奏，控制混音峰值")
    result = folder/"result.wav"
    # Common attenuation and a limiter prevent clipping without changing pitch or tempo.
    filters = mix_filter(spec.get("vocal_gain_db",0))
    run([executable,"-nostdin","-v","error","-y","-i",str(candidates[0]),"-i",str(backing),
         "-filter_complex",filters,"-map","[m]","-t",str(duration),"-ar","44100","-ac","2","-c:a","pcm_s16le",str(result)])
    if not result.is_file(): raise PipelineError("混音没有产生结果文件")
    # All artifacts are from this job. Reference audio is intentionally not exported.
    return {"result":result,"source_clip":clip,"original_vocals":vocals,"converted_vocals":candidates[0],"accompaniment":backing}
