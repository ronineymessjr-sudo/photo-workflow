const test = require('node:test');
const assert = require('node:assert/strict');
const { createStaticServer } = require('../../tools/start-local-workspace');

test('local workspace server redirects root and serves the legacy workspace', async (t) => {
  const server = createStaticServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const root = await fetch(`${base}/`, { redirect: 'manual' });
  assert.equal(root.status, 302);
  assert.equal(root.headers.get('location'), '/legacy/');

  const workspace = await fetch(`${base}/legacy/`);
  assert.equal(workspace.status, 200);
  assert.match(await workspace.text(), /PhotoAtelier/);
});

test('local workspace server canonicalizes repeated legacy paths', async (t) => {
  const server = createStaticServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/legacy/legacy/legacy/?mode=public-beta`, { redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/legacy/?mode=public-beta');
});
