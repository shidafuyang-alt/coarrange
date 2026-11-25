import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('translations match full phrases, preserve authored text and switch both ways', async () => {
  const sandbox = {
    window: { dispatchEvent() {} },
    localStorage: {
      getItem() {
        return null;
      },
    },
    Event: class {},
    document: { body: null },
  };
  vm.runInNewContext(
    await readFile(new URL('../web/locale-extra.js', import.meta.url), 'utf8'),
    sandbox,
  );
  vm.runInNewContext(await readFile(new URL('../web/i18n.js', import.meta.url), 'utf8'), sandbox);
  const locale = sandbox.window.CoLocale;
  locale.setLanguage('en');
  assert.equal(locale.text('模型与连接'), 'Models and connections');
  assert.equal(locale.text('用我的声音翻唱'), 'Sing in my voice');
  assert.equal(locale.text('我喜欢流行乐，也喜欢这首古典作品'), '我喜欢流行乐，也喜欢这首古典作品');
  assert.equal(locale.text('21 个版本 · 保存在此浏览器'), '21 versions · saved in this browser');
  locale.setLanguage('zh');
  assert.equal(locale.text('模型与连接'), '模型与连接');
});
