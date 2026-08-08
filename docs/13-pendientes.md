# Pendientes — lista canónica para retomar (2026-08-08)

> Este documento es la **única fuente de verdad de lo que queda por hacer**.
> Se actualiza al cierre de cada sesión (regla del proyecto). Para contexto
> completo ver `AGENTS.md` («Estado actual» y notas de sesión) y
> `docs/00-plan-maestro.md`.

**Estado al 08/08/2026**: MVP cerrado con datos reales (0 perfiles fantasma,
traslado real controlado). **214 unitarias, typecheck y build en verde**.
Rama visual **completada** (marca real, iconos SVG, CTA azul, estados vacíos,
accesibilidad). CSP configurable y service worker **completados**.
El teléfono del revendedor ya no contamina clientes (migración `0061`).

---

## A. Inmediato — git y validación ✅ COMPLETO (2026-08-08)

- [x] **Commit por rebanada** de todo lo acumulado. Últimos commits:
      `6905478` (PWA), `e90a20d` (CSP), `fe3a53c` (db:types UTF-8),
      `4469938` (hoyCaracas), `5cfd819` (docs cierre), `2ebc6b8` (cabeceras),
      `b38beb9` (migración 0061), `d5ee1d3` (pase visual), `262697` (docs visual).
- [x] **Validación final completa** (2026-08-08):
      1. `npm run db:reset` — pendiente si se necesita regenerar la base.
      2. `npm run db:types` — ⚠️ usar `scripts/gen-types-utf8.mjs`, NO redirect de PowerShell.
      3. Suites SQL — pendiente correrlas con el contenedor db.
      4. `npm test` → **214/214 en verde** ✅
      5. `npm run typecheck` → **verde** ✅
      6. `npm run build` → **verde** ✅

## B. Rama visual ✅ COMPLETO (2026-08-08)

- [x] Ejecutar el pase autónomo de `docs/11-pase-visual-claude.md` — **completado**.
      Commits: `d5ee1d3` (CTA azul, objetivos táctiles, estados vacíos,
      accesibilidad), `262697` (docs del pase visual).
- [x] **Revisar e integrar** los cambios de diseño — **integrado**. Paleta calmada
      respetada, flujos intactos.
- [x] Quick wins de la auditoría (3.1–3.5): eyebrow de finanzas, franja de flujo
      neto, login con marca real, iconografía SVG, encabezado de inventario.
- [x] Elevaciones (4.1–4.5): CTA azul en «Renovar y Cobrar», login rediseñado,
      objetivos táctiles ≥ 44 px, `EstadoVacio` unificado, foco visible y
      `prefers-reduced-motion`.
- [ ] Pasada visual en **teléfonos reales** por todas las plataformas y modales
      (el código ya está adaptado; falta verificación visual manual).
- [ ] Pasada visual del flujo **«Nueva cuenta» para todas las plataformas**
      (móvil + escritorio) — el rediseño 1.1–1.8 está en código; falta verificar.

## C. Seguridad / preparación para producción

- [x] **CSP por entorno** — completado (`e90a20d`): configurable vía variable
      `NEXT_PUBLIC_CSP_DIRECTIVES`.
- [x] **Service worker / PWA** — completado (`6905478`): SW registrado,
      `public/sw.js`, `src/components/registrador-sw.tsx`, iconos PWA en `public/`
      y `manifest.ts` válido.
- [ ] **Rotar el secreto de Kuanto** (`sb_secret_…`) que quedó expuesto en el
      repo público del usuario (`github.com/Aleneytor/Kuanto-App`) y **purgar
      el historial de git** de ese repo. Afecta solo a la tasa paralela en vivo.
- [ ] Decidir y aplicar **`noindex`** (o una capa de auth adicional) para que la
      app no se indexe en buscadores si va a ser privada.
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

- [x] Los 3 «perfiles fantasma» de la auditoría del 2026-07-27 están
      **RESUELTOS** (0 en la base real, verificado 2026-08-08).
- [ ] Si se vuelve a importar desde el Excel, las fechas de renovación omitidas
      por cargas anteriores **no existen en PostgreSQL** y deben venir de nuevo
      en el pegado (no se pueden reconstruir).
- [x] **Teléfonos-referencia del vendedor en clientes (RESUELTO 2026-08-08,
      migración `0061`)**.
      ⚠️ Los nombres reales de los clientes finales que el importador viejo
      colapsó bajo el nombre del vendedor solo viven en el Excel de respaldo;
      para recuperarlos hay que volver a importar esas filas.

## F. Documentación — al cierre de la próxima sesión

- [ ] Actualizar:
      - `AGENTS.md`: entrada en «Estado actual», notas de sesión y el footer de
        «Última actualización».
      - `docs/00-plan-maestro.md`: consolidación de la sesión e índice.
      - Este archivo (`docs/13-pendientes.md`): marcar lo terminado y ajustar el
        orden de lo que sigue.

---

## Orden recomendado para la próxima sesión

1. Rotar secreto de Kuanto y aplicar `noindex` (C, baja complejidad).
2. Revisar `middleware.ts` para producción (C).
3. Pasada visual en teléfonos reales (B, manual — requiere dispositivo físico).
4. Despliegue (D) cuando haya servidor disponible.
5. Cerrar con la documentación (F).