# Arquitectura de Pantallas y Wireframes Funcionales

# Academia de Transformacion

Version: 2.1
Estado: Actualizado con decisiones arquitectonicas aprobadas
Proyecto: academia-transformacion

---

## 1. Mapa general de pantallas

### Publicas

- Entrada principal.
- Acceso certificable por cedula.
- Acceso visitante.

### Participante certificable

- Home.
- Mi ruta.
- Modulo.
- Dinamica.
- Evaluacion.
- Aplicacion.
- Perfil.
- Ranking.
- Biblioteca.
- Certificados.
- Desperdicio Hunter.

### Visitante

- Home visitante.
- Contenidos visibles.
- Biblioteca.
- Desperdicio Hunter sin persistencia certificable.

### Administrador

- Login administrador.
- Dashboard.
- Participantes.
- Rutas.
- Modulos.
- Preguntas.
- Biblioteca.
- Certificados.
- Configuracion.
- Estadisticas.

---

## 2. Entrada principal

Objetivo: permitir seleccionar modo de acceso.

Componentes:

- Logo configurado.
- Nombre de academia configurado.
- Boton: Ingresar con cedula.
- Boton: Entrar como visitante.
- Boton o enlace: Administrador.

Reglas:

- No mostrar usuario/contrasena para participantes.
- No mostrar recuperacion de contrasena para participantes.
- La autenticacion con contrasena solo aplica a administradores.

---

## 3. Acceso certificable por cedula

Objetivo: validar participante activo.

Campos:

- Cedula.

Acciones:

- Ingresar.
- Volver.

Validaciones:

- Cedula obligatoria.
- Cedula existente en `PARTICIPANTES`.
- `ACTIVO = SI`.

Mensajes:

- Acceso permitido.
- Cedula no habilitada.
- Participante inactivo.

Salida:

- Home certificable con datos del participante.

---

## 4. Modo visitante

Objetivo: permitir exploracion sin registro.

Permite:

- Ver contenidos visibles.
- Consultar biblioteca.
- Jugar Desperdicio Hunter.

Bloquea:

- Evaluaciones.
- XP.
- Ranking.
- Certificados.
- Registro de avance.

Mensajes sugeridos:

- Para certificarte, ingresa con cedula habilitada.
- Esta funcion esta disponible solo en modo certificable.

---

## 5. Home certificable

Informacion:

- Nombre.
- Organizacion.
- Area.
- Cargo.
- Ruta activa.
- Progreso reconstruido desde `PROGRESO`.
- Modulo disponible.
- Certificados disponibles.

Componentes:

- Tarjeta de progreso.
- Tarjeta de ruta.
- Tarjeta de modulo actual.
- Tarjeta de ranking.
- Tarjeta de biblioteca.
- Tarjeta de certificados.

---

## 6. Home visitante

Informacion:

- Nombre de academia.
- Rutas o contenidos visibles.
- Biblioteca.
- Juego.

No debe mostrar:

- XP personal.
- Ranking personal.
- Certificados.
- Avance individual.

---

## 7. Mapa de ruta

Estados visuales:

- Bloqueado.
- Disponible.
- En curso.
- Aprobado.

Regla:

- Un modulo se libera solo cuando el anterior esta `APROBADO`.
- Los modulos aprobados permanecen abiertos para revision.

---

## 8. Pantalla modulo

Secciones:

- Aprender.
- Practicar.
- Evaluar.
- Aplicar.

Modo certificable:

- Puede iniciar modulo.
- Puede evaluar.
- Puede aprobar.
- Puede registrar progreso.

Modo visitante:

- Puede revisar contenido visible.
- No puede evaluar ni registrar progreso.

---

## 9. Evaluacion

Disponible solo para modo certificable.

Reglas:

- Evaluacion obligatoria para aprobar modulo.
- Aprobacion requerida para liberar el siguiente modulo.
- Modulo aprobado no exige repetir evaluacion para consulta posterior.

---

## 10. Perfil

Disponible para modo certificable.

Informacion:

- Nombre.
- Organizacion.
- Area.
- Cargo.
- Progreso.
- XP.
- Insignias.
- Certificados.

---

## 11. Ranking

Disponible solo para modo certificable.

Vistas:

- General.
- Area.
- Ruta.
- Mensual.
- Historico.

No visible para visitante como ranking personal. Si se muestra un ranking publico, debe ser solo lectura y sin registrar datos del visitante.

---

## 12. Certificados

Disponible solo para modo certificable.

Requisitos:

- Participante activo.
- Ruta completada.
- Evaluaciones aprobadas.

No depende de:

- XP minima.
- Juegos.
- Ranking.

---

## 13. Administrador

Login separado.

Gestiona:

- Participantes.
- Organizaciones.
- Rutas.
- Modulos.
- Preguntas.
- Biblioteca.
- Certificados.
- Configuracion.
- Estadisticas.

Pantalla Participantes:

- Tabla con ID, ORGANIZACION, CEDULA, NOMBRE, AREA, CARGO, ACTIVO.
- Acciones: crear, editar, activar, desactivar.

---

## 14. Principio UX final

El usuario debe entender claramente si esta en:

- Modo certificable.
- Modo visitante.
- Modo administrador.

La interfaz no debe prometer certificados, XP, ranking ni avance cuando el usuario esta en modo visitante.

---

## 15. Pantalla modulo Sprint 3

La pantalla de modulo se organiza en pestanas:

- Aprender.
- Practicar.
- Evaluar.
- Aplicar.

Modo visitante:

- Pestanas Aprender, Practicar y Aplicar disponibles.
- Evaluar bloqueado.

Modo certificable:

- Todas las pestanas disponibles si el modulo esta liberado.
- Al aprobar Evaluar, se informa el resultado y se libera el siguiente modulo desde progreso backend.
