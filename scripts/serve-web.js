import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
const root=fileURLToPath(new URL('../web/',import.meta.url));
const port=Number(process.env.PORT||8080);
if(!Number.isInteger(port)||port<0||port>65535)throw new Error('PORT debe ser un puerto válido.');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(resolve(root)+sep)||!(await stat(path)).isFile()){res.writeHead(404);res.end('Archivo no encontrado');return;}
  res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(await readFile(path));
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Archivo no encontrado');}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'El puerto está ocupado. Cierra la otra instancia o configura PORT.':e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`FacturaLab CR visual: http://localhost:${server.address().port}\nPresiona Ctrl+C para cerrar.`));
