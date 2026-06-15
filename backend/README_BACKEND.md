# README_BACKEND.md

# academia-transformacion - Sprint 2 Backend

Este documento cubre la infraestructura backend de Sprint 2, el motor academico de Sprint 3 y reconocimiento/certificacion de Sprint 4.

No implementa:

- Biblioteca.
- Estadisticas.
- Juego.
- Administracion.

---

## Archivos

- `backend.gs`: API base y validaciones.
- `setupDatabase.gs`: creacion/normalizacion de hojas.
- `README_BACKEND.md`: instrucciones de despliegue y pruebas.

---

## Regla obligatoria de Spreadsheet

No se utiliza:

```javascript
SpreadsheetApp.getActiveSpreadsheet()
```

Toda operacion usa:

```javascript
SpreadsheetApp.openById(spreadsheetId)
```

Los Spreadsheet ID se guardan en Script Properties con claves separadas por ambiente:

```text
DEV_SPREADSHEET_ID
QA_SPREADSHEET_ID
PROD_SPREADSHEET_ID
```

El ambiente activo se guarda en:

```text
ENVIRONMENT
```

Valores permitidos:

- `DEV`
- `QA`
- `PROD`

La funcion central `getSpreadsheet()` selecciona automaticamente el Spreadsheet correcto segun `ENVIRONMENT`.

---

## Estructura de Google Sheets

### CONFIG

| KEY | VALUE | DESCRIPTION | PUBLIC |
| --- | --- | --- | --- |

Valores minimos:

| KEY | VALUE inicial | PUBLIC |
| --- | --- | --- |
| APP_NAME | Academia de Transformacion | SI |
| ENVIRONMENT | DEV | SI |
| LOGO_URL |  | SI |
| ADMIN_USER |  | NO |
| ADMIN_PASSWORD |  | NO |
| ACADEMIA_ACTIVA | SI | SI |
| MODO_VISITANTE | SI | SI |
| HORAS_RUTA_INTEGRADOR | 4 | SI |

`ENVIRONMENT` debe soportar:

- `DEV`
- `QA`
- `PROD`

### PARTICIPANTES

| ID | ORGANIZACION | CEDULA | NOMBRE | AREA | CARGO | ACTIVO | FECHA_REGISTRO | ULTIMO_ACCESO |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

Reglas:

- `CEDULA` se usa solo para acceso.
- `ID` se usa internamente para relaciones.
- `ACTIVO = SI` habilita acceso certificable.
- `FECHA_REGISTRO` se establece al crear el participante y no debe modificarse.
- `ULTIMO_ACCESO` se actualiza en cada ingreso valido por cedula.
- Al ejecutar `setupDatabase()` sobre datos existentes, se agregan columnas faltantes y se completa `FECHA_REGISTRO` solo si esta vacia.

### PROGRESO

| ID_PARTICIPANTE | ID_MODULO | ESTADO | FECHA | FECHA_APROBACION |
| --- | --- | --- | --- | --- |

Estados validos:

- `NO_INICIADO`
- `EN_CURSO`
- `APROBADO`

Reglas:

- `FECHA` registra la ultima actualizacion del progreso.
- `FECHA_APROBACION` se registra solo la primera vez que el estado pasa a `APROBADO`.
- `FECHA_APROBACION` no se actualiza nuevamente en reingresos ni reintentos posteriores.

### RUTAS

| ID_RUTA | ORGANIZACION | NOMBRE | DESCRIPCION | ACTIVO | VISIBLE | ORDEN |
| --- | --- | --- | --- | --- | --- | --- |

### MODULOS

| ID_MODULO | ID_RUTA | NOMBRE | DESCRIPCION | ORDEN | ACTIVO | VISIBLE | DURACION_MIN | TIPO_DINAMICA |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

### CONTENIDOS

| ID_CONTENIDO | ID_MODULO | SECCION | BLOQUE | TITULO | CUERPO | TIPO_CONTENIDO | TIPO_DINAMICA | CONFIG_DINAMICA | ORDEN_SECCION | ORDEN | ACTIVO |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

`CONTENIDOS` es la fuente de verdad para construir el modulo academico en frontend.

Secciones academicas oficiales:

- `OBJETIVO`
- `COMPETENCIAS`
- `APRENDER`
- `OBSERVAR`
- `ANALIZAR`
- `DECIDIR`
- `DOCUMENTAR`
- `COMUNICAR`
- `SEGUIMIENTO`
- `EVALUAR`
- `APLICAR`
- `INSIGNIA`
- `MENSAJES_CLAVE`
- `RESULTADO_ESPERADO`

