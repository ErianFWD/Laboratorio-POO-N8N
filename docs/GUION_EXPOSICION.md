# Guion para exponer FacturaLab CR

Duración orientativa: 7 a 10 minutos. Ensaya con tus palabras; debes defender todo el código.

## Antes de entrar

- Ejecuta `npm install`, `npm test` y `npm run demo`.
- Inicia JSON Server con `npm run db` y abre `/facturas`.
- Importa el workflow, revisa la URL y fija la fecha de demo a `2026-10-19`.
- Usa la copia de demostración con los cinco registros iniciales. Ten el JSON original disponible para restaurar las URLs.
- Mantén el horario desactivado hasta que decidas activarlo.

## 1. Problema de negocio

“Elegí la central de facturación porque una fecha mal calculada puede marcar como vencida una factura que todavía está dentro de su plazo. Mi solución consulta las facturas y el calendario de feriados, aplica el plazo en días hábiles y actualiza únicamente las facturas pendientes.”

Aclara que son reglas comerciales del ejercicio, no una herramienta de cálculo legal.

## 2. Explicar el modelo y la jerarquía

Abre `src/models/dominio.js`.

- `Factura` valida datos, conserva una copia de su estado y determina el vencimiento y el cambio de estado.
- `CalendarioLaboral` encapsula los feriados y los años disponibles; sabe si un día es hábil y cómo sumar el plazo.
- La factura delega el calendario: relación de composición. El calendario se usa por composición. En la extensión, FacturaEstandar y FacturaConGracia sí heredan de Factura: ambas son facturas con políticas de vencimiento distintas.
- Los campos privados impiden editar directamente el estado interno. La modificación persistente ocurre mediante un PATCH controlado.
- Ejecuta `npm run demo`: las clases funcionan sin n8n.
- Ejecuta `npm run demo:polimorfismo`: muestra las dos hijas y el mismo método `calcularVencimiento` con resultados distintos. `evaluar` no necesita preguntar por el tipo.
- Explica `super`: la factura con gracia conserva el cálculo contractual del padre y lo extiende con días hábiles adicionales.

## 3. Mostrar el recorrido

“Los triggers llegan a la configuración. HTTP Request consulta JSON Server; Code valida y prepara cada factura. El IF separa registros válidos. Dos llamadas HTTP obtienen los feriados de ambos años. El Code usa las mismas clases para calcular. El segundo IF decide si hace falta un PATCH.”

Muestra `scripts/build-workflow.js`: toma el archivo fuente y lo incorpora al workflow; la prueba de equivalencia comprueba el resultado. No hay un segundo algoritmo de fechas mantenido aparte.

## 4. Ejecutar el caso normal

- Muestra los registros antes de ejecutar.
- Ejecuta el flujo desde el trigger manual.
- FAC-001, emitida el 10 de septiembre con tres días hábiles: 11, 14 y 16. El 15 se excluye por feriado. Queda vencida al evaluarse el 19 de octubre.
- FAC-002, emitida el viernes 16 de octubre con un día hábil: vence el lunes 19 y sigue pendiente ese día.
- FAC-003: plazo de quince días hábiles; vence el 9 de noviembre.
- FAC-004: pagada, no se modifica.
- FAC-005: FacturaConGracia. Vencimiento contractual el 16 de octubre; con dos días hábiles de gracia vence el 20 y permanece pendiente el día 19.
- Actualiza GET /facturas y muestra los cambios guardados.
- Ejecuta otra vez para demostrar omisiones y registros sin cambios.

## 5. Demostrar errores

Introduce `2026-02-30` en una factura pendiente y ejecuta. Muestra `FECHA_INVALIDA`, sin escritura para ese registro. Restáurala.

Opcionalmente cambia las dos URLs de feriados a `http://127.0.0.1:1/feriados`. El calendario falla y no se actualizan las facturas. Restaura las URLs originales. Explica que inventar feriados sería un error de negocio.

## 6. Cierre y decisiones

“Lo más delicado es mantener la relación entre cada respuesta HTTP y su factura, validar el calendario y usar exactamente la misma lógica en consola y n8n. Trabajé con fechas sin horas para evitar cambios de día por zona horaria. También separé la lógica de negocio del acceso HTTP.”

No afirmes que ya expusiste, que tu instancia está configurada o que una prueba pendiente se ejecutó. Usa las evidencias y luego realiza la demostración en tu computadora.

## Preguntas que debes saber contestar

1. ¿Por qué se separan Factura y CalendarioLaboral? Cada una reúne datos y comportamiento de una responsabilidad distinta; las hijas especializan la política de vencimiento.
2. ¿Por qué se consulta el año siguiente? Un plazo iniciado en diciembre puede vencer en enero.
3. ¿Por qué el vencimiento no cuenta como atraso? La regla permite pagar durante todo ese día.
4. ¿Qué pasa si una API responde 200 con datos incorrectos? Se valida formato, país y año, no solo el status HTTP.
5. ¿Qué evita duplicar cambios? Se usa el ID existente, PATCH determinista y comparación del estado actual; no se crea otra factura.
6. ¿Eso garantiza exactamente una ejecución? No: JSON Server no protege contra dos procesos concurrentes o un pago que llegue durante el cálculo.
7. ¿Dónde hay herencia y polimorfismo? FacturaEstandar y FacturaConGracia son hijas de Factura; ambas sobrescriben calcularVencimiento y evaluar usa el método sin condicionar por tipo.
8. ¿Por qué no hay interfaz web? La consigna pide JavaScript puro, consola y workflow, sin interfaz visual.
