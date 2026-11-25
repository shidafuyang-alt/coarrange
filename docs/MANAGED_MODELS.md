# MusicCraft 托管模型接入

普通用户选择任务、描述要求或上传音频即可。账号、API 密钥、额度和 GPU 由项目团队统一提供，网页不会返回密钥或允许访客修改共享连接。内部 Prompt 在后端生成、保存并执行，不展示给用户；点击一次生成会自动完成需求规划与音乐任务提交。

## 当前推荐组合

| 部分           | 模型与接入方式                            | 管理员配置                                      | 当前能力                                                     |
| -------------- | ----------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------ |
| 创作助手       | DeepSeek 官方 API                         | `DEEPSEEK_API_KEY`                              | 理解需求，生成内部音乐描述和歌词，整理反馈；该请求不上传音频 |
| 音乐创作与改编 | fal ACE-Step / Stable Audio 官方 API      | `FAL_KEY`                                       | ACE-Step 歌曲创作与改编；Stable Audio 纯音乐                 |
| 个人歌声转换   | 团队部署 Seed-VC + Demucs + FFmpeg Worker | `VOICE_WORKER_BASE_URL`、`VOICE_WORKER_API_KEY` | 分离原唱，按参考录音转换音色，再与伴奏混音                   |
| 可选国内音乐   | 昆仑万维 Mureka 9.5 官方 API              | `MUREKA_API_KEY`                                | 歌曲、纯音乐生成及上传音乐 Remix，当前未配置凭证             |
| 可选自部署音乐 | ACE-Step 1.5                              | `ACESTEP_BASE_URL`、`ACESTEP_API_KEY`           | 项目专属音乐生成和改编，接口与云端服务不同                   |

