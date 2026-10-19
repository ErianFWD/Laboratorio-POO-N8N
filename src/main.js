import {readFile} from 'node:fs/promises';
import {prepararFacturas,procesarFactura} from './models/dominio.js';
import {solicitar} from './services/http.js';
const demo=process.argv.includes('--demo');
const hoy=process.env.FECHA_EVALUACION || (demo ? '2026-10-19' : new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
const base=process.env.JSON_SERVER_URL || 'http://localhost:3000';
const respuesta=demo ? {statusCode:200,body:JSON.parse(await readFile(new URL('../tests/fixtures/db.demo.json',import.meta.url)))} : await solicitar(base+'/facturas');
if(respuesta.statusCode!==200 || !Array.isArray(respuesta.body)) {console.error('JSON_SERVER: no se recibió una colección de facturas.');process.exitCode=1;}
else {
 const cache=new Map();
 const feriados=async anio=>{
  if(!cache.has(anio)) cache.set(anio,demo ? {statusCode:200,body:JSON.parse(await readFile(new URL(`../tests/fixtures/feriados-${anio}.json`,import.meta.url)))} : await solicitar(`https://date.nager.at/api/v3/PublicHolidays/${anio}/CR`));
  return cache.get(anio);
 };
 console.log(`FacturaLab | evaluación ${hoy} | ${demo?'fixtures sin red':'JSON Server + API real'} | solo lectura`);
 for(const p of prepararFacturas(respuesta.body,hoy)) {
  console.log(JSON.stringify(p.valida ? procesarFactura(p,await feriados(p.anio),await feriados(p.anio+1)) : p,null,2));
 }
}
