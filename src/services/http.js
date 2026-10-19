export async function solicitar(url, options={}) {
  try {
    const r=await fetch(url,{...options,signal:AbortSignal.timeout(10000)});
    return {statusCode:r.status,body:await r.json()};
  } catch(e) { return {statusCode:0,error:e.name,mensaje:'No se pudo consultar el servicio o interpretar el JSON.'}; }
}
