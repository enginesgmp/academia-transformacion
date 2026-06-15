# Documento Tecnico

# Academia de Transformacion

Version: 2.1
Estado: Actualizado con decisiones arquitectonicas aprobadas
Proyecto: academia-transformacion

---

## 1. Arquitectura general

La solucion se implementara con tres capas:

- Frontend SPA en HTML, CSS y JavaScript Vanilla.
- API en Google Apps Script.
- Persistencia y configuracion en Google Sheets.

La plataforma debe funcionar como aplicacion estatica hospedable en GitHub Pages o Netlify, consumiendo Apps Script como backend.

---

## 2. Principio tecnico principal

No se implementara autenticacion de participantes mediante usuario y contrasena.

El backend validara acceso certificable mediante cedula contra la hoja `PARTICIPANTES`.

El frontend podra ofrecer dos entradas:

- Modo certificable.
- Modo visitante.

---

## 3. Estructura tecnica esperada

```text
academia-transformacion/
  index.html
  css/
    styles.css
  js/
    app.js
    router.js
    auth.js
    academy.js
    profile.js
    ranking.js
    library.js
    game.js
    admin.js
    utils.js
  backend/
    backend.gs
    setupDatabase.gs
  docs/
    funcional.md
    tecnico.md
    wireframes.md
  assets/
    logos/
    badges/
    game/
```

Nota: la estructura de codigo se creara en Sprint 1. Esta actualizacion solo documenta reglas y decisiones.

---

## 4. Modelo de datos aprobado

### 4.1 PARTICIPANTES

Reemplaza cualquier tabla u hoja anterior llamada `USUARIOS`.

| Campo | Tipo conceptual | Regla |
| --- | --- | --- |
| ID | Texto/numero | Clave interna |
| ORGANIZACION | Texto | Requerido para multiempresa |
| CEDULA | Texto | Clave de acceso |
| NOMBRE | Texto | Requerido |
| AREA | Texto | Requerido |
| CARGO | Texto | Requerido |
| ACTIVO | SI/NO | Habilita acceso certificable |
| FECHA_REGISTRO | Fecha/hora | Se establece al crear el participante |
| ULTIMO_ACCESO | Fecha/hora | Se actualiza en cada ingreso valido por cedula |

### 4.2 PROGRESO

Fuente de verdad para avance academico.

| Campo | Tipo conceptual | Regla |
| --- | --- | --- |
| ID_PARTICIPANTE | Texto/numero | Referencia a PARTICIPANTES.ID |
| ID_MODULO | Texto | Identificador del modulo |
| ESTADO | Enum | NO_INICIADO, EN_CURSO, APROBADO |
| FECHA | Fecha/hora | Ultima actualizacion |
| FECHA_APROBACION | Fecha/hora | Primera aprobacion del modulo |

### 4.3 Hojas complementarias

Se mantienen como modelo objetivo:

- `CONFIG`
- `ORGANIZACIONES`
- `RUTAS`
- `MODULOS`
- `RUTA_MODULO`
- `CONTENIDOS`
- `PREGUNTAS`
- `RESULTADOS`
- `XP`
- `INSIGNIAS`
- `CERTIFICADOS`
- `BIBLIOTECA`
- `FIRMAS`
- `JUEGO_RESULTADOS`
- `ANALYTICS`

---

## 5. Acceso certificable

Flujo:

1. El participante ingresa cedula.
2. Frontend envia cedula al backend.
3. Apps Script consulta `PARTICIPANTES`.
4. Si existe coincidencia y `ACTIVO = SI`, devuelve perfil minimo.
5. El frontend habilita funcionalidades certificables.
6. El progreso se consulta desde `PROGRESO`.

El frontend no debe decidir por si solo si un participante esta habilitado.

---

## 6. Acceso visitante

El visitante entra sin autenticacion.

El estado visitante debe bloquear:

- Evaluaciones.
- Escritura de progreso.
- Escritura de XP.
- Ranking.
- Certificados.

Puede permitir:

- Lectura de contenidos visibles.
- Lectura de biblioteca visible.
- Juego sin persistencia certificable.

---

## 7. Liberacion secuencial

La liberacion de modulos se calcula reconstruyendo la ruta desde:

- Ruta configurada.
- Orden de modulos.
- Estados en `PROGRESO`.

Regla:

- Primer modulo disponible por defecto para participante certificable activo.
- Modulo N disponible si modulo N-1 esta `APROBADO`.
- Modulo aprobado queda disponible para revision.

No usar `localStorage` como fuente de verdad de progreso.

---

## 8. Autenticacion administrativa

La autenticacion administrativa se mantiene separada del acceso de participantes.

Las credenciales o mecanismos de validacion admin deben verificarse en backend.

No almacenar contrasena administrativa en frontend.

---

## 9. Multiempresa

El sistema debe filtrar, configurar y presentar informacion por organizacion cuando corresponda.

No quemar nombres, logos, rutas, textos ni firmantes especificos en codigo.

La configuracion debe permitir personalizacion por organizacion mediante Sheets.

---

## 10. Contrato tecnico minimo de API

Endpoints/acciones conceptuales requeridas:

- Validar cedula certificable.
- Obtener configuracion por organizacion.
- Obtener rutas activas.
- Obtener modulos de ruta.
- Obtener progreso por participante.
- Registrar inicio de modulo.
- Registrar aprobacion de modulo.
- Registrar resultado de evaluacion.
- Registrar XP solo para modo certificable.
- Obtener ranking solo para modo certificable.
- Generar certificado.
- Autenticar administrador.
- Gestionar datos administrativos.

---

## 11. Reglas tecnicas obligatorias

