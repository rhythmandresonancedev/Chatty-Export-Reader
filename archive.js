const fs = require('node:fs/promises');
const path = require('node:path');

async function findDefaultArchive(directory) {
  const names = await fs.readdir(directory).catch(() => []);
  return names.includes('conversations.json')
    ? path.join(directory, 'conversations.json')
    : names.filter(name => /^conversations-\d+\.json$/i.test(name)).sort()
      .map(name => path.join(directory, name))[0];
}

async function readArchive(filePath) {
  const directory = path.dirname(filePath);
  const names = /^conversations-\d+\.json$/i.test(path.basename(filePath))
    ? (await fs.readdir(directory)).filter(name => /^conversations-\d+\.json$/i.test(name)).sort()
    : [path.basename(filePath)];
  let data;
  for (const name of names) {
    const parsed = JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'));
    if (names.length === 1) return parsed;
    if (!Array.isArray(parsed)) throw new Error('Conversation archive parts must contain arrays');
    if (!data) data = [];
    data = data.concat(parsed);
  }
  return data;
}

module.exports = { findDefaultArchive, readArchive };
