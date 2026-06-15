# PROJECT_RULES.md

# academia-transformacion

Version: 1.1
Estado: Reglas arquitectonicas actualizadas hasta Sprint 4.1

Este documento gobierna las decisiones tecnicas, funcionales y de producto del proyecto. Cualquier implementacion futura debe respetar estas reglas antes de escribir codigo.

---

## 1. Principio rector

La plataforma es un Centro de Transformacion multiempresa, no un LMS tradicional.

Debe permitir:

- Rutas de aprendizaje configurables.
- Contenidos consultables.
- Evaluaciones certificables.
- Progreso academico por participante habilitado.
- Biblioteca independiente.
- Gamificacion solo para usuarios certificables.
- Certificados dinamicos.
- Administracion centralizada.

Debe evitar:

- Logica critica en frontend.
- Datos quemados de una empresa especifica.
- Credenciales de participantes.
- Dependencia de almacenamiento local como fuente de verdad.

---

## 2. No existe usuario participante con contrasena

Queda eliminado cualquier diseno o implementacion de:

- Usuario participante.
- Contrasena participante.
- Recuperacion de contrasena participante.
- Gestion de credenciales de participantes.

Solo los administradores tendran autenticacion.

---

## 3. PARTICIPANTES reemplaza USUARIOS

La hoja `PARTICIPANTES` es la fuente oficial de personas habilitadas para modo certificable.

Estructura obligatoria vigente:

| ID | ORGANIZACION | CEDULA | NOMBRE | AREA | CARGO | ACTIVO | FECHA_REGISTRO | ULTIMO_ACCESO |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

Reglas:

- `ID` es la clave interna.
- `CEDULA` es la clave de acceso.
- `ORGANIZACION` habilita multiempresa.
- `ACTIVO = SI` permite acceso certificable.
- `FECHA_REGISTRO` se establece al crear el participante y no debe modificarse posteriormente.
- `ULTIMO_ACCESO` se actualiza cuando el participante ingresa con cedula valida.
- `CEDULA` no debe ser clave relacional principal.
- Los datos de participante se administran desde backend o panel administrador, no desde registro publico abierto.

---

## 4. Modos de acceso

### Modo certificable

- Ingresa con cedula.
- Requiere existencia en `PARTICIPANTES`.
- Requiere `ACTIVO = SI`.
- Puede evaluar.
- Puede registrar progreso.
- Puede generar XP.
- Puede aparecer en ranking.
- Puede obtener certificados.

Reglas:

- La validacion de cedula debe ocurrir en backend.
- El frontend no decide si un participante esta habilitado.
- El perfil activo debe derivarse de `PARTICIPANTES`.
- Las operaciones de progreso, XP, ranking y certificacion deben usar `ID_PARTICIPANTE`.

### Modo visitante

- No requiere autenticacion.
- Puede ver contenidos visibles.
- Puede consultar biblioteca.
- Puede usar juegos.
- No puede evaluar.
- No genera XP.
- No aparece en ranking.
- No obtiene certificados.
- No registra avance.

Reglas:

- El visitante no puede escribir registros academicos.
- El visitante no puede desbloquear modulos por progreso.
- El visitante no debe ver mensajes que prometan certificacion o avance personal.

---

## 5. Progreso academico

La hoja `PROGRESO` es la fuente oficial de avance.

Estructura obligatoria vigente:

| ID_PARTICIPANTE | ID_MODULO | ESTADO | FECHA | FECHA_APROBACION |
| --- | --- | --- | --- | --- |

Estados permitidos:

- `NO_INICIADO`
- `EN_CURSO`
- `APROBADO`

Reglas:

- El progreso se almacena por `ID_PARTICIPANTE`.
- La ruta se reconstruye consultando `PROGRESO`.
- `localStorage` no puede ser fuente principal de verdad.
- El frontend puede cachear estado temporal, pero debe reconciliar con backend.
- El estado `APROBADO` es requisito para liberar el siguiente modulo.
- `FECHA_APROBACION` se registra solo la primera vez que el modulo pasa a `APROBADO`.

---

## 6. Liberacion secuencial

- Los modulos son secuenciales.
- Un modulo se libera solo cuando el anterior esta `APROBADO`.
- Los modulos aprobados quedan abiertos para revision.
- No se obliga a repetir evaluacion para revisar contenido aprobado.

---

## 7. Certificacion

Requisitos:

- Participante registrado.
- Cedula valida.
- `ACTIVO = SI`.
- Ruta completada.
- Evaluaciones aprobadas.

No requerido:

- XP minima.
- Juegos.
- Ranking.

Reglas:

- La elegibilidad de certificado se valida en backend.
- El certificado debe asociarse a `ID_PARTICIPANTE`, ruta, organizacion, fecha y codigo unico.
- Los certificados deben incluir `URL_CERTIFICADO` aunque pueda estar vacia al momento de emision.
- Las horas de certificacion deben salir de `CONFIG`, no del codigo.
- Firmante, cargo, firma PNG y logo deben salir de `FIRMAS`/`CONFIG`, no del codigo.
- Los visitantes no pueden generar certificados.

---

## 8. XP, logros y ranking

XP, logros y ranking solo existen para modo certificable.

Reglas:

- No registrar XP para visitantes.
- No registrar puntajes certificables de juego para visitantes.
- No incluir visitantes en ranking.
- No crear hoja `RANKING`; el ranking se calcula desde la hoja `XP`.
- Las respuestas publicas de ranking no deben exponer cedula ni `ID_PARTICIPANTE`.
- No exigir XP minima para certificacion.
- No exigir juegos para certificacion.

---

## 9. Multiempresa

La plataforma debe soportar multiples organizaciones desde el inicio.

