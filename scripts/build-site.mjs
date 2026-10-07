// EkoMetChem build: validates CMS content, writes dist/ (only public files)
// and dist/content/index.json (the single file the public site reads).
// A broken content file fails the build, so Netlify keeps the previous good deploy.
import { readdir, readFile, writeFile, mkdir, cp, rm, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const root = process.cwd();
const out = resolve(root, 'dist');
const collections = {
  offers: 'offers', procurement: 'procurement',
  servicesActive: 'services-active', servicesNeeded: 'services-needed'
};
const optionalStrings = ['description', 'photo', 'quantity', 'country', 'link'];

async function readCollection(folder) {
  const dir = join(root, 'content', folder);
  let names;
  try { names = await readdir(dir); }
  catch (err) {
    if (err.code === 'ENOENT') throw new Error(`content/${folder} is missing`);
    throw err;
  }
  const entries = [];
  for (const name of names.filter(n => n.endsWith('.json')).sort()) {
    const file = join(dir, name);
    let entry;
    try { entry = JSON.parse(await readFile(file, 'utf8')); }
    catch (err) { throw new Error(`${file}: invalid JSON (${err.message})`); }
    if (!entry || Array.isArray(entry) || typeof entry !== 'object')
      throw new Error(`${file}: expected object`);
    if (typeof entry.title !== 'string' || !entry.title.trim())
      throw new Error(`${file}: missing title`);
    for (const key of optionalStrings)
      if (entry[key] != null && typeof entry[key] !== 'string')
        throw new Error(`${file}: invalid ${key}`);
    for (const key of ['hidden', 'pinned'])
      if (entry[key] != null && typeof entry[key] !== 'boolean')
        throw new Error(`${file}: invalid ${key}`);
    if (entry.date != null && entry.date !== '' &&
        (typeof entry.date !== 'string' || !Number.isFinite(Date.parse(entry.date))))
      throw new Error(`${file}: invalid date`);
    if (entry.hidden !== true)
      entries.push({ ...entry, _id: name.slice(0, -5) });
  }
  return entries;
}

// Validate everything before touching the output directory.
const index = { schemaVersion: 1, generatedAt: new Date().toISOString() };
for (const [key, folder] of Object.entries(collections))
  index[key] = await readCollection(folder);

const pages = ['index.html', 'services.html', 'privacy.html', '404.html',
  'robots.txt', 'sitemap.xml'];
const publicDirs = ['assets', 'css', 'js', 'admin'];
for (const name of [...pages, ...publicDirs]) await stat(join(root, name));

await rm(out, { recursive: true, force: true }); // only the generated dist/
await mkdir(out, { recursive: true });
// assets/hero-loop.mp4 is an old unused copy (the site uses assets/video/hero-loop.mp4).
const skip = new Set([join(root, 'assets', 'hero-loop.mp4')]);
for (const name of [...pages, ...publicDirs])
  await cp(join(root, name), join(out, name), { recursive: true, filter: src => !skip.has(src) });
for (const name of ['_redirects', '_headers']) {
  try { await stat(join(root, name)); }
  catch (err) { if (err.code === 'ENOENT') continue; throw err; }
  await cp(join(root, name), join(out, name));
}
await mkdir(join(out, 'content'), { recursive: true });
await writeFile(join(out, 'content', 'index.json'), JSON.stringify(index));
console.log('[build-site]', Object.keys(collections)
  .map(key => `${key}=${index[key].length}`).join(' '));
