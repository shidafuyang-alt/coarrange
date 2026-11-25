import { ApiError } from './http.mjs';
import { runFal, downloadFal } from './fal.mjs';
import { generate, audioExtension } from './acestep.mjs';
import { clipAudio } from './media.mjs';
import { generateMureka } from './mureka.mjs';

const definitions = [
  {
    id: 'mureka-cloud',
    name: 'Mureka 9.5 · 昆仑万维',
    modes: ['create', 'restyle'],
    vocals: true,
    provider: 'mureka',
    description: '国产音乐模型：歌曲与纯音乐创作、上传音乐后改编风格。',
    source: 'https://platform.mureka.ai/docs/api/operations/post-v1-song-remix.html',
    captionLimit: 1024,
    lyricsLimit: 5000,
    executionNote:
      '创作按完整歌曲计费，完成后截取试听片段；改编使用上传片段。随机种子不适用于此模型。',
    cancellationNote: '取消会停止本地等待；服务方未公开取消接口，已提交的任务可能继续生成并计费。',
  },
  {
    id: 'ace-cloud',
    name: 'ACE-Step · Cloud',
    modes: ['create', 'restyle'],
    vocals: true,
    provider: 'fal',
    description: '创作歌曲与纯音乐，也可以重新编配上传的音乐。',
    source: 'https://fal.ai/models/fal-ai/ace-step/audio-to-audio/api',
  },
  {
    id: 'stable-cloud',
    name: 'Stable Audio 2.5',
    modes: ['create'],
    vocals: false,
    provider: 'fal',
    description: '适合纯音乐、氛围与配乐创作，不支持指定歌词演唱。',
    source: 'https://fal.ai/models/fal-ai/stable-audio-25/text-to-audio/api',
  },
  {
    id: 'ace-local',
    name: 'ACE-Step 1.5 · Studio',
    modes: ['create', 'restyle'],
    vocals: true,
    provider: 'acestep',
    description: '项目专属音乐模型，由团队统一部署与维护。',
    source: 'https://github.com/ace-step/ACE-Step-1.5',
  },
  {
    id: 'seed-studio',
    name: 'Seed-VC · Singing Voice',
    modes: ['voice'],
    vocals: true,
    provider: 'seed-vc',
    description: '先分离人声，再用参考录音转换音色并保留伴奏。',
    source: 'https://github.com/Plachtaa/seed-vc',
  },
];
export { plannerReady } from './planners.mjs';
export function engineCatalog(config) {
  return definitions
    .filter((engine) => !config.domesticOnly || engine.provider !== 'fal')
    .map((engine) => {
      const configured =
        engine.provider === 'mureka'
          ? Boolean(config.mureka?.key)
          : engine.provider === 'fal'
            ? Boolean(config.fal?.key)
            : Boolean(config[engine.provider === 'acestep' ? 'music' : 'voice'].base);
      return {
        ...engine,
        configured,
        role: engine.modes.includes('voice') ? 'singing-conversion' : 'music-generation',
        status: configured ? 'configured' : 'awaiting-admin',
        restyleReady:
          configured &&
          (!['fal', 'mureka'].includes(engine.provider) || Boolean(config.mediaReady)),
        ready: configured && (engine.provider !== 'mureka' || Boolean(config.mediaReady)),
        availabilityNote: '已配置不代表服务已通过实时推理验证',
      };
    });
}
export function selectEngine(config, id, mode, instrumental = true, requireReady = true) {
  let rows = engineCatalog(config).filter(
    (x) => x.modes.includes(mode) && (instrumental || x.vocals),
  );
  if (id && id !== 'auto') rows = rows.filter((x) => x.id === id);
  else
    rows.sort(
      (a, b) =>
        Number(b.ready && (mode !== 'restyle' || b.restyleReady)) -
        Number(a.ready && (mode !== 'restyle' || a.restyleReady)),
    );
  const selected = rows[0];
  if (!selected) throw new ApiError(400, '所选引擎不支持当前任务或人声要求，请选择自动选择。');
  if (requireReady && (!selected.ready || (mode === 'restyle' && !selected.restyleReady)))
    throw new ApiError(
      503,
      mode === 'restyle' && selected.configured && !selected.restyleReady
        ? '项目的音频处理服务尚未就绪，请联系管理员；用户无需自行连接模型。'
        : '项目管理员尚未开通当前任务所需的模型服务，用户无需自行填写地址或密钥。',
    );
  return selected;
}
export async function generateMusic(config, engineId, brief, source, signal, event) {
  const mode = brief.task === 'cover' ? 'restyle' : 'create';
  const engine = selectEngine(config, engineId || 'auto', mode, brief.instrumental);
  if (engine.provider === 'mureka') return generateMureka(config, brief, source, signal, event);
  if (engine.provider === 'acestep') return generate(config, brief, source, signal, event);
  let endpoint, input;
  if (engine.id === 'stable-cloud') {
    endpoint = 'fal-ai/stable-audio-25/text-to-audio';
    input = {
      prompt: brief.caption,
      seconds_total: brief.duration,
      seed: brief.seed,
      num_inference_steps: 8,
    };
  } else {
    endpoint = source ? 'fal-ai/ace-step/audio-to-audio' : 'fal-ai/ace-step';
    input = {
      tags: brief.caption,
      lyrics: brief.instrumental ? '[inst]' : brief.lyrics,
      seed: brief.seed,
      number_of_steps: 27,
    };
    if (source) {
      event('preparing', '正在准备音乐片段');
      const clip = await clipAudio(config, source, brief.duration, signal);
      Object.assign(input, {
        audio_url: 'data:audio/wav;base64,' + clip.toString('base64'),
        edit_mode: 'remix',
        original_tags: 'music',
      });
    } else input.duration = brief.duration;
  }
  const { result, id } = await runFal(config, endpoint, input, signal, event);
  const audioURL = typeof result.audio === 'string' ? result.audio : result.audio?.url;
  if (!audioURL) throw new ApiError(502, '云端模型未返回音频文件。');
  event('downloading', '正在取回云端音乐结果');
  const data = await downloadFal(config, audioURL, signal);
  return {
    data,
    extension: audioExtension(data),
    model: engine.name,
    providerTaskId: id,
    seed: result.seed ?? brief.seed,
  };
}