Prohibido quemar en codigo:

- Nombre de empresa.
- Logos.
- Firmantes.
- Textos institucionales.
- Rutas especificas no configurables.
- Parametros visuales o funcionales dependientes de una organizacion.

Toda personalizacion debe salir de configuracion.

Reglas:

- Toda entidad principal debe poder relacionarse con `ORGANIZACION` cuando aplique.
- La configuracion visual e institucional debe resolverse desde Sheets.
- No usar nombres corporativos fijos dentro de codigo, textos base o plantillas no configurables.

---

## 10. Configuracion mediante Google Sheets

Debe ser configurable:

- Nombre de academia.
- Logos.
- Organizaciones.
- Rutas activas.
- Modulos visibles.
- Contenidos.
- Preguntas.
- Biblioteca.
- Certificados.
- Firmantes.
- Estados activo/visible.
- Horas de certificado por ruta.

Hojas vigentes hasta Sprint 4.1:

- `CONFIG`
- `PARTICIPANTES`
- `PROGRESO`
- `RUTAS`
- `MODULOS`
- `CONTENIDOS`
- `PREGUNTAS`
- `XP`
- `INSIGNIAS`
- `CERTIFICADOS`
- `FIRMAS`

Reglas del motor de contenido academico:

- `CONTENIDOS` es la fuente de verdad para construir secciones academicas.
- El frontend no debe quemar contenido academico de modulos.
- El backend debe convertir `CONTENIDOS` y `PREGUNTAS` en JSON academico normalizado mediante `getAcademicModule()`.
- Las secciones oficiales son `OBJETIVO`, `COMPETENCIAS`, `APRENDER`, `OBSERVAR`, `ANALIZAR`, `DECIDIR`, `DOCUMENTAR`, `COMUNICAR`, `SEGUIMIENTO`, `EVALUAR`, `APLICAR`, `INSIGNIA`, `MENSAJES_CLAVE` y `RESULTADO_ESPERADO`.
- `PREGUNTAS` conserva la evaluacion formal y nunca debe exponer `RESPUESTA` al frontend.
- No sembrar contenido academico desde codigo como fuente operativa; el contenido debe migrarse y mantenerse en Sheets.
- La importacion Markdown debe usar reemplazo completo por `ID_MODULO`, IDs estables y validacion estricta.
- La evaluacion vigente se mantiene en 4 preguntas de opcion multiple A/B/C/D con aprobacion de 75%.

No debe ser configurable:

- Logica de navegacion.
- Reglas de certificacion.
- Secuencialidad academica.
- Calculo principal de elegibilidad.
- Permisos por modo de acceso.
- Mecanica central del juego.

---

## 11. Seguridad y permisos

- Solo administradores usan autenticacion con credenciales.
- Las credenciales admin nunca deben almacenarse en frontend.
- Las validaciones criticas deben ejecutarse en backend.
- El frontend no debe recibir datos sensibles innecesarios.
- Toda escritura academica debe validar modo certificable.
- Las escrituras criticas deben usar bloqueo transaccional con `LockService` cuando exista riesgo de duplicidad o concurrencia.
- Toda accion administrativa debe validar sesion/permisos admin.

---

## 12. UX obligatoria por modo

La interfaz debe distinguir claramente:

- Modo visitante.
- Modo certificable.
- Modo administrador.

Reglas:

- Visitante: exploracion sin avance personal.
- Certificable: ruta, progreso, evaluaciones, XP, ranking y certificados.
- Administrador: gestion y configuracion.

No se debe mostrar una accion si el modo actual no puede ejecutarla, salvo que sea un llamado claro a ingresar con cedula habilitada.

---

## 13. Modelo de desarrollo por sprints

Sprint 1 debe limitarse a:

- Estructura SPA.
- Entrada principal.
- Modo certificable por cedula.
- Modo visitante.
- Home.
- Perfil certificable basico.
- Router.

Sprint 1 no debe implementar todavia:

- Certificados completos.
- Ranking avanzado.
- Juego completo.
- Panel administrador completo.
- Estadisticas avanzadas.

Los sprints posteriores deben respetar el orden funcional acordado.

---

## 14. Nombres canonicos

Usar estos nombres como fuente canonica:

- `PARTICIPANTES`, no `USUARIOS`.
- `PROGRESO` para avance academico.
- `ID_PARTICIPANTE` para relaciones.
- `ID_MODULO` para relacionar progreso con modulos.
- `CEDULA` solo para acceso.
- `ORGANIZACION` para multiempresa.
- `NO_INICIADO`, `EN_CURSO`, `APROBADO` como estados de modulo.
- `XP`, `INSIGNIAS`, `CERTIFICADOS`, `FIRMAS` como hojas de reconocimiento y certificacion.
- `DEV_SPREADSHEET_ID`, `QA_SPREADSHEET_ID`, `PROD_SPREADSHEET_ID` como propiedades de ambiente.

---

## 15. Reglas de implementacion futura

- Validaciones criticas en backend.
- Toda lectura/escritura de Spreadsheet debe resolverse con `SpreadsheetApp.openById()` mediante `getSpreadsheet()`.
- Credenciales admin nunca en frontend.
- Cedula no debe usarse como clave relacional principal.
- `ID_PARTICIPANTE` debe usarse para progreso, resultados, XP, ranking y certificados.
- Visitantes no deben escribir registros academicos.
- El codigo debe separar modo visitante, modo certificable y modo administrador.
- La construccion de rutas y modulos debe salir de `getRoutes()` y `getModules()` cuando el backend este configurado.
- Antes de programar una funcionalidad, validar si aplica a visitante, certificable o administrador.
- No iniciar implementacion si una funcionalidad contradice este documento.
