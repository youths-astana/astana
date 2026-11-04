// Запуск бота на своём компьютере или сервере (Node.js 18+), без Cloudflare.
//   BOT_TOKEN=123:ABC ADMIN_IDS=12345 node bot/node.js
// Данные хранятся в bot/bot-data.json рядом с этим файлом.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker, { handleUpdate, scheduled, setup } from './worker.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// Хранилище в файле с тем же интерфейсом, что у Cloudflare KV.
export class FileKV {
  constructor(file) {
    this.file = file;
    try { this.m = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { this.m = {}; }
    this.t = null;
  }
  save() { clearTimeout(this.t); this.t = setTimeout(() => fs.writeFileSync(this.file, JSON.stringify(this.m)), 300); }
  live(k) { const e = this.m[k]; if (!e) return null; if (e.x && e.x < Date.now()) { delete this.m[k]; this.save(); return null; } return e; }
  async get(k) { const e = this.live(k); return e ? e.v : null; }
  async put(k, v, o) { this.m[k] = { v, x: o && o.expirationTtl ? Date.now() + o.expirationTtl * 1000 : 0 }; this.save(); }
  async delete(k) { delete this.m[k]; this.save(); }
  async list({ prefix = '' } = {}) { return { keys: Object.keys(this.m).filter((k) => k.startsWith(prefix) && this.live(k)).map((name) => ({ name })), list_complete: true }; }
}

async function main() {
  const env = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    ADMIN_IDS: process.env.ADMIN_IDS || '',
    SITE_URL: process.env.SITE_URL || 'https://qosyl.club/',
    DEBUG: process.env.DEBUG,
    DB: new FileKV(path.join(here, 'bot-data.json'))
  };
  if (!env.BOT_TOKEN) { console.error('Укажите токен: BOT_TOKEN=123:ABC node bot/node.js'); process.exit(1); }
  const api = (m, b) => fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${m}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }).then((r) => r.json());
  await api('deleteWebhook', {});
  const s = await setup(env, '');
  console.log('Бот запущен:', s.me && s.me.ok ? '@' + s.me.result.username : s.me);
  setInterval(() => scheduled(env).catch((e) => console.error('cron', e)), 10 * 60 * 1000);
  let offset = 0;
  for (;;) {
    try {
      const r = await api('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query', 'inline_query', 'my_chat_member'] });
      for (const u of (r.result || [])) {
        offset = u.update_id + 1;
        handleUpdate(u, env).catch((e) => console.error('update', e));
      }
    } catch (e) { console.error('poll', e.message); await new Promise((ok) => setTimeout(ok, 3000)); }
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
export default worker;
