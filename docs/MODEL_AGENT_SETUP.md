# MusicCraft 模型与 Agent 接入

> 当前推荐配置为 DeepSeek + Mureka，使用国内模式；本页的自部署与兼容接口说明仍可用于高级部署。请先阅读 [国内模型与统一配置](MANAGED_MODELS.md)。

## 已实现的调用链

用户要求 → LLM Planner → 后端校验 → 用户确认 → ACE-Step 异步任务 → 真实音频 → 用户试听反馈 → LLM Critic → 下一轮完整计划。

当前默认提供 DeepSeek/OpenAI Prompt 模型与独立的音乐模型选择。最新配置与页面流程参见 [MANAGED_MODELS.md](MANAGED_MODELS.md)。下面保留自部署兼容服务的技术细节。

这是新增的模型执行路线。旧的预制音乐、MIDI 工作台仍可使用。音乐模型 API 和通用文本 LLM 是两个独立服务：ACE-Step 内部的音乐语言模型不能代替这里的任务规划 Agent。

## 先配置再启动

建议 Node.js 22 LTS，运行 `npm ci` 安装依赖和 FFmpeg。本文保留自部署服务的技术配置；默认的项目统一接入请参考 [MANAGED_MODELS.md](MANAGED_MODELS.md)。

```bash
cp .env.example .env
# 在编辑器中填写 .env，不要把密钥发进聊天或提交 Git。
npm start
```

打开 http://localhost:8788，所有功能位于同一张音乐工作区页面。在共用 Agent 输入区选择「创作新音乐」或「改编已有音乐」，下方依次为 MIDI 编曲工作台、风格试听与对比和作品库；侧栏只定位本页区域。旧的 `#create` 和 `#transform` 链接会定位到同一工作区。

必要配置：

| 配置项             | 含义                                                                                |
| ------------------ | ----------------------------------------------------------------------------------- |
| `LLM_BASE_URL`     | 兼容 Chat Completions 的服务根地址，通常以 `/v1` 结尾；程序追加 `/chat/completions` |
| `LLM_MODEL`        | 供应商或本地服务中的实际模型 ID                                                     |
| `LLM_API_KEY`      | 该 LLM 的密钥；无鉴权的本地服务可留空                                               |
| `ACESTEP_BASE_URL` | ACE-Step REST API 地址，例如 `http://127.0.0.1:8001`，不是 Gradio 网页地址          |
| `ACESTEP_API_KEY`  | 音乐服务启用鉴权时填写                                                              |
| `ACESTEP_MODEL`    | 可选，留空使用音乐服务默认模型                                                      |

若 LLM 不支持 `response_format`，设置 `LLM_JSON_MODE=false`；后端仍会严格解析 JSON，错误输出不会执行。服务端读取 `.env` 后需重启。`GET /api/status` 不返回密钥，只表示配置存在；页面的连接检查调用音乐服务 `/health`，不等于完成了真实生成或效果验证。

## 音乐模型服务

本实现使用 ACE-Step 1.5 官方 REST 协议：`POST /release_task` → `POST /query_result` → 下载同服务的 `/v1/audio`。已接入 `text2music` 和 `cover`，默认单样本、8 步、10–60 秒；首版关闭模型内部 `thinking`，减少额外音乐 LM 依赖。通用 Agent 仍使用上面的 LLM。

在独立的模型目录／GPU 服务器中，按官方安装指南配置 Python、uv 和模型权重后运行：

```bash
git clone https://github.com/ACE-Step/ACE-Step-1.5.git
cd ACE-Step-1.5
uv sync
uv run acestep-api --host 127.0.0.1 --port 8001
```

这是部署说明，本项目尚未执行上述模型安装，也未下载权重。租用 GPU 时可通过 SSH 转发给本地应用：

```bash
ssh -L 8001:127.0.0.1:8001 your-user@your-gpu-host
```

然后使用 `ACESTEP_BASE_URL=http://127.0.0.1:8001`。SSH 密码和密钥由本人管理。网页应用目前仅监听本机；这次没有发布或更新线上演示站。

官方来源：

