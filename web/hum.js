/* Hum-to-Music. Recording stays in the browser. Transcription goes only to the local server. */
(function (root) {
  'use strict';
  const MAX_SECONDS = 15;
  const state = {
    phase: 'idle',
    error: '',
    warning: '',
    status: '准备哼唱',
    seconds: 0,
    blobUrl: '',
    buffer: null,
    levelHistory: [],
    notes: [],
    midiBytes: null,
    style: 'jazz',
    recording: false,
    service: 'checking',
    takenName: '哼唱旋律',
  };
  let stream = null;
  let recorder = null;
  let chunks = [];
  let audioCtx = null;
  let analyser = null;
  let timer = 0;
  let previewNodes = [];
  let previewCtx = null;
  let stopFallback = null;
  let take = 0;
  let serviceChecked = false;

  function tr(value) {
    try {
      return root.CoLocale ? root.CoLocale.text(value) : String(value);
    } catch {
      return String(value);
    }
  }
  function esc(value) {
    return String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character],
    );
  }
  function clock(seconds) {
    const safe = Math.max(0, seconds || 0);
    return `${Math.floor(safe / 60)}:${String(Math.floor(safe % 60)).padStart(2, '0')}`;
  }
  function micErrorMessage(error) {
    const name = error && error.name ? error.name : String(error || '');
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError')
      return '麦克风权限被拒绝。请在浏览器设置里允许后重试。';
    if (name === 'NotFoundError' || name === 'OverconstrainedError')
      return '没有找到可用的麦克风。';
    if (name === 'NotReadableError' || name === 'AbortError') return '麦克风正被其他程序占用。';
    if (name === 'unsupported') return '这个浏览器没有麦克风接口。';
    if (name === 'insecure')
      return '浏览器不允许在直接打开的文件里使用麦克风。请通过本地服务器访问。';
    return '无法使用麦克风。';
  }
  function recordingProblem(duration, level) {
    if (duration < 0.45) return '录音太短了，请至少哼 1 秒。';
    if (level < 0.004) return '这段录音几乎没有声音。请靠近麦克风再试。';
    return '';
  }
  function bufferLevel(buffer) {
    if (!buffer || !buffer.length) return 0;
    const data = buffer.getChannelData(0);
    let sum = 0;
    const step = Math.max(1, Math.floor(data.length / 8000));
    let count = 0;
    for (let i = 0; i < data.length; i += step) {
      sum += data[i] * data[i];
      count++;
    }
    return Math.sqrt(sum / Math.max(1, count));
  }
  function audioBufferToWav(buffer) {
    const rate = buffer.sampleRate;
    const max = Math.min(buffer.length, Math.floor(rate * MAX_SECONDS));
    const mix = new Float32Array(max);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < max; i++) mix[i] += data[i] / buffer.numberOfChannels;
    }
    const wav = new ArrayBuffer(44 + max * 2);
    const view = new DataView(wav);
    const write = (offset, text) => {
      for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
    };
    write(0, 'RIFF');
    view.setUint32(4, 36 + max * 2, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, 'data');
    view.setUint32(40, max * 2, true);
    let offset = 44;
    for (let i = 0; i < max; i++, offset += 2) {
      const sample = Math.max(-1, Math.min(1, mix[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
    return wav;
  }
  function peaksOf(buffer) {
    if (!buffer) return [];
    const data = buffer.getChannelData(0);
    const bars = 72;
    const size = Math.max(1, Math.floor(data.length / bars));
    const peaks = [];
    for (let i = 0; i < bars; i++) {
      let peak = 0;
      for (let j = 0; j < size; j++) peak = Math.max(peak, Math.abs(data[i * size + j] || 0));
      peaks.push(peak);
    }
    return peaks;
  }
  function drawMeter(canvas) {
    if (!canvas) return;
    const width = canvas.clientWidth || 320;
    const height = canvas.clientHeight || 72;
    const ratio = root.devicePixelRatio || 1;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const values = state.phase === 'recording' ? state.levelHistory : peaksOf(state.buffer);
    const count = Math.max(values.length, 1);
    const gap = 3;
    const bar = Math.max(2, (width - gap * count) / count);
    values.forEach((value, index) => {
      const h = Math.max(3, Math.min(1, value) * (height - 8));
      ctx.fillStyle = state.phase === 'recording' ? '#8d6cab' : '#6f5588';
      ctx.fillRect(index * (bar + gap), (height - h) / 2, bar, h);
    });
  }
  function stepIndex() {
    if (state.phase === 'ready') return 3;
    if (state.phase === 'transcribing') return 1;
    if (state.phase === 'recorded' || (state.phase === 'error' && state.buffer)) return 1;
    return 0;
  }
  function view() {
    const styles = (root.MusicCatalog && MusicCatalog.styles) || [];
    const steps = ['1 哼唱', '2 识别', '3 试听', '4 选风格', '5 生成'];
    const current = stepIndex();
    const service =
      state.service === 'ok'
        ? '浏览器音高模型已就绪'
        : state.service === 'down'
          ? '音高模型没有加载。请先运行 npm run pitch-model，再用 npm start 打开页面。'
          : '正在加载浏览器音高模型…';
    const noteEnd = state.notes.reduce((end, note) => Math.max(end, note.start + note.duration), 1);
    const low = state.notes.length ? Math.min(...state.notes.map((note) => note.pitch)) : 60;
    const high = state.notes.length ? Math.max(...state.notes.map((note) => note.pitch)) : 72;
    return `<div class="view-title"><p class="eyebrow">HUM IT. HEAR IT BACK.</p><h1>哼一段旋律。</h1><p>用麦克风哼 5 到 15 秒。确认识别出的旋律后，选一种风格，生成可以播放的伴奏。</p></div>
      <div class="hum-steps">${steps.map((label, index) => `<span class="hum-step ${index === current ? 'active' : ''} ${index < current ? 'done' : ''}">${label}</span>`).join('')}</div>
      <div class="hum-layout">
        <section class="panel">
          <div class="panel-title">${icon('audio-lines')}你的哼唱</div>
          <p class="hum-status" id="hum-status" role="status">${esc(state.status)}</p>
          <div class="hum-live"><strong id="hum-clock">${clock(state.seconds)} / ${clock(MAX_SECONDS)}</strong><span>${state.phase === 'recording' ? '正在录音' : '最长 15 秒'}</span></div>
          <canvas class="hum-meter" id="hum-meter" aria-label="录音电平"></canvas>
          ${state.error ? `<p class="hum-error" role="alert">${esc(state.error)}</p>` : ''}
          ${state.warning ? `<p class="helper">${esc(state.warning)}</p>` : ''}
          <div class="hum-actions">
            <button class="btn btn-primary" data-hum="start" ${state.phase === 'recording' || state.phase === 'transcribing' ? 'disabled' : ''}>${icon('audio-lines')}${state.buffer ? '再录一次' : '开始哼唱'}</button>
            <button class="btn btn-outline" data-hum="stop" ${state.phase === 'recording' ? '' : 'disabled'}>停止</button>
            <button class="btn btn-outline" data-hum="listen" ${state.blobUrl ? '' : 'disabled'}>${icon('play')}听我的录音</button>
          </div>
          <audio id="hum-audio" class="hum-audio" controls ${state.blobUrl ? '' : 'hidden'}></audio>
          <label class="hum-drop" for="hum-file">${icon('upload')}<strong>或上传一段短音频</strong><p>WAV、MP3、M4A · 15 秒以内 · 在浏览器里识别</p><input class="file-input" id="hum-file" type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm"></label>
          <p class="helper">${icon('info')}音频只在这台浏览器里处理，不会上传。适合单声部哼唱，歌曲和嘈杂背景不会准确。</p>
          <p class="helper">音高识别使用 Spotify Basic Pitch 1.0.1（Apache-2.0，Copyright 2022 Spotify AB）。</p>
          <p class="helper" id="hum-service">${service}</p>
        </section>
        <section class="panel">
          <div class="panel-title">${icon('music-2')}识别出的旋律</div>
          <div class="hum-roll" id="hum-roll" aria-label="识别音符">${
            state.notes
              .map((note) => {
                const left = (note.start / noteEnd) * 100;
                const width = Math.max(0.6, (note.duration / noteEnd) * 100);
                const top = 12 + ((high - note.pitch) / Math.max(1, high - low)) * 70;
                return `<span class="note" style="left:${left}%;width:${width}%;top:${top}%" title="MIDI ${note.pitch}"></span>`;
              })
              .join('') || '<p class="hum-empty">哼完以后，旋律会显示在这里。</p>'
          }</div>
          <p class="helper">${state.notes.length ? `已识别 <span data-i18n-ignore>${state.notes.length}</span> 个音。可以先试听，再决定要不要重录。` : '识别完成后可以单独试听，不会马上改动编曲工作台。'}</p>
          <div class="hum-actions">
            <button class="btn btn-primary" data-hum="transcribe" ${state.buffer && state.phase !== 'recording' && state.phase !== 'transcribing' ? '' : 'disabled'}>${icon('sparkles')}${state.phase === 'transcribing' ? '正在识别音高…' : '识别旋律'}</button>
            <button class="btn btn-outline" data-hum="preview" ${state.notes.length ? '' : 'disabled'}>${icon('play')}试听旋律</button>
            <button class="btn btn-outline" data-hum="retry" ${state.notes.length || state.error ? '' : 'disabled'}>换一段再试</button>
          </div>
          <span class="field-label">选择伴奏风格</span>
          <div class="hum-styles">${styles.map((style) => `<button class="style-choice ${style.id === state.style ? 'selected' : ''}" data-hum-style="${style.id}" aria-pressed="${style.id === state.style}">${icon(style.icon)}<strong>${style.name}</strong><small>${style.hint}</small></button>`).join('')}</div>
          <button class="btn btn-pink full" data-hum="commit" ${state.notes.length ? '' : 'disabled'}>${icon('sliders-horizontal')}生成编曲</button>
        </section>
      </div>`;
  }
  function refresh() {
    const page = (location.hash || '#home').slice(1);
    if (page === 'hum' && typeof render === 'function') render();
    else sync();
  }
  function sync() {
    const canvas = document.querySelector('#hum-meter');
    if (canvas) drawMeter(canvas);
    const player = document.querySelector('#hum-audio');
    if (player && state.blobUrl && player.src !== state.blobUrl) player.src = state.blobUrl;
    if (state.phase === 'recording') ensureTimer();
    if (!serviceChecked) {
      serviceChecked = true;
      checkService();
    }
  }
  function ensureTimer() {
    if (timer) return;
    const tick = () => {
      if (!state.recording) {
        timer = 0;
        return;
      }
      state.seconds = Math.min(MAX_SECONDS, (performance.now() - state.startedAt) / 1000);
      if (analyser) {
        const data = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const sample = (data[i] - 128) / 128;
          sum += sample * sample;
        }
        state.levelHistory.push(Math.sqrt(sum / data.length) * 2.2);
        if (state.levelHistory.length > 72) state.levelHistory.shift();
      }
      const clockNode = document.querySelector('#hum-clock');
      if (clockNode) clockNode.textContent = `${clock(state.seconds)} / ${clock(MAX_SECONDS)}`;
      drawMeter(document.querySelector('#hum-meter'));
      if (state.seconds >= MAX_SECONDS) stopRecording();
      else timer = requestAnimationFrame(tick);
    };
    timer = requestAnimationFrame(tick);
  }
  function releaseMic() {
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
  function finishFallback(save) {
    const finish = stopFallback;
    stopFallback = null;
    if (finish) finish(save);
  }
  function leave() {
    take += 1;
    state.recording = false;
    if (recorder && recorder.state === 'recording') recorder.stop();
    else finishFallback(false);
    releaseMic();
    stopPreview();
    const player = document.querySelector('#hum-audio');
    if (player) player.pause();
  }
  async function useBuffer(buffer, name) {
    const trimmed = buffer.duration > MAX_SECONDS + 0.05;
    state.buffer = buffer;
    state.seconds = Math.min(MAX_SECONDS, buffer.duration);
    state.notes = [];
    state.midiBytes = null;
    state.error = '';
    state.warning = trimmed ? '已截取前 15 秒。' : '';
    state.takenName = name || '哼唱旋律';
    const problem = recordingProblem(state.seconds, bufferLevel(buffer));
    if (state.blobUrl) URL.revokeObjectURL(state.blobUrl);
    state.blobUrl = URL.createObjectURL(
      new Blob([audioBufferToWav(buffer)], { type: 'audio/wav' }),
    );
    if (problem) {
      state.phase = 'error';
      state.error = problem;
      state.status = '这段录音还不能识别';
    } else {
      state.phase = 'recorded';
      state.status = '录音完成，可以听一遍，也可以直接识别。';
    }
    refresh();
  }
  async function decodeBlob(blob) {
    audioCtx ||= new (root.AudioContext || root.webkitAudioContext)();
    const copy = await blob.arrayBuffer();
    return audioCtx.decodeAudioData(copy);
  }
  async function start() {
    leave();
    const mine = ++take;
    state.error = '';
    state.warning = '';
    state.notes = [];
    state.midiBytes = null;
    if (!root.isSecureContext) {
      state.phase = 'error';
      state.error = micErrorMessage({ name: 'insecure' });
      state.status = '需要通过本地服务器打开';
      refresh();
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      state.phase = 'error';
      state.error = micErrorMessage({ name: 'unsupported' });
      state.status = '当前浏览器不能录音';
      refresh();
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });
    } catch (error) {
      state.phase = 'error';
      state.error = micErrorMessage(error);
      state.status = '没有开始录音';
      refresh();
      return;
    }
    audioCtx ||= new (root.AudioContext || root.webkitAudioContext)();
    await audioCtx.resume();
    const source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    state.levelHistory = [];
    state.startedAt = performance.now();
    state.seconds = 0;
    state.recording = true;
    state.phase = 'recording';
    state.status = '正在聆听…哼得慢一点，一个音一个音。';
    chunks = [];
    if (typeof MediaRecorder !== 'undefined') {
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : '';
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        if (mine !== take) return;
        state.recording = false;
        releaseMic();
        const blob = new Blob(chunks, {
          type: recorder.mimeType || 'audio/webm',
        });
        try {
          if (!blob.size) throw Error('empty');
          await useBuffer(await decodeBlob(blob), '哼唱旋律');
        } catch {
          state.phase = 'error';
          state.error = '录音是空的，或这个浏览器无法解码刚录下的音频。请再试一次。';
          state.status = '录音没有保存下来';
          refresh();
        }
      };
      recorder.start(200);
    } else {
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      const silent = audioCtx.createGain();
      silent.gain.value = 0;
      const samples = [];
      processor.onaudioprocess = (event) => {
        if (state.recording) samples.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(silent);
      silent.connect(audioCtx.destination);
      stopFallback = (save) => {
        processor.disconnect();
        silent.disconnect();
        if (!save || mine !== take) return;
        const length = samples.reduce((sum, chunk) => sum + chunk.length, 0);
        const mix = new Float32Array(length);
        let offset = 0;
        samples.forEach((chunk) => {
          mix.set(chunk, offset);
          offset += chunk.length;
        });
        const recorded = audioCtx.createBuffer(1, Math.max(1, mix.length), audioCtx.sampleRate);
        if (mix.length) recorded.copyToChannel(mix, 0);
        state.recording = false;
        useBuffer(recorded, '哼唱旋律');
      };
    }
    refresh();
  }
  function stopRecording() {
    if (!state.recording) return;
    state.recording = false;
    if (recorder && recorder.state === 'recording') recorder.stop();
    else {
      finishFallback(true);
      releaseMic();
    }
  }
  async function onFile(file) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      state.phase = 'error';
      state.error = '文件请小于 8 MB。';
      state.status = '这个文件太大了';
      refresh();
      return;
    }
    try {
      audioCtx ||= new (root.AudioContext || root.webkitAudioContext)();
      const decoded = await decodeBlob(file);
      await useBuffer(decoded, file.name.replace(/\.[^.]+$/, '') || '上传旋律');
    } catch {
      state.phase = 'error';
      state.error = '这个音频无法解码。请换 WAV、MP3 或 M4A。';
      state.status = '没有读到音频';
      refresh();
    }
  }
  function listen() {
    const player = document.querySelector('#hum-audio');
    if (!player || !state.blobUrl) return;
    pausePageAudio();
    player.play().catch(() => {
      state.error = '这段录音暂时无法播放。';
      refresh();
    });
  }
  function pausePageAudio() {
    try {
      audio.pause();
    } catch {}
    try {
      root.CoStudio && root.CoStudio.stop();
    } catch {}
    stopPreview();
  }
  function stopPreview() {
    previewNodes.forEach((node) => {
      try {
        node.stop();
      } catch {}
    });
    previewNodes = [];
  }
  async function preview() {
    if (!state.notes.length) return;
    pausePageAudio();
    previewCtx ||= new (root.AudioContext || root.webkitAudioContext)();
    await previewCtx.resume();
    const time = previewCtx.currentTime + 0.05;
    try {
      if (root.CoSampler) {
        await root.CoSampler.load(previewCtx, 'piano');
        const gain = previewCtx.createGain();
        gain.gain.value = 0.45;
        gain.connect(previewCtx.destination);
        for (const note of state.notes) {
          const nodes = await root.CoSampler.schedule(
            previewCtx,
            'piano',
            note.pitch,
            time + note.start,
            note.duration,
            Math.max(0.2, note.velocity / 127),
            gain,
          );
          previewNodes.push(...nodes);
        }
        return;
      }
    } catch {}
    const gain = previewCtx.createGain();
    gain.gain.value = 0.2;
    gain.connect(previewCtx.destination);
    state.notes.forEach((note) => {
      const osc = previewCtx.createOscillator();
      osc.frequency.value = 440 * 2 ** ((note.pitch - 69) / 12);
      osc.connect(gain);
      osc.start(time + note.start);
      osc.stop(time + note.start + note.duration);
      previewNodes.push(osc);
    });
  }
  function resampleMono(buffer, targetRate) {
    const max = Math.min(buffer.length, Math.floor(buffer.sampleRate * MAX_SECONDS));
    const mono = new Float32Array(max);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < max; i++) mono[i] += data[i] / buffer.numberOfChannels;
    }
    if (buffer.sampleRate === targetRate) return mono;
    const outLength = Math.max(1, Math.floor((max * targetRate) / buffer.sampleRate));
    const out = new Float32Array(outLength);
    const ratio = buffer.sampleRate / targetRate;
    for (let i = 0; i < outLength; i++) {
      const position = i * ratio;
      const left = Math.floor(position);
      const right = Math.min(max - 1, left + 1);
      const fraction = position - left;
      out[i] = mono[left] * (1 - fraction) + mono[right] * fraction;
    }
    return out;
  }
  async function transcribe() {
    if (!state.buffer) {
      state.error = '没有可用的录音。';
      refresh();
      return;
    }
    const problem = recordingProblem(
      Math.min(state.buffer.duration, MAX_SECONDS),
      bufferLevel(state.buffer),
    );
    if (problem) {
      state.phase = 'error';
      state.error = problem;
      refresh();
      return;
    }
    if (!root.CoPitch) {
      state.phase = 'error';
      state.service = 'down';
      state.error = '音高模型没有加载。请先运行 npm run pitch-model，再用 npm start 打开页面。';
      refresh();
      return;
    }
    state.phase = 'transcribing';
    state.error = '';
    state.status = '正在识别音高…';
    refresh();
    try {
      const payload = await root.CoPitch.transcribeSamples(resampleMono(state.buffer, 22050));
      state.service = 'ok';
      if (
        !payload.ok ||
        !payload.notes ||
        !payload.notes.length ||
        !payload.midi ||
        !payload.midi.length
      ) {
        state.phase = 'recorded';
        state.notes = [];
        state.midiBytes = null;
        state.error = payload.message || '没有识别出稳定的音高。';
        state.status = '识别没有成功';
        refresh();
        return;
      }
      state.notes = payload.notes;
      state.midiBytes =
        payload.midi instanceof Uint8Array ? payload.midi : Uint8Array.from(payload.midi);
      state.phase = 'ready';
      state.status = payload.message || '已从录音中识别出旋律。';
      state.warning = '';
      refresh();
    } catch (error) {
      state.phase = 'recorded';
      state.error = error && error.message ? error.message : '转录失败';
      state.status = '识别没有完成';
      refresh();
    }
  }
  async function commit() {
    if (!state.notes.length || !state.midiBytes) {
      state.error = '请先识别出旋律，再生成编曲。';
      refresh();
      return;
    }
    pausePageAudio();
    const bytes = state.midiBytes;
    const name = (state.takenName || '哼唱旋律').replace(/[\\/]/g, '').slice(0, 60) || '哼唱旋律';
    const file = new File([bytes], name.endsWith('.mid') ? name : name + '.mid', {
      type: 'audio/midi',
    });
    const imported = await root.CoStudio.importMidi(file);
    if (imported === false) return;
    await root.CoStudio.preset(state.style);
    if (typeof setView === 'function') setView('arrange');
  }
  function retry() {
    stopPreview();
    state.notes = [];
    state.midiBytes = null;
    state.error = '';
    state.phase = state.buffer ? 'recorded' : 'idle';
    state.status = state.buffer ? '可以重录，或再识别一次。' : '准备哼唱';
    refresh();
  }
  function checkService() {
    state.service = root.CoPitch ? 'ok' : 'down';
    const node = document.querySelector('#hum-service');
    if (!node || (location.hash || '#home').slice(1) !== 'hum') return;
    node.textContent = tr(
      state.service === 'ok'
        ? '浏览器音高模型已就绪'
        : '音高模型没有加载。请先运行 npm run pitch-model，再用 npm start 打开页面。',
    );
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
      const styleButton = event.target.closest('[data-hum-style]');
      if (styleButton) {
        state.style = styleButton.dataset.humStyle;
        document.querySelectorAll('[data-hum-style]').forEach((button) => {
          const selected = button.dataset.humStyle === state.style;
          button.classList.toggle('selected', selected);
          button.setAttribute('aria-pressed', String(selected));
        });
        return;
      }
      const button = event.target.closest('[data-hum]');
      if (!button || button.disabled) return;
      const action = button.dataset.hum;
      if (action === 'start') start();
      if (action === 'stop') stopRecording();
      if (action === 'listen') listen();
      if (action === 'transcribe') transcribe();
      if (action === 'preview') preview();
      if (action === 'retry') retry();
      if (action === 'commit') commit();
    });
    document.addEventListener('change', (event) => {
      if (event.target && event.target.id === 'hum-file')
        onFile(event.target.files && event.target.files[0]);
    });
    document.addEventListener('dragover', (event) => {
      if (event.target.closest && event.target.closest('.hum-drop')) event.preventDefault();
    });
    document.addEventListener('drop', (event) => {
      const zone = event.target.closest && event.target.closest('.hum-drop');
      if (!zone) return;
      event.preventDefault();
      onFile(event.dataTransfer.files && event.dataTransfer.files[0]);
    });
  }
  root.HumToMusic = {
    view,
    sync,
    leave,
    checkService,
    micErrorMessage,
    recordingProblem,
    audioBufferToWav,
  };
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', checkService);
})(typeof window !== 'undefined' ? window : globalThis);
