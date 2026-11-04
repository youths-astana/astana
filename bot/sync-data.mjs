// Вшивает в bot/worker.js направления, районы, ключевые слова и поля Google Формы
// из data.js и config.js сайта. Запускать после их изменения:
//   node bot/sync-data.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const box = { window: {} };
vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), box);
vm.runInContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), box);
const D = box.window.QOSYL_DATA, C = box.window.QOSYL_CONFIG;
const data = {
  CATS: D.CATS.map(({ id, ru, kz, en }) => ({ id, ru, kz, en })),
  DISTRICTS: D.DISTRICTS.map(({ id, lat, lng, ru, kz, en }) => ({ id, lat, lng, ru, kz, en })),
  CAT_HINTS: D.CAT_HINTS,
  FORM: C.form
};
const file = path.join(here, 'worker.js');
const src = fs.readFileSync(file, 'utf8');
const out = src.replace(/\/\*DATA-START\*\/[\s\S]*?\/\*DATA-END\*\//, '/*DATA-START*/' + JSON.stringify(data) + '/*DATA-END*/');
if (out === src && !src.includes('/*DATA-START*/')) throw new Error('Не нашёл блок DATA в worker.js');
fs.writeFileSync(file, out);
console.log('Готово: направлений', data.CATS.length, '· районов', data.DISTRICTS.length);
