# Verificación realizada

Fecha: 19 de octubre de 2026.

## Pruebas realmente ejecutadas

- 22 pruebas automatizadas de JavaScript aprobadas. Incluyen fines de semana, feriado del 15 de septiembre, cruce de año, vencimiento exacto, estados excluidos, fechas y montos inválidos, API caída, país/año incorrecto, IDs duplicados y equivalencia del Code generado con las clases. Las ocho pruebas nuevas cubren la jerarquía, el despacho polimórfico, super, validaciones de gracia y el mismo resultado en el Code.
- `main.js --demo` ejecutado: resultados guardados en `demo-consola.txt`.
- Validador estructural de la skill n8n-workflow-check ejecutado sobre el JSON: `structurally_valid: true`. El campo `runtime_verified: false` de ese helper es fijo y describe el alcance de su revisión, no reemplaza las pruebas de ejecución descritas abajo.
- Importación y ejecución real en n8n **2.23.4**, con JavaScript task runner y JSON Server **0.17.4**, en un directorio y base de datos temporales. No se utilizó la instancia del estudiante.
- PDF revisado visualmente en sus cuatro páginas.

## Casos del workflow ejecutados e inspeccionados

1. **Válido, con API HTTP controlada:** cuatro PATCH confirmados; FAC-001 vencida al 16 de septiembre, FAC-002 pendiente con vencimiento 19 de octubre y FAC-003 pendiente con vencimiento 9 de noviembre. FAC-004 permanece pagada. FAC-005 usa la subclase FacturaConGracia y queda pendiente con vencimiento efectivo el 20 de octubre.
2. **Segunda ejecución sobre los datos actualizados:** no se ejecuta Actualizar factura; se observan estados omitidos y sin cambios.
3. **Fecha inexistente 2026-02-30:** FECHA_INVALIDA en Entrada omitida o error. Sin PATCH.
4. **Extensión, gracia inválida:** diasGracia igual a cero produce GRACIA_INVALIDA en Entrada omitida o error; ningún PATCH adicional.
5. **Servicio de feriados con HTTP 503:** API_FERIADOS en Sin escritura. Sin PATCH.
6. **API externa real:** el mismo flujo consulta `https://date.nager.at/api/v3/PublicHolidays/2026/CR` y `.../2027/CR`. Los cuatro PATCH se confirman en la colección temporal. Las facturas siguen siendo datos ficticios de demostración.

Los resultados por nodo se conservaron en `runtime.json`; se inspeccionaron valores de salida y registros persistidos, no solo el código de salida del proceso.

## Reproducir

```bash
npm install
npm test
npm run demo
python scripts/check_workflow.py n8n/FacturaLab_CR.json
```

Con n8n 2.23.4 y JSON Server 0.17.4 disponibles en PATH, o mediante N8N_BIN y JSON_SERVER_BIN:

```bash
python scripts/test-runtime.py
python scripts/test-runtime.py --live
```

El segundo comando requiere conexión a la API real. Las bases temporales se eliminan al finalizar; solo permanece el reporte. El script prueba el JSON entregado cambiando exclusivamente la fecha de demostración y las URLs de los destinos de prueba. En el caso `--live` conserva las URLs externas originales.

## Acciones que todavía debe realizar el estudiante

Importar y ejecutar en su propia computadora, confirmar que la URL local es correcta, subir el proyecto al repositorio Git que entregará y realizar la presentación oral. No se ha activado ningún horario ni configurado una instancia del usuario.

La prueba de duplicados dentro de un lote corresponde al dominio. La repetición secuencial entre ejecuciones sí se probó con n8n. No se probó ni se promete exclusión transaccional frente a ejecuciones concurrentes.

## Versión ampliada

Proyecto 1.1.0: extensión Reto 1 implementada. Se conservan las 14 pruebas del laboratorio base y se agregan 8 pruebas de la extensión. Las seis ejecuciones de runtime.json corresponden al workflow actualizado. El horario sigue inactivo y no se añaden credenciales.
