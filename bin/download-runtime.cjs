'use strict';
const fs = require('node:fs');
const { pipeline } = require('node:stream/promises');

async function download(url, file) {
  const signal = AbortSignal.timeout(300_000);
  for (let redirects = 0; redirects <= 8; redirects++) {
    if (new URL(url).protocol !== 'https:') throw Error('Runtime download requires HTTPS');
    const response = await fetch(url, { redirect: 'manual', signal });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const next = response.headers.get('location');
      if (!next) throw Error('Runtime download redirect missing location');
      url = new URL(next, url).href;
      continue;
    }
    if (response.status !== 200) throw Error('Runtime download failed: HTTP ' + response.status);
    await pipeline(response.body, fs.createWriteStream(file, { flags: 'wx' }), { signal });
    return;
  }
  throw Error('Too many runtime download redirects');
}

if (require.main === module) download(...process.argv.slice(2)).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
module.exports = { download };
