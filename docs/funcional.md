# Documento Funcional

# Academia de Transformacion

Version: 2.1
Estado: Actualizado con decisiones arquitectonicas aprobadas
Proyecto: academia-transformacion

---

## 1. Proposito

La plataforma sera un Centro de Transformacion corporativo para desarrollar capacidades organizacionales mediante rutas de aprendizaje, contenidos, evaluaciones, biblioteca, gamificacion, ranking, certificados y el juego Desperdicio Hunter.

La primera ruta sera Integrador Operacional, pero la solucion debe estar preparada desde el inicio para operar con multiples organizaciones y nuevas rutas sin redisenar la arquitectura.

---

## 2. Modelo de acceso aprobado

Se elimina completamente el concepto de usuario participante con credenciales propias.

No existira:

- Usuario participante con contrasena.
- Recuperacion de contrasena para participantes.
- Gestion de credenciales de participantes.
- Registro abierto de participantes desde la plataforma publica.

Unicamente existira autenticacion para administradores.

---

## 3. Modos de acceso

### 3.1 Modo certificable

El participante ingresa unicamente su cedula.

El sistema consulta la hoja `PARTICIPANTES`.

Si la cedula existe y `ACTIVO = SI`, el acceso es permitido.

Si la cedula no existe o `ACTIVO` no es `SI`, el acceso es denegado.

El modo certificable permite:

- Visualizar contenidos.
- Realizar evaluaciones.
- Registrar progreso.
- Generar XP.
- Participar en ranking.
- Obtener certificados.

### 3.2 Modo visitante

No requiere autenticacion.

Permite:

- Visualizar contenidos.
- Consultar biblioteca.
- Utilizar juegos.

No permite:

- Evaluaciones.
- XP.
- Ranking.
- Certificados.
- Registro de avance.

---

## 4. Modelo de participantes

La hoja `PARTICIPANTES` reemplaza cualquier concepto anterior de `USUARIOS`.

Estructura:

| Campo | Descripcion |
| --- | --- |
| ID | Clave interna del sistema |
| ORGANIZACION | Empresa u organizacion asociada |
| CEDULA | Clave de acceso del participante |
| NOMBRE | Nombre completo |
| AREA | Area del participante |
| CARGO | Cargo del participante |
| ACTIVO | Control de habilitacion |

Reglas:

- `ID` es la clave interna para relaciones del sistema.
- `CEDULA` es la clave de acceso.
- `ORGANIZACION` habilita operacion multiempresa.
- `ACTIVO` controla si el participante puede acceder en modo certificable.

---

## 5. Progreso academico

El progreso se almacena por `ID_PARTICIPANTE`.

Hoja: `PROGRESO`

Estructura:

| Campo | Descripcion |
| --- | --- |
| ID_PARTICIPANTE | Referencia a PARTICIPANTES.ID |
| ID_MODULO | Identificador del modulo |
| ESTADO | Estado academico del modulo |
| FECHA | Fecha de ultima actualizacion |

Estados permitidos:

- `NO_INICIADO`
- `EN_CURSO`
- `APROBADO`

La plataforma reconstruira la ruta consultando `PROGRESO`. El almacenamiento local no sera fuente principal de verdad.

---

## 6. Liberacion de modulos

Los modulos son secuenciales.

Un modulo se libera unicamente cuando el modulo anterior tiene estado `APROBADO`.

Los modulos aprobados permanecen accesibles para revision de contenido y recursos. No sera necesario repetir la evaluacion para volver a consultar un modulo aprobado.

---

## 7. Certificacion

Requisitos:

- Participante registrado en `PARTICIPANTES`.
- Cedula valida.
- Participante activo.
- Ruta completada.
- Evaluaciones aprobadas.

No requerido:

- XP minima.
- Juegos.
- Ranking.

---

## 8. XP y ranking

XP, logros y ranking solo estan disponibles para participantes en modo certificable.

Los visitantes no generan XP, logros, ranking ni historial academico.

---

## 9. Multiempresa

La plataforma debe soportar multiples organizaciones desde el inicio.

No se deben quemar referencias especificas a una empresa dentro del codigo.

Toda personalizacion debera salir de configuracion, incluyendo:

- Nombre de academia.
- Logo.
- Textos institucionales.
- Rutas activas.
- Firmantes.
- Certificados.
- Recursos visibles.
- Parametros de experiencia por organizacion cuando aplique.

---

## 10. Ruta inicial

Ruta inicial: Integrador Operacional.

Secuencia:

1. Lean
2. TOC
3. Gestion por Procesos
4. Indicadores
5. Gestion de Proyectos
6. Auditoria Operacional
7. IA Aplicada
8. Gestion del Cambio

Cada modulo tendra:

- Aprender.
- Practicar.
- Evaluar.
- Aplicar.

---

## 11. Administracion

El administrador tendra autenticacion propia y protegida desde backend.

Funciones previstas:

- Dashboard.
- Gestion de participantes.
- Gestion de rutas.
- Gestion de modulos.
- Gestion de preguntas.
- Gestion de biblioteca.
- Gestion de certificados.
- Configuracion.
- Estadisticas.

---

## 12. Reglas funcionales finales aprobadas

- `PARTICIPANTES` reemplaza `USUARIOS`.
- No existe contrasena de participante.
- No existe recuperacion de contrasena de participante.
- El modo certificable se habilita por cedula activa.
- El modo visitante no registra avance.
- `PROGRESO` es la fuente de verdad academica.
- Los modulos son secuenciales.
- Los modulos aprobados quedan disponibles para revision.
- La certificacion no depende de XP, juegos ni ranking.
- La plataforma debe ser multiempresa.

---

## 13. Motor academico Sprint 3

La ruta Integrador Operacional se implementa con ocho modulos secuenciales.

Cada modulo contiene:

- Aprender: contenido consultado desde backend.
- Practicar: dinamica interactiva no certificante.
- Evaluar: 4 preguntas con aprobacion de 3 respuestas correctas.
- Aplicar: mini caso de respuesta libre sin evaluacion automatica.

Modo visitante:

- Puede visualizar contenido.
- Puede practicar dinamicas.
- No puede evaluar.
- No guarda progreso.
- No libera modulos.

Modo certificable:

- Puede evaluar.
- Al aprobar, actualiza `PROGRESO`.
- La ruta se reconstruye desde backend.
