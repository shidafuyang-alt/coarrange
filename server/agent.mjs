import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { ApiError, auth, remoteJSON } from './http.mjs';
import { runFal } from './fal.mjs';

export function text(value, name, limit = 2000, empty = false) {
  if (typeof value !== 'string' || value.length > limit || (!empty && !value.trim()))
    throw new ApiError(400, `${name} 格式不正确`);
  return value.trim();
}
function strings(value, name, limit = 12) {
  if (!Array.isArray(value) || value.length > limit) throw new ApiError(400, `${name} 格式不正确`);
  return value.map((x) => text(x, name, 500));
}
export function controls(value) {
  const v = value || {};
  const duration = v.duration ?? 20,
    seed = v.seed ?? 42,
    instrumental = v.instrumental ?? true;
  if (
    !Number.isInteger(duration) ||
    duration < 10 ||
    duration > 60 ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 2147483647 ||
    typeof instrumental !== 'boolean'
  )
    throw new ApiError(400, '时长应为 10–60 秒，seed 应为非负整数，instrumental 应为布尔值');
  return { duration, seed, instrumental };
}
export function validateBrief(value, mode, selected, previous) {
  if (!value || typeof value !== 'object') throw new ApiError(422, 'Agent 计划不是 JSON 对象');
  const task = mode === 'voice' ? 'voice_cover' : mode === 'restyle' ? 'cover' : 'text2music';
  if (
    !['ready', 'needs_clarification', 'unsupported'].includes(value.status) ||
    value.task !== task
  )
    throw new ApiError(422, 'Agent 返回了无效任务类型');
  const p = value.preserve;
  if (!p || ['melody', 'lyrics', 'backing'].some((k) => typeof p[k] !== 'boolean'))
    throw new ApiError(422, 'Agent 保留约束无效');
  const bpm = value.bpm;
  if (bpm !== null && (!Number.isInteger(bpm) || bpm < 40 || bpm > 200))
    throw new ApiError(422, 'Agent BPM 超出范围');
  if (
    typeof value.cover_strength !== 'number' ||
    !Number.isFinite(value.cover_strength) ||
    value.cover_strength < 0 ||
    value.cover_strength > 1
  )
    throw new ApiError(422, 'Agent 源音频约束强度无效');
  const questions = strings(value.questions, 'questions'),
    unsupported = strings(value.unsupported, 'unsupported');
  const preserve = Object.fromEntries(
    ['melody', 'lyrics', 'backing'].map((k) => [k, p[k] || Boolean(previous?.preserve[k])]),
  );
  if (task !== 'voice_cover' && preserve.backing && !unsupported.length)
    unsupported.push('当前生成工具无法保证原伴奏完全不变');
  const warnings = strings(value.warnings, 'warnings');
  if (task === 'cover')
    warnings.push('音乐模型会重新生成音频；旋律和歌词保留需要试听验证，不能保证逐音符一致。');
  if (task === 'voice_cover')
    warnings.push('人声分离可能残留原唱；个人音色相似度、歌词与音高保持需要试听验证。');
  return {
    status: unsupported.length
      ? 'unsupported'
      : questions.length
        ? 'needs_clarification'
        : value.status,
    summary: text(value.summary, 'summary', 1000),
    task,
    caption: text(value.caption, 'caption'),
    lyrics: selected.instrumental ? '[Instrumental]' : text(value.lyrics, 'lyrics', 6000, true),
    ...selected,
    bpm,
    key_scale: text(value.key_scale, 'key_scale', 80, true),
    instruments: strings(value.instruments, 'instruments'),
    cover_strength: value.cover_strength,
    preserve,
    questions,
    unsupported,
    warnings: [...new Set(warnings)],
  };
}
export class Agent {
  constructor(config) {
    this.config = config;
  }
  async complete(system, messages) {
    const { llm } = this.config;
    if (!llm.base || !llm.model)
      throw new ApiError(503, '项目的智能规划服务尚未开通，请联系项目管理员。');
    const body = {
      model: llm.model,
      temperature: 0.2,
      max_tokens: 2500,
      messages: [{ role: 'system', content: system }, ...messages],
    };
    if (llm.json) body.response_format = { type: 'json_object' };
    let content;
    if (llm.provider === 'fal') {
      const { result } = await runFal(this.config, 'openrouter/router', {
        system_prompt:
          system + '\nReturn only a valid JSON object. Do not include markdown fences.',
        prompt: JSON.stringify(messages),
        model: llm.model,
        temperature: 0.2,
        max_tokens: 2500,
      });
      content = result.output;
    } else if (llm.provider === 'openai') {
      // OpenAI uses Responses; DeepSeek uses Chat Completions. Their request fields differ.
      const result = await remoteJSON(`${llm.base}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth(llm.key) },
        body: JSON.stringify({
          model: llm.model,
          instructions: system,
          input: [
            {
              role: 'developer',
              content:
                'Return exactly one valid JSON object matching the schema in the instructions.',
            },
            ...messages,
          ],
          max_output_tokens: 4000,
          reasoning: { effort: 'none' },
          text: { format: { type: 'json_object' } },
          store: false,
        }),
      });
      if (result.status !== 'completed')
        throw new ApiError(502, 'OpenAI 创作助手未完成本次请求，请重试或调整要求。');
      const entries = (result.output || []).flatMap((item) =>
        item.type === 'message' ? item.content || [] : [],
      );
      if (entries.some((entry) => entry.type === 'refusal'))
        throw new ApiError(422, 'OpenAI 创作助手未接受本次请求，请调整描述。');
      content = entries
        .filter((entry) => entry.type === 'output_text')
        .map((entry) => entry.text)
        .join('');
    } else {
      if (llm.provider === 'deepseek') body.thinking = { type: 'disabled' };
      const result = await remoteJSON(`${llm.base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth(llm.key) },
        body: JSON.stringify(body),
      });
      if (result.choices?.[0]?.finish_reason && result.choices[0].finish_reason !== 'stop')
        throw new ApiError(502, '创作要求处理未完成，请缩短描述后重试。');
      content = result.choices?.[0]?.message?.content;
    }
    if (typeof content !== 'string' || !content.trim() || content.length > 20000)
      throw new ApiError(502, 'LLM 返回内容无效');
    let value;
    try {
      value = JSON.parse(content);
    } catch {
      throw new ApiError(502, 'LLM 未返回有效 JSON，请重试或检查模型是否支持 JSON 输出');
    }
    return value;
  }
  async plan(input, previous) {
    const prompt = await readFile(join(this.config.root, 'prompts/planner.md'), 'utf8');
    const examples = JSON.parse(
      await readFile(join(this.config.root, 'prompts/examples.json'), 'utf8'),
    );
    const messages = examples.flatMap((x) => [
      { role: 'user', content: JSON.stringify(x.input) },
      { role: 'assistant', content: JSON.stringify(x.output) },
    ]);
    messages.push({
      role: 'user',
      content: JSON.stringify({
        mode: input.mode,
        instruction: input.instruction,
        controls: input.controls,
        previous_brief: previous?.brief || null,
        source_available: Boolean(input.assetId),
        reference_available: Boolean(input.referenceId),
        response_language: input.language,
        target_style: input.style,
        execution_engine: input.engine
          ? {
              id: input.engine.id,
              name: input.engine.name,
              supports_vocals: input.engine.vocals,
              supported_modes: input.engine.modes,
              caption_character_limit: input.engine.captionLimit || 2000,
              lyrics_character_limit: input.engine.lyricsLimit || 6000,
              execution_note: input.engine.executionNote || '',
            }
          : null,
      }),
    });
    const brief = validateBrief(
      await this.complete(prompt, messages),
      input.mode,
      input.controls,
      previous?.brief,
    );
    if (input.mode === 'voice') {
      brief.instrumental = false;
      brief.preserve = { melody: true, lyrics: true, backing: true };
      brief.clip_start = input.clipStart;
      brief.vocal_gain_db = input.vocalGain;
    }
    if (
      input.engine?.provider === 'mureka' &&
      (brief.caption.length > 1024 || (!brief.instrumental && brief.lyrics.length > 5000))
    )
      throw new ApiError(422, '创作描述超出 Mureka 限制，请简化要求后重新生成。');
    return {
      brief,
      promptVersion: createHash('sha256')
        .update(prompt + JSON.stringify(examples))
        .digest('hex')
        .slice(0, 12),
    };
  }
  async review(plan, job, feedback) {
    const prompt = await readFile(join(this.config.root, 'prompts/critic.md'), 'utf8');
    const value = await this.complete(prompt, [
      {
        role: 'user',
        content: JSON.stringify({
          brief: plan.brief,
          execution: {
            status: job.status,
            bytes: job.bytes,
            provider: job.model || 'music-model',
            audio_analysis_performed: false,
          },
          human_feedback: feedback,
          response_language: plan.language || 'zh',
        }),
      },
    ]);
    return {
      summary: text(value.summary, 'summary', 2000),
      verified: strings(value.verified, 'verified'),
      listener_reports: strings(value.listener_reports, 'listener_reports'),
      unverified: strings(value.unverified, 'unverified'),
      suggested_revision: text(value.suggested_revision, 'suggested_revision', 2000, true),
      evidenceBoundary: '文本 LLM 未收到音频；该反馈依据执行记录和你的试听描述，不是自动听测结果。',
    };
  }
}
