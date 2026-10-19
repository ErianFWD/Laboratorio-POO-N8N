#!/usr/bin/env python3
"""Prueba aislada de n8n y JSON Server; nunca importa en la base de datos del usuario.
N8N_BIN=/ruta/n8n JSON_SERVER_BIN=/ruta/json-server python3 scripts/test-runtime.py
"""
import os,json,tempfile,pathlib,subprocess,threading,time,urllib.request,shutil,sys
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
ROOT=pathlib.Path(__file__).resolve().parent.parent
N8N=shutil.which(os.environ.get('N8N_BIN','n8n'))
JS=shutil.which(os.environ.get('JSON_SERVER_BIN','json-server'))
if not N8N or not JS: raise SystemExit('Instala n8n 2.23.4 en un entorno de pruebas y JSON Server 0.17.4, o define N8N_BIN y JSON_SERVER_BIN.')
mode={'fail':False}
class Api(BaseHTTPRequestHandler):
 def log_message(self,*args): pass
 def do_GET(self):
  year=self.path.rsplit('/',1)[-1]
  p=ROOT/f'tests/fixtures/feriados-{year}.json'
  ok=p.exists() and not mode['fail']
  self.send_response(200 if ok else 503); self.send_header('Content-Type','application/json'); self.end_headers()
  self.wfile.write(p.read_bytes() if ok else b'{"error":"servicio no disponible"}')
