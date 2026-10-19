# Requisitos y evidencia

| Requisito de la consigna | Implementación | Cómo comprobarlo |
|---|---|---|
| Trabajo individual | Erian Badilla Fallas | Autor indicado en el documento |
| Una solución sin interfaz visual | Consola + n8n | No se incluye sitio ni framework |
| JSON Server | jsonserver/db.json | GET /facturas y PATCH /facturas/ID |
| API externa | Nager.Date API v3, CR | Dos años por factura |
| Un trigger mínimo | Manual y Schedule | Flujo importado, activo false |
| Dos HTTP Request mínimo | Consulta facturas, dos feriados, PATCH | Cuatro nodos HTTP |
| IF o Filter | Factura válida y Requiere actualización | Ramas distintas con resultado |
| Code | Preparación, clases y verificación | Abrir los nodos Code |
| Resultado verificable | Vencimiento y estado persistidos | Comparar GET antes y después |
| Dos clases con métodos propios | Factura y CalendarioLaboral | src/models/dominio.js |
| main.js independiente | src/main.js | npm run demo o npm start |
| Misma lógica en POO y Code | Generación desde fuente única | build-workflow y prueba de equivalencia |
| Cinco reglas mínimo | Diez reglas documentadas | README y documento PDF |
| Dos errores mínimo | Datos inválidos, API caída, JSON Server caído, escritura incierta | Ramas de error y tests |
| Documento 2-4 páginas | Documento de lógica de cuatro páginas | docs/Logica_Negocio_Erian_Badilla.pdf |
| Diagrama del recorrido | PDF y diagrama.svg | docs/diagrama.svg |
| Git con JSON y clases | Proyecto listo para subir | El usuario debe crear/subir su repositorio |
| Exposición en vivo | Guion y casos reproducibles | Realizar en la computadora del estudiante |

La preparación local y las pruebas no sustituyen la ejecución ante el docente.

## Extensión seleccionada

| Requisito Reto 1 | Implementación |
|---|---|
| Una clase base | Factura |
| Al menos dos hijas | FacturaEstandar y FacturaConGracia extends Factura |
| Mismo método sobreescrito | calcularVencimiento en ambas hijas |
| Implementación distinta | Plazo contractual frente a plazo más gracia hábil |
| Polimorfismo real | evaluar llama this.calcularVencimiento sin condicionar por tipo |
| Misma jerarquía en n8n | JSON generado desde dominio.js |
| Demostración independiente | npm run demo:polimorfismo |
| Validación de la extensión | tests/extension.test.js y FAC-005 en n8n |
