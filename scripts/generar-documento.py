"""Requiere reportlab. Genera el documento de lógica de cuatro páginas."""
from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Flowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import html
ROOT=Path(__file__).resolve().parent.parent
C=colors.HexColor('#183B43');G=colors.HexColor('#25745E');PALE=colors.HexColor('#ECF4F0')
s=getSampleStyleSheet()
s.add(ParagraphStyle(name='Tit',fontName='Helvetica-Bold',fontSize=23,leading=27,textColor=C,spaceAfter=15))
s.add(ParagraphStyle(name='H',fontName='Helvetica-Bold',fontSize=13,leading=17,textColor=G,spaceBefore=12,spaceAfter=7))
s.add(ParagraphStyle(name='P',fontName='Helvetica',fontSize=11,leading=15,spaceAfter=9,textColor=C))
s.add(ParagraphStyle(name='Small',fontName='Helvetica',fontSize=9,leading=12,spaceAfter=7,textColor=colors.HexColor('#52616A')))
a=[]
def p(t,st='P'):a.append(Paragraph(t,s[st]))
def h(t):p(t,'H')
def title(k,t):p(k,'Small');p(t,'Tit')
def table(rows,widths):
 t=Table([[Paragraph(html.escape(str(c)),s['Small']) for c in row] for row in rows],colWidths=widths,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),PALE),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('LINEBELOW',(0,0),(-1,-1),.3,colors.HexColor('#DDE5E2'))]));a.append(t)
class Diagram(Flowable):
 def __init__(self):Flowable.__init__(self);self.width=500;self.height=345
 def draw(self):
  c=self.canv; c.saveState()
  texts=['Inicio manual o diario 08:00','Configuración y GET /facturas','Validar datos y construir la hija','IF factura válida','GET feriados de ambos años','Code con jerarquía y calendario','IF requiere actualización','PATCH y verificar respuesta']
  for i,text in enumerate(texts):
   y=308-i*40;c.setFillColor(PALE);c.setStrokeColor(G);c.roundRect(95,y,270,28,4,fill=1,stroke=1);c.setFillColor(C);c.setFont('Helvetica',9);c.drawCentredString(230,y+10,text)
   if i<7:c.setStrokeColor(G);c.line(230,y,230,y-12);c.line(230,y-12,227,y-8);c.line(230,y-12,233,y-8)
  for i,label in [(3,'Omitida o error'),(6,'Sin cambios o error')]:
   y=308-i*40;c.setFillColor(PALE);c.roundRect(388,y,110,28,4,fill=1);c.setFillColor(C);c.setFont('Helvetica',8);c.drawCentredString(443,y+10,label);c.line(365,y+14,388,y+14);c.drawString(368,y+19,'No')
  c.restoreState()