api=ThreadingHTTPServer(('127.0.0.1',0),Api);threading.Thread(target=api.serve_forever,daemon=True).start()
with tempfile.TemporaryDirectory(prefix='facturalab-test-') as tmp:
 t=pathlib.Path(tmp); db=t/'db.json'; db.write_bytes((ROOT/'tests/fixtures/db.seed.json').read_bytes())
 # Reserve an unused port for the disposable JSON Server.
 import socket
 with socket.socket() as s: s.bind(('127.0.0.1',0)); port=s.getsockname()[1]
 log=open(t/'jsonserver.log','w')
 js=subprocess.Popen([JS,'--watch',str(db),'--host','127.0.0.1','--port',str(port)],stdout=log,stderr=log)
 env={**os.environ,'N8N_USER_FOLDER':str(t/'n8n'),'N8N_DIAGNOSTICS_ENABLED':'false','N8N_VERSION_NOTIFICATIONS_ENABLED':'false','N8N_RUNNERS_ENABLED':'true','N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS':'true'}
 try:
  for i in range(100):
   try: urllib.request.urlopen(f'http://127.0.0.1:{port}/facturas',timeout=1);break
   except Exception: time.sleep(.1)
  else: raise RuntimeError('JSON Server no arrancó')
  w=json.loads((ROOT/'n8n/FacturaLab_CR.json').read_text())
  for n in w['nodes']:
   if n['name']=='Configuracion': n['parameters']['jsCode']=n['parameters']['jsCode'].replace("const fechaDemo = '';","const fechaDemo = '2026-10-19';").replace('http://localhost:3000',f'http://127.0.0.1:{port}')
   if n['name']=='Feriados año emisión': n['parameters']['url']="={{ 'http://127.0.0.1:"+str(api.server_port)+"/' + $('Clasificar entrada').item.json.anio }}"
   if n['name']=='Feriados año siguiente': n['parameters']['url']="={{ 'http://127.0.0.1:"+str(api.server_port)+"/' + ($('Clasificar entrada').item.json.anio + 1) }}"
  export=t/'workflow.json'; export.write_text(json.dumps(w))
  def cli(args):
   p=subprocess.run([N8N,*args],env=env,capture_output=True,text=True,timeout=180)
   if p.returncode: raise RuntimeError(p.stdout[-6000:]+p.stderr[-3000:])
   return p.stdout
  version=cli(['--version']).strip()
  cli(['import:workflow','--input='+str(export)])
  results=[]
  def run(label):
   out=cli(['execute','--id=facturaLabCR01','--rawOutput'])
   start=out.find('{"data":')
   if start<0:
    # rawOutput is JSON formatted across lines in some releases.
    starts=[i for i,c in enumerate(out) if c=='{']
    for i in starts:
     try:
      candidate,_=json.JSONDecoder().raw_decode(out[i:])
      if isinstance(candidate,dict) and 'data' in candidate: start=i;break
     except ValueError: pass
   if start<0: raise RuntimeError('No se encontró el resultado de ejecución: '+out[-3000:])
   execution,_=json.JSONDecoder().raw_decode(out[start:])
   data=execution['data']; result=data.get('resultData',{})
   if result.get('error'): raise RuntimeError(json.dumps(result['error']))
   nodes=result.get('runData',{})
   if not nodes: raise RuntimeError('No se encontraron salidas de nodos')
   outputs={}
   for name,runs in nodes.items():
    outputs[name]=[item['json'] for run in runs for group in run.get('data',{}).get('main',[]) for item in group or []]
   results.append({'caso':label,'nodos':outputs})
   return outputs
  first=run('válido: feriados y persistencia')
  actual=json.loads(urllib.request.urlopen(f'http://127.0.0.1:{port}/facturas').read())
  byid={f['id']:f for f in actual}
  assert byid['FAC-001']['estado']=='vencida' and byid['FAC-001']['fechaVencimiento']=='2026-09-16'
  assert byid['FAC-002']['estado']=='pendiente' and byid['FAC-002']['fechaVencimiento']=='2026-10-19'
  assert byid['FAC-003']['fechaVencimiento']=='2026-11-09'
  assert byid['FAC-004']['estado']=='pagada' and 'fechaVencimiento' not in byid['FAC-004']
  assert byid['FAC-005']['fechaVencimiento']=='2026-10-20' and byid['FAC-005']['estado']=='pendiente'
  assert len(first.get('Verificar escritura',[]))==4
  second=run('repetición: cero escrituras adicionales')
  assert not second.get('Actualizar factura')
  # Insert only synthetic invalid and duplicate invoices in the disposable store.
  seed=json.loads((ROOT/'tests/fixtures/db.seed.json').read_text()); a=seed['facturas'][0]
  malformed={**a,'id':'INVALIDA','fechaEmision':'2026-02-30'}
  urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:{port}/facturas',data=json.dumps(malformed).encode(),headers={'Content-Type':'application/json'},method='POST')).read()
  invalid=run('inválido: fecha inexistente sin PATCH')
  assert any(x.get('id')=='INVALIDA' and x.get('codigo')=='FECHA_INVALIDA' for x in invalid['Entrada omitida o error'])
  assert not invalid.get('Actualizar factura')
  bad_grace={**a,'id':'GRACIA-INVALIDA','tipo':'con_gracia','diasGracia':0}
  urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:{port}/facturas',data=json.dumps(bad_grace).encode(),headers={'Content-Type':'application/json'},method='POST')).read()
  extension_error=run('extensión: gracia inválida sin PATCH')
  assert any(x.get('id')=='GRACIA-INVALIDA' and x.get('codigo')=='GRACIA_INVALIDA' for x in extension_error['Entrada omitida o error'])
  assert not extension_error.get('Actualizar factura')
  mode['fail']=True
  failed=run('API 503: no se modifica ninguna factura')
  assert any(x.get('codigo')=='API_FERIADOS' for x in failed['Sin escritura'])
  assert not failed.get('Actualizar factura')
  if '--live' in sys.argv:
   # Run the real external reads against a local, disposable destination only.
   live=json.loads((ROOT/'n8n/FacturaLab_CR.json').read_text())
   for n in live['nodes']:
    if n['name']=='Configuracion': n['parameters']['jsCode']=n['parameters']['jsCode'].replace("const fechaDemo = '';","const fechaDemo = '2026-10-19';").replace('http://localhost:3000',f'http://127.0.0.1:{port}')
   for item in seed['facturas']:
    urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:{port}/facturas/'+item['id'],data=json.dumps(item).encode(),headers={'Content-Type':'application/json'},method='PUT')).read()
   export.write_text(json.dumps(live));cli(['import:workflow','--input='+str(export)])
   real=run('API real Nager.Date: consultas y persistencia local')
   assert len(real.get('Verificar escritura',[]))==4, json.dumps(real.get('Sin escritura',[]))
  # Same stable ID received again: no new POST is used in this workflow.
  summary={'runtime_verified':True,'n8n_version':version,'json_server_version':'0.17.4','destinos':'JSON Server temporal + API HTTP local con fixtures de Nager.Date; sin credenciales. Con --live, también se consulta Nager.Date real.','casos':results,'nota':'La prueba de IDs duplicados en un lote está en tests/dominio.test.js. La repetición entre ejecuciones se verifica aquí. JSON Server carece de CAS para carreras concurrentes.'}
  (ROOT/'evidencias/runtime.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
  print(json.dumps({'runtime_verified':True,'n8n_version':version,'casos':[r['caso'] for r in results]},ensure_ascii=False,indent=2))
 finally:
  js.terminate();js.wait(timeout=10);log.close();api.shutdown()