Reglas:

- Cada fila representa un bloque academico renderizable.
- `BLOQUE` permite identificar subpartes internas de una seccion.
- `TIPO_CONTENIDO` permite clasificar el bloque sin cambiar el contrato.
- `TIPO_DINAMICA` y `CONFIG_DINAMICA` se usan solo cuando el bloque tiene una practica interactiva.
- `CONFIG_DINAMICA` debe almacenarse como JSON valido.
- `ORDEN_SECCION` controla el orden de la seccion cuando se requiera ajustar el orden canonico.
- `ORDEN` controla el orden de los bloques dentro de la seccion.

Migracion de contenidos:

1. Tomar cada documento oficial del modulo aprobado.
2. Crear una fila por bloque academico en `CONTENIDOS`.
3. Usar el mismo `ID_MODULO` definido en `MODULOS`.
4. Clasificar cada bloque en una de las secciones oficiales.
5. Mantener `ACTIVO = SI` solo para bloques publicados.
6. Cargar las preguntas en `PREGUNTAS`; no incluir respuestas correctas en `CONTENIDOS`.
7. Ejecutar `getAcademicModule()` para validar que el JSON academico se construye correctamente.

### Importador Markdown

Archivo Apps Script:

- `academicImporter.gs`

Funciones manuales:

- `importModuleMarkdown(fileIdOrName, folderId)`
- `importAllModules(folderId)`

Reglas del importador:

- Lee archivos Markdown oficiales desde Google Drive.
- Soporta los 8 modulos oficiales `M01` a `M08`.
- Detecta secciones por nombre, no por numeracion.
- Reemplaza completamente los registros existentes del `ID_MODULO` en `CONTENIDOS` y `PREGUNTAS`.
- Mantiene IDs estables.
- Valida estrictamente que existan 4 preguntas A/B/C/D con `Respuesta correcta`.
- No modifica XP, insignias, certificados, ranking ni autenticacion.

Ejemplo de ejecucion:

```javascript
function importarModulosAcademicos() {
  return importAllModules("ID_DE_LA_CARPETA_DRIVE_CON_MARKDOWNS");
}
```

Resultado esperado:

- `CONTENIDOS`: registros por bloque academico de cada modulo.
- `PREGUNTAS`: 4 preguntas por modulo, 32 preguntas en total para los 8 modulos.
- `getAcademicModule()` entrega los bloques importados en `academic.sections`.

### PREGUNTAS

| ID_PREGUNTA | ID_MODULO | PREGUNTA | OPCION_A | OPCION_B | OPCION_C | OPCION_D | RESPUESTA | EXPLICACION | ORDEN | ACTIVO |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Reglas:

- 4 preguntas activas por modulo.
- Aprobacion con 3 de 4 correctas.
- `RESPUESTA` no se devuelve al frontend.

### XP

| ID_XP | ID_PARTICIPANTE | ORGANIZACION | ID_RUTA | ID_MODULO | EVENTO | XP | FECHA |
| --- | --- | --- | --- | --- | --- | --- | --- |

Eventos:

- `PRACTICA_COMPLETADA`: 20 XP.
- `EVALUACION_APROBADA`: 100 XP.
- `MODULO_COMPLETADO`: 50 XP.
- `RUTA_COMPLETADA`: 200 XP.

Regla: no registrar XP duplicada para el mismo participante, modulo/ruta y evento.

### INSIGNIAS

| ID_INSIGNIA | ID_PARTICIPANTE | ORGANIZACION | ID_RUTA | ID_MODULO | INSIGNIA | FECHA |
| --- | --- | --- | --- | --- | --- | --- |

Regla: no registrar insignias duplicadas.

### CERTIFICADOS

| ID_CERTIFICADO | ID_PARTICIPANTE | ORGANIZACION | ID_RUTA | RUTA | NOMBRE | FECHA | HORAS | CODIGO | FIRMANTE | CARGO_FIRMANTE | FIRMA_URL | LOGO_URL | URL_CERTIFICADO | ESTADO |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

`HORAS` se toma desde `CONFIG`, por ejemplo `HORAS_RUTA_INTEGRADOR`.

### FIRMAS

| ID_FIRMA | ORGANIZACION | FIRMANTE | CARGO | FIRMA_URL | LOGO_URL | ACTIVO |
| --- | --- | --- | --- | --- | --- | --- |

