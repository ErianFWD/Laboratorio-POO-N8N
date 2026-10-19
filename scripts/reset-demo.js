import {copyFile} from 'node:fs/promises';
await copyFile(new URL('../tests/fixtures/db.seed.json',import.meta.url),new URL('../jsonserver/db.json',import.meta.url));
console.log('Datos de demostración restaurados. Ejecuta solo sobre la copia local de este laboratorio.');
