const fs = require('node:fs/promises');
const path = require('node:path');
const { fileURLToPath } = require('node:url');

// Only files indexed from the open archive may be read by the renderer/exporter.
function assetByUrl(assets, url) {
  return Object.values(assets).find(info => info && info.url === url);
}

async function imageDataUrl(info) {
  if (!info || !info.mimeType || !info.mimeType.startsWith('image/')) {
    throw new Error('Image is not available in the open archive');
  }
  const bytes = await fs.readFile(fileURLToPath(info.url));
  return `data:${info.mimeType};base64,${bytes.toString('base64')}`;
}

async function savePortableExport(filePath, content, format, assets) {
  const pattern = format === 'html'
    ? /(?:src|href)="(file:[^"]+)"/g
    : /\]\(<(file:[^>]+)>\)/g;
  const urls = [...new Set([...content.matchAll(pattern)].map(match => match[1]))];
  const replacements = new Map();
  let assetDirectory;
  for (const url of urls) {
    const fileUrl = format === 'html' ? url.replace(/&amp;/g, '&') : url;
    const info = assetByUrl(assets, fileUrl);
    if (!info) throw new Error('Export references a file outside the open archive');
    if (format === 'html' && info.mimeType && info.mimeType.startsWith('image/')) {
      replacements.set(url, await imageDataUrl(info));
    } else {
      if (!assetDirectory) {
        assetDirectory = await fs.mkdtemp(path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)) + '-assets-'));
      }
      const extension = info.extension || path.extname(info.originalName || info.relativePath);
      const name = `attachment-${replacements.size + 1}${extension}`;
      await fs.copyFile(fileURLToPath(fileUrl), path.join(assetDirectory, name));
      replacements.set(url, encodeURIComponent(path.basename(assetDirectory)) + '/' + encodeURIComponent(name));
    }
  }
  content = content.replace(pattern, (match, url) => match.replace(url, replacements.get(url)));
  await fs.writeFile(filePath, content, 'utf8');
}

module.exports = { assetByUrl, imageDataUrl, savePortableExport };