El backend busca firma activa por organizacion y luego una firma `GLOBAL`.

---

## APIs implementadas

### `healthCheck()`

Verifica disponibilidad basica del backend.

Respuesta:

```json
{
  "status": "OK",
  "service": "academia-transformacion-backend",
  "environment": "DEV",
  "spreadsheetConfigured": true,
  "timestamp": "..."
}
```

### `getConfig()`

Devuelve solo configuracion publica.

No devuelve:

- `ADMIN_PASSWORD`
- `ADMIN_USER`
- Configuracion marcada como `PUBLIC = NO`

### `validateCedula(cedula)`

Valida acceso certificable:

- Cedula obligatoria.
- Cedula existente.
- Participante activo.

Devuelve datos minimos del participante y progreso.

### `getParticipant(id)`

Devuelve datos minimos por `ID`.

No devuelve cedula ni contrasenas.

### `getProgress(idParticipante)`

Devuelve progreso por `ID_PARTICIPANTE`.

Valida que el participante exista y este activo.

### `saveProgress(payload)`

Guarda o actualiza progreso.

Payload:

```json
{
  "idParticipante": "P001",
  "idModulo": "lean",
  "estado": "EN_CURSO"
}
```

Validaciones:

- Participante activo.
- Modulo valido.
- Ruta asociada valida.
- Estado permitido.

### `getRoutes(payload)`

Devuelve rutas activas y visibles.

Filtro opcional:

```json
{
  "organizacion": "ORG001"
}
```

Tambien devuelve rutas `GLOBAL`.

### `getModules(routeId)`

Devuelve modulos activos y visibles de una ruta valida.

### `getAcademicModule(moduleId, payload)`

Devuelve datos academicos del modulo:

- Ruta.
- Modulo.
- Contenido academico completo desde `CONTENIDOS`.
- Preguntas sin respuesta correcta.
- JSON academico normalizado en `academic`.

Reglas:

- En modo certificable valida participante activo y modulo liberado.
- En modo visitante permite lectura y practica sin progreso.
- Mantiene `contents` y `questions` por compatibilidad con Sprint 4.

Forma conceptual de `academic`:

```json
{
  "version": "1.0",
  "source": "SHEETS",
  "sections": [
    {
      "key": "APRENDER",
      "id": "aprender",
      "title": "Aprender",
      "order": 1,
      "blocks": [
        {
          "id": "lean-aprender-01",
          "key": "observacion",
          "title": "Titulo del bloque",
          "body": "Contenido del bloque",
          "type": "TEXTO"
        }
      ]
    }
  ],
  "evaluation": {
    "questions": [],
    "totalQuestions": 4,
    "requiredCorrect": 3
  }
}
```

### `submitEvaluation(payload)`

Corrige la evaluacion del modulo.

Reglas:

- Solo modo certificable.
- Requiere participante activo.
- Requiere modulo valido y liberado.
- Usa 4 preguntas activas.
- Aprueba con 3 de 4 correctas.
- Si aprueba, actualiza `PROGRESO` a `APROBADO`.
- Si aprueba, registra XP e insignia del modulo sin duplicados.
- Si no aprueba, permite repetir sin actualizar progreso.

### `registerPracticeCompletion(payload)`

Registra 20 XP por practica completada para participantes certificables.

No aplica a visitantes.

### `getRecognitionSummary(idParticipante)`

Devuelve:

- XP acumulada.
- Nivel.
- Insignias.
- Certificados.
- Posicion de ranking por organizacion.

### `getRanking(payload)`

Calcula ranking desde la hoja `XP`.

No existe hoja `RANKING`.

Filtros:

- General.
- Organizacion.
- Ruta.

No devuelve cedula.

### `getCertificates(idParticipante)`

Devuelve certificados emitidos para el participante activo.

### `issueCertificate(payload)`

Emite certificado si:

- Participante activo.
- Ruta completa.
- Todos los modulos aprobados.

No emite certificados para visitantes ni si falta algun modulo.

---

## Despliegue Apps Script

1. Crear un Google Spreadsheet por ambiente requerido: DEV, QA y PROD.
2. Copiar cada Spreadsheet ID desde la URL.
3. Crear un proyecto de Apps Script.
4. Copiar `backend.gs` y `setupDatabase.gs` al proyecto.
5. Configurar el ambiente activo:

```javascript
setAcademiaEnvironment("DEV")
```

6. Configurar los Spreadsheet ID:

