import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Factura,FacturaEstandar,FacturaConGracia,crearFactura,CalendarioLaboral,prepararFacturas,procesarFactura} from '../src/models/dominio.js';
const respuestas=await Promise.all([2026,2027].map(async anio=>({anio,datos:JSON.parse(await readFile(new URL(`./fixtures/feriados-${anio}.json`,import.meta.url)))})));
const cal=new CalendarioLaboral(respuestas);
const d={id:'EXT-001',cliente:'Cliente',monto:10000,pais:'CR',fechaEmision:'2026-10-15',plazoDiasHabiles:1,estado:'pendiente'};
test('dos hijas de Factura y dos implementaciones propias del mismo método',()=>{
 for(const C of [FacturaEstandar,FacturaConGracia]){assert.ok(C.prototype instanceof Factura);assert.ok(Object.hasOwn(C.prototype,'calcularVencimiento'));}
});
test('polimorfismo: misma entrada y consumidor, vencimiento distinto',()=>{
 const objetos=[crearFactura({...d,tipo:'estandar'}),crearFactura({...d,tipo:'con_gracia',diasGracia:2})];
 assert.deepEqual(objetos.map(f=>f.calcularVencimiento(cal)),['2026-10-16','2026-10-20']);
 assert.deepEqual(objetos.map(f=>f.evaluar(cal,'2026-10-19').cambios.estado),['vencida','pendiente']);
});
test('gracia salta fin de semana y feriado',()=>assert.equal(crearFactura({...d,fechaEmision:'2026-09-10',tipo:'con_gracia',diasGracia:2}).calcularVencimiento(cal),'2026-09-16'));
test('gracia cruza año mediante el calendario consultado',()=>assert.equal(crearFactura({...d,fechaEmision:'2026-12-24',tipo:'con_gracia',diasGracia:5}).calcularVencimiento(cal),'2027-01-05'));
test('gracia inválida y tipo desconocido se rechazan',()=>{
 for(const diasGracia of [undefined,0,-1,1.5,6,'2'])assert.throws(()=>crearFactura({...d,tipo:'con_gracia',diasGracia}));
 assert.throws(()=>crearFactura({...d,tipo:'otra'}));assert.throws(()=>crearFactura({...d,tipo:'estandar',diasGracia:2}));
});
test('datos anteriores sin tipo siguen siendo estándar',()=>assert.ok(crearFactura(d) instanceof FacturaEstandar));
test('preparación rechaza gracia incompleta sin llegar al HTTP',()=>assert.equal(prepararFacturas([{...d,tipo:'con_gracia'}],'2026-10-19')[0].codigo,'GRACIA_INVALIDA'));
test('nodo Code usa la misma jerarquía para factura con gracia',async()=>{
 const w=JSON.parse(await readFile(new URL('../n8n/FacturaLab_CR.json',import.meta.url)));const {Script}=await import('node:vm');
 const p=prepararFacturas([{...d,tipo:'con_gracia',diasGracia:2}],'2026-10-19')[0];
 const a={statusCode:200,body:respuestas[0].datos},b={statusCode:200,body:respuestas[1].datos};
 const $=name=>({item:{json:name==='Clasificar entrada'?p:a}});
 const result=new Script('(function(){'+w.nodes.find(n=>n.name==='Calcular con POO').parameters.jsCode+'})()').runInNewContext({$,$json:b});
 assert.deepEqual(JSON.parse(JSON.stringify(result.json)),procesarFactura(p,a,b));assert.equal(result.json.cambios.fechaVencimiento,'2026-10-20');
});
