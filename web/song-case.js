'use strict';
// Waveforms are measured from the actual supplied and generated audio files.
function songWaveform(key) {
  const values = window.songWaveforms?.[key] || [];
  return `<svg class="song-wave" viewBox="0 0 480 64" role="img" aria-label="音频波形">${values.map((v, i) => `<rect x="${i * 5}" y="${32 - v * 29}" width="2.8" height="${Math.max(3, v * 58)}" rx="1.4"/>`).join('')}</svg>`;
}
function songCaseStudy() {
  return `<section class="song-case" aria-label="真实歌曲改编对比">
    <div class="song-case-heading"><div><p class="eyebrow">YOUR SONG. REIMAGINED.</p><h2>你喜欢的歌，换一种打开方式。</h2></div><span class="tag">同一旋律 · 六种声音</span></div>
    <p class="song-credit"><span data-i18n-ignore>hate that i made you love me</span><span>用户提供的音乐片段 · 0:47–1:07</span></p>
    ${CoRemix.view()}<div class="song-ab-grid">
      <article class="song-version"><div class="song-version-head"><img src="assets/cover-pop.png" alt="流行版本封面"><div><span class="song-letter">A / ORIGINAL</span><h3>先听，熟悉的声音。</h3><p>原曲片段</p></div></div>${songWaveform('song-original')}<button class="btn btn-outline song-switch" data-compare="song-original" aria-pressed="false">${icon('play')}A · 试听原曲</button></article>
      <article class="song-version song-reimagined"><div class="song-version-head"><img src="assets/cover-classical.png" alt="古典版本封面"><div><span class="song-letter">B / REIMAGINED</span><h3>再听，古典的另一面。</h3><p>钢琴逐音弹出人声的旋律，弦乐在下方衬托</p></div></div>${songWaveform('song-chamber')}<button class="btn btn-primary song-switch" data-compare="song-chamber" aria-pressed="false">${icon('play')}B · 试听古典改编</button></article>
    </div>
    <div class="song-case-footer"><p>${icon('repeat-2')}播放中切换 A / B，会保留当前进度。</p><button class="text-btn" data-action="song-restart">${icon('rotate-ccw')}从原曲开头听</button><button class="text-btn" data-compare="song-classical">${icon('history')}对比：早期 AI 改编</button><button class="text-btn" data-compare="song-alternative">${icon('piano')}另一个改编版本</button></div>
    <details class="song-process"><summary>本次改编做了什么？</summary><div><p>先用 Demucs 分离人声，再用 CREPE 转录旋律与滑音，并从伴奏中识别和弦。五个新版本用采样乐器演奏同一条旋律，没有叠加原曲音频。</p><p>早期版本由本地 ACE-Step 模型直接生成，旋律容易走样，保留作对比。所有版本已匹配响度；MIDI 工作台使用另一首原创示例。</p></div></details>
    <p class="song-boundary">提前制作的真实改编案例。上传其他歌曲的实时改编尚未开放。</p>
  </section>`;
}
function updateSongCase() {
  document.querySelectorAll('.song-switch').forEach((b) => {
    const selected = b.dataset.compare === current;
    b.classList.toggle('is-selected', selected);
    b.setAttribute('aria-pressed', String(selected));
  });
}
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-action="song-restart"]')) {
    audio.currentTime = 0;
    playTrack('song-original');
  }
});
