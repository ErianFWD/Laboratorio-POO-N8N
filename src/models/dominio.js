// Fuente única de negocio. build-workflow.js incorpora este archivo en los nodos Code.
export class ErrorNegocio extends Error {
  constructor(codigo, mensaje) { super(mensaje); this.name = 'ErrorNegocio'; this.codigo = codigo; }
}
export function fechaValida(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto))
    throw new ErrorNegocio('FECHA_INVALIDA', 'Se requiere una fecha YYYY-MM-DD.');
  const d = new Date(texto + 'T00:00:00Z');
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0,10) !== texto || +texto.slice(0,4) < 2000 || +texto.slice(0,4) > 2098)
    throw new ErrorNegocio('FECHA_INVALIDA', 'Fecha inexistente o fuera del rango 2000-2098.');
  return d;
}
export class CalendarioLaboral {
  #feriados = new Set(); #anios;
  constructor(respuestas, pais = 'CR') {
    if (pais !== 'CR') throw new ErrorNegocio('PAIS_NO_SOPORTADO', 'Esta solución usa el calendario nacional CR.');
    this.#anios = new Set();
    if (!Array.isArray(respuestas) || respuestas.length !== 2)
      throw new ErrorNegocio('API_FERIADOS', 'Se requieren dos respuestas anuales de feriados.');
    for (const {anio, datos} of respuestas) {
      if (!Number.isInteger(anio) || !Array.isArray(datos) || datos.length === 0 || this.#anios.has(anio))
        throw new ErrorNegocio('API_FERIADOS', 'Respuesta anual de feriados vacía o inválida.');
      this.#anios.add(anio);
      for (const h of datos) {
        fechaValida(h.date);
        if (+h.date.slice(0,4) !== anio || h.countryCode !== pais || typeof h.global !== 'boolean' || !Array.isArray(h.types))
          throw new ErrorNegocio('API_FERIADOS', 'Feriado con país, año o formato incorrecto.');
        if (h.global && h.types.includes('Public')) this.#feriados.add(h.date);
      }
    }
    const [a,b] = [...this.#anios].sort();
    if (b !== a+1) throw new ErrorNegocio('API_FERIADOS', 'Los años deben ser consecutivos.');
  }
  esDiaHabil(fecha) {
    const d = fechaValida(fecha);
    if (!this.#anios.has(d.getUTCFullYear())) throw new ErrorNegocio('ANIO_SIN_FERIADOS', 'Falta consultar el calendario del año.');
    return ![0,6].includes(d.getUTCDay()) && !this.#feriados.has(fecha);
  }
  sumarDiasHabiles(emision, dias) {
    const d = fechaValida(emision);
    if (!Number.isInteger(dias) || dias < 1 || dias > 60) throw new ErrorNegocio('PLAZO_INVALIDO', 'Plazo entero de 1 a 60 días hábiles.');
    let acumulados=0;
    // Tope de seguridad: nunca devolver un vencimiento parcial.
    for (let intentos=0; intentos<366; intentos++) {
      d.setUTCDate(d.getUTCDate()+1);
      const fecha=d.toISOString().slice(0,10);
      if (this.esDiaHabil(fecha)) acumulados++;
      if (acumulados===dias) return fecha;
    }
    throw new ErrorNegocio('CALENDARIO_INVALIDO', 'No se completó el plazo dentro de un año.');
  }
}
export class Factura {
  #datos;
  constructor(datos) {
    if (!datos || typeof datos !== 'object') throw new ErrorNegocio('FACTURA_INVALIDA', 'Faltan datos de factura.');
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(String(datos.id ?? ''))) throw new ErrorNegocio('ID_INVALIDO', 'ID obligatorio y seguro para URL.');
    if (typeof datos.cliente !== 'string' || !datos.cliente.trim()) throw new ErrorNegocio('CLIENTE_INVALIDO', 'Cliente obligatorio.');
    if (typeof datos.monto !== 'number' || !Number.isFinite(datos.monto) || datos.monto<=0) throw new ErrorNegocio('MONTO_INVALIDO', 'El monto debe ser un número positivo.');
    if (datos.pais !== 'CR') throw new ErrorNegocio('PAIS_NO_SOPORTADO', 'La factura debe pertenecer al calendario CR.');
    fechaValida(datos.fechaEmision);
    if (!Number.isInteger(datos.plazoDiasHabiles) || datos.plazoDiasHabiles<1 || datos.plazoDiasHabiles>60) throw new ErrorNegocio('PLAZO_INVALIDO', 'Plazo entero de 1 a 60 días hábiles.');
    if (!['pendiente','pagada','cancelada','vencida'].includes(datos.estado)) throw new ErrorNegocio('ESTADO_INVALIDO', 'Estado de factura desconocido.');
    this.#datos=Object.freeze({...datos});
  }
  get id() { return String(this.#datos.id); }
  get fechaEmision() { return this.#datos.fechaEmision; }
  get plazoDiasHabiles() { return this.#datos.plazoDiasHabiles; }
  calcularVencimiento(calendario) { return calendario.sumarDiasHabiles(this.fechaEmision,this.#datos.plazoDiasHabiles); }
  evaluar(calendario, hoy) {
    fechaValida(hoy);
    if (this.#datos.estado !== 'pendiente') return {id:this.id,accion:'omitida',motivo:'Solo se procesan facturas pendientes.'};
    if (this.fechaEmision>hoy) throw new ErrorNegocio('EMISION_FUTURA','La emisión no puede ser posterior a la fecha de evaluación.');
    const fechaVencimiento=this.calcularVencimiento(calendario);
    const estado=hoy>fechaVencimiento ? 'vencida' : 'pendiente';
    const cambios={fechaVencimiento,estado};
    return {id:this.id,accion:this.#datos.fechaVencimiento===fechaVencimiento && this.#datos.estado===estado ? 'sin_cambios' : 'actualizar',cambios};
  }
}
// Extensión Reto 1: dos subclases sobreescriben el mismo método.
export class FacturaEstandar extends Factura {
  constructor(datos) {
    super(datos);
    if (datos.diasGracia != null && datos.diasGracia !== 0)
      throw new ErrorNegocio('GRACIA_NO_APLICA', 'Una factura estándar no permite días de gracia.');
  }
  calcularVencimiento(calendario) {
    return calendario.sumarDiasHabiles(this.fechaEmision, this.plazoDiasHabiles);
  }
}
export class FacturaConGracia extends Factura {
  #diasGracia;
  constructor(datos) {
    super(datos);
    if (!Number.isInteger(datos.diasGracia) || datos.diasGracia < 1 || datos.diasGracia > 5)
      throw new ErrorNegocio('GRACIA_INVALIDA', 'La gracia debe ser de 1 a 5 días hábiles, acordados en la factura.');
    this.#diasGracia = datos.diasGracia;
  }
  get diasGracia() { return this.#diasGracia; }
  calcularVencimiento(calendario) {
    const contractual = super.calcularVencimiento(calendario);
    return calendario.sumarDiasHabiles(contractual, this.#diasGracia);
  }
}
export function crearFactura(datos) {
  // La selección se hace una sola vez; evaluar() usa despacho polimórfico.
  const tipo = datos?.tipo ?? 'estandar';
  if (tipo === 'estandar') return new FacturaEstandar(datos);
  if (tipo === 'con_gracia') return new FacturaConGracia(datos);
  throw new ErrorNegocio('TIPO_INVALIDO', 'Tipo de factura desconocido. Use estandar o con_gracia.');
}
export function prepararFacturas(datos,hoy) {
  fechaValida(hoy);
  if (!Array.isArray(datos)) throw new ErrorNegocio('JSON_SERVER','JSON Server debe devolver un arreglo.');
  const frecuencias=new Map();
  for(const d of datos) if(d && d.id!=null) frecuencias.set(String(d.id),(frecuencias.get(String(d.id))||0)+1);
  const salida=[];
  for(const d of datos) {
    try {
      if(d && frecuencias.get(String(d.id))>1) throw new ErrorNegocio('ID_DUPLICADO','ID repetido en el lote; no se actualiza.');
      const f=crearFactura(d);
      if(d.estado!=='pendiente') {salida.push({valida:false,id:f.id,accion:'omitida',motivo:'Estado no pendiente.'});continue;}
      if(f.fechaEmision>hoy) throw new ErrorNegocio('EMISION_FUTURA','La emisión es posterior a la evaluación.');
      salida.push({valida:true,factura:d,anio:+f.fechaEmision.slice(0,4),hoy});
    } catch(e) {salida.push({valida:false,id:d?.id??null,accion:'error',codigo:e.codigo||'DATOS_INVALIDOS',mensaje:e.message});}
  }
  return salida.length ? salida : [{valida:false,accion:'sin_facturas',motivo:'La colección está vacía.'}];
}
export function procesarFactura(preparada, respuestaActual, respuestaSiguiente) {
  try {
    for(const r of [respuestaActual,respuestaSiguiente]) if(r?.statusCode!==200 || !Array.isArray(r.body))
      throw new ErrorNegocio('API_FERIADOS','API de feriados no disponible o respuesta inválida. No se modifica la factura.');
    const calendario=new CalendarioLaboral([{anio:preparada.anio,datos:respuestaActual.body},{anio:preparada.anio+1,datos:respuestaSiguiente.body}]);
    return crearFactura(preparada.factura).evaluar(calendario,preparada.hoy);
  } catch(e) {return {id:preparada.factura?.id,accion:'error',codigo:e.codigo||'ERROR_CALCULO',mensaje:e.message};}
}