- [安装说明](https://ace-step.github.io/ACE-Step-1.5/en/INSTALL)
- [REST API](https://ace-step.github.io/ACE-Step-1.5/en/API)

## 演示流程

1. 文字创作：输入「雨天听的安静钢琴和弦乐」，选 20 秒、纯音乐、固定 seed，制定计划。
2. 检查计划、英文模型提示词和限制，点击确认生成。模型失败会显示错误，不会换成预制结果。
3. 风格改编：上传已裁好的 10–60 秒源片段，输入「木吉他流行风，尽量保留旋律」。当前不自动裁剪整首歌曲。
4. 完成后试听、下载，填写反馈，例如「吉他合适，但鼓太响」。让 Critic 整理建议，再制定下一版计划。
5. 保存原计划与新计划的关系、prompt 版本、seed 和实际音乐模型信息，用于实验记录。

计划制定时会上传所选音频到应用后端，确认生成后发送给配置的 ACE-Step 服务。应用数据位于 `.musiccraft-data/`，包括原片段、计划、任务和输出；不自动清理。`.gitignore` 已排除这些数据和 `.env`。当前浏览器标签页会话保存正在使用的计划和任务引用，刷新后可继续查询；关闭标签页后仍可从后端数据保留记录，但页面尚无历史任务浏览器。

## Agent 提示词

- `prompts/planner.md`：角色、可用工具、JSON 字段、能力边界、多轮约束继承。
- `prompts/examples.json`：文字创作、改编与不支持请求的 few-shot 示例。
- `prompts/critic.md`：基于执行信息和人工反馈整理建议，不进行虚构听测。
- `server/agent.mjs`：实际调用 LLM，并以白名单重新构造执行计划。模型返回的资产 ID、路径和未知字段不会成为执行参数。

修改 Planner 或示例会改变计划记录中的 `promptVersion`。下一轮传递上轮完整 brief；已标记的保留要求会继续继承。要改变任务类型或取消既有保留要求，请新建任务。MIDI 工作台的自然语言操作尚未接入本轮工具集。

Cover 的旋律、歌词等保留标记是目标，不是测量结果。完整原伴奏不变、逐音符一致、个人歌声音色克隆和精确分轨替换不属于当前 ACE-Step 工具承诺。个人歌声转换现已通过独立 `voice_cover` 工具接入，使用原歌曲和个人参考录音；页面模型选择、部署和边界见 [换声与模型设置](VOICE_AND_MODELS.md)。

## API 与运行限制

| 方法与路径                  | 用途                                                   |
| --------------------------- | ------------------------------------------------------ |
| `GET /api/status`           | 查看配置状态，不含密钥                                 |
| `GET /api/health`           | 音乐服务连通检查                                       |
| `POST /api/assets`          | 原始音频 body，最大 30 MB；返回资产 ID                 |
| `POST /api/plans`           | `mode,instruction,controls,assetId,style,parentPlanId` |
| `POST /api/jobs`            | `{planId}`，需明确确认；成功／运行中的同计划不重复提交 |
| `GET /api/jobs/:id`         | 查询任务                                               |
| `POST /api/jobs/:id/cancel` | 停止本地轮询与下载                                     |
| `GET /api/jobs/:id/audio`   | 真实结果，支持 Range 试听                              |
| `POST /api/jobs/:id/review` | `{feedback}`，调用文本 Critic                          |

写入请求需 `X-MusicCraft-Client: web`，浏览器跨站写入被拒绝。音乐任务单并发，等待队列最多 4 项；超时默认 15 分钟。取消不能保证取消远端模型运算，页面会说明这一点。重启时未完成任务标为 interrupted，不自动重复付费／消耗 GPU 提交。失败后再次确认会重新提交。

本实现不运行任意 shell、任意 URL 下载或模型返回的本地路径。模型结果必须来自同一服务 `/v1/audio`，并检查音频文件头。文件头检查不是完整解码分析；时长、旋律、歌词、风格和音质仍需真实音频验证。

## 验证现状

```bash
npm run check
```

测试用本机 HTTP fixture 模拟 Chat Completions 和 ACE-Step，覆盖实际请求格式、multipart 上传、轮询、下载、Range、反馈与修订、失败、取消、输出校验和跨站拒绝。fixture 只在测试中运行，不是应用可选的音乐提供方。它不证明真实模型生成质量。

截至本次修改：接口测试通过；真实 LLM／ACE-Step 未配置，因此尚未完成真实模型端到端生成与听测。训练与实验建议见 [TRAINING_PLAN.md](TRAINING_PLAN.md)。
