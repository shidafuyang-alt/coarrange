'use strict';
// UI copy only. User-entered text and uploaded filenames are never translated.
window.CoLocale = (() => {
  const dictionary = {
    '编曲，放开玩。': 'Make it playful. Make it yours.',
    '让二胡领唱，让贝斯蹦迪。换乐器、加声部，亲手听见反差。':
      'Let an erhu lead and a bassline dance. Swap instruments and add parts.',
    '你的乐器架，今天想加谁？': 'Who is joining your arrangement?',
    '31 种音色 · 二胡真实采样 · 最多 8 个声部':
      '31 sounds \u00b7 Recorded erhu \u00b7 Up to 8 parts',
    添加乐器: 'Add instrument',
    配器起点: 'Starting style',
    选择编曲风格: 'Arrangement style',
    试点不按常理的: 'Try something unexpected',
    '这些组合会真正改变音符、节奏和乐器。': 'These presets change notes, rhythm and instruments.',
    '点击乐器名称就能替换音色。先按 S 单独听，再把其他乐器加回来。':
      'Click an instrument name to replace it. Use S to hear it alone.',
    '工作台可实时更换乐器、增删声部与导出 MIDI。这里是原创主题的可编辑配器；AI 试听版本与工作台演奏会有差别。':
      'Swap instruments, add or remove parts, and export MIDI. This editable arrangement of the original theme differs from the prepared AI audio.',
    给编曲加一位新成员: 'Add a new voice',
    '换一种音色，听听看。': 'Try another instrument.',
    乐器架: 'Instrument rack',
    搜索乐器: 'Search instruments',
    '搜索二胡、吉他、萨克斯…': 'Search erhu, guitar, sax\u2026',
    全部: 'All',
    常见风格: 'Genres',
    反差实验室: 'Unexpected mixes',
    全部风格: 'All styles',
    试点有趣的: 'Try something playful',
    '晴日来信，也可以这么不一样。': 'Letters in the Sun, with a twist.',
    '从摇滚到民谣，再让二胡出来蹦个迪。点一下，直接听。':
      'Rock, folk, or an erhu at the disco. Tap to listen.',
    自己配一版: 'Make your own mix',
    '熟悉的旋律，': 'A familiar melody.',
    听点: 'Hear something',
    '不一样。': 'unexpected.',
    '摇滚、民谣、爵士，或让二胡和迪斯科碰个面。': 'Rock, folk, jazz \u2014 or an erhu meets disco.',
    '一首原创主题，十三种打开方式。': 'One original theme. Thirteen interpretations.',
    听二胡蹦迪: 'Play erhu disco',
    '同一首原创主题 · 已准备好 13 个试听版本 · 文字描述暂不触发实时生成。':
      'One original theme \u00b7 13 prepared versions \u00b7 Text does not trigger live generation.',
    听感方向: 'Sound direction',
    乐器组合: 'Instruments',
    继续动手: 'Keep creating',
    '在工作台换乐器、加声部，试出自己的组合。': 'Swap instruments and add parts in the workbench.',
    试听这个版本: 'Play this version',
    对比流行原版: 'Compare original pop',
    在工作台试这个配器: 'Try this arrangement',
    '再大胆一点？': 'Try a bolder twist?',
    '试听为提前准备的真实音乐版本。工作台使用同一主题的可编辑配器，演奏细节会有所不同。':
      'These are real prepared audio versions. The workbench provides editable arrangements of the same theme with different performance details.',
    'AI 改编试听': 'AI arrangement',
    原创编配试听: 'Original arrangement',
    '原主题 108 BPM': 'Original theme: 108 BPM',
    '描述一个想法（可选）': 'Describe an idea (optional)',
    试听这个方向: 'Listen to this direction',
    '文字用于记录方向，试听为已准备的风格样例。':
      'Text records your idea. Playback uses prepared style examples.',
    '正在加载音色…': 'Loading instruments\u2026',
    '音色加载失败，请重试。': 'Instrument loading failed. Please try again.',
    '已更新乐器，点播放听听变化。': 'Instrument updated. Press play to hear it.',
    '已导入旋律，可继续更换乐器与风格。': 'Melody imported. Try other instruments and styles.',
    '已导出当前乐器、音符与速度。': 'Exported instruments, notes and tempo.',
    '伯克利 BISA · 真实录音': 'Berklee BISA \u00b7 Recorded sample',
    鼓组合成: 'Synthesized drums',
    音源署名与授权: 'Sound credits and licenses',
    更换乐器: 'Change instrument',
    移除: 'Remove ',
    半音: 'semitones',
    键盘: 'Keys',
    拨弦: 'Plucked',
    低音: 'Bass',
    弓弦: 'Strings',
    管乐: 'Winds',
    特色: 'Special',
    电子: 'Electronic',
    节奏: 'Rhythm',
    '原创主题 · AI 风格改编': 'Original theme \u00b7 AI arrangement',
    '原创主题 · AI 改编': 'Original theme \u00b7 AI arrangement',
    三角钢琴: 'Grand piano',
    电钢琴: 'Electric piano',
    爵士风琴: 'Jazz organ',
    击弦古钢琴: 'Clavinet',
    尼龙吉他: 'Nylon guitar',
    民谣吉他: 'Steel guitar',
    清音电吉他: 'Clean electric guitar',
    失真电吉他: 'Distorted guitar',
    低音提琴: 'Upright bass',
    电贝斯: 'Electric bass',
    拍弦贝斯: 'Slap bass',
    小提琴: 'Violin',
    大提琴: 'Cello',
    弦乐合奏: 'String ensemble',
    竖琴: 'Harp',
    长笛: 'Flute',
    单簧管: 'Clarinet',
    次中音萨克斯: 'Tenor saxophone',
    小号: 'Trumpet',
    长号: 'Trombone',
    手风琴: 'Accordion',
    马林巴: 'Marimba',
    八音盒: 'Music box',
    班卓琴: 'Banjo',
    西塔琴: 'Sitar',
    三味线: 'Shamisen',
    日本筝: 'Japanese koto',
    陶笛: 'Ocarina',
    '8-bit 方波': '8-bit square lead',
    二胡: 'Erhu',
    鼓组: 'Drum kit',
    流行: 'Pop',
    轻快节拍与合成器: 'Bright beats and synths',
    '晴日来信 · 流行': 'Letters in the Sun \u00b7 Pop',
    室内古典: 'Chamber',
    钢琴与弦乐的呼吸感: 'Piano and expressive strings',
    '晴日来信 · 室内古典': 'Letters in the Sun \u00b7 Chamber',
    轻柔古典: 'Gentle chamber',
    更轻的弦乐与留白: 'Soft strings and breathing room',
    '晴日来信 · 轻柔古典': 'Letters in the Sun \u00b7 Gentle chamber',
    摇滚: 'Rock',
    失真吉他与真鼓冲击: 'Crunchy guitars and live drums',
    '晴日来信 · 摇滚': 'Letters in the Sun \u00b7 Rock',
    民谣: 'Folk',
    指弹吉他与木质音色: 'Fingerpicked guitar and warm woodwinds',
    '晴日来信 · 民谣': 'Letters in the Sun \u00b7 Folk',
    爵士摇摆: 'Jazz swing',
    '萨克斯、行进贝斯与切分': 'Sax, walking bass and swung rhythm',
    '晴日来信 · 爵士摇摆': 'Letters in the Sun \u00b7 Jazz swing',
    巴萨诺瓦: 'Bossa nova',
    尼龙吉他与轻盈拉丁律动: 'Nylon guitar and a gentle Latin groove',
    '晴日来信 · 巴萨诺瓦': 'Letters in the Sun \u00b7 Bossa nova',
    放克: 'Funk',
    拍弦贝斯与俏皮铜管: 'Slap bass and cheeky brass stabs',
    '晴日来信 · 放克': 'Letters in the Sun \u00b7 Funk',
    雷鬼: 'Reggae',
    反拍吉他与松弛低音: 'Offbeat guitar and deep relaxed bass',
    '晴日来信 · 雷鬼': 'Letters in the Sun \u00b7 Reggae',
    'Lo-fi 嘻哈': 'Lo-fi hip-hop',
    电钢琴与慵懒碎拍: 'Rhodes and a dusty laid-back beat',
    '晴日来信 · Lo-fi 嘻哈': 'Letters in the Sun \u00b7 Lo-fi hip-hop',
    二胡迪斯科: 'Erhu disco',
    '二胡拉主旋律，贝斯负责蹦迪': 'Bowed erhu melody meets a disco bassline',
    '晴日来信 · 二胡迪斯科': 'Letters in the Sun \u00b7 Erhu disco',
    马戏团摇摆: 'Circus swing',
    '手风琴、木琴与滑稽停顿': 'Accordion, marimba and comic musical pauses',
    '晴日来信 · 马戏团摇摆': 'Letters in the Sun \u00b7 Circus swing',
    像素游戏: '8-bit adventure',
    方波旋律与街机琶音: 'Square-wave melody and arcade arpeggios',
    '晴日来信 · 像素游戏': 'Letters in the Sun \u00b7 8-bit adventure',
    '你喜欢的歌，换一种打开方式。': 'Your favorite song. A different world.',
    '真实 AI 改编 · 20 秒': 'Real AI arrangement \u00b7 20 seconds',
    '用户提供的音乐片段 · 0:47–1:07': 'User-supplied excerpt \u00b7 0:47\u20131:07',
    '先听，熟悉的声音。': 'First, the familiar sound.',
    '再听，古典的另一面。': 'Then, a classical reimagining.',
    原曲片段: 'Original excerpt',
    '以原曲为素材，重新生成古典配器': 'A new classical arrangement generated from the source',
    'A · 试听原曲': 'A \u00b7 Play original',
    'B · 试听古典改编': 'B \u00b7 Play classical',
    '播放中切换 A / B，会保留当前进度。': 'Switch A / B while playing to keep the same position.',
    从原曲开头听: 'Start with the original',
    另一个改编版本: 'Another arrangement',
    '本次改编做了什么？': 'How was this arrangement made?',
    '从你提供的 MP3 截取 20 秒，交给本地 ACE-Step 音乐模型重新生成古典版本。没有用升降调、变速或原曲叠加来冒充改编。':
      'A 20-second excerpt from your MP3 was reimagined with the local ACE-Step music model. This is a generated arrangement, rather than a pitch shift, speed change or source overlay.',
    '试听版本已匹配响度，并保留原曲与改编文件供对比。生成式改编可能改变部分旋律与细节；MIDI 工作台使用另一首原创示例。':
      'Levels are matched for comparison, with source and generated versions available. Generative arrangements can change melodic details. The MIDI workbench uses a separate original composition.',
    '提前生成的真实改编案例。上传其他歌曲的实时改编尚未开放。':
      'A real arrangement prepared in advance. Live transformation of other uploads is not available yet.',
    音频波形: 'Audio waveform',
    真实歌曲改编对比: 'Real song arrangement comparison',
    流行版本封面: 'Pop version artwork',
    古典版本封面: 'Classical version artwork',
    'hate that i made you love me · 原曲': 'hate that i made you love me \u00b7 Original',
    'hate that i made you love me · 古典改编': 'hate that i made you love me \u00b7 Classical',
    'hate that i made you love me · 另一版改编': 'hate that i made you love me \u00b7 Alternative',
    '用户提供的 MP3 · 0:47–1:07 片段': 'User-supplied MP3 \u00b7 Excerpt from 0:47\u20131:07',
    '真实 AI 改编 · 古典再创作': 'Real AI arrangement \u00b7 Classical reimagining',
    '真实 AI 改编 · 另一种演绎': 'Real AI arrangement \u00b7 Alternative interpretation',
    真实歌曲改编案例: 'Real song arrangement',
    '你选的歌曲片段，重新演绎成古典音乐。': 'Your selected song, reimagined as classical music.',
    '从熟悉的声音，听见另一种可能。': 'Hear a new possibility in a familiar sound.',
    '本期改编 · POP MEETS CLASSICAL': 'FEATURED ARRANGEMENT \u00b7 POP MEETS CLASSICAL',
    '先比较你选的歌曲，再探索自己的音乐想法。':
      'Compare your selected song, then explore your own ideas.',
    继续探索上传与编曲: 'Explore uploads and arrangement',
    '下方使用另一首原创示例；上传文件仅本地试听。':
      'Below is a separate original demo. Uploads support local playback only.',
    '真实改编与原创示例都在这里。播放、比较，或者带走它。':
      'Your AI arrangements and original demos. Play, compare or download.',
    '包含用户提供的歌曲片段、真实 AI 改编与原创程序编配示例。封面为 AI 图像。':
      'Includes a user-supplied excerpt, real AI arrangements and original procedural examples. Artwork is AI generated.',
    '新增歌曲案例由本地 ACE-Step 模型预先生成。其他试听为原创程序编配示例。网站尚未接入实时生成或 LLM API。':
      'The featured song was arranged in advance with local ACE-Step inference. Other examples are original procedural compositions. Live generation and LLM APIs are not connected.',
    '1 个链接': '1 link',
    '添加 Spotify 链接': 'Add Spotify link',
    'Spotify 收藏链接': 'Spotify bookmarks',
    '收好喜欢的音乐，随时去 Spotify 听。': 'Keep the music you love, and listen on Spotify.',
    个链接: 'links',
    歌曲: 'Track',
    专辑: 'Album',
    歌单: 'Playlist',
    仅保存链接: 'Link only',
    '在 Spotify 打开': 'Open in Spotify',
    移除链接: 'Remove link',
    '喜欢的歌曲，也可以放在这里。': 'Keep your favorite music here, too.',
    '粘贴 Spotify 分享链接，建立自己的音乐收藏。':
      'Paste a Spotify share link to build your own collection.',
    添加链接: 'Add link',
    '这里保存的是链接，不会下载或导入 Spotify 音频，也不会将 Spotify 内容用于 AI 改编。':
      'Bookmarks only. Spotify audio is not downloaded, imported, or used for AI restyling.',
    '把喜欢的音乐，留在这里。': 'Keep the music you love.',
    '保存歌曲、专辑或歌单链接，在 Spotify 中打开收听。':
      'Save a track, album or playlist link, then listen on Spotify.',
    'Spotify 分享链接': 'Spotify share link',
    给它起个名字: 'Give it a name',
    可选: 'Optional',
    '比如：我喜欢的夏日歌单': 'For example: My favorite summer playlist',
    '仅保存链接，不导入音频。需要改编时，请上传你自己的音频文件。':
      'This saves a link, not an audio file. To rearrange music, upload your own audio.',
    保存链接: 'Save link',
    '已移除 Spotify 链接': 'Spotify link removed',
    '已保存 Spotify 链接': 'Spotify link saved',
    '请粘贴完整的 Spotify 歌曲、专辑或歌单链接。':
      'Paste a full Spotify track, album or playlist link.',
    '请使用以 https://open.spotify.com/ 开头的链接。':
      'Use a link beginning with https://open.spotify.com/.',
    '暂支持歌曲、专辑和歌单链接；短链接请先在 Spotify 中打开，再复制完整地址。':
      'Track, album and playlist links are supported. Open a short link in Spotify first and copy its full address.',
    '这个链接已经在收藏里了。': 'This link is already in your bookmarks.',
    '最多可保存 30 个链接，请先移除不再需要的链接。':
      'You can save up to 30 links. Remove one before adding another.',
    '浏览器暂时无法保存，请检查本地存储设置。':
      'Your browser could not save this link. Check its local storage settings.',
    'CoArrange 首页': 'CoArrange home',
    '−1 半音': '−1 semitone',
    '＋1 半音': '+1 semitone',
    让灵感有回声: 'Give your ideas a voice',
    开始创作: 'Create music',
    工作空间: 'Workspace',
    主导航: 'Main navigation',
    为你推荐: 'For you',
    灵感创作: 'Create music',
    风格转换: 'Restyle music',
    编曲工作台: 'Arrangement',
    我的音乐: 'My music',
    音乐库: 'Music library',
    作品库: 'Library',
    我的作品库: 'Your library',
    我的收藏: 'Favorites',
    '不懂乐理，也可以': 'No music theory needed.',
    '从喜欢的声音开始。': 'Start with a sound you love.',
    '认识 CoArrange': 'Meet CoArrange',
    偏好设置: 'Preferences',
    我的创作空间: 'My workspace',
    '本地保存 · 无需登录': 'Saved locally · No sign-in',
    你的音乐工作室: 'Your music studio',
    交互演示版: 'Interactive demo',
    使用帮助: 'Help',
    'CoArrange · 课程项目初版': 'CoArrange · Course project prototype',
    音乐播放器: 'Music player',
    当前音乐封面: 'Current artwork',
    收藏当前音乐: 'Favorite this version',
    循环播放: 'Loop playback',
    上一版本: 'Previous version',
    下一版本: 'Next version',
    打开版本比较: 'Compare versions',
    播放进度: 'Playback position',
    音量: 'Volume',
    下载当前音乐: 'Download audio',
    '今天，想听见什么灵感？': 'What will you create today?',
    '你的音乐，不必从专业开始。': 'Your music starts with you.',
    '本期灵感 · POP MEETS CLASSICAL': 'IN THE SPOTLIGHT · POP MEETS CLASSICAL',
    '把流行，': 'Pop, reimagined.',
    写成另一种: 'A little ',
    '浪漫。': 'romance.',
    '一段原创旋律，从轻快节拍走进钢琴与弦乐。':
      'An original melody, from pop beats to piano and strings.',
    '先听听看，再开始你的版本。': 'Have a listen. Then make it your own.',
    试听古典版: 'Play classical version',
    试试风格转换: 'Explore restyling',
    '从这里，开始你的创作': 'Find your starting point',
    '选一种方式，剩下的慢慢来。': 'One small step. Plenty of possibilities.',
    把想法变成音乐: 'Turn ideas into music',
    '说说心情，找一个喜欢的声音。': 'Describe a feeling. Discover a sound.',
    给音乐换种风格: 'Give music a new style',
    '保留熟悉的旋律，听见新的可能。': 'A familiar melody. A new possibility.',
    亲手调整编曲: 'Make it your own',
    '让鼓轻一点，或让钢琴多一点。': 'A little less rhythm. A little more piano.',
    '同一段旋律，两种模样': 'One melody. Two different worlds.',
    '晴日来信 · 为这次体验创作的音乐示例': 'Letters in the Sun · An original theme for this demo',
    查看作品库: 'Open library',
    银色流动雕塑: 'Flowing silver sculpture',
    光影中的三角钢琴: 'A grand piano in light and shadow',
    '轻快节奏，合成器与电子鼓': 'Bright rhythms, synths and electronic drums',
    '保留旋律，换上钢琴与弦乐': 'The same melody, dressed in piano and strings',
    原始编配: 'Original arrangement',
    风格改编: 'Restyled arrangement',
    室内古典: 'Chamber classical',
    '原创试听示例 · 当前为演示模式，实时生成将在后续版本开放。':
      'Original listening examples · Live generation is planned for a later version.',
    '晴日来信 · 室内乐编配': 'Letters in the Sun · Chamber arrangement',
    '晴日来信 · 室内乐版': 'Letters in the Sun · Chamber version',
    '晴日来信 · 流行原版': 'Letters in the Sun · Original pop version',
    '晴日来信 · 轻柔版': 'Letters in the Sun · Gentle version',
    晴日来信: 'Letters in the Sun',
    '原创旋律 · 流行编配': 'Original melody · Pop arrangement',
    '同一段旋律 · 钢琴与弦乐': 'Same melody · Piano and strings',
    '修订版本 · 更轻的弦乐': 'Revised arrangement · Softer strings',
    '古典 / Soft chamber': 'Classical / Soft chamber',
    '古典 / Chamber': 'Classical / Chamber',
    '流行 / Synth-pop': 'Pop / Synth-pop',
    '先说说，你想听见什么。': 'Tell us what you have in mind.',
    '不用专业词汇。一种心情、一个画面，都可以是开始。':
      'No technical terms needed. A feeling or a little scene is enough.',
    你的音乐灵感: 'Your musical idea',
    描述一个想法: 'Describe your idea',
    '比如：午后的阳光洒进房间，一首温柔的钢琴曲，带一点弦乐，适合安静地发呆。':
      'For example: afternoon sunlight, a gentle piano melody and a little string accompaniment. Something to daydream to.',
    '下班路上，轻快一点': 'Something bright for the way home',
    雨天的钢琴和弦乐: 'Piano and strings for a rainy day',
    像夏天一样的流行音乐: 'Pop music that feels like summer',
    选择声音方向: 'Choose a sound',
    '轻快 · 有律动': 'Bright · Rhythmic',
    '钢琴 · 弦乐': 'Piano · Strings',
    轻柔古典: 'Gentle classical',
    '舒缓 · 有留白': 'Calm · Spacious',
    预览编曲计划: 'Preview arrangement plan',
    '先体验编曲计划与预制试听。实时音乐生成将在后续版本开放。':
      'Explore a plan and a prepared audio example. Live music generation is coming later.',
    '你的灵感，会在这里响起': 'Your idea will take shape here',
    '先选一个方向，预览编曲计划与示例。':
      'Choose a direction to preview a plan and listening example.',
    '熟悉的旋律，换一种心情。': 'A familiar melody. A different feeling.',
    '先用「晴日来信」体验流行转古典，也可以上传自己的音频试听。':
      'Explore our pop-to-classical example, or upload your own audio to listen locally.',
    选择你的音乐: 'Choose your music',
    点击或拖入一段音频: 'Click or drop an audio file',
    'MP3、WAV、M4A · 最大 30 MB · 仅在浏览器本地读取':
      'MP3, WAV, M4A · Up to 30 MB · Stays in your browser',
    音乐封面: 'Music artwork',
    '已上传 · 可本地试听': 'Uploaded · Ready for local playback',
    '已为你准备 · 0:38 · 原创演示素材': 'Ready to explore · 0:38 · Original demo audio',
    试听源音频: 'Play source audio',
    '你想把它变成什么风格？': 'What would you like it to sound like?',
    保留主旋律: 'Keep the main melody',
    示例已保留: 'Preserved in this example',
    固定示例: 'Prepared example',
    试听本站改编示例: 'Play our restyling example',
    预览流行转古典: 'Preview pop to classical',
    '你上传的音频可试听；本版不改编上传文件，结果仍为「晴日来信」的预制示例。':
      'Your upload can be played locally. This demo does not transform uploaded audio; the output is our prepared example.',
    '示例保留同一旋律，分别编配与渲染。实时风格转换将在模型接入后提供。':
      'Both examples share the same melody. Live restyling will be available after model integration.',
    恢复内置示例: 'Restore demo source',
    编曲结果封面: 'Arrangement artwork',
    'C 大调': 'C major',
    预制试听示例: 'Prepared audio example',
    旋律: 'Melody',
    保留原始旋律与段落结构: 'Keep the original melody and structure',
    配器: 'Instruments',
    '合成器、电子钢琴、贝斯与电子鼓': 'Synths, electric piano, bass and electronic drums',
    '钢琴、弦乐、大提琴与竖琴': 'Piano, strings, cello and harp',
    表达: 'Feel',
    '轻快、清晰，有稳定的节奏推进': 'Bright and clear, with a steady rhythmic pulse',
    '舒展、细腻，用分解和弦衬托旋律':
      'Expressive and spacious, with arpeggios supporting the melody',
    试听流行版: 'Play pop version',
    对比原版: 'Compare original',
    '再调整一点？': 'One more little change?',
    '本版可试：弦乐轻一点，钢琴更突出': 'Try the prepared revision: softer strings, more piano',
    试听更轻柔的修订版: 'Play the gentler revision',
    '这是提前准备的修订版本，可与初版对比试听。':
      'This prepared revision can be compared with the first version.',
    '初版 · 室内乐': 'First version · Chamber',
    '初版 · 流行': 'First version · Pop',
    '修订 · 轻柔版': 'Revision · Gentle',
    '你的方向：': 'Your direction: ',
    '。试听使用本站对应风格的固定示例。': '. Playback uses the prepared example for this style.',
    '喜欢的声音，留在这里。': 'Keep the sounds you love.',
    '每个版本，都值得听见。': 'Every version deserves a listen.',
    '点击播放器或列表中的爱心，把喜欢的版本收藏起来。':
      'Tap a heart in the player or library to save a favorite.',
    '原创示例已经准备好。播放、比较，或者带走它。':
      'Your original examples are ready. Play, compare, or take them with you.',
    搜索作品: 'Search music',
    '搜索作品、风格…': 'Search music or styles…',
    '个版本 · 保存在此浏览器': 'versions · Saved in this browser',
    '还没有收藏。去试听一首喜欢的音乐吧。': 'No favorites yet. Find a sound you love.',
    '音频为本站原创程序编配示例；封面使用 AI 生成图像。':
      'Audio is originally composed and rendered for this demo. Cover artwork is AI-generated.',
    '编曲，听你的。': 'Your arrangement. Your way.',
    '先点播放，再试试关闭一个声部。你会听见不同。':
      'Press play, then mute a part. Hear what changes.',
    '导入 MIDI': 'Import MIDI',
    '导出 MIDI': 'Export MIDI',
    '编曲速度 BPM': 'Arrangement tempo in BPM',
    钢琴与主旋律音量: 'Piano and melody volume',
    弦乐音量: 'Strings volume',
    大提琴音量: 'Cello volume',
    竖琴音量: 'Harp volume',
    速度: 'Tempo',
    移调半音: 'Transpose in semitones',
    移调: 'Transpose',
    半音: 'semitones',
    原调: 'Original key',
    重置: 'Reset',
    '声部 / 钢琴卷帘': 'Parts / Piano roll',
    钢琴与主旋律: 'Piano & melody',
    弦乐: 'Strings',
    大提琴: 'Cello',
    竖琴: 'Harp',
    前八小节音符: ' notes, first eight bars',
    静音: 'Mute ',
    独奏: 'Solo ',
    播放编曲: 'Play arrangement',
    暂停编曲: 'Pause arrangement',
    'M 静音 · S 独奏 · 滑杆调整音量': 'M: Mute · S: Solo · Sliders: Volume',
    试着改一点: 'Try a little change',
    '这些调整会直接作用于当前编曲。': 'These controls change the current arrangement.',
    让钢琴更突出: 'Bring out the piano',
    整体柔和一点: 'Make it softer',
    放慢速度: 'Slow it down',
    一个小提示: 'A little tip',
    '想知道某件乐器的作用？点它旁边的 S，就能单独听见它。':
      'Curious about a part? Press its S button to hear it on its own.',
    '浏览器合成器实时播放，音色与首页的音源渲染示例不同。导入 MIDI 后保留旋律，并按估计调性配置模板伴奏；可导出当前音符、速度与移调。':
      'The live browser synthesizer sounds different from the rendered examples. MIDI import preserves notes and adds a template accompaniment in an estimated key. Export includes notes, tempo and transposition.',
    '上传文件 · 仅本地试听': 'Uploaded file · Local playback',
    本地上传音频: 'Local audio upload',
    原创编配示例: 'Original arrangement example',
    '让这里，更像你的空间': 'Make yourself at home.',
    '当前版本无需账号，收藏保存在此浏览器。':
      'No account needed. Your preferences and favorites stay in this browser.',
    '模型接入 · 后续配置': 'Model connection · Coming later',
    '初版不发送生成请求，也不收集 API 密钥。音乐样例已准备好，可以直接试听。':
      'This prototype does not send generation requests or collect API keys. The prepared examples are ready to play.',
    '同一旋律，切换着听': 'One melody. Compare the versions.',
    '切换版本会尽量保留播放位置，方便比较编曲差异。':
      'Switching versions keeps your listening position where possible.',
    从喜欢的声音开始: 'Start with a sound you love',
    'CoArrange 是一个面向音乐初学者的创作工作台。先试听，再选择一种方式开始。':
      'CoArrange is a music workspace for beginners. Have a listen, then choose a way to start.',
    '用日常语言描述想法，查看编曲计划和对应的固定试听样例。':
      'Describe an idea in everyday language, then explore a plan and prepared example.',
    '比较流行与古典编配；上传文件可本地试听，尚不支持实时改编。':
      'Compare pop and classical arrangements. Uploads can be played locally; live restyling is not connected yet.',
    '真实调整声部音量、速度与移调，导入旋律 MIDI，再导出你的编曲。':
      'Adjust parts, tempo and transposition. Import a melody MIDI and export your arrangement.',
    '音乐为原创程序编配示例，封面为 AI 生成图像。本站未接入音乐生成或 LLM API。':
      'Music is originally composed and rendered for this demo; artwork is AI-generated. No music-generation or LLM API is connected.',
    关闭: 'Close',
    继续听音乐: 'Keep listening',
    '知道了，开始探索': 'Got it. Let’s explore.',
    '编曲数据暂时无法读取，请刷新重试。':
      'Arrangement data could not be loaded. Please refresh and try again.',
    '音频暂时无法播放，请稍后重试。': 'Audio could not be played. Please try again.',
    已加入收藏: 'Added to favorites',
    已取消收藏: 'Removed from favorites',
    '已导出当前编曲 MIDI': 'Arrangement exported as MIDI',
    文件不完整: 'The file is incomplete',
    'MIDI 格式错误': 'Invalid MIDI format',
    '请选择标准 MIDI 文件': 'Please choose a standard MIDI file',
    '暂支持 PPQ 格式的 Type 0/1 MIDI': 'Type 0/1 MIDI with PPQ timing is supported',
    'MIDI 轨道格式错误': 'Invalid MIDI track format',
    没有找到可播放的旋律音符: 'No playable melody notes found',
    '请选择小于 2 MB 的旋律 MIDI': 'Please choose a melody MIDI under 2 MB',
    模板伴奏: 'Template accompaniment',
    '已导入音符，并配置模板伴奏。建议使用单旋律 MIDI。':
      'Notes imported and template accompaniment added. A single-melody MIDI works best.',
    '无法读取：': 'Could not read file: ',
    '请选择小于 30 MB 的音频文件': 'Please choose an audio file under 30 MB',
    '请选择 MP3、WAV 或 M4A 音频': 'Please choose MP3, WAV or M4A audio',
    '已在本地载入音频；本版可试听，尚不执行实时改编。':
      'Audio loaded locally. Playback is available; live restyling is not connected yet.',
    '先写一句你想听见的音乐吧。': 'Describe the music you would like to hear first.',
    '正在试听已渲染的轻柔版：弦乐更轻，钢琴更突出。':
      'Playing the prepared gentle version, with softer strings and more piano.',
    '编曲播放暂时不可用，请重试。': 'Arrangement playback is unavailable. Please try again.',
    '已突出钢琴，降低其他声部音量。': 'Piano brought forward; the other parts are softer.',
    '已降低各声部音量。': 'All parts are now softer.',
    速度已调整为: 'Tempo set to',
    '这个音频无法播放，请尝试其他格式或内置样例。':
      'This audio could not be played. Try another format or a built-in example.',
    外观主题: 'Appearance',
    '为创作空间，选一种心情。': 'Choose a mood for your workspace.',
    柔雾: 'Soft mist',
    '紫灰与粉灰，柔和的默认配色': 'Dusty lavender and rose. Soft by default.',
    黑白: 'Monochrome',
    '纯粹中性色，把注意力留给声音': 'Quiet neutrals. Let the sound take focus.',
    夏日: 'Summer',
    '鼠尾草绿与浅杏色，清新明亮': 'Sage green and soft peach. Light and fresh.',
    深夜: 'After hours',
    '深色面板与柔紫点缀，适合夜间使用': 'Dark surfaces and muted lilac accents.',
    界面语言: 'Interface language',
    简体中文: '简体中文',
    主题选择: 'Theme selection',
    已选: 'Selected',
    侧栏布局: 'Sidebar layout',
    紧凑侧栏: 'Compact sidebar',
    '收起文字，只保留图标。随时可以展开。': 'Keep just the icons. Expand whenever you like.',
    收起侧栏: 'Collapse sidebar',
    展开侧栏: 'Expand sidebar',
    展开导航: 'Open navigation',
    收起导航: 'Close navigation',
    '主题、语言和侧栏设置会自动保存在此浏览器。':
      'Theme, language and sidebar preferences are saved automatically in this browser.',
    播放设置: 'Playback',
    '已切换主题：': 'Theme changed: ',
    已保存你的偏好: 'Your preferences are saved',
    切换到英文: 'Switch to English',
    切换到中文: 'Switch to Chinese',
    取消收藏: 'Unfavorite ',
    收藏: 'Favorite ',
    切换到: 'Switch to ',
    试听: 'Play ',
    播放: 'Play',
    暂停: 'Pause',
    封面: ' artwork',
    流行: 'Pop',
    古典: 'Classical',
    室内乐: 'Chamber',
    轻柔版: 'Gentle version',
    修订: 'Revision',
    夏日主题: 'Summer theme',
    哼唱成曲: 'Hum to music',
    '哼一段旋律。': 'Hum a melody.',
    '用麦克风哼 5 到 15 秒。确认识别出的旋律后，选一种风格，生成可以播放的伴奏。':
      'Hum for 5 to 15 seconds. Preview the recognized melody, choose a style, and make an accompaniment.',
    '1 哼唱': '1 Hum',
    '2 识别': '2 Recognize',
    '3 试听': '3 Preview',
    '4 选风格': '4 Choose a style',
    '5 生成': '5 Arrange',
    你的哼唱: 'Your humming',
    准备哼唱: 'Ready to hum',
    '最长 15 秒': 'Up to 15 seconds',
    正在录音: 'Recording',
    录音电平: 'Recording level',
    再录一次: 'Record again',
    开始哼唱: 'Start humming',
    停止: 'Stop',
    听我的录音: 'Play my recording',
    或上传一段短音频: 'Or upload a short recording',
    'WAV、MP3、M4A · 15 秒以内 · 在浏览器里识别':
      'WAV, MP3, M4A · Up to 15 seconds · Recognized in the browser',
    '音频只在这台浏览器里处理，不会上传。适合单声部哼唱，歌曲和嘈杂背景不会准确。':
      'Audio stays in this browser and is not uploaded. This is for one hummed line, not a song or a noisy recording.',
    '音高识别使用 Spotify Basic Pitch 1.0.1（Apache-2.0，Copyright 2022 Spotify AB）。':
      'Pitch recognition uses Spotify Basic Pitch 1.0.1 (Apache-2.0, Copyright 2022 Spotify AB).',
    浏览器音高模型已就绪: 'The browser pitch model is ready',
    '音高模型没有加载。请先运行 npm run pitch-model，再用 npm start 打开页面。':
      'The pitch model did not load. Run npm run pitch-model, then open the page with npm start.',
    '正在加载浏览器音高模型…': 'Loading the browser pitch model…',
    识别出的旋律: 'Recognized melody',
    '哼完以后，旋律会显示在这里。': 'The melody appears here after recognition.',
    '识别完成后可以单独试听，不会马上改动编曲工作台。':
      'You can preview the melody before it changes the arrangement workbench.',
    '已识别 ': 'Recognized ',
    ' 个音。可以先试听，再决定要不要重录。': ' notes. Preview them before recording again.',
    '正在识别音高…': 'Recognizing pitch…',
    识别旋律: 'Recognize melody',
    试听旋律: 'Preview melody',
    换一段再试: 'Try another take',
    选择伴奏风格: 'Choose an accompaniment style',
    生成编曲: 'Make the arrangement',
    '已截取前 15 秒。': 'Only the first 15 seconds were used.',
    '录音太短了，请至少哼 1 秒。': 'That recording is too short. Hum for at least one second.',
    '这段录音几乎没有声音。请靠近麦克风再试。':
      'This recording is almost silent. Move closer to the microphone and try again.',
    这段录音还不能识别: 'This recording cannot be recognized yet',
    '录音完成，可以听一遍，也可以直接识别。':
      'Recording complete. Listen back, or recognize it now.',
    '麦克风权限被拒绝。请在浏览器设置里允许后重试。':
      'Microphone permission was denied. Allow it in the browser settings and try again.',
    '没有找到可用的麦克风。': 'No microphone was found.',
    '麦克风正被其他程序占用。': 'The microphone is being used by another program.',
    '这个浏览器没有麦克风接口。': 'This browser does not provide a microphone.',
    '浏览器不允许在直接打开的文件里使用麦克风。请通过本地服务器访问。':
      'The browser blocks the microphone when a file is opened directly. Open the page through the local server.',
    '无法使用麦克风。': 'The microphone could not be used.',
    需要通过本地服务器打开: 'Open this page through the local server',
    当前浏览器不能录音: 'This browser cannot record',
    没有开始录音: 'Recording did not start',
    '正在聆听…哼得慢一点，一个音一个音。': 'Listening… hum slowly, one note at a time.',
    '录音是空的，或这个浏览器无法解码刚录下的音频。请再试一次。':
      'The recording was empty, or this browser could not decode it. Please try again.',
    录音没有保存下来: 'The recording was not saved',
    '文件请小于 8 MB。': 'Please use a file smaller than 8 MB.',
    这个文件太大了: 'This file is too large',
    '这个音频无法解码。请换 WAV、MP3 或 M4A。':
      'This audio could not be decoded. Use WAV, MP3, or M4A.',
    没有读到音频: 'No audio was read',
    '这段录音暂时无法播放。': 'This recording cannot be played right now.',
    '没有可用的录音。': 'There is no recording to recognize.',
    转录失败: 'Transcription failed',
    识别没有完成: 'Recognition did not finish',
    识别没有成功: 'Recognition did not succeed',
    '请先识别出旋律，再生成编曲。': 'Recognize a melody before making an arrangement.',
    '可以重录，或再识别一次。': 'Record again, or recognize this take once more.',
    '已从这段录音中识别出旋律。请先试听，再生成伴奏。':
      'A melody was recognized from this recording. Preview it, then make an accompaniment.',
    '没有识别出稳定的音高。请哼得稍慢一些，并尽量减少背景噪声。':
      'No stable pitch was found. Hum a little slower and reduce background noise.',
    '没有检测到足够的声音。请靠近麦克风，哼一段清晰的旋律后再试。':
      'Not enough sound was detected. Move closer and hum a clear melody.',
    录音是空的: 'The recording is empty',
    '已从录音中识别出旋律。': 'A melody was recognized from the recording.',
  };
  let language = 'zh';
  try {
    const p = JSON.parse(localStorage.getItem('coarrange-preferences') || '{}');
    if (p.language === 'en') language = 'en';
  } catch {}
  const replacements = Object.entries(dictionary).sort((a, b) => b[0].length - a[0].length);
  const originalText = new WeakMap(),
    originalAttrs = new WeakMap();
  function text(value) {
    if (language !== 'en') return String(value);
    const str = String(value),
      key = str.trim();
    if (Object.hasOwn(dictionary, key)) return str.replace(key, dictionary[key]);
    // Replace once against the original string; do not re-translate inserted English.
    let out = '',
      pos = 0;
    while (pos < str.length) {
      let found = false;
      for (const [zh, en] of replacements) {
        if (str.startsWith(zh, pos)) {
          out += en;
          pos += zh.length;
          found = true;
          break;
        }
      }
      if (!found) out += str[pos++];
    }
    return out;
  }
  function apply(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (
        !n.nodeValue.trim() ||
        n.parentElement?.closest('script,style,textarea,[data-i18n-ignore]')
      )
        continue;
      let entry = originalText.get(n);
      if (!entry || n.nodeValue !== entry.last) entry = { source: n.nodeValue, last: n.nodeValue };
      const translated = text(entry.source);
      if (n.nodeValue !== translated) n.nodeValue = translated;
      entry.last = translated;
      originalText.set(n, entry);
    }
    for (const el of root.querySelectorAll('[aria-label],[placeholder],[alt],[title]')) {
      if (el.closest('[data-i18n-ignore]')) continue;
      let entries = originalAttrs.get(el) || {};
      for (const attr of ['aria-label', 'placeholder', 'alt', 'title']) {
        if (!el.hasAttribute(attr)) continue;
        const current = el.getAttribute(attr);
        let e = entries[attr];
        if (!e || current !== e.last) e = { source: current, last: current };
        const translated = text(e.source);
        if (current !== translated) el.setAttribute(attr, translated);
        e.last = translated;
        entries[attr] = e;
      }
      originalAttrs.set(el, entries);
    }
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    document.title =
      language === 'en' ? 'CoArrange · Give your ideas a voice' : 'CoArrange · 让灵感有回声';
  }
  return {
    text,
    apply,
    get language() {
      return language;
    },
    setLanguage(next) {
      language = next === 'en' ? 'en' : 'zh';
      apply();
    },
  };
})();
