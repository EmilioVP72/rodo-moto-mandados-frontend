import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
test('la navegación sin red recibe el HTML y las rutas privadas pasan directamente a la API', async () => {
  const handlers = {};
  const shell = new Response('<html>RODO</html>');
  const self = { location: new URL('https://example.test'), addEventListener: (key, fn) => handlers[key] = fn };
  vm.runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    URL, Response, self, caches: {open: async () => ({match: async () => shell})},
    fetch: async () => { throw new Error('offline'); },
  });
  let result;
  const event = path => ({ request:{url:new URL(path,self.location).href,method:'GET',mode:'navigate',headers:new Headers()},
    respondWith: pending => { result = pending; } });
  handlers.fetch(event('/api/orders'));
  assert.equal(result,undefined);
  handlers.fetch(event('/?ticket=QA'));
  assert.equal(await result,shell);
});