```javascript
setEnvironmentSpreadsheetId("DEV", "DEV_SPREADSHEET_ID_AQUI")
setEnvironmentSpreadsheetId("QA", "QA_SPREADSHEET_ID_AQUI")
setEnvironmentSpreadsheetId("PROD", "PROD_SPREADSHEET_ID_AQUI")
```

Tambien se puede usar:

```javascript
setAcademiaSpreadsheetIds(
  "DEV_SPREADSHEET_ID_AQUI",
  "QA_SPREADSHEET_ID_AQUI",
  "PROD_SPREADSHEET_ID_AQUI"
)
```

7. Ejecutar `setupDatabase()` para el ambiente activo:

```javascript
setupDatabase()
```

8. Confirmar que existan las hojas en el Spreadsheet del ambiente activo:

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

9. Repetir `setAcademiaEnvironment("QA")` + `setupDatabase()` y `setAcademiaEnvironment("PROD")` + `setupDatabase()` cuando se quieran preparar esos ambientes.
10. Publicar como Web App:

- Ejecutar como: propietario del script.
- Acceso: segun politica del proyecto.

11. Copiar la URL de despliegue.
12. En Sprint posterior, colocar esa URL en la configuracion frontend `APP_CONFIG.apiEndpoint`.

---

## Gestion de ambientes

### Ver ambiente activo

Ejecutar:

```javascript
healthCheck()
```

La respuesta incluye:

- `environment`: ambiente activo desde Script Properties.
- `configEnvironment`: ambiente declarado en la hoja `CONFIG`.
- `spreadsheetConfigured`: indica si hay Spreadsheet ID para ese ambiente.

### Cambiar ambiente activo

```javascript
setAcademiaEnvironment("QA")
```

Luego todas las APIs usaran automaticamente `QA_SPREADSHEET_ID`.

### Riesgo operativo

Antes de publicar o probar una Web App, ejecutar siempre `healthCheck()` y confirmar que `environment` apunta al ambiente correcto.

---

## Uso por HTTP

Enviar `POST` con JSON:

```json
{
  "action": "healthCheck",
  "payload": {}
}
```

Ejemplo para validar cedula:

```json
{
  "action": "validateCedula",
  "payload": {
    "cedula": "0102030405"
  }
}
```

---

## Pruebas recomendadas

### Setup

1. Ejecutar `setAcademiaEnvironment("DEV")`.
2. Ejecutar `setEnvironmentSpreadsheetId("DEV", "...")`.
3. Ejecutar `setupDatabase()`.
4. Verificar encabezados de todas las hojas.
5. Verificar que `CONFIG.ADMIN_PASSWORD` tenga `PUBLIC = NO`.
6. Repetir para `QA` y `PROD` si esos ambientes ya existen.

### Config

1. Ejecutar `getConfig()`.
2. Confirmar que no retorna `ADMIN_PASSWORD`.
3. Confirmar que no retorna `ADMIN_USER`.
4. Confirmar que retorna `APP_NAME`, `ENVIRONMENT`, `ACADEMIA_ACTIVA` y `MODO_VISITANTE`.

### Participantes

1. Agregar participante activo en `PARTICIPANTES`.
2. Ejecutar `validateCedula()` con cedula valida.
3. Confirmar que devuelve `ID`, `ORGANIZACION`, `NOMBRE`, `AREA`, `CARGO`.
4. Confirmar que no devuelve `CEDULA`.
5. Cambiar `ACTIVO` a `NO`.
6. Confirmar error `PARTICIPANT_INACTIVE`.
7. Probar cedula inexistente y confirmar error `CEDULA_NOT_FOUND`.

### Progreso

1. Ejecutar `saveProgress()` con participante activo y modulo valido.
2. Confirmar fila en `PROGRESO`.
3. Ejecutar `getProgress()`.
4. Confirmar que retorna el registro.
5. Probar estado invalido y confirmar error `INVALID_PROGRESS_STATE`.
6. Probar modulo inexistente y confirmar error `INVALID_MODULE`.

### Rutas y modulos

1. Ejecutar `getRoutes()`.
2. Confirmar que solo retorna rutas activas y visibles.
3. Ejecutar `getModules("ruta-integrador-operacional")`.
4. Confirmar orden de modulos.
5. Probar ruta inexistente y confirmar error `INVALID_ROUTE`.

### Salud

1. Ejecutar `healthCheck()`.
2. Confirmar `status = OK`.
3. Confirmar `spreadsheetConfigured = true`.
