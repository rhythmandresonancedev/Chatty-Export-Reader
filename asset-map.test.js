const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { buildLocalAssetMap } = require('./asset-map');

test('maps current export .dat assets using the filename manifest', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chatty-assets-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  fs.writeFileSync(path.join(directory, 'file-example.dat'), 'image bytes');
  fs.writeFileSync(
    path.join(directory, 'conversation_asset_file_names.json'),
    JSON.stringify({ 'file-example.dat': 'holiday photo.png' })
  );

  const assets = buildLocalAssetMap(directory);
  assert.equal(assets['file-example'].relativePath, 'file-example.dat');
  assert.equal(assets['file-service://file-example'].originalName, 'holiday photo.png');
  assert.equal(assets['holiday photo.png'].relativePath, 'file-example.dat');
});

test('continues to map legacy assets with real media extensions', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chatty-assets-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  fs.writeFileSync(path.join(directory, 'file-example-sanitized.jpg'), 'image bytes');

  const assets = buildLocalAssetMap(directory);
  assert.equal(assets['file-example'].relativePath, 'file-example-sanitized.jpg');
  assert.equal(assets['sediment://file-example'].relativePath, 'file-example-sanitized.jpg');
});

test('does not expose unrelated files as conversation assets', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chatty-assets-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  fs.writeFileSync(path.join(directory, 'notes.dat'), 'not media');
  assert.deepEqual(buildLocalAssetMap(directory), {});
});
