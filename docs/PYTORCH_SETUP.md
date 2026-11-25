# 第一步：安装 PyTorch

本机为 macOS / Apple Silicon，目前在项目目录创建了 Python 3.10 独立环境 `.venvs/seed`。基础 Python 放在 `.venvs/python` 中，不依赖系统自带的 Python 3.9。上述目录均已由 `.gitignore` 排除。

本文记录本机最初的 PyTorch 安装步骤。后续已在 AutoDL RTX 3090 完成 Seed-VC、Demucs 和网页换声服务部署，当前使用方式见 [换声部署与使用](VOICE_AND_MODELS.md)。

## 已选择的版本

| 组件        | 版本    |
| ----------- | ------- |
| Python      | 3.10.22 |
| PyTorch     | 2.4.0   |
| torchaudio  | 2.4.0   |
| torchvision | 0.19.0  |
| NumPy       | 1.26.4  |

PyTorch 组件版本与项目现有 GPU 脚本保持一致；macOS 使用 Apple Silicon wheel，不安装 CUDA 版本。[PyTorch 官方历史版本说明](https://pytorch.org/get-started/previous-versions/#v240)

## 使用当前环境

在本机项目根目录执行：

```bash
source .venvs/seed/bin/activate
python --version
python -c "import torch; print(torch.__version__); print('MPS:', torch.backends.mps.is_available())"
```

在 VS Code 选择 Python 解释器时，选择当前项目的 `.venvs/seed/bin/python`。使用 `deactivate` 退出环境。

其他 Mac 已经装有 Python 3.10 时，可以在项目根目录重新创建环境：

```bash
python3.10 -m venv .venvs/seed
.venvs/seed/bin/python -m pip install -r deploy/requirements-pytorch-mac.txt
```

## 验证与边界

安装验证包括 CPU 张量与反向传播、NumPy 数据互转、torchaudio 音频重采样和 torchvision 本地算子，以及 `pip check`。本机的运行结果记录在 `.venvs/pytorch-check.json`，完整已安装包版本在 `.venvs/pytorch-packages.txt`。

本次检查上述基础运算与依赖一致性均通过。当前执行环境返回 `mps_built=true`、`mps_available=false`、`cuda_available=false`，因此已确认 CPU 可运行，尚未确认本机 GPU 加速可运行。

MPS 是 Mac GPU 后端，CUDA 是 NVIDIA GPU 后端。应在实际运行环境中分别检查，不能因为 Mac 上 CUDA 为 false 就判断 PyTorch 安装失败；也不能将某个受限执行环境里 MPS 为 false 直接解释为硬件不支持。

当前 `deploy/setup_gpu.sh` 和换声 Worker 仍面向 Linux / NVIDIA CUDA。后续若在本机运行完整换声，需要继续安装推理依赖、下载权重并适配设备路径；不能在这一步把换声引擎标记为已就绪。若租用云端 NVIDIA GPU，应在服务器上执行 CUDA 部署，不能复制本机的 Mac 虚拟环境过去使用。

云端已验证预训练模型换声；是否微调个人音色，应根据使用本人录音的实际试听结果决定。
