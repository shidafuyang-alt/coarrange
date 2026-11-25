'use strict';
window.MusicCraftMessages = {
  '创作助手待管理员开通：DeepSeek。':
    'The creative assistant is awaiting project activation of DeepSeek.',
  '国产音乐模型：歌曲与纯音乐创作、上传音乐后改编风格。':
    'Chinese music model for songs, instrumentals and restyling uploaded audio.',
  '创作按完整歌曲计费，完成后截取试听片段；改编使用上传片段。随机种子不适用于此模型。':
    'Creation is billed as a full song, then trimmed to a preview; remix uses the uploaded clip. This model does not support random seeds.',
  '取消会停止本地等待；服务方未公开取消接口，已提交的任务可能继续生成并计费。':
    'Cancel stops local waiting. The provider has no public cancellation API; submitted tasks may continue and incur charges.',
  'Mureka 密钥无效，请联系项目管理员。':
    'The Mureka key is invalid. Contact the project administrator.',
  'Mureka 额度不足，请联系项目管理员充值。':
    'Mureka has insufficient credit. Contact the project administrator.',
  '项目尚未开通 Mureka 模型权限。': 'Mureka model access is not enabled for this project.',
  'Mureka 请求受限，请稍后重试或检查项目额度。':
    'Mureka requests are limited. Try later or check project credit.',
  'Mureka 正在排队': 'Queued on Mureka',
  'Mureka 正在生成音乐': 'Mureka is generating music',
  '正在提交 Mureka 音乐任务': 'Submitting a Mureka music task',
  'Mureka 改编需要至少 10 秒的有效源音频。':
    'Mureka remix requires at least 10 seconds of valid source audio.',
  '创作描述超出 Mureka 限制，请简化要求后重新生成。':
    'The music brief exceeds Mureka limits. Simplify your request and try again.',
  'DeepSeek 在后台理解创意；Mureka 负责音乐创作和风格改编，Seed-VC 负责个人换声。':
    'DeepSeek interprets ideas in the background; Mureka creates and restyles music, and Seed-VC converts singing voices.',
  '项目的 AI 服务额度不足，请联系项目管理员补充 API 额度。':
    'The project AI service has insufficient credit. Please contact the project administrator to add API credit.',
  '正在读取创作助手…': 'Loading creative assistant…',
  '创作助手已配置，将自动理解你的要求。':
    'The creative assistant is configured and will interpret your request automatically.',
  '创作助手待管理员开通：DeepSeek 或 OpenAI。':
    'The project has yet to activate DeepSeek or OpenAI for the creative assistant.',
  '音乐模型已配置，可直接开始创作。': 'The music model is configured. You can start creating.',
  创作助手设置: 'Creative assistant settings',
  'AI 助手会自动理解你的要求，普通用户无需调整。':
    'The AI assistant interprets your request automatically. No adjustments are needed.',
  创作助手: 'Creative assistant',
  检查助手服务: 'Check assistant service',
  开始换声: 'Convert singing',
  开始改编: 'Restyle music',
  生成音乐: 'Generate music',
  生成新版本: 'Generate a new version',
  '描述想法、上传素材，直接生成并试听你的作品。':
    'Describe your idea or upload audio, then generate and listen to your music.',
  你的音乐作品: 'Your music',
  '填写创意并开始生成，完成后在这里试听、下载和继续调整。':
    'Describe your idea and start generating. Listen, download and refine the result here.',
  重试生成: 'Retry generation',
  按此建议生成新版本: 'Generate a revision from this feedback',
  '上方输入修改要求，可沿用源素材继续生成新版本。':
    'Enter your changes above to generate a new version using the same source audio.',
  '创作服务尚未由项目管理员开通。': 'The creative service is awaiting project activation.',
  创意整理: 'Creative planning',
  '项目统一提供模型账号与额度。AI 助手理解创意，音乐模型创作音频，用户无需填写地址或密钥。':
    'The project provides model accounts and credits. The assistant interprets your idea and the music model creates audio. No user addresses or keys are needed.',
  音乐生成与歌声转换模型: 'Music generation and singing conversion models',
  '选择功能后即可生成作品，系统自动安排创作过程；未开通的服务会标明状态。':
    'Choose a task and generate your music. The creative workflow runs automatically; pending services are labelled.',
  '理解创意、安排创作任务，并整理试听反馈。':
    'Interprets ideas, coordinates creative tasks and organizes listening feedback.',
  '通过 OpenAI API 理解创意、安排任务与提出修改建议。':
    'Uses the OpenAI API to interpret ideas, coordinate tasks and suggest revisions.',
  '项目管理员配置的创作助手，用于理解要求和安排任务。':
    'A project-configured assistant for understanding requests and coordinating tasks.',
  'DeepSeek 或 OpenAI 在后台理解创意；ACE-Step、Stable Audio 或 Seed-VC 负责创作音频。':
    'DeepSeek or OpenAI interprets your idea in the background; ACE-Step, Stable Audio or Seed-VC produces the audio.',
  '上传原歌曲和自己的清晰歌声参考，点击开始换声即可完成分离、转换与混音。':
    'Upload the source song and a clear recording of your singing, then start conversion to separate, convert and remix.',
  '创作助手尚未开通，请由项目管理员配置 DeepSeek 或 OpenAI 密钥。':
    'The creative assistant is awaiting activation. The administrator must configure a DeepSeek or OpenAI key.',
  '所选创作助手尚未由项目管理员开通，用户无需自行填写密钥。':
    'The selected creative assistant is awaiting project activation. Users do not need their own API keys.',
  '创作助手选择无效。': 'Invalid creative assistant selection.',
  '创作助手已配置，权限和额度将在实际生成时验证。':
    'The creative assistant is configured. Permissions and credit are verified during generation.',
  '创作助手接口可达，实际生成能力以执行结果为准。':
    'The creative assistant is reachable. Generation capability is verified during execution.',
  'OpenAI 创作助手未完成本次请求，请重试或调整要求。':
    'The OpenAI assistant did not finish this request. Retry or revise your description.',
  'OpenAI 创作助手未接受本次请求，请调整描述。':
    'The OpenAI assistant declined this request. Please revise your description.',
  '创作要求处理未完成，请缩短描述后重试。':
    'The request was not fully processed. Shorten your description and retry.',

  'Prompt 大模型尚未开通，请由项目管理员配置 DeepSeek 或 OpenAI 密钥。':
    'The Prompt LLM is awaiting activation. The project administrator must configure a DeepSeek or OpenAI key.',
  '所选 Prompt 大模型尚未由项目管理员开通，用户无需自行填写密钥。':
    'The selected Prompt LLM is awaiting project activation. Users do not need their own API keys.',
  '提示词模型选择无效。': 'Invalid Prompt model selection.',
  'OpenAI 未完成 Prompt 生成，请重试或调整要求。':
    'OpenAI did not finish Prompt generation. Retry or revise your request.',
  'OpenAI 未接受本次 Prompt 请求，请调整描述。':
    'OpenAI declined this Prompt request. Please revise your description.',
  'Prompt 生成未完整结束，请缩短要求后重试。':
    'Prompt generation was incomplete. Shorten your request and retry.',

  '音乐模型待管理员开通。': 'Music models are awaiting project activation.',
  'DeepSeek 或 OpenAI 负责理解要求与生成 Prompt；ACE-Step、Stable Audio 或 Seed-VC 负责音频执行。':
    'DeepSeek or OpenAI interprets your request and writes Prompts; ACE-Step, Stable Audio or Seed-VC executes audio tasks.',
  '正在读取 Prompt 模型…': 'Loading Prompt models…',
  'Prompt 模型已配置，可先生成创作计划与提示词。':
    'The Prompt model is configured. Generate your plan and music prompt first.',
  'Prompt 模型待管理员开通：DeepSeek 或 OpenAI。':
    'The project has yet to activate DeepSeek or OpenAI for Prompt generation.',
  '正在读取音乐模型…': 'Loading music models…',
  '音乐模型已配置，确认 Prompt 后即可执行。':
    'The music model is configured. Confirm your Prompt to run it.',
  '音乐模型待管理员开通，仍可先生成 Prompt。':
    'Music model activation is pending. You can still generate a Prompt first.',
  已配置: 'Configured',
  待开通: 'Activation pending',
  'Prompt 大模型': 'Prompt LLM',
  '理解创意 · 生成 Prompt': 'Understand ideas · generate a Prompt',
  '用文字大模型理解要求、生成音乐提示词和修改建议。':
    'A text LLM interprets your request, writes music prompts and suggests revisions.',
  '检查 Prompt 服务': 'Check Prompt service',
  音乐与换声模型: 'Music and singing models',
  '参考录音 · 转换歌声': 'Reference recording · convert singing',
  '确认 Prompt · 生成音乐': 'Confirm the Prompt · generate music',
  '用歌声转换模型处理原曲与参考录音，输出新的歌声混音。':
    'A singing conversion model processes your source and reference to produce a new vocal mix.',
  '用音乐模型根据 Prompt 创作或改编音频。':
    'A music model creates or restyles audio from the Prompt.',
  歌声转换模型: 'Singing conversion model',
  音乐生成模型: 'Music generation model',
  '生成 Prompt 与计划': 'Generate Prompt and plan',
  '修订 Prompt 与计划': 'Revise Prompt and plan',
  'Prompt 由以下模型生成': 'Prompt generated by',
  音频交给以下模型执行: 'Audio to be produced by',
  '生成的音乐 Prompt': 'Generated music Prompt',
  '复制音乐 Prompt': 'Copy music Prompt',
  确认计划并转换歌声: 'Confirm plan and convert singing',
  '确认 Prompt 并生成音频': 'Confirm Prompt and generate audio',
  'Prompt 已生成，音乐服务待开通后才能执行音频任务。':
    'Your Prompt is ready. Audio execution requires project music service activation.',
  '音乐 Prompt 已复制。': 'Music Prompt copied.',
  '复制失败，请手动选择上方 Prompt 复制。':
    'Copy failed. Select and copy the Prompt above manually.',
  '项目统一提供模型账号与额度。文字大模型负责 Prompt，音乐模型负责音频，用户无需填写地址或密钥。':
    'The project provides model accounts and credits. Text LLMs write Prompts; music models produce audio. No user URLs or API keys are needed.',
  '第一步：Prompt 与规划大模型': 'Step 1: Prompt and planning LLMs',
  '第二步：音乐生成与歌声转换模型': 'Step 2: Music generation and singing models',
  '两个步骤分别调用对应模型。你可以先生成 Prompt，再确认是否执行音频任务；未开通的服务会标明状态。':
    'Each step calls its corresponding model. Generate a Prompt first, then confirm audio execution. Pending services are labelled.',
  各部分使用的模型: 'Models used in each step',
  'Prompt LLM + 音乐模型': 'Prompt LLM + music models',
  需求理解: 'Understand requests',
  'Prompt 生成': 'Prompt generation',
  试听反馈: 'Listening feedback',
  '理解创意、生成音乐 Prompt，并整理试听反馈。':
    'Interprets ideas, writes music Prompts and organizes listening feedback.',
  '通过 OpenAI API 生成音乐 Prompt、执行计划与修改建议。':
    'Uses the OpenAI API for music Prompts, execution plans and revisions.',
  '项目管理员配置的兼容 LLM，用于提示词与任务规划。':
    'A project-configured compatible LLM for Prompts and planning.',
  'Prompt 模型已配置，权限和额度将在实际生成时验证。':
    'The Prompt model is configured. Permissions and credit are verified during generation.',
  'Prompt 模型接口可达，实际生成能力以执行结果为准。':
    'The Prompt API is reachable. Generation capability is verified during execution.',
  '本区为预制试听，播放和切换风格不调用实时模型。':
    'Prepared listening examples: playing and switching styles do not call live models.',
  '本区为本地 MIDI 与采样乐器编曲，不调用大模型。':
    'Local MIDI and sampled-instrument arrangement; no LLM calls.',

  '创作引擎由项目统一提供，保留自动选择即可，也可以选择适合当前任务的引擎。':
    'Engines are provided by the project. Keep Auto select, or choose an engine for your task.',
  '正在读取项目内置引擎…': 'Loading project engines…',
  '项目统一提供创作引擎，你无需填写模型地址或密钥。自动选择会按任务匹配已配置的引擎。':
    'Engines are provided by this project. No URLs or API keys are needed. Auto select matches configured engines to your task.',
  '已配置 · 待推理验证': 'Configured · inference unverified',
  规划服务待开通: 'Planner activation pending',
  待管理员开通: 'Awaiting project activation',
  音乐创作: 'Music creation',
  风格改编: 'Restyling',
  个人换声: 'Your singing voice',
  '风格改编的音频处理服务待管理员启动。':
    'Audio processing for restyling is awaiting project activation.',
  '模型资料 ↗': 'Model details ↗',
  '实时模型的账号、额度与服务由项目管理员维护。已配置表示接入条件齐备，实际可用性以任务执行结果为准。':
    'The project maintains model accounts, credits and services. Configured indicates setup is complete; availability is verified during execution.',
  内置创作引擎: 'Built-in engines',
  由项目统一提供: 'Provided by MusicCraft',
  '当前是离线展示版，实时创作需要项目的在线服务。':
    'This is an offline preview. Live creation requires the project server.',
  创作引擎: 'Creative engine',
  '自动选择（推荐）': 'Auto select (recommended)',
  '无需配置，系统会按任务匹配。': 'No setup needed. Engines are matched to your task.',
  '创作引擎已由项目配置，选择任务即可开始。':
    'Engines are configured by the project. Select a task to start.',
  '实时创作服务待管理员开通，可先试听示例。':
    'Live creation is awaiting project activation. Prepared examples are ready to play.',
  检查创作服务: 'Check creative service',
  '创作歌曲与纯音乐，也可以重新编配上传的音乐。':
    'Create songs and instrumentals, or restyle uploaded music.',
  '适合纯音乐、氛围与配乐创作，不支持指定歌词演唱。':
    'For instrumental, ambient and soundtrack creation. Explicit sung lyrics are not supported.',
  '项目专属音乐模型，由团队统一部署与维护。':
    'A dedicated music model deployed and maintained by the project.',
  '先分离人声，再用参考录音转换音色并保留伴奏。':
    'Separate vocals, convert timbre from a reference recording, and remix the accompaniment.',
  正在提交云端音乐任务: 'Submitting the cloud music task',
  云端模型排队中: 'Waiting in the cloud queue',
  云端模型正在生成音乐: 'The cloud model is generating music',
  正在准备音乐片段: 'Preparing the source clip',
  正在取回云端音乐结果: 'Downloading cloud-generated music',
  '云端模型已由管理员配置，密钥权限和余额将在实际任务中验证。':
    'The cloud engine is configured by the project. Key permissions and credit will be checked during execution.',
  服务可达不代表模型效果已验证: 'A reachable service does not verify generation quality',

  墨绿: 'Ink green',
  '深墨绿、奶油白与酸橙色，独立音乐工作室':
    'Forest ink, warm ivory and lime. An independent music studio.',
  '让每一种声音，成为你的作品。': 'Every sound can become something of your own.',
  '重塑歌曲风格，用自己的声音翻唱，或让一个灵感长成旋律。':
    'Restyle a song, sing it in your own voice, or turn an idea into a melody.',
  进入创作: 'Start creating',
  先听听灵感: 'Find inspiration',
  风格重塑: 'RESTYLE',
  个人音色: 'YOUR VOICE',
  灵感作曲: 'COMPOSE',
  配置创作引擎: 'Configure engines',

  筛选音乐风格: 'Filter music styles',
  等待执行: 'Waiting to execute',
  提交音乐模型任务: 'Submitting to the music model',
  '音乐模型处理中；耗时取决于模型服务器': 'The music model is running; time depends on the server.',
  下载真实模型音频: 'Downloading generated audio',
  提交人声分离与换声任务: 'Submitting separation and singing conversion',
  解码并裁剪源歌曲和参考录音: 'Decoding and trimming the song and reference',
  'Demucs 分离原唱与伴奏': 'Demucs is separating vocals and accompaniment',
  'Seed-VC 按参考声音转换歌声，保持原音高':
    'Seed-VC is converting the singing voice with source pitch conditioning',
  '对齐转换歌声与原伴奏，控制混音峰值': 'Aligning the converted vocals, mixing and limiting peaks',
  歌声转换完成: 'Singing voice conversion completed',
  '已发送换声取消请求；请以服务端任务状态为准。':
    'Cancellation was requested. Check the worker for the final task state.',
  '文本 LLM 未收到音频；该反馈依据执行记录和你的试听描述，不是自动听测结果。':
    'The text LLM received no audio. This review uses execution records and your listening feedback, not an automated listening test.',
  '用参考歌声替换原唱，保留原曲旋律、歌词与伴奏。':
    'Replace the singer using my reference voice while retaining the melody, lyrics and accompaniment.',
  'MusicCraft 将音乐创作、风格改编、个人音色翻唱与 MIDI 编曲放在同一工作区。':
    'MusicCraft combines music creation, restyling, personal voice conversion and MIDI arrangement in one workspace.',
  '先在模型与连接中填写服务地址、选择模型并保存；模型名称来自你配置的服务。':
    'Enter service addresses, select models and save them in Models and connections. Model names come from your configured services.',
  '上传原歌曲和自己的清晰歌声参考，先确认计划，再执行人声分离、歌声转换与混音。':
    'Upload a source song and a clear reference of your singing, confirm the plan, then run separation, voice conversion and mixing.',
  '预制示例可直接试听；真实生成与换声需要相应模型服务。':
    'Prepared examples are ready to play. Live generation and voice conversion require their model services.',
  'MusicCraft 音乐工作区': 'MusicCraft music workspace',
  'MusicCraft 音乐 Agent': 'MusicCraft music agent',
  '从一个想法或一段旋律开始，在同一页完成创作、改编、试听和调整。':
    'Start with an idea or a melody. Create, restyle, listen and arrange on one page.',
  音乐创作与改编: 'Create and transform music',
  '描述想法、上传素材、确认计划和试听结果，都在这里完成。':
    'Describe your idea, upload audio, confirm a plan and listen to the result here.',
  音乐任务: 'Music task',
  创作新音乐: 'Create new music',
  改编已有音乐: 'Restyle existing music',
  用我的声音翻唱: 'Sing in my voice',
  '请在上方「模型与连接」选择模型并保存服务地址。':
    'Choose models and save service addresses in Models and connections above.',
  '尚未检查模型服务配置。': 'Model connections have not been checked.',
  '模型服务地址已配置，可先检查音乐服务连接。':
    'Model addresses are configured. Check the connection before generating.',
  '模型服务地址已配置，请先检查连接。':
    'Model addresses are configured. Please check the connection.',
  你的音乐要求: 'Your music request',
  补充要求或下一轮修改: 'Additional requirements or next revision',
  '雨天听的安静钢琴和弦乐，纯音乐': 'Quiet piano and strings for a rainy day, instrumental',
  '改成木吉他流行风，尽量保留旋律，纯音乐':
    'Acoustic guitar pop, retain the melody where possible, instrumental',
  源音频片段: 'Source audio clip',
  '源音频片段（改编时使用）': 'Source audio clip for restyling',
  沿用上一轮源音频: 'Using the previous source audio',
  '改编时请选择 10–60 秒的片段，最大 30 MB。制定计划时上传到应用，确认生成后发送给模型服务。':
    'For restyling, select a 10–60 second clip, up to 30 MB. Planning uploads it to this app; generation confirmation sends it to the model service.',
  '换声支持 10–40 秒片段；可用起点选择整首歌曲中的位置。':
    'Voice conversion supports 10–40 second clips. Set the start time to choose a passage from a longer song.',
  我的歌声参考录音: 'My reference singing recording',
  沿用上一轮参考歌声: 'Using the previous reference voice',
  请选择参考歌声: 'Select a reference singing recording',
  '请上传自己 3–20 秒的清晰独唱，尽量没有伴奏和混响。':
    'Upload 3–20 seconds of your own clear solo singing, preferably without backing music or reverb.',
  '先分离原唱与伴奏，再按参考音色转换歌声并混音。效果取决于录音和分离质量，原唱可能有残留。':
    'The pipeline separates vocals, converts them toward the reference timbre, and remixes the accompaniment. Quality depends on the recordings and separation; traces of the original voice may remain.',
  '原曲起点（秒）': 'Source start in seconds',
  '人声音量（dB）': 'Vocal gain in dB',
  保留原曲旋律与歌词: 'Retain source melody and lyrics',
  目标风格: 'Target style',
  根据描述决定: 'Follow my description',
  '时长（秒）': 'Duration in seconds',
  随机种子: 'Random seed',
  纯音乐: 'Instrumental',
  含人声: 'With vocals',
  秒: 'seconds',
  '正在处理…': 'Working…',
  制定修订计划: 'Plan revision',
  制定音乐计划: 'Plan music task',
  检查音乐服务: 'Check model service',
  新建任务: 'New task',
  计划与结果: 'Plan and result',
  '填写音乐要求后，Agent 会在这里展示计划、生成进度、音频和修改建议。':
    'Enter your request to see the plan, progress, audio and revision suggestions here.',
  个人音色翻唱: 'Reference-based singing conversion',
  音频风格改编: 'Audio restyling',
  文字创作: 'Text-to-music',
  需要确认: 'Clarification needed',
  暂不支持: 'Not supported yet',
  说明: 'Notes',
  查看交给音乐模型的提示词: 'View the music model prompt',
  提示词版本: 'Prompt version',
  确认计划并生成: 'Confirm plan and generate',
  排队中: 'Queued',
  生成中: 'Generating',
  已完成: 'Completed',
  失败: 'Failed',
  已停止等待: 'Stopped waiting',
  任务被中断: 'Interrupted',
  停止等待: 'Stop waiting',
  重新提交此计划: 'Resubmit this plan',
  真实模型生成结果: 'Live model output',
  下载音频: 'Download audio',
  试听反馈: 'Listening feedback',
  '例如：吉他效果不错，但鼓太响，下一版希望降低鼓的存在感。':
    'For example: the guitar works well, but the drums are too loud. Make them subtler in the next version.',
  '请 Agent 整理反馈': 'Ask the agent to review feedback',
  '上方输入下一轮修改要求，可沿用此计划和源素材；音乐模型会重新生成音频。':
    'Enter your next revision above to reuse the plan and source. The music model will regenerate the audio.',
  试听反馈建议: 'Listening feedback suggestions',
  用此建议制定下一版: 'Plan the next version from this suggestion',
  试听换声分轨: 'Listen to separated and converted tracks',
  原曲片段: 'Source excerpt',
  分离出的原唱: 'Separated original vocals',
  转换后的歌声: 'Converted singing',
  分离出的伴奏: 'Separated accompaniment',
  '请先停止当前任务，再新建。': 'Stop the current task before starting a new one.',
  '请先等待当前生成完成或停止等待，再制定下一版。':
    'Wait for generation to finish or stop waiting before planning the next version.',
  '请描述希望创作或修改的音乐。': 'Describe the music you want to create or change.',
  '请先选择用于改编的音频片段。': 'Select the source audio first.',
  '音频不能超过 30 MB。': 'Audio must be no larger than 30 MB.',
  请上传自己的清晰歌声参考录音: 'Upload a clear reference of your own singing.',
  '请先试听并填写反馈。': 'Listen and enter your feedback first.',
  模型与连接: 'Models and connections',
  '选择模型前，需要有可用的模型服务地址。模型列表来自该服务实际提供的模型，选择名称不会自动下载或部署模型。':
    'A running model service is required. The list shows models available from that service; selecting a name does not download or deploy it.',
  '理解要求的 LLM': 'LLM for planning',
  创作与改编模型: 'Music generation model',
  歌声转换模型: 'Singing voice model',
  '兼容 Chat Completions 的服务': 'Chat Completions compatible service',
  '兼容 ACE-Step 1.5 的服务': 'ACE-Step 1.5 compatible service',
  'Seed-VC + Demucs 专用换声服务': 'Dedicated Seed-VC and Demucs worker',
  服务地址: 'Service address',
  'API 密钥（可选）': 'API key, optional',
  '已保存；留空保持原密钥': 'Saved; leave blank to keep the existing key',
  仅保存在本机后端: 'Stored only in this local backend',
  '模型 ID': 'Model ID',
  留空使用服务默认模型: 'Leave blank for the service default',
  '输入或选择服务支持的模型 ID': 'Enter or select a supported model ID',
  读取可用模型: 'Load available models',
  检查连接: 'Check connection',
  保存模型连接: 'Save model connections',
  '留空密钥会保留同一地址的已有密钥；更换地址后需要重新填写密钥。':
    'A blank key keeps the saved key for the same address. Re-enter it when changing the address.',
  '模型列表已更新，请在模型 ID 输入框中选择，然后保存。':
    'The model list is ready. Choose a model ID, then save.',
  '服务未提供可选模型，可手动填写模型 ID。':
    'No models were listed. You can enter a model ID manually.',
  '服务连接成功，实际生成效果仍需试听验证。':
    'The service is reachable. Validate generation quality by listening to real outputs.',
  '模型连接已保存，可以制定新计划。': 'Connections saved. You can create a new plan.',
  '请通过 npm start 启动应用服务': 'Start the application server with npm start.',
  连接请求失败: 'Connection request failed.',
  '请打开「模型与连接」填写服务地址并保存':
    'Open Models and connections, enter a service address, and save.',
  '请先填写并保存服务地址，再读取模型列表':
    'Enter and save the service address before loading models.',
  'LLM 尚未配置，请在 .env 设置 LLM_BASE_URL 和 LLM_MODEL':
    'The planning LLM is not configured. Set its address and model in Models and connections.',
  '请在「模型与连接」配置当前任务所需的服务':
    'Configure the service required for this task in Models and connections.',
  '模型连接或选择已改变，请重新制定计划':
    'The model connection or selection changed. Create a new plan.',
  '换声服务可达，但缺少模型或推理依赖，请检查 Worker 环境':
    'The voice worker is reachable, but its model or inference dependencies are missing.',
  '音乐模型会重新生成音频；旋律和歌词保留需要试听验证，不能保证逐音符一致。':
    'The music model regenerates audio. Melody and lyric preservation require listening and are not guaranteed note for note.',
  '人声分离可能残留原唱；个人音色相似度、歌词与音高保持需要试听验证。':
    'Separation may leave traces of the original singer. Voice similarity, lyrics and pitch preservation require listening.',
  '以下是预先制作的示例，可直接播放。Agent 的新生成结果会显示在页面上方。':
    'These prepared examples are ready to play. New agent-generated results appear above.',
  '同一首原创主题 · 已准备好 13 个试听版本 · 文字描述暂不触发实时生成。':
    'One original theme in 13 prepared versions. Use the agent above for new model tasks.',
  '提前制作的真实改编案例。上传其他歌曲的实时改编尚未开放。':
    'A prepared arrangement example. Use the agent above to restyle your own uploaded audio.',
};
