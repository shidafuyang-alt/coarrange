'use strict';
(() => {
  const themes = [
    {
      id: 'mist',
      name: '墨绿',
      description: '深墨绿、奶油白与酸橙色，独立音乐工作室',
      icon: 'disc-3',
    },
    { id: 'mono', name: '黑白', description: '纯粹中性色，把注意力留给声音', icon: 'contrast' },
    { id: 'summer', name: '夏日', description: '鼠尾草绿与浅杏色，清新明亮', icon: 'sun' },
    { id: 'midnight', name: '深夜', description: '深色面板与柔紫点缀，适合夜间使用', icon: 'moon' },
  ];
  let preferences = { theme: 'mist', language: 'zh', sidebarCollapsed: false };
  try {
    const p = JSON.parse(localStorage.getItem('coarrange-preferences') || '{}');
    if (themes.some((t) => t.id === p.theme)) preferences.theme = p.theme;
    if (p.language === 'en') preferences.language = 'en';
    preferences.sidebarCollapsed = p.sidebarCollapsed === true;
  } catch {}
  let mobileOpen = false;
  const mobile = matchMedia('(max-width:600px)');
  const tr = (s) => CoLocale.text(s);
  function persist() {
    try {
      localStorage.setItem('coarrange-preferences', JSON.stringify(preferences));
    } catch {}
  }
  function updateSidebar() {
    document.body.classList.toggle('sidebar-collapsed', preferences.sidebarCollapsed);
    document.body.classList.toggle('sidebar-mobile-open', mobileOpen && mobile.matches);
    const collapsed = mobile.matches ? !mobileOpen : preferences.sidebarCollapsed;
    const toggle = document.querySelector('#sidebar-toggle');
    toggle.innerHTML = icon(collapsed ? 'panel-left-open' : 'panel-left-close');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute(
      'aria-label',
      tr(
        mobile.matches
          ? collapsed
            ? '展开导航'
            : '收起导航'
          : collapsed
            ? '展开侧栏'
            : '收起侧栏',
      ),
    );
    toggle.title = toggle.getAttribute('aria-label');
    for (const button of document.querySelectorAll('.sidebar .nav-item,.sidebar .new-project')) {
      const labels = {
        workspace: '创作与改编',
        examples: '风格试听与对比',
        home: '为你推荐',
        create: '灵感创作',
        transform: '风格转换',
        arrange: '编曲工作台',
        library: '作品库',
        favorites: '我的收藏',
      };
      const label = button.classList.contains('new-project')
        ? '开始创作'
        : labels[button.dataset.view] || '偏好设置';
      button.setAttribute('aria-label', tr(label));
      button.title = tr(label);
    }
    const sw = document.querySelector('[data-preference="sidebar"]');
    if (sw) sw.setAttribute('aria-checked', String(preferences.sidebarCollapsed));
    icons();
  }
  function updateLanguageControl() {
    const button = document.querySelector('#language-toggle');
    button.innerHTML =
      icon('languages') + `<span>${preferences.language === 'en' ? '中' : 'EN'}</span>`;
    button.setAttribute(
      'aria-label',
      preferences.language === 'en' ? 'Switch to Chinese' : 'Switch to English',
    );
    button.title = button.getAttribute('aria-label');
    document.querySelectorAll('[data-language]').forEach((b) => {
      const selected = b.dataset.language === preferences.language;
      b.setAttribute('aria-pressed', String(selected));
      b.classList.toggle('selected', selected);
    });
  }
  function setLanguage(next) {
    preferences.language = next === 'en' ? 'en' : 'zh';
    persist();
    CoLocale.setLanguage(preferences.language);
    updateLanguageControl();
    updateSidebar();
    // Values typed by a user are left intact; only built-in UI copy changes.
    document.querySelectorAll('.track-row').forEach((row) => {
      row.dataset.search = (row.dataset.search + ' ' + row.textContent).toLowerCase();
    });
  }
  function setTheme(id) {
    if (!themes.some((t) => t.id === id)) return;
    preferences.theme = id;
    document.documentElement.dataset.theme = id;
    persist();
    document.querySelector('meta[name="theme-color"]').content = getComputedStyle(
      document.documentElement,
    )
      .getPropertyValue('--bg')
      .trim();
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      const active = button.dataset.themeChoice === id;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  function openPreferences() {
    document.querySelector('#modal-root').innerHTML =
      `<div class="modal-overlay"><section class="modal preferences-modal" role="dialog" aria-modal="true" aria-labelledby="preferences-title"><div class="modal-head"><div><p class="eyebrow">MAKE ROOM FOR YOUR IDEAS</p><h2 id="preferences-title">让这里，更像你的空间</h2></div><button class="icon-btn" data-action="close-modal" aria-label="关闭">${icon('x')}</button></div><section class="preferences-section"><div class="preference-heading">${icon('palette')}<div><h3>外观主题</h3><p>为创作空间，选一种心情。</p></div></div><div class="theme-options" role="group" aria-label="主题选择">${themes.map((t) => `<button class="theme-option ${preferences.theme === t.id ? 'selected' : ''}" data-theme-choice="${t.id}" aria-pressed="${preferences.theme === t.id}"><span class="theme-swatches" data-swatch="${t.id}" aria-hidden="true"><span></span><span></span><span></span><span></span></span><span class="theme-copy"><strong>${t.name}</strong><small>${t.description}</small></span><span class="theme-selected" aria-hidden="true">${icon('check')}</span></button>`).join('')}</div></section><section class="preferences-section"><div class="preference-row"><div class="preference-heading">${icon('languages')}<div><h3>界面语言</h3></div></div><div class="language-options" role="group" aria-label="界面语言"><button data-language="zh" aria-pressed="${preferences.language === 'zh'}" class="${preferences.language === 'zh' ? 'selected' : ''}">简体中文</button><button data-language="en" aria-pressed="${preferences.language === 'en'}" class="${preferences.language === 'en' ? 'selected' : ''}">English</button></div></div></section><section class="preferences-section"><div class="preference-row"><div class="preference-heading">${icon('panel-left')}<div><h3>紧凑侧栏</h3><p>收起文字，只保留图标。随时可以展开。</p></div></div><button class="toggle" role="switch" aria-label="紧凑侧栏" data-preference="sidebar" aria-checked="${preferences.sidebarCollapsed}"></button></div></section><section class="preferences-section"><div class="preference-row"><div class="preference-heading">${icon('repeat')}<div><h3>循环播放</h3></div></div><button class="toggle" role="switch" aria-label="循环播放" aria-checked="${audio.loop}" data-action="switch-loop"></button></div></section><p class="preferences-note">${icon('check-check')}主题、语言和侧栏设置会自动保存在此浏览器。</p></section></div>`;
    icons();
    document.querySelector('.preferences-modal [data-action="close-modal"]').focus();
  }
  window.openPreferences = openPreferences;
  document.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (button?.dataset.themeChoice) {
      setTheme(button.dataset.themeChoice);
      return;
    }
    if (button?.dataset.language) {
      setLanguage(button.dataset.language);
      return;
    }
    if (button?.dataset.preference === 'sidebar') {
      preferences.sidebarCollapsed = !preferences.sidebarCollapsed;
      persist();
      updateSidebar();
      return;
    }
    if (button?.dataset.action === 'toggle-language') {
      setLanguage(preferences.language === 'en' ? 'zh' : 'en');
      return;
    }
    if (button?.dataset.action === 'toggle-sidebar') {
      if (mobile.matches) mobileOpen = !mobileOpen;
      else {
        preferences.sidebarCollapsed = !preferences.sidebarCollapsed;
        persist();
      }
      updateSidebar();
      return;
    }
    if (
      e.target.closest('[data-action="close-sidebar"]') ||
      (mobile.matches && e.target.closest('.sidebar [data-view]'))
    ) {
      mobileOpen = false;
      updateSidebar();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileOpen) {
      mobileOpen = false;
      updateSidebar();
    }
  });
  mobile.addEventListener('change', () => {
    mobileOpen = false;
    updateSidebar();
  });
  setTheme(preferences.theme);
  CoLocale.setLanguage(preferences.language);
  updateLanguageControl();
  updateSidebar();
})();
