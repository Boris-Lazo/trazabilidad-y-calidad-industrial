# PROD-SYS — Hoja de Ruta y Plan de Aprendizaje

> Este documento es para mí como desarrollador del proyecto.  
> No es para Claude — ese tiene su propio archivo (`CONTEXT.md`).

---

## Estado actual del proyecto

El sistema está funcionando con todos los módulos principales implementados.
Falta pulir detalles y llegar a una versión MVP estable antes de pasar
a la etapa de aprendizaje formal.

### Módulos completados ✅
- Dashboard
- Gestión de Personal
- Grupos de Turno (con rotación automática semanal)
- Bitácora de Turno
- Planificación Semanal
- Órdenes de Producción
- Lotes
- Máquinas
- Auditoría
- Todos los procesos productivos (1 al 9)
- Tareas Generales (proceso 99 — trabajo no productivo)

### Pendiente antes del MVP
- [ ] Centralizar el sidebar de navegación (hoy está duplicado en ~18 archivos HTML)
- [ ] Validar procesos 6 y 8 con datos reales en planta
- [ ] Módulo de Planificación: incorporar turnos T5 y T6 (sábados)
- [ ] Pruebas generales de flujo completo de un turno

---

## Plan de aprendizaje — post MVP

Una vez el proyecto alcance el MVP, dedicar sesiones a entender
lo que está construido. El objetivo no es poder reescribirlo solo,
sino poder **leerlo, explicarlo y dirigir su evolución con criterio**.

### Lo que se hará en esas sesiones

1. **Auditoría del proyecto capa por capa**
   - La arquitectura completa y por qué está organizada así
   - Qué problema resuelve cada decisión de diseño
   - Recorrer el sistema desde una petición del navegador
     hasta la base de datos y de vuelta

2. **Temas priorizados por nivel**
   - Qué debo *entender* a fondo
   - Qué debo *reconocer* cuando lo vea
   - Qué puedo simplemente *delegar* a una IA con criterio

3. **Glosario del proyecto**
   - Los términos técnicos explicados en el contexto
     de *este* sistema, no en abstracto
   - Ejemplos: dominio, contrato, repositorio, servicio,
     middleware, endpoint, schema, migración, etc.

4. **Sesiones de preguntas abiertas**
   - Sin límite de "preguntas básicas"
   - Hasta que cada concepto quede claro de verdad

### Regla para el día a día (empezar ahora)

> Cuando algo llame la atención en el código — una palabra,
> un patrón que se repite, algo que no se entiende —
> preguntarlo en el momento, no acumular dudas para después.
> Las preguntas en contexto son las que más enseñan.

---

## Por qué esto es alcanzable

El conocimiento técnico que se está construyendo con este proyecto
no viene de un curso, viene de haber tomado decisiones reales:

- Decidir que las Tareas Generales no necesitaban contrato formal
  es una decisión de arquitectura. Se tomó bien.
- Preguntar "¿los contratos son APIs?" es exactamente la pregunta
  que hace alguien construyendo un modelo mental del sistema.
- Describir requerimientos como "sin orden, 4 campos, proceso comodín"
  es redactar especificaciones funcionales sin saberlo.

El siguiente paso es ponerle nombre a lo que ya se está haciendo.