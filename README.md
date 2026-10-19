# FacturaLab CR

Laboratorio #1 - Soluciones de negocio con POO y n8n. Erian Badilla Fallas.

Automatiza el vencimiento de facturas con días hábiles, JSON Server y los feriados nacionales de Costa Rica de Nager.Date. JavaScript puro, sin interfaz web. La fecha de vencimiento depende de cada factura; no se asigna un plazo fijo a todas.

## Abrir la web visual

La carpeta `web/` incluye la versión en beige, blanco y verde duende. Desde la raíz del proyecto ejecuta:

```bash
npm run web
```

Abre `http://localhost:8080`. Este comando solo necesita Node.js y no requiere iniciar JSON Server ni n8n. Incluye el simulador, el recorrido del flujo, los ejemplos de error y la jerarquía de clases. Los cálculos usan los mismos modelos del laboratorio y los calendarios locales de 2026-2027. La demostración permite emisiones de 2026.

La web es material complementario para explicar el laboratorio. La consola y el workflow siguen siendo la solución operativa. Si modificas `src/models/dominio.js`, regenera el workflow y actualiza también `web/assets/dominio.js` antes de volver a empaquetar.

## Empezar en Windows o en otro sistema con Node.js 22 o superior

Abre la carpeta del proyecto en VS Code y ejecuta:

```bash
npm install
npm run demo
npm test
npm run db
```

Deja la última terminal abierta. En otra terminal:

```bash
npm start
```

`npm run demo` usa fixtures y la fecha 2026-10-19, sin red. `npm start` consulta JSON Server y la API real, muestra instancias y resultados en consola y NO escribe: la persistencia la realiza n8n. Para una fecha fija, copia `.env.example` como `.env` y ejecuta `node --env-file=.env src/main.js`. Sin esa variable se usa el día actual en Costa Rica.

## Importar en n8n

Versión objetivo: n8n 2.23.4; JSON Server 0.17.4. Si usas otra versión, confirma la compatibilidad antes de activar. Nodos: Manual Trigger v1, Schedule Trigger v1.2, HTTP Request v4.2, Code v2 e IF v2.2.

1. Abre n8n y elige importar desde archivo. Selecciona `n8n/FacturaLab_CR.json`.
2. Abre el nodo **Configuracion**. Si n8n y JSON Server corren directamente en tu PC, deja `http://localhost:3000`. Con Docker Compose cambia a `http://jsonserver:3000`. Si solo n8n corre en Docker Desktop y JSON Server en el host, usa `http://host.docker.internal:3000` y permite conexiones locales según tu entorno.
3. Para reproducir los resultados de la guía, cambia `const fechaDemo = '';` por `const fechaDemo = '2026-10-19';`. Después de la demostración vuelve a dejarla vacía.
4. Confirma que `http://localhost:3000/facturas` devuelve los cinco registros del ejemplo. Los datos son ficticios; las respuestas de feriados incluidas se descargaron de la API.
5. Ejecuta desde **Inicio manual**. Revisa **Entrada omitida o error**, **Sin escritura** y **Verificar escritura**, según la rama.
6. Comprueba en JSON Server que FAC-001 quedó vencida, FAC-002 vence el 19 de octubre y FAC-003 vence el 9 de noviembre. FAC-004 permanece pagada.
7. FAC-005 usa dos días hábiles de gracia: su vencimiento contractual es el 16 de octubre y el efectivo el 20 de octubre. Sigue pendiente el día 19.
8. Ejecuta una segunda vez: FAC-001 y FAC-004 se omiten; FAC-002 y FAC-003 no necesitan otra escritura.

El archivo se entrega con `active: false`. No se necesita ninguna API key ni binding de credenciales. No publiques/actives el horario durante las primeras pruebas. Si decides automatizarlo, deja la fecha de demo vacía y activa/publica el flujo en tu instancia: el horario está configurado a las 08:00 de Costa Rica.

## Alternativa con Docker

Con Docker Desktop disponible:

```bash
docker compose up -d
```

Abre `http://localhost:5678`, crea tu usuario local e importa el JSON. En **Configuracion** cambia la URL a `http://jsonserver:3000`. Los datos de n8n se mantienen en un volumen y db.json en el proyecto. Usa una copia de este laboratorio para probar; el compose crea una instancia distinta y no requiere reutilizar tu base de datos de n8n actual.

## Extensión elegida: Reto 1

Se implementa la jerarquía `Factura → FacturaEstandar / FacturaConGracia`. Ambas hijas sobreescriben `calcularVencimiento(calendario)`. La clase base mantiene `evaluar`, que llama al método polimórficamente, sin preguntar por el tipo. `crearFactura` selecciona la clase al construirla. Un registro anterior sin `tipo` se trata como estándar.

- `tipo: "estandar"`: usa el plazo contractual original; no permite gracia positiva.
- `tipo: "con_gracia"`: suma entre 1 y 5 días hábiles al vencimiento contractual, mediante `super.calcularVencimiento`. `diasGracia` es obligatorio y entero.
- La gracia es una regla comercial pactada del ejemplo, no un derecho legal. El estado de atraso se decide usando el vencimiento efectivo.
- El plazo contractual sigue limitado a 1-60 días; la gracia se suma por separado y puede llevar el total hasta 65.

Ejecuta `npm run demo:polimorfismo`: los mismos datos producen vencimiento 2026-10-16 para la estándar y 2026-10-20 con dos días de gracia. Al evaluar el 19, la primera está vencida y la segunda pendiente.

La misma jerarquía se incluye automáticamente en el Code de n8n. Se agregaron pruebas específicas y FAC-005. La extensión permite escoger uno o varios retos: esta entrega implementa el **Reto 1**, sin añadir los retos 2, 3 o 4. Consulta `docs/EXTENSION_RETO_1.md`.

## Reglas implementadas

1. El plazo debe ser entero entre 1 y 60 días hábiles.
2. El día de emisión no se cuenta.
3. Los sábados y domingos no cuentan.
4. Los feriados nacionales de tipo Public de CR no cuentan; se consultan el año de emisión y el siguiente para cruzar diciembre.
5. La factura queda vencida solo si la evaluación es posterior al vencimiento; durante el día de vencimiento sigue pendiente.
6. Solo se modifican facturas pendientes. Pagadas, canceladas y ya vencidas se omiten.
7. Se rechazan ID inseguro, cliente vacío, monto no positivo, fechas inexistentes y emisiones futuras.
8. Si falla el calendario, no se inventan feriados ni se actualiza esa factura.
9. IDs duplicados en un lote se rechazan; si vencimiento y estado ya coinciden, no se emite otro PATCH.
10. Toda escritura debe devolver el ID, vencimiento y estado esperados. Si no se confirma, se informa un resultado incierto y se revisa antes de repetir.

## Diseño y estructura

- `src/models/dominio.js`: clases `Factura`, `CalendarioLaboral`, errores y funciones de procesamiento.
- `src/services/http.js`: consultas con timeout, fuera de las entidades.
- `src/demo-polimorfismo.js`: demostración de las dos hijas con un consumidor común.
- `src/main.js`: instancias y evaluación independiente, solo lectura.
- `jsonserver/db.json`: fuente y destino de facturas.
- `scripts/build-workflow.js`: incorpora exactamente las clases al JSON; no mantengas otra lógica manual dentro de n8n.
- `scripts/check_workflow.py`: validador estructural incluido por la skill n8n-workflow-check; no ejecuta nodos.
- `scripts/test-runtime.py`: prueba en una instancia desechable, con destinos locales de prueba.
- `tests/`: pruebas y fixtures de feriados; no sustituyen las llamadas de producción.
- `docs/`: documento de lógica, diagrama, guion oral y trazabilidad.
- `evidencias/`: resultados obtenidos durante la preparación.

Para regenerar tras modificar las clases:

```bash
npm run build:workflow
npm test
python scripts/check_workflow.py n8n/FacturaLab_CR.json
```

Vuelve a importar el JSON regenerado. La comparación del Code con las clases se incluye en los tests.

## Mostrar dos errores durante la exposición

**Datos inválidos:** cambia temporalmente la fecha de FAC-003 a `2026-02-30` en tu copia de db.json. Ejecuta: aparece `FECHA_INVALIDA`, no se consulta el calendario de esa factura y no se escribe. Restablece el dato.

**Servicio externo caído:** en tu copia del workflow cambia ambas URLs de feriados a `http://127.0.0.1:1/feriados`. Ejecuta: `API_FERIADOS` en **Sin escritura**, sin PATCH. Restaura las URLs antes de presentar el caso normal. Un HTTP 503 también se controla; `Never Error` entrega el status al Code y `onError` controla errores de transporte.

Para volver a los cinco datos iniciales en la copia de demostración: detén JSON Server, ejecuta `npm run reset:demo` y arráncalo de nuevo. Esto sobrescribe solo `jsonserver/db.json` del proyecto y no debe usarse con información real.

## Prueba aislada del workflow

El script necesita los ejecutables de n8n 2.23.4 y JSON Server 0.17.4 disponibles en PATH, o las variables `N8N_BIN` y `JSON_SERVER_BIN`. Crea una base temporal nueva, importa y ejecuta el flujo con API simulada por HTTP. No toca tu instancia ni tus credenciales.

```bash
python scripts/test-runtime.py
# Incluye además una ejecución con Nager.Date real:
python scripts/test-runtime.py --live
```

Consulta `evidencias/VERIFICACION.md` para saber qué se ejecutó realmente. La API real se usa en el flujo entregado; los fixtures se emplean en las pruebas aisladas.

## Límites y decisiones

- Se aplica un calendario comercial acordado para el laboratorio: sábados, domingos y feriados nacionales reportados por la API. No constituye una interpretación de plazos legales de Costa Rica.
- Datos de demostración ficticios y montos en colones. No se hace contabilidad fiscal ni se emiten comprobantes electrónicos.
- JSON Server se usa sin paginación: GET /facturas devuelve la colección completa en 0.17.4. Para grandes volúmenes harían falta paginación y consultas por estado.
- El workflow consulta dos años por factura: fácil de demostrar, pero para volumen alto conviene caché anual. El CLI ya reutiliza respuestas dentro de la ejecución.
- Un PATCH asigna valores deterministas sobre un ID existente, no crea una factura nueva. Esto evita cambios adicionales al repetir el proceso secuencialmente; no garantiza exactamente una ejecución ni protege carreras con pagos simultáneos. JSON Server no ofrece una restricción transaccional/CAS: en producción se necesita base de datos con control de concurrencia.
- No se reintentan automáticamente escrituras. Un timeout puede ocurrir después de guardar; primero revisa GET /facturas/ID.
- Los HTTP GET también tienen timeout de 10 s; ante fallo se informa el error y se conserva el estado. No existe recuperación silenciosa con datos viejos.

## Entrega en Git

El ZIP es para trabajar localmente; el docente pide el enlace del repositorio.

Crea un repositorio vacío en GitHub y ejecuta, sustituyendo la URL:

```bash
git init
git add .
git commit -m "feat: integrar facturación con POO y n8n"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

No subas node_modules, .env ni credenciales. Incluye el JSON de n8n, el código, el documento y las evidencias. El guion es apoyo: revisa el documento y adáptalo a tus palabras antes de exponer.

## Fuentes técnicas

- Consigna del laboratorio adjuntada por el estudiante.
- Nager.Date, API v3: https://date.nager.at/api/v3/PublicHolidays/2026/CR
- Año siguiente: https://date.nager.at/api/v3/PublicHolidays/2027/CR
- Especificación de Nager.Date: https://date.nager.at/swagger/index.html
- HTTP Request: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/
- Code: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/
- JSON Server 0.17.4: https://github.com/typicode/json-server/tree/v0.17.4