# 1
title('LABORATORIO 1 Y EXTENSIÓN RETO 1','Facturación con días hábiles')
p('Erian Badilla Fallas · FWD Costa Rica<br/>Programación Front End con IA Aplicada · 19 de octubre de 2026','Small')
h('Problema y propósito')
p('Una empresa necesita conocer la fecha de vencimiento de sus facturas y detectar cuáles agotaron su plazo. Sumar días naturales puede producir errores si el periodo incluye fines de semana o feriados. FacturaLab CR consulta JSON Server y los feriados de Nager.Date, calcula el vencimiento y actualiza los registros pendientes mediante n8n.')
p('La solución utiliza JavaScript puro, consola y un workflow, sin interfaz web. Los datos de facturas son ficticios y los feriados incluidos proceden de respuestas reales de la API. La extensión agrega dos políticas comerciales de vencimiento mediante herencia y polimorfismo, conservando el cálculo del laboratorio base.')
h('Reglas comunes')
p('El plazo contractual debe ser un entero entre uno y sesenta días hábiles. El conteo comienza después del día de emisión y excluye sábados, domingos y feriados nacionales de tipo Public reportados para Costa Rica. Se consultan el año de emisión y el siguiente, para permitir vencimientos en enero.')
p('Una factura permanece pendiente durante su último día de plazo y pasa a vencida solo en una fecha posterior. Pagadas, canceladas y ya vencidas no se modifican. Se validan ID, cliente, monto positivo, país, estado y fechas reales; una emisión futura se rechaza. Los IDs repetidos dentro del lote se bloquean y los valores ya coincidentes no generan otro PATCH.')
h('Alcance de la gracia comercial')
p('Una factura estándar conserva exclusivamente el plazo contractual. Una factura con gracia agrega de uno a cinco días hábiles pactados al vencimiento contractual; por ello, el plazo efectivo puede llegar a sesenta y cinco días. La clasificación del atraso utiliza ese vencimiento efectivo.')
p('Estas políticas pertenecen al ejercicio y no constituyen una interpretación de plazos legales de Costa Rica. No se calculan intereses, no se consulta Hacienda y no se emiten comprobantes electrónicos. Los montos de ejemplo se expresan en colones.','Small')
a.append(PageBreak())
#2
title('DISEÑO DEL WORKFLOW','Recorrido y decisiones')
p('El trigger manual sirve para demostrar la solución y el Schedule permite ejecutarla diariamente a las 08:00 de Costa Rica. El archivo se entrega inactivo; las consultas no necesitan API keys.')
a.append(Diagram())
h('Datos relacionados con cada factura')
p('El primer IF separa entradas inválidas y estados excluidos. Cada respuesta HTTP queda enlazada a su factura. Los dos calendarios se validan antes del cálculo y el segundo IF permite el PATCH únicamente si existen cambios. La nueva jerarquía vive en el mismo Code que procesa los registros estándar y con gracia.')
h('Resultado y manejo de errores')
p('Una fecha inválida, una gracia incompleta o un tipo desconocido producen un error visible sin escribir para ese registro. Si JSON Server no devuelve una colección o la API de feriados falla, no se inventan datos ni se guarda un vencimiento provisional. El timeout HTTP es de diez segundos.')
p('Después del PATCH se comprueban ID, estado y vencimiento. Una respuesta no confirmada produce ESCRITURA_NO_CONFIRMADA y requiere consultar el registro antes de repetir: un timeout podría suceder después de haber guardado el cambio.','Small')
a.append(PageBreak())
#3
title('EXTENSIÓN SELECCIONADA','Herencia y polimorfismo')
p('Se implementa el Reto 1 del documento de extensión, que permite elegir uno o varios retos y recomienda comenzar con uno. Factura es la clase base; FacturaEstandar y FacturaConGracia heredan de ella y sobreescriben el mismo método calcularVencimiento(calendario).')
table([['Clase','Responsabilidad y método'],['Factura','Valida datos y conserva el estado privado. evaluar llama a this.calcularVencimiento y decide el estado.'],['FacturaEstandar','Sobreescribe calcularVencimiento: suma únicamente los días hábiles contractuales a la emisión.'],['FacturaConGracia','Sobreescribe calcularVencimiento: obtiene el contractual con super y añade días hábiles de gracia. Valida gracia entera de 1 a 5.'],['CalendarioLaboral','Encapsula feriados y años disponibles. esDiaHabil y sumarDiasHabiles resuelven el calendario compartido.']],[135,365])
h('Una llamada común con respuestas distintas')
p('crearFactura selecciona la hija al construir el objeto. Después, el consumidor utiliza evaluar o calcularVencimiento sin preguntar por el tipo. JavaScript elige la implementación del objeto: ese despacho constituye el polimorfismo. Los registros anteriores sin tipo se interpretan como estándar.')
p('Ambas facturas del siguiente ejemplo se emiten el 15 de octubre de 2026 con un día hábil contractual. Se evalúan el 19 de octubre:')
table([['Tipo','Vencimiento efectivo','Estado'],['Estándar','16 de octubre de 2026','Vencida'],['Con dos días hábiles de gracia','20 de octubre de 2026','Pendiente']],[190,180,130])
p('La gracia no consume el sábado ni el domingo. El comando npm run demo:polimorfismo muestra los dos objetos bajo el mismo consumidor. FAC-005 lleva esta variante a JSON Server y n8n. Los constructores hijos utilizan super(datos), mientras que los campos privados y getters protegen los datos internos.')
p('La relación entre factura y calendario sigue siendo composición. La herencia se usa solo donde existe una relación coherente: las dos variantes son facturas.','Small')
a.append(PageBreak())
#4
title('INTEGRACIÓN Y VALIDACIÓN','Una fuente de negocio')
p('src/models/dominio.js contiene las clases y la fábrica. main.js evalúa instancias sin depender de n8n y demo-polimorfismo.js compara las hijas. build-workflow.js incorpora exactamente la fuente del dominio en los nodos Code al generar el JSON; no se mantiene un segundo algoritmo de fechas.')
h('Ejemplo completo al 19 de octubre de 2026')
table([['Factura','Política','Vencimiento','Resultado'],['FAC-001','Estándar · 3 hábiles','16 sep 2026','Vencida'],['FAC-002','Estándar · 1 hábil','19 oct 2026','Pendiente'],['FAC-003','Estándar · 15 hábiles','9 nov 2026','Pendiente'],['FAC-004','Pagada','Sin cambio','Omitida'],['FAC-005','1 hábil + 2 de gracia','20 oct 2026','Pendiente']],[80,180,125,115])
h('Pruebas y demostración')
p('La suite tiene veintidós pruebas sobre cálculo, errores, duplicados, repetición, herencia, polimorfismo y equivalencia del Code generado con las clases. El procedimiento aislado importa el JSON en n8n 2.23.4, ejecuta sobre JSON Server temporal y comprueba los registros resultantes. Las salidas realmente obtenidas se conservan en evidencias/VERIFICACION.md y runtime.json.')
p('La exposición debe mostrar el estado inicial y final, ejecutar otra vez para comprobar que no hay escrituras innecesarias y provocar una fecha inválida o un error de gracia. El estudiante todavía debe configurar la URL en su equipo, subir el repositorio y defender la solución en vivo.')
h('Decisiones técnicas y límites')
p('Se usan fechas YYYY-MM-DD recorridas en UTC y la fecha actual de Costa Rica para evitar cambios de día por conversión horaria. JSON Server 0.17.4 devuelve la colección completa sin paginación; para volumen alto se necesitarían filtros y caché anual. Los PATCH son deterministas, pero no hay protección transaccional contra un pago simultáneo ni garantía de ejecución exactamente una vez.')
p('Fuentes: consigna del Laboratorio 1 y Laboratorio1_Extension.docx; date.nager.at/api/v3/PublicHolidays/2026/CR y /2027/CR; docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/; github.com/typicode/json-server/tree/v0.17.4.','Small')
def foot(c,d):c.setFillColor(C);c.setFont('Helvetica',8);c.drawString(48,28,'FacturaLab CR · Laboratorio base y extensión Reto 1');c.drawRightString(550,28,str(d.page))
SimpleDocTemplate(str(ROOT/'docs/Logica_Negocio_Erian_Badilla.pdf'),pagesize=(600,800),leftMargin=50,rightMargin=50,topMargin=42,bottomMargin=46,title='Facturación con días hábiles y polimorfismo',author='Erian Badilla Fallas').build(a,onFirstPage=foot,onLaterPages=foot)
