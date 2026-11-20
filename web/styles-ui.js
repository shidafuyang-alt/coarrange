'use strict';
function musicStyleChoices() {
  return (
    MusicCatalog.styles.reduce(
      (html, s, i) =>
        html +
        (i === 0 || s.group !== MusicCatalog.styles[i - 1].group
          ? `${i ? '</div>' : ''}<div class="style-group-heading">${s.group}${s.group === '反差实验室' ? '<span>试点有趣的</span>' : ''}</div><div class="style-grid expanded-style-grid">`
          : '') +
        `<button class="style-choice ${chosenStyle === s.id ? 'selected' : ''} ${s.group === '反差实验室' ? 'playful-choice' : ''}" data-style="${s.id}" aria-pressed="${chosenStyle === s.id}">${icon(s.icon)}<strong>${s.name}</strong><small>${s.hint}</small></button>`,
      '',
    ) + '</div>'
  );
}
function themePlayground() {
  return `<section class="theme-playground"><div class="section-head"><div><p class="eyebrow">ONE MELODY. THIRTEEN PERSONALITIES.</p><h2>晴日来信，也可以这么不一样。</h2><p>从摇滚到民谣，再让二胡出来蹦个迪。点一下，直接听。</p></div><button class="text-btn" data-view="arrange">${icon('sliders-horizontal')}自己配一版</button></div><div class="genre-filters" role="group" aria-label="筛选音乐风格">${['全部风格', '常见风格', '反差实验室'].map((g, i) => `<button class="suggestion ${i === 0 ? 'active' : ''}" data-genre-filter="${g}" aria-pressed="${i === 0}">${g}</button>`).join('')}</div><div class="genre-gallery">${MusicCatalog.styles.map((s) => `<article class="genre-card ${s.group === '反差实验室' ? 'genre-playful' : ''}" data-genre-group="${s.group}"><span class="genre-art genre-${s.id}">${icon(s.icon)}<span>${s.en.toUpperCase()}</span></span><div><h3>${s.name}</h3><p>${s.hint}</p></div><button class="icon-btn genre-play" data-play="${s.id}" aria-label="试听${s.name}">${icon('play')}</button></article>`).join('')}</div><p class="compare-note">${icon('info')}同一首原创主题 · 已准备好 13 个试听版本 · 文字描述暂不触发实时生成。</p></section>`;
}
function musicStyleResult(key, kind) {
  const s = MusicCatalog.styles.find((s) => s.id === key) || MusicCatalog.styles[1],
    t = tracks[s.id];
  const ai = !['pop', 'classical', 'soft'].includes(s.id);
  document.querySelector('#result-panel').innerHTML =
    `<div class="style-result-art genre-${s.id}">${icon(s.icon)}<span>${s.en.toUpperCase()}</span></div><div class="result-title"><div><h3>${t.title}</h3><p>${s.name} · 原主题 108 BPM · 0:38</p></div><span class="badge-small">${ai ? 'AI 改编试听' : '原创编配试听'}</span></div><ul class="plan-list"><li>${icon(s.icon)}<span><strong>听感方向</strong>${s.hint}</span></li><li>${icon('music-2')}<span><strong>乐器组合</strong>${s.parts.map((id) => MusicCatalog.instruments.find((i) => i.id === id).name).join('、')}</span></li><li>${icon('sliders-horizontal')}<span><strong>继续动手</strong>在工作台换乐器、加声部，试出自己的组合。</span></li></ul>${kind === 'create' ? '<p id="user-plan" class="helper"></p>' : ''}<div class="result-buttons"><button class="btn btn-primary" data-play="${s.id}">${icon('play')}试听这个版本</button><button class="btn btn-outline" data-play="pop">${icon('repeat-2')}对比流行原版</button></div><button class="btn btn-pink full studio-result-button" data-open-studio-preset="${s.id}">${icon('sliders-horizontal')}在工作台试这个配器</button><div class="revision-box"><h3>再大胆一点？</h3><div class="bold-alternatives">${[
      'erhu',
      'circus',
      'chiptune',
    ]
      .map((id) => {
        const a = MusicCatalog.styles.find((s) => s.id === id);
        return `<button class="suggestion" data-preview-style="${id}" data-result-kind="${kind}">${icon(a.icon)}${a.name}</button>`;
      })
      .join(
        '',
      )}</div><p class="helper">试听为提前准备的真实音乐版本。工作台使用同一主题的可编辑配器，演奏细节会有所不同。</p></div>`;
  icons();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.genreFilter) {
    document.querySelectorAll('[data-genre-filter]').forEach((x) => {
      x.classList.toggle('active', x === b);
      x.setAttribute('aria-pressed', String(x === b));
    });
    document
      .querySelectorAll('[data-genre-group]')
      .forEach(
        (el) =>
          (el.hidden =
            b.dataset.genreFilter !== '全部风格' &&
            el.dataset.genreGroup !== b.dataset.genreFilter),
      );
  }
  if (b.dataset.previewStyle) {
    chosenStyle = b.dataset.previewStyle;
    document.querySelectorAll('[data-style]').forEach((x) => {
      x.classList.toggle('selected', x.dataset.style === chosenStyle);
      x.setAttribute('aria-pressed', String(x.dataset.style === chosenStyle));
    });
    musicStyleResult(chosenStyle, b.dataset.resultKind);
  }
});
