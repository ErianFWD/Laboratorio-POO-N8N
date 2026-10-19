import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const source=await readFile(new URL('src/models/dominio.js',root),'utf8');
const negocio=source.replace(/^export /gm,'');
const nodes=[]; const connections={};
function add(name,type,typeVersion,parameters,x,y,extra={}) {nodes.push({id:createHash('sha256').update(name).digest('hex').slice(0,24),name,type:'n8n-nodes-base.'+type,typeVersion,position:[x,y],parameters,...extra});}
function link(from,to,output=0){connections[from]??={main:[]};while(connections[from].main.length<=output)connections[from].main.push([]);connections[from].main[output].push({node:to,type:'main',index:0});}
function code(name,body,x,y,domain=false,mode='runOnceForAllItems'){add(name,'code',2,{mode,jsCode:(domain?negocio+'\n':'')+body},x,y);}
function condition(name,key,value,x,y){add(name,'if',2.2,{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:'condicion',leftValue:`={{ $json.${key} }}`,rightValue:value,operator:{type:'string',operation:'equals'}}],combinator:'and'},options:{}},x,y);}
const options={response:{response:{fullResponse:true,neverError:true,responseFormat:'json'}},timeout:10000};
function http(name,url,x,y,extra={}){add(name,'httpRequest',4.2,{url,options,...extra},x,y,{onError:'continueRegularOutput'});}
add('Inicio manual','manualTrigger',1,{},0,0);
add('Cada día 8 AM','scheduleTrigger',1.2,{rule:{interval:[{field:'cronExpression',expression:'0 8 * * *'}]}},0,180);
code('Configuracion',`// Cambia jsonServerUrl a http://jsonserver:3000 si usas docker-compose.
// fechaDemo vacía usa la fecha actual de Costa Rica. Demo reproducible: 2026-10-19.
const fechaDemo = '';
const hoy=fechaDemo || new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
return [{json:{jsonServerUrl:'http://localhost:3000',hoy}}];`,230,0);
http('Consultar facturas',"={{ $('Configuracion').first().json.jsonServerUrl + '/facturas' }}",460,0);
code('Preparar facturas',`const r=$input.first().json;
if(r.statusCode!==200 || !Array.isArray(r.body)) return [{json:{valida:false,accion:'error',codigo:'JSON_SERVER',mensaje:'No se recibió la colección. No se realizan escrituras.'}}];
return prepararFacturas(r.body,$('Configuracion').first().json.hoy).map(json=>({json,pairedItem:{item:0}}));`,690,0,true);
// Normalize to string explicitly to keep IF strict type validation simple.
code('Clasificar entrada',`return $input.all().map((item,i)=>({json:{...item.json,ruta:item.json.valida?'procesar':'informar'},pairedItem:{item:i}}));`,920,0);
condition('Factura válida','ruta','procesar',1150,0);
http('Feriados año emisión',"={{ 'https://date.nager.at/api/v3/PublicHolidays/' + $('Clasificar entrada').item.json.anio + '/CR' }}",1380,-100);
http('Feriados año siguiente',"={{ 'https://date.nager.at/api/v3/PublicHolidays/' + ($('Clasificar entrada').item.json.anio + 1) + '/CR' }}",1610,-100);
code('Calcular con POO',`const p=$('Clasificar entrada').item.json;
return {json:procesarFactura(p,$('Feriados año emisión').item.json,$json)};`,1840,-100,true,'runOnceForEachItem');
condition('Requiere actualización','accion','actualizar',2070,-100);
http('Actualizar factura',"={{ $('Configuracion').first().json.jsonServerUrl + '/facturas/' + encodeURIComponent($json.id) }}",2300,-200,{method:'PATCH',sendBody:true,specifyBody:'json',jsonBody:'={{ JSON.stringify($json.cambios) }}'});
code('Verificar escritura',`const r=$json; const previsto=$('Calcular con POO').item.json;
const ok=r.statusCode===200 && String(r.body?.id)===String(previsto.id) && r.body?.estado===previsto.cambios.estado && r.body?.fechaVencimiento===previsto.cambios.fechaVencimiento;
return {json:ok?{id:previsto.id,accion:'actualizada',factura:r.body}:{id:previsto.id,accion:'error',codigo:'ESCRITURA_NO_CONFIRMADA',mensaje:'Verifica GET /facturas/id antes de reintentar: el resultado puede ser incierto.'}};`,2530,-200,false,'runOnceForEachItem');
code('Sin escritura',`return $input.all();`,2300,100);
code('Entrada omitida o error',`return $input.all();`,1380,220);
link('Inicio manual','Configuracion');link('Cada día 8 AM','Configuracion');link('Configuracion','Consultar facturas');link('Consultar facturas','Preparar facturas');link('Preparar facturas','Clasificar entrada');link('Clasificar entrada','Factura válida');link('Factura válida','Feriados año emisión');link('Factura válida','Entrada omitida o error',1);link('Feriados año emisión','Feriados año siguiente');link('Feriados año siguiente','Calcular con POO');link('Calcular con POO','Requiere actualización');link('Requiere actualización','Actualizar factura');link('Requiere actualización','Sin escritura',1);link('Actualizar factura','Verificar escritura');
const workflow={id:'facturaLabCR01',name:'FacturaLab CR - POO y días hábiles',active:false,nodes,connections,settings:{executionOrder:'v1',timezone:'America/Costa_Rica'},pinData:{}};
await writeFile(new URL('n8n/FacturaLab_CR.json',root),JSON.stringify(workflow,null,2)+'\n');
console.log('Workflow generado desde la fuente de negocio. SHA256: '+createHash('sha256').update(source).digest('hex'));
