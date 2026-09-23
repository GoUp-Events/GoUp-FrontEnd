import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';

const backend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(backend, '..', 'js', 'dados.js');
const output = resolve(backend, 'src', 'main', 'resources', 'catalogo.json');
const context = { window: {} };
vm.runInNewContext(readFileSync(source, 'utf8'), context, { filename: source, timeout: 1000 });
const { eventos, locais } = context.window.GoUpData;
const today = new Date();
const localDay = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
const synced = {
  origem: 'js/dados.js',
  eventos: eventos.map(({ data, ...event }) => ({
    ...event,
    diasAposHoje: Math.round((Date.parse(data + 'T00:00:00Z') - localDay(today)) / 86400000)
  })),
  locais
};
writeFileSync(output, JSON.stringify(synced, null, 2) + '\n', 'utf8');
console.log(`Catálogo sincronizado: ${eventos.length} eventos e ${locais.length} locais.`);
