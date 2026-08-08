# Pendientes — lista canónica para retomar (2026-08-08)

> Este documento es la **única fuente de verdad de lo que queda por hacer**.
> Se actualiza al cierre de cada sesión (regla del proyecto). Para contexto
> completo ver `AGENTS.md` («Estado actual» y notas de sesión) y
> `docs/00-plan-maestro.md`.

**Estado al 08/08/2026**: MVP cerrado con datos reales (0 perfiles fantasma,
traslado real controlado). **214 unitarias y typecheck en verde; suites SQL
`importacion.sql` y `rls.sql` en verde sobre la base migrada a `0061`** (el
teléfono del revendedor ya no se guarda como WhatsApp del cliente; la migración
`0061` reconstruyó 20 teléfonos de vendedor y limpió 116 teléfonos-referencia
conservando los espejos). **Claude (modelo con visión) está ejecutando la rama
visual/branding ahora mismo.**

---

## A. Inmediato — git y validación (antes de seguir trabajando)

- [ ] **Commit por rebanada** de todo lo acumulado sin commitear (regla de oro
      nº 2). No se ha commiteado aún. Una rebanada = un commit, con mensaje
      descriptivo.
- [ ] Tras integrar lo visual de Claude, **validación final completa**:
      1. `npm run db:reset` (DESTRUCTIVO: confirmar respaldo si hay datos
         operativos que conservar).
      2. `npm run db:types` ⚠️ sale en **UTF-16 LE** si se usa un redirect `>` de
         PowerShell → convertir a **UTF-8 sin BOM** (como se hizo en
         `database.types.ts`; ver SLICE 5 en `AGENTS.md`).
      3. 25/25 suites SQL en verde (con el contenedor db corriendo).
      4. `npm test` → 214 unitarias en verde.
      5. `npm run typecheck` y `npm run build` en verde.

## B. Rama visual — Claude trabajando ahora

- [ ] Ejecutar el pase autónomo de `docs/11-pase-visual-claude.md` (en curso).
- [ ] **Revisar e integrar** los cambios de diseño que produzca Claude (login,
      dashboard / Centro de Operaciones, inventario, finanzas). Validar que la
      paleta calmada (neutral + acento azul + color semántico, oscuro «dim»)
      se respete y que no se rompa ningún flujo.
- [ ] Pasada visual en **teléfonos reales** por todas las plataformas y modales
      (pendiente inherente del responsive; ver nota en `AGENTS.md`).
- [ ] Pasada visual del flujo **«Nueva cuenta» para todas las plataformas**
      (móvil + escritorio) — quedó pendiente del rediseño 1.1–1.8.

## C. Seguridad / preparación para producción

- [ ] **Definir la CSP por entorno** (pendiente deliberado en `docs/12`): la app
      habla con Supabase (dominio por entorno), Kuanto y la fuente BCV externa;
      una CSP fija rompería producción. Hacerla configurable por variable.
- [ ] **Rotar el secreto de Kuanto** (`sb_secret_…`) que quedó expuesto en el
      repo público del usuario (`github.com/Aleneytor/Kuanto-App`) y **purgar
      el historial de git** de ese repo. Afecta solo a la tasa paralela en vivo.
- [ ] Decidir y aplicar **`noindex`** (o una capa de auth adicional) para que la
      app no se indexe en buscadores si va a ser privada.
- [ ] **Service worker / PWA** pendiente: registrar el SW y definir el shell
      offline. Los iconos ya están en `public/` y `manifest.ts` es válido.
- [ ] Revisar `src/middleware.ts` (sesión + protección de rutas) con la
      configuración de producción real.

## D. Despliegue (cuando haya servidor)

- [ ] Seguir `docs/12-checklist-despliegue.md` paso a paso:
      - Variables de entorno (8, ver `src/lib/env.ts` y `.env.example`).
      - **`GLS_ENCRYPTION_KEY`**: respaldo en lugar seguro — si se pierde, los
        secretos cifrados (AES-256-GCM) no se pueden descifrar nunca.
      - Base de datos en producción (aplicar migraciones, seed opcional).
      - Node LTS, `npm ci`, `npm run build`, `next start` detrás de HTTPS.
      - Cabeceras de seguridad ya en `next.config.ts` (verificar en vivo).
- [ ] **Smoke tests post-despliegue**: login (admin y revendedor), inventario,
      venta, renovación, finanzas (caja/cobros/egresos/cierre), tasas (BCV +
      paralela), portal del revendedor, importador.

## E. Datos / negocio — solo si aplica

- [ ] Los 3 «perfiles fantasma» de la auditoría del 2026-07-27 están
      **RESUELTOS** (0 en la base real, verificado 2026-08-08) — no requiere
      acción; solo no reintroducirlos al hacer `db:reset` con datos de respaldo.
- [ ] Si se vuelve a importar desde el Excel, las fechas de renovación omitidas
      por cargas anteriores **no existen en PostgreSQL** y deben venir de nuevo
      en el pegado (no se pueden reconstruir).
- [x] **Teléfonos-referencia del vendedor en clientes (RESUELTO 2026-08-08,
      migración `0061`)**: el importador dejó de guardar el teléfono del
      vendedor como WhatsApp del cliente (decisión del usuario), la vista
      `/clientes` lo etiqueta como «Ref. del vendedor» sin botón de WhatsApp, y
      la migración reconstruyó el teléfono de **20 vendedores** en
      `vendedores.telefono_*` y limpió **116 teléfonos-referencia** de clientes
      reales, conservando los espejos (venta directa al propio revendedor).
      ⚠️ Los nombres reales de los clientes finales que el importador viejo
      colapsó bajo el nombre del vendedor solo viven en el Excel de respaldo;
      para recuperarlos hay que volver a importar esas filas.

## F. Documentación — al cierre de la próxima sesión

- [ ] Tras integrar lo visual de Claude, actualizar:
      - `AGENTS.md`: entrada en «Estado actual», notas de sesión y el footer de
        «Última actualización».
      - `docs/00-plan-maestro.md`: consolidación de la sesión e índice.
      - Este archivo (`docs/13-pendientes.md`): marcar lo terminado y ajustar el
        orden de lo que sigue.

---

## Orden recomendado para mañana

1. Integrar/revisar el trabajo visual de Claude → validar (A.2).
2. Commit por rebanada de lo integrado.
3. Seguridad pendiente de la rama C (CSP por entorno, Kuanto, noindex, SW).
4. Despliegue (D) cuando haya servidor disponible.
5. Cerrar con la documentación (F).