- `PARTICIPANTES` reemplaza `USUARIOS`.
- `ID_PARTICIPANTE` es la clave para progreso, resultados, certificados, XP y ranking.
- `CEDULA` solo se usa para acceso, no como clave relacional principal.
- Visitantes no escriben datos academicos.
- Progreso se reconstruye desde backend/Sheets.
- Reglas de certificacion se validan en backend.
- La configuracion soporta multiempresa desde el inicio.

---

## 12. Motor academico Sprint 3

Hojas agregadas:

- `CONTENIDOS`
- `PREGUNTAS`

APIs agregadas:

- `getAcademicModule(moduleId, payload)`
- `submitEvaluation(payload)`

Reglas:

- El frontend no quema contenido academico en HTML.
- Las preguntas se entregan al frontend sin respuesta correcta.
- La correccion de evaluacion se realiza en backend.
- La aprobacion requiere 3 de 4 respuestas correctas.
- Si aprueba, backend actualiza `PROGRESO` a `APROBADO`.
- Visitantes no pueden evaluar ni guardar progreso.

---

## 12.1 Motor de contenido academico Fase 1

Objetivo tecnico:

Construir los modulos academicos dinamicamente desde Google Sheets, sin contenido academico quemado en frontend ni backend.

### 12.1.1 Estructura estandar de `CONTENIDOS`

| Campo | Uso |
| --- | --- |
| ID_CONTENIDO | Identificador unico del bloque |
| ID_MODULO | Relacion con `MODULOS.ID_MODULO` |
| SECCION | Seccion academica oficial |
| BLOQUE | Codigo interno del bloque dentro de la seccion |
| TITULO | Titulo visible del bloque |
| CUERPO | Texto academico del bloque |
| TIPO_CONTENIDO | Tipo conceptual del bloque, por defecto `TEXTO` |
| TIPO_DINAMICA | Tipo de practica interactiva si aplica |
| CONFIG_DINAMICA | JSON de configuracion de la dinamica |
| ORDEN_SECCION | Orden opcional de la seccion |
| ORDEN | Orden del bloque dentro de la seccion |
| ACTIVO | `SI` para publicar el bloque |

Secciones oficiales soportadas:

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

### 12.1.2 Estructura de evaluacion

La evaluacion mantiene la hoja `PREGUNTAS`.

Reglas sin cambios:

- 4 preguntas activas por modulo.
- Aprobacion con 3 de 4.
- La respuesta correcta permanece solo en backend.
- Visitantes no pueden evaluar.

### 12.1.3 Parser backend

`getAcademicModule(moduleId, payload)` construye un objeto `academic` desde Sheets:

- Lee bloques activos de `CONTENIDOS`.
- Normaliza secciones oficiales.
- Agrupa bloques por seccion.
- Ordena por `ORDEN_SECCION` y `ORDEN`.
- Convierte `CONFIG_DINAMICA` de texto JSON a objeto.
- Adjunta preguntas sanitizadas dentro de `academic.evaluation`.

El contrato conserva `contents` y `questions` para compatibilidad con Sprint 4.

### 12.1.4 Renderizador frontend

El frontend renderiza pestañas y secciones desde `academic.sections`.

Reglas:

- No quemar secciones academicas como contenido.
- Renderizar dinamicamente los bloques recibidos.
- Si el backend responde en contrato anterior, usar fallback compatible.
- Mantener bloqueo de evaluacion para visitantes.
- Mantener XP, insignias, certificados y ranking sin cambios.

### 12.1.5 Importador Markdown a Sheets

El importador academico se implementa como funciones manuales de Apps Script:

- `importModuleMarkdown(fileIdOrName, folderId)`
- `importAllModules(folderId)`

Reglas tecnicas:

- Lee Markdown desde Google Drive.
- Identifica `ID_MODULO` desde el nombre del archivo.
- Detecta secciones por nombre, sin depender de numeracion.
- Convierte secciones academicas en filas de `CONTENIDOS`.
- Convierte `Evaluar` en filas de `PREGUNTAS`.
- Aplica reemplazo completo por modulo.
- Mantiene IDs estables para contenidos y preguntas.
- Valida estrictamente 4 preguntas de opcion multiple por modulo.
- No modifica APIs publicas ni reglas de XP, insignias, certificados, ranking o autenticacion.

---

## 13. Reconocimiento y certificacion Sprint 4

Hojas agregadas:

- `XP`
- `INSIGNIAS`
- `CERTIFICADOS`
- `FIRMAS`

No se crea hoja `RANKING`; el ranking se calcula desde `XP`.

Reglas de XP en codigo:

- Practica completada: 20 XP.
- Evaluacion aprobada: 100 XP.
- Modulo completado: 50 XP.
- Ruta completada: 200 XP.

Niveles:

- Nivel 1: Explorador Operacional desde 0 XP.
- Nivel 2: Facilitador Operacional desde 200 XP.
- Nivel 3: Integrador Operacional desde 500 XP.
- Nivel 4: Agente de Transformacion desde 900 XP.
- Nivel 5: Transformador Maestro desde 2000 XP.

Certificados:

- Se emiten solo para participantes activos con ruta completa.
- Incluyen `URL_CERTIFICADO`.
- `HORAS` se gestiona desde `CONFIG`, no desde codigo.
- Firmante, cargo, firma PNG y logo se leen desde `FIRMAS`/`CONFIG`.

APIs agregadas:

- `registerPracticeCompletion(payload)`
- `getRecognitionSummary(idParticipante)`
- `getRanking(payload)`
- `getCertificates(idParticipante)`
- `issueCertificate(payload)`
