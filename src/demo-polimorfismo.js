// Mismo consumidor, mismo método: cada objeto decide cómo calcular.
import {readFile} from 'node:fs/promises';
import {crearFactura,CalendarioLaboral} from './models/dominio.js';
const respuestas=await Promise.all([2026,2027].map(async anio=>({anio,datos:JSON.parse(await readFile(new URL(`../tests/fixtures/feriados-${anio}.json`,import.meta.url)))})));
const calendario=new CalendarioLaboral(respuestas);
const comunes={id:'DEMO',cliente:'Cliente del ejemplo',monto:10000,pais:'CR',fechaEmision:'2026-10-15',plazoDiasHabiles:1,estado:'pendiente'};
const facturas=[crearFactura({...comunes,tipo:'estandar'}),crearFactura({...comunes,tipo:'con_gracia',diasGracia:2})];
for(const factura of facturas) {
 console.log(JSON.stringify({clase:factura.constructor.name,vencimiento:factura.calcularVencimiento(calendario),evaluacion:factura.evaluar(calendario,'2026-10-19')},null,2));
}
