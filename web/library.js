'use strict';
window.MusicCraftLibrary = (() => {
  let items = [],
    error = '',
    pending = null,
    revision = 0;
  const hiddenKey = 'musiccraft-hidden-demos';
  let hidden = [];
  try {
    const saved = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
    if (Array.isArray(saved)) hidden = saved.filter((key) => typeof key === 'string');
  } catch {}
  async function request(path, method = 'GET', payload) {
    const response = await fetch('/api/library' + path, {
      method,
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      ...(method === 'GET'
        ? {}
        : {
            headers: {
              'X-MusicCraft-Client': 'web',
              ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }),
            },
          }),
    });
    let body;
    try {
      body = await response.json();
    } catch {
      throw Error('我的作品需要通过应用后台读取，预制示例仍可试听。');
    }
    if (!response.ok) throw Error(body.error || '作品库暂时无法连接，请稍后重试。');
    return body;
  }
  function notify() {
    window.dispatchEvent(new Event('musiccraft-library-changed'));
  }
  async function load() {
    if (pending) return pending;
    const version = revision;
    pending = (async () => {
      try {
        const result = await request('');
        if (!Array.isArray(result.items)) throw Error('作品库返回的数据无效。');
        if (version !== revision) return;
        items = result.items.filter(
          (item) =>
            /^[a-f0-9-]{36}$/.test(item.id) && ['voice', 'restyle', 'create'].includes(item.mode),
        );
        error = '';
      } catch (failure) {
        error = failure.message;
      } finally {
        pending = null;
        notify();
      }
    })();
    return pending;
  }
  function tracks() {
    return items.map((item) => [
      `generated-${item.id}`,
      {
        title: String(item.title || '我的音乐作品').slice(0, 80),
        customTitle: item.customTitle || '',
        defaultTitle: item.defaultTitle || item.title,
        subtitle:
          String(item.model || 'MusicCraft') +
          (Number.isFinite(Date.parse(item.createdAt))
            ? ' · ' +
              new Date(item.createdAt).toLocaleString(
                window.CoLocale?.language === 'en' ? 'en-GB' : 'zh-CN',
                {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                },
              )
            : ''),
        style: { voice: '个人音色翻唱', restyle: '音频风格改编', create: '音乐创作' }[item.mode],
        cover: item.mode === 'restyle' ? 'assets/cover-classical.png' : 'assets/cover-pop.png',
        src: `/api/jobs/${item.id}/audio`,
        duration: `${Math.floor(Number(item.duration || 0) / 60)}:${String(Number(item.duration || 0) % 60).padStart(2, '0')}`,
        generated: true,
        jobId: item.id,
        mode: item.mode,
        deleted: Boolean(item.deletedAt),
      },
    ]);
  }
  async function change(key, restore = false) {
    if (key.startsWith('generated-')) {
      const id = key.slice('generated-'.length);
      if (!items.some((item) => item.id === id)) throw Error('作品不存在，请刷新作品库。');
      const updated = await request(
        '/' + id + (restore ? '/restore' : ''),
        restore ? 'POST' : 'DELETE',
      );
      items = items.map((item) => (item.id === id ? updated : item));
    } else {
      const next = restore ? hidden.filter((item) => item !== key) : [...new Set([...hidden, key])];
      localStorage.setItem(hiddenKey, JSON.stringify(next));
      hidden = next;
    }
    revision++;
    notify();
  }
  async function rename(key, title) {
    const id = key.slice('generated-'.length);
    if (!key.startsWith('generated-') || !items.some((item) => item.id === id))
      throw Error('作品不存在，请刷新作品库。');
    const updated = await request('/' + id, 'PATCH', { title });
    items = items.map((item) => (item.id === id ? updated : item));
    revision++;
    notify();
  }
  window.addEventListener('musiccraft-library-refresh', load);
  window.addEventListener('storage', (event) => {
    if (event.key === hiddenKey) {
      try {
        const saved = JSON.parse(event.newValue || '[]');
        if (Array.isArray(saved)) hidden = saved;
      } catch {}
      notify();
    }
  });
  return {
    load,
    tracks,
    change,
    rename,
    hidden: (key) => hidden.includes(key),
    get error() {
      return error;
    },
  };
})();
