# academia-transformacion

Frontend base de la Academia de Transformacion.

## Estado

Sprint 1 implementado:

- Arquitectura SPA.
- Router por hash.
- Layout responsive.
- Header, sidebar y footer.
- Home.
- Perfil certificable basico.
- Acceso por cedula preparado para Apps Script.
- Modo visitante.
- Gestion de estado de sesion.
- Configuracion centralizada en `js/config.js`.

Sprint 3 implementado:

- Ruta Integrador Operacional.
- Vista de modulo academico.
- Secciones Aprender, Practicar, Evaluar y Aplicar.
- Motor de dinamicas extensible.
- Clasificacion Lean.
- Clasificacion TOC.
- Drag & Drop de Procesos.
- Constructor de Prompts.
- Evaluacion de 4 preguntas con aprobacion 3 de 4.
- Bloqueo de evaluacion/progreso en modo visitante.
- Integracion preparada con backend Apps Script para contenido y preguntas.

Sprint 4 implementado:

- XP para practica, evaluacion, modulo y ruta.
- Niveles de reconocimiento.
- Insignias automaticas por modulo aprobado.
- Ranking general, por organizacion y por ruta calculado desde XP.
- Certificados con firma/logo configurables y horas desde CONFIG.
- Vista de ranking y vista de certificados.

## Fuera de alcance actual

- Biblioteca.
- Estadisticas.
- Juego Desperdicio Hunter.
- Administracion.

## Reglas principales

Las reglas rectoras estan en `PROJECT_RULES.md`.

- No existe usuario participante con contrasena.
- `PARTICIPANTES` reemplaza `USUARIOS`.
- La cedula solo permite solicitar acceso certificable.
- `ID_PARTICIPANTE` sera la clave relacional.
- `PROGRESO` sera la fuente de verdad academica.
- Visitantes no registran avance, XP, ranking ni certificados.
- La plataforma debe ser multiempresa desde el inicio.

## Ejecucion local

Desde la carpeta del proyecto:

```bash
python -m http.server 4173 --bind 127.0.0.1
```

Luego abrir:

```text
http://127.0.0.1:4173/
```

## Backend

La carpeta `backend/` contiene la infraestructura Apps Script y el setup de Google Sheets.

El frontend ya contiene configuracion central en `js/config.js` y un adaptador API en `js/utils.js` mediante `APP_CONFIG.apiEndpoint` y `callApi()`.