官方参考：[DeepSeek](https://api-docs.deepseek.com/)、[Mureka 平台](https://platform.mureka.ai/)、[歌曲创作接口](https://platform.mureka.ai/docs/api/operations/post-v1-song-generate.html)、[纯音乐接口](https://platform.mureka.ai/docs/api/operations/post-v1-instrumental-generate.html)、[Remix 接口](https://platform.mureka.ai/docs/api/operations/post-v1-song-remix.html)、[Seed-VC](https://github.com/Plachtaa/seed-vc)。

`MUSICCRAFT_DOMESTIC_ONLY=true` 时，目录与执行选择只允许 DeepSeek，以及 Mureka/ACE-Step/Seed-VC 路线。OpenAI 和 fal 不展示，也不能通过手动提交它们的 ID 绕过限制；DeepSeek 缺少密钥时不会偷偷回退 OpenAI。已有 OpenAI/fal 配置保留，设为 `false` 可恢复兼容模式。

这里的“国内模型”指提供方与接入路线，不能据此推断每个请求的数据存储地域。Mureka 官方 API 目前使用 `https://api.mureka.ai`；如需严格的中国大陆部署或数据地域保证，应向官方确认或在国内 GPU 自部署。Seed-VC 为歌声转换模型，Demucs 为分离工具，FFmpeg 为音频处理工具，并非三者都属于中国大模型。

## 团队如何取得密钥并配置

1. 打开 [DeepSeek 开放平台](https://platform.deepseek.com/)，登录后在 API Keys 创建项目密钥，并确认 API 账户有可用额度。
2. 打开 [Mureka API 平台](https://platform.mureka.ai/)，登录控制台，创建 API Key 并开通音乐调用额度。使用 API 平台的密钥，不使用消费端音乐网页的登录凭证。付款与账号操作由团队完成。
3. 在项目根目录 `.env` 填入以下配置；没有该文件时先复制 `.env.example`。不要覆盖已有的其他密钥，也不要将真实值写入示例文件。

```dotenv
MUSICCRAFT_MANAGED=true
MUSICCRAFT_DOMESTIC_ONLY=true
PROMPT_PROVIDER=deepseek
DEEPSEEK_API_KEY=your_deepseek_project_key
MUREKA_API_KEY=your_mureka_project_key
```

4. 运行 `npm ci` 安装依赖，然后重启 `npm start`。FFmpeg 默认使用随依赖安装的 `ffmpeg-static`；也可以用 `MUSICCRAFT_FFMPEG` 指定现有程序。

当前本地预览为 `http://localhost:8792/#music-agent`。换声连接和专用服务密钥也已在本机配置，详见 [换声部署与使用](VOICE_AND_MODELS.md)。前端、后端共用端口，密钥无需通过另一个网页端口上传。`.env` 由后端启动时读取、已被 Git 忽略，实际配置权限为 0600；`web/` 与静态分享包不包含该文件。

## Mureka 适配的实际行为与限制

- 有人声创作调用 `/v1/song/generate`，纯音乐调用 `/v1/instrumental/generate`，改编调用 `/v1/song/remix`。所有任务显式设置 `n=1`，避免默认生成两份作品；不自动重试收费提交。
- 改编先将源曲裁剪为所选片段，再编码 MP3，使用 multipart 上传，`purpose=remix`。上传前检查至少 10 秒和 10 MB 上限。歌词字段留空，由服务从原曲处理，避免将 LLM 没听过原曲却编造的歌词当成原歌词。旋律、歌词和风格保留仍需试听验证，不能保证逐音符一致。
- 内部音乐描述不得超过 1024 字符，歌词不得超过 5000 字符；规划与执行均校验。浏览器不收到这些内部字段。
- 当前网页支持 10–60 秒试听。Mureka 创作的精确时长参数范围是 120–300 秒，因此适配器不发送非法的 20 秒参数，而是让模型自动生成完整作品，再截取试听片段；仍按服务方的完整歌曲任务计费。不能据此承诺 20 秒更便宜。改编使用裁剪后的输入片段。
- Mureka 接口未提供此处所需的随机种子控制，不发送 seed；网页明确说明这一限制，结果记录的 seed 为 null。
- 异步任务按官方 song/instrumental query 接口轮询。下载限制为已知 Mureka 域名的 HTTPS 地址，不向下载站转发 API 密钥，并检查返回音频的实际文件头。
- 官方公开文档未提供任务取消接口。用户点击取消仅停止本地等待和结果下载，已经提交的服务任务可能继续运行并计费。网页显示这项限制，不虚构取消成功或退款。
- 模型卡片的“已配置”只代表凭证与本地依赖齐备，不代表账号权限、余额或真实音频质量已验证。“检查音乐服务”不启动收费任务。

## 换声单独开通

Mureka 的 [Vocal cloning](https://platform.mureka.ai/docs/api/operations/post-v1-song-vocal-clone.html) 创建可用于新歌生成的 Vocal ID，不能直接当作“保持已有原曲并替换原唱”的等价接口。本项目个人换声继续使用既有 Seed-VC 路线，参见 [VOICE_AND_MODELS.md](VOICE_AND_MODELS.md)。

团队在租用 GPU 上启动 Worker 后配置其地址和密钥。访客只上传原曲与清晰参考歌声，不需要逐人训练或部署模型。当前换声处理 10–40 秒原曲片段，分离残留与音色相似度需要真实听测。仅填写 Mureka 密钥不会同时开通这个 Worker。

## 验证与部署边界

运行 `npm run check` 会检查前端静态资产和离线 HTTP 契约，包括三类 Mureka 请求、实际 FFmpeg 编码、源曲过短、收费次数、密钥隔离、下载限制、取消及国内模式禁用海外回退。这些测试不产生云端费用，不能替代真实生成与听测。

当前本机已配置 DeepSeek 与 fal，并设置 `PROMPT_PROVIDER=deepseek`、`MUSICCRAFT_DOMESTIC_ONLY=false`。DeepSeek 的模型列表鉴权和一次真实内部计划生成已通过，计划绑定 ACE-Step，浏览器响应不含内部 Prompt。fal 的官方价格接口鉴权已通过，ACE-Step 显示每生成秒 $0.0002。尚未提交真实 fal 音乐生成任务。Mureka 凭证仍未配置；GPU 换声 Worker 已在 RTX 3090 上部署，已用实际歌曲和官方参考音色跑通分离、转换、混音及 MusicCraft 后台完整调用。已有 OpenAI 配置保留，自动规划优先使用 DeepSeek；此前 OpenAI 调用曾因额度不足失败。以上真实凭证仅在本机 `.env` 中，仓库和离线分享包不包含密钥。

现有 `scripts/serve.mjs` 是 localhost 开发服务。让组员或外部访客使用实时模型仍需部署 Node 后端与 Worker；只分享静态 `web/` 或离线 HTML 不会获得实时云端生成功能。
