# MusicCraft 个人换声：部署与使用

当前路线为 DeepSeek 理解需求 → Demucs 分离原唱与伴奏 → Seed-VC 按参考音色转换歌声 → FFmpeg 混音。使用预训练模型做零样本转换，不要求用户先训练个人模型。内部 Prompt 在后端处理，网页点击一次「开始换声」即可自动执行。

## 已验证的部署

已在 AutoDL 的 RTX 3090 上部署并验证：

| 项目                 | 版本或状态                                  |
| -------------------- | ------------------------------------------- |
| Python               | 3.10.8                                      |
| PyTorch / torchaudio | 2.4.0 + CUDA 12.1                           |
| Demucs               | 4.0.1，htdemucs                             |
| Seed-VC 源码         | `51383efd921027683c89e5348211d93ff12ac2a8`  |
| 推理方式             | F0 条件歌声转换，30 步，不主动移调          |
| 权重                 | 固定版本，校验后缓存；实际推理可离线运行    |
| Worker               | 私有监听 `127.0.0.1:8010`，项目专用密钥鉴权 |

已使用项目自带的真实歌曲混音片段与 Seed-VC 官方参考样例 s1p1，完成上传、分离、换声、混音和五条音轨下载。一次 10 秒样例的 Worker 流程约 22 秒；这只是当前实例与样例的观测，不是所有歌曲的速度保证。完整 MusicCraft 后台也已通过 DeepSeek 规划后执行换声的真实调用，接口未返回内部 Prompt。

这次验证的参考声音是官方样例，不是用户本人的声音。音色相似度、歌词清晰度和原唱残留仍需使用自己的录音试听评估。

## 在网页使用

1. 打开本机 MusicCraft 工作区，选择「用我的声音翻唱」。
2. 上传原歌曲，以及自己 3–20 秒的清晰独唱参考。参考不需要与原曲唱相同的歌词。
3. 选择原曲起点、10–40 秒的处理长度，以及人声音量。第一次建议先做 10–20 秒。
4. 点击「开始换声」，等待各阶段完成后试听、下载；也可以分别听原曲、分离原唱、转换人声和伴奏。

模型有时输出较响的人声，可以调低「人声音量」后重新生成。分离和转换可能改变音质，不能承诺逐音符、逐样本保持或完全没有原唱残留。

当前本机预览：`http://localhost:8792/#music-agent`。GPU Worker、SSH 隧道及本机 Node 后端都要保持运行。静态分享网页或离线 HTML 不包含这些运行中的服务。

## 团队部署

在 NVIDIA GPU / Ubuntu 服务器安装 Python 3.10、venv、FFmpeg、curl、编译工具。上传当前项目的 `workers/` 和 `deploy/`，不要上传包含 DeepSeek、fal 等密钥的本机 `.env`。

```bash
bash deploy/setup_gpu.sh
bash deploy/start_voice.sh
```

脚本使用固定的源码和推理依赖，不安装上游冲突的 nightly Torch 或桌面 GUI 依赖。模型清单见 `deploy/voice-models.json`；下载器校验 Hugging Face 官方元数据中的 SHA256 / Git blob 校验值，以及固定的官方 Demucs 文件 SHA256。缓存保存在项目数据盘内。

AutoDL 环境可通过 `/etc/network_turbo` 为学术资源下载加速；安装脚本会在下载权重的子进程中使用它。其他机器可通过 `MUSICCRAFT_HF_ENDPOINT` 指定 Hugging Face 下载端点。已有下载块可复用，校验不匹配的文件不会作为模型使用。

`setup_gpu.sh` 面向本项目已验证的 Linux / NVIDIA 环境。Mac 上的 PyTorch 虚拟环境不能复制到服务器使用；更新架构的 GPU 需要另行核对 PyTorch 与 CUDA 版本。

## Worker 密钥与私有连接

服务器项目根目录的 `.env.voice-worker` 只包含一项专用服务凭证：

```dotenv
VOICE_WORKER_API_KEY=team_generated_worker_token
```

`start_voice.sh` 自动读取这一项。文件应为 0600 权限，不提交仓库。它不需要包含 DeepSeek 或 fal 密钥。本次部署已生成并配置专用凭证，浏览器不接收该凭证。

本机终端可以使用 SSH 转发：

```bash
ssh -N -p SSH_PORT -L 8010:127.0.0.1:8010 USER@GPU_HOST
```

使用平台给出的端口、用户名和主机替换占位符，保持连接窗口打开。管理员在本机项目 `.env` 配置：

```dotenv
VOICE_WORKER_BASE_URL=http://127.0.0.1:8010
VOICE_WORKER_API_KEY=the_same_worker_token
```

随后重启 Node 服务。当前本机端口为 8792，可使用：

```bash
npm start -- --port 8792
```

建议使用 Node.js 22。默认管理模式下，配置由团队维护，用户不需要自行寻找模型或填写密钥。

## 实际联调修复与检查

- 修复 multipart 上传解析中对任务参数对象的错误属性访问，并用真实 HTTP 上传契约测试覆盖。
- 兼容 Ubuntu 22.04 的 FFmpeg：不使用其缺少的 `alimiter latency` 参数，在固定 44.1kHz 下显式补偿限制器的 219 样本延迟。脉冲音频检查确认开头与末尾的定位和完整长度。
- 在混音前将单声道人声与立体声伴奏显式转换为双声道，避免 FFmpeg 按人声输入把伴奏压成单声道；测试覆盖左右声道不同的伴奏。
- 原始上传和参考录音在 GPU 任务结束后清理；任务目录为 0700。分轨和混音仍保留在服务器 `voice-data/`，本机后端也会保留上传素材和下载结果，尚无自动过期清理。

```bash
npm run check
python3 -B -m unittest discover -s tests -p 'test_voice*.py' -v
```

以上离线测试包括模拟 GPU 命令、真实 HTTP 上传和实际 FFmpeg 混音。真实 GPU 结果及试听文件另存于本机被忽略的 `artifacts/voice-smoke/`；其中 `live-check.json` 记录了实际后台任务、模型与音频地址。
