const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { findDefaultArchive, readArchive } = require('./archive');
const { buildLocalAssetMap } = require('./asset-map');
const { imageDataUrl, savePortableExport } = require('./export-assets');

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOioAAAAASUVORK5CYII=', 'base64');

function temporaryDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chatty-reader-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function readerContext() {
  const context = vm.createContext({ URL, console, window: { location: { href: 'file:///reader.html' }, addEventListener() {} } });
  const script = fs.readFileSync(path.join(__dirname, 'index .html'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInContext(script, context);
  return context;
}

test('loads all numbered archive parts in order and prefers a legacy default', async t => {
  const directory = temporaryDirectory(t);
  fs.writeFileSync(path.join(directory, 'conversations-001.json'), '[{"id":"second"}]');
  fs.writeFileSync(path.join(directory, 'conversations-000.json'), '[{"id":"first"}]');
  const defaultPath = await findDefaultArchive(directory);
  assert.equal(path.basename(defaultPath), 'conversations-000.json');
  assert.deepEqual(await readArchive(path.join(directory, 'conversations-001.json')), [{ id: 'first' }, { id: 'second' }]);
  fs.writeFileSync(path.join(directory, 'conversations.json'), '[{"id":"legacy"}]');
  assert.equal(path.basename(await findDefaultArchive(directory)), 'conversations.json');
  assert.deepEqual(await readArchive(path.join(directory, 'conversations.json')), [{ id: 'legacy' }]);
});

test('detects .dat image bytes without a manifest and supplies the correct MIME type', async t => {
  const directory = temporaryDirectory(t);
  fs.writeFileSync(path.join(directory, 'file-photo.dat'), png);
  const assets = buildLocalAssetMap(directory);
  const image = assets['file-service://file-photo'];
  assert.equal(image.extension, '.png');
  assert.equal(await imageDataUrl(image), 'data:image/png;base64,' + png.toString('base64'));
  await assert.rejects(imageDataUrl(undefined), /not available/);
});

test('HTML embeds images and Markdown carries readable files when moved away from the source', async t => {
  const directory = temporaryDirectory(t);
  const source = path.join(directory, 'source & photos');
  const output = path.join(directory, 'output');
  fs.mkdirSync(source);
  fs.mkdirSync(output);
  fs.writeFileSync(path.join(source, 'file-photo.dat'), png);
  const assets = buildLocalAssetMap(source);
  const reader = readerContext();
  reader.assetsJson = assets;
  const parts = [{ asset: { content_type: 'image_asset_pointer', asset_pointer: 'file-service://file-photo' } }];
  const htmlPath = path.join(output, 'export.html');
  const mdPath = path.join(output, 'export.md');
  await savePortableExport(htmlPath, reader.renderMessagePartsToHtml(parts, {}), 'html', assets);
  await savePortableExport(mdPath, reader.renderMessagePartsToMarkdown(parts, {}), 'markdown', assets);
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.ok(html.includes('data:image/png;base64,' + png.toString('base64')));
  assert.ok(!html.includes('file:'));
  const markdown = fs.readFileSync(mdPath, 'utf8');
  const target = markdown.match(/\]\(<([^>]+)>\)/)[1];
  assert.ok(target.endsWith('.png'));
  fs.renameSync(output, path.join(directory, 'moved'));
  assert.deepEqual(fs.readFileSync(path.join(directory, 'moved', decodeURIComponent(target))), png);
  await assert.rejects(savePortableExport(htmlPath, '<img src="file:///outside.png">', 'html', assets), /outside the open archive/);
});

test('published exports omit hard-redacted image references and unpublished threads', () => {
  const reader = readerContext();
  const asset = { content_type: 'image_asset_pointer', asset_pointer: 'file-service://file-photo' };
  reader.assetsJson = { 'file-service://file-photo': { url: 'file:///photo.png' } };
  reader.allConversationsForDisplay = [{ key: 'private', messages: [{ id: 'a', parts: [{ asset }] }] },
    { key: 'shared', messages: [{ id: 'b', parts: [{ asset }] }] }];
  reader.editsState.conversations = { shared: { publish: true, messages: { b: { action: 'redact' } } } };
  assert.ok(!reader.buildPublishedHtml().includes('photo.png'));
  assert.ok(!reader.buildPublishedMarkdown().includes('photo.png'));
  assert.ok(reader.buildPublishedMarkdown().includes('[REDACTED]'));
});

test('malformed graph cycles, missing authors and null parts do not stop the reader', () => {
  const reader = readerContext();
  const conversation = { current_node: 'a', mapping: { a: { parent: 'a', message: { content: { content_type: 'text', parts: [null, 'hello'] } } } } };
  const messages = reader.getConversationMessages(conversation);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].parts[0].text, 'hello');
});
