const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const SUPPORTED_ASSET_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif',
  '.mp4', '.webm', '.mp3', '.wav', '.m4a'
]);

const MIME_TYPES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.bmp': 'image/bmp',
  '.avif': 'image/avif', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4'
};

function detectImageExtension(filePath) {
  let descriptor;
  try {
    descriptor = fs.openSync(filePath, 'r');
    const bytes = Buffer.alloc(32);
    fs.readSync(descriptor, bytes, 0, bytes.length, 0);
    if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return '.png';
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return '.jpg';
    if (/^GIF8[79]a/.test(bytes.toString('ascii', 0, 6))) return '.gif';
    if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return '.webp';
    if (bytes.toString('ascii', 0, 2) === 'BM') return '.bmp';
    if (bytes.toString('ascii', 4, 8) === 'ftyp' && /avif|avis/.test(bytes.toString('ascii', 8, 32))) return '.avif';
  } catch (error) {
    return '';
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
  return '';
}

function readAssetFileNames(baseDir) {
  const manifestPath = path.join(baseDir, 'conversation_asset_file_names.json');
  try {
    const value = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (error) {
    return {};
  }
}

function addAssetAliases(assetMap, names, assetInfo) {
  for (const name of names) {
    if (!name || typeof name !== 'string') continue;
    const extension = path.extname(name);
    const stem = extension ? path.basename(name, extension) : name;
    const unsanitizedStem = stem.replace(/-sanitized$/, '');

    for (const alias of [name, stem, unsanitizedStem, 'file-service://' + unsanitizedStem, 'sediment://' + unsanitizedStem]) {
      if (!Object.prototype.hasOwnProperty.call(assetMap, alias)) {
        Object.defineProperty(assetMap, alias, { value: assetInfo, enumerable: true, configurable: true });
      }
    }
  }
}

function buildLocalAssetMap(baseDir) {
  const assetMap = {};
  if (!baseDir || !fs.existsSync(baseDir)) return assetMap;

  // Current OpenAI exports store media as *.dat and describe the original
  // filename (and therefore its media type) in this companion manifest.
  const assetFileNames = readAssetFileNames(baseDir);

  function scanDir(dir, depth) {
    if (depth > 2) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;

      const storedExtension = path.extname(entry.name).toLowerCase();
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      const originalName = assetFileNames[relativePath] || assetFileNames[entry.name];
      const originalExtension = typeof originalName === 'string'
        ? path.extname(originalName).toLowerCase()
        : '';
      const extension = (storedExtension === '.dat' ? detectImageExtension(fullPath) : '') ||
        (SUPPORTED_ASSET_EXTENSIONS.has(originalExtension) ? originalExtension : storedExtension);
      if (!SUPPORTED_ASSET_EXTENSIONS.has(extension)) continue;

      const assetInfo = {
        url: pathToFileURL(fullPath).href,
        relativePath,
        originalName: originalName || entry.name,
        extension,
        mimeType: MIME_TYPES[extension]
      };
      addAssetAliases(assetMap, [entry.name, originalName], assetInfo);
      Object.defineProperty(assetMap, relativePath, { value: assetInfo, enumerable: true, configurable: true });
    }
  }

  scanDir(baseDir, 0);
  return assetMap;
}

module.exports = { buildLocalAssetMap };
