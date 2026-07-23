# Plan maestro — punto de partida único

Este documento existe para que, si el código de una fase sale mal, no gusta el resultado, o hay que empezar de cero, **todo el contexto necesario para retomar esté en un solo lugar**, sin depender del historial de una conversación. `docs/` es la carpeta de planificación del proyecto y no la toca ninguna herramienta de scaffolding de código (`src/`, `supabase/`, `tests/` viven aparte, ver sección 3): borrar el código nunca borra este contexto.

Fecha de esta consolidación: **22/07/2026**.

## 1. Resumen ejecutivo del estado del proyecto

GL Streaming reemplaza un Excel operativo de reventa de cuentas de streaming (Netflix, HBO, Disney+, Prime Video, Crunchyroll, Paramount+, Universal+, VIX, FlujoTV, Telelatino, CapCut, Gemini/Google Cloud, Canva, YouTube, Spotify) por una app web. El modelo de dominio es inusualmente riguroso para una etapa pre-código: **95 decisiones confirmadas** (`DEC-01` a `DEC-95` en `06-decisiones-pendientes.md`), un diccionario de ~30 entidades con campos exactos (`02-modelo-dominio.md`), 90+ invariantes numerados, y fórmulas financieras completas (USD comercial → VES cobrado a BCV → lectura económica a paralela → USDT de costos).

**Fase 0 (decisiones de dominio) está cerrada.** Seis plataformas están funcionalmente sólidas: Netflix, HBO, Disney+, Prime Video, Crunchyroll y Spotify. Los cuatro huecos que quedaban (YouTube, Canva, Telelatino, Gemini/Google Cloud) se resolvieron o se despriorizaron explícitamente en la sesión del 22/07/2026 (ver `DEC-91` a `DEC-95`), incluida una regla nueva de Netflix (verificación de hogar) que no estaba documentada antes.

**Lo único pendiente fuera de este workspace**: rotar una credencial expuesta en el repo público del proyecto Kuanto (fuente de la tasa paralela, propiedad del usuario) — ver `07-integracion-tasas.md` y la nota en `README.md`. **No bloquea la Fase 1**: todo el desarrollo empieza en local con datos simulados; solo importa antes de conectar la tasa paralela en vivo (más cerca de la Fase 4, motor financiero).

## 2. Índice de la documentación (orden de lectura recomendado)

| Documento | Contenido |
|---|---|
| `README.md` | Visión general, hallazgos que cambian el blueprint original, estado de seguridad |
| `01-alcance-y-reglas.md` | Reglas de negocio, actores, vocabulario, fórmulas financieras completas |
| `02-modelo-dominio.md` | Diagrama ER + diccionario de ~30 entidades con campos exactos, invariantes |
| `03-arquitectura-y-seguridad.md` | Stack propuesto, estructura de repo, seguridad por capas, operaciones atómicas |
| `04-carga-manual.md` | Cómo se da de alta el inventario/cartera existente a mano, sin importador |
| `05-roadmap.md` | Fases 0-6 con criterios de entrada/salida de cada una |
| `06-decisiones-pendientes.md` | **Fuente de verdad de qué está confirmado y qué sigue abierto** (P0/P1) |
| `07-integracion-tasas.md` | Contrato exacto de las APIs de tasa BCV y paralela (Kuanto), hallazgos de auditoría |
| `08-proximo-paso.md` | Última instrucción registrada antes de esta consolidación |
| `plataformas/` | Ficha detallada de cada una de las 15 plataformas + 4 arquetipos de cuenta compartida |

Si hay que reconstruir el proyecto desde cero, **empezar por este archivo, luego `06-decisiones-pendientes.md`** (para saber exactamente qué ya está decidido) y después la sección 3 de este documento (stack técnico) antes de tocar cualquier editor.

## 3. Stack técnico confirmado para la Fase 1

Propuesto el 22/07/2026 a pedido explícito del usuario, para no perder tiempo decidiéndolo el día que se arranque a programar.

| Capa | Elección | Por qué |
|---|---|---|
| Framework | Next.js 15 (App Router) | Ya implícito en la estructura de carpetas de `03-arquitectura-y-seguridad.md`; Server Actions maduras para la "frontera de servidor" que pide ese documento |
| Lenguaje | TypeScript 5.x, `strict` activado | Tipos generados de Supabase (`supabase gen types typescript`) encajan directo |
| UI | Tailwind CSS 3.4 LTS (no v4 todavía) | Proyecto financiero, prioriza estabilidad sobre novedad |
| Backend/DB | Supabase (Postgres + Auth + RLS), CLI de Supabase para migraciones locales versionadas | Ya confirmado en `DEC-09`, `DEC-34` |
| Acceso a datos | `@supabase/supabase-js` + tipos generados + patrón repositorio en `server/repositories/`, **sin ORM** (nada de Prisma/Drizzle) | Evita duplicar la lógica de RLS que ya vive en Postgres |
| Validación | Zod | Integra con TS + Server Actions; tipos derivados en `lib/validation/` |
| Cifrado de secretos (credenciales de cuentas, PIN, Gmail de clientes) | AES-256-GCM con el módulo `crypto` nativo de Node, en el servidor Next.js; clave solo en variable de entorno del servidor, nunca en Postgres | Cumple literalmente "clave no guardada junto al dato"; evita depender de pgcrypto/Supabase Vault para miles de secretos por-cliente con revelado auditado caso a caso |
| Testing | Vitest (unidad), Playwright (E2E), `pgTAP` o suites de la CLI de Supabase (RLS/restricciones) | Cubre las categorías que ya pide `03-arquitectura-y-seguridad.md` |
| Estado de UI transversal | Zustand, solo si aparece necesidad real fuera de URL/estado local | Ya condicionado así en el documento original |

Repositorio propuesto (de `03-arquitectura-y-seguridad.md`, sin cambios): `src/app/`, `src/features/`, `src/domain/`, `src/server/`, `src/components/`, `src/lib/`, `supabase/migrations/`, `tests/`. Todo el código de aplicación vive fuera de `docs/`.

## 4. Secuencia de trabajo acordada

Por decisión explícita del usuario, **no se espera a cerrar el catálogo completo de las 15 plataformas** antes de programar:

1. Fase 1 (fundación técnica): proyecto local Next.js/TS/Tailwind/Supabase, migraciones cubriendo el esquema completo de las 6 plataformas sólidas + Spotify + los huecos ya resueltos de Canva/Gemini/Netflix-extra + la nueva regla de verificación de hogar; YouTube con el mínimo necesario para conservar sus 2 registros comerciales reales. Auth/RLS/vistas seguras, seeds sintéticos.
2. Fase 2 (Netflix + carga manual) → Fase 3 (ciclo comercial) → Fase 4 (proveedores/finanzas/cierre, momento natural para resolver la rotación de Kuanto) → Fase 5 (portal revendedor) → Fase 6 (resto de plataformas + despliegue en `glcuenta.com`), tal como están descritas en `05-roadmap.md`, sin cambios de fondo.
3. Telelatino queda con modalidad limitada a "cuenta completa" (default ya aceptado) hasta que se decida ampliarla; el resto de los ~40 ítems P0/P1 no críticos quedan aceptados con la propuesta que ya trae `06-decisiones-pendientes.md`, salvo que el usuario diga lo contrario en el momento de implementarlos.
4. No se toca VPS ni `glcuenta.com` hasta la Fase 6.

## 4.1. Estado del código (actualizado 22/07/2026)

**Fase 1 — rebanada 1 de ~6 entregada**: scaffold + capa de fundación/catálogo.

- Scaffold completo: `package.json` (stack confirmado), configs de Next 15 / TS strict / Tailwind 3.4, `.gitignore`, `.env.example`, app shell mínima en `src/app/`, helpers de Supabase en `src/lib/supabase/`, validación de entorno con Zod en `src/lib/env.ts`.
- `supabase/migrations/0001_fundacion_catalogo.sql`: tablas `usuarios`, `vendedores`, `plataformas`, `mecanismos_entrega`, `modalidades`, `productos_plataforma`, `producto_modalidades`, `proveedores`, con RLS activo, función `es_admin()` y trigger de alta de perfil.
- `supabase/seed.sql`: catálogo sintético de las 15 plataformas con capacidades confirmadas (sin secretos).
- Base PWA / mobile-first iniciada: `src/app/manifest.ts` (display standalone) + viewport/theme-color en `layout.tsx`. Pendiente para instalabilidad completa: iconos 192/512/maskable en `/public` y service worker (ver `01-alcance-y-reglas.md` §9).
- **Validado contra PostgreSQL real (22/07/2026)**: Docker Desktop 4.83 + WSL2 instalados, `supabase start` levanta el stack local, la migración 0001 aplica y el seed carga correctamente. Verificado por consulta: 15 plataformas, 17 productos, 28 modalidades, 28 combinaciones producto/modalidad, 7 mecanismos, 1 proveedor (`Yo`). Las capacidades no triviales quedaron correctas (Canva 500, CapCut 3/2, Universal+ 5, Netflix 5 + extra 1, YouTube `solo_cartera`, Spotify 1/5).
- Verificado además: `npm install` con Node 25, `tsc --noEmit` limpio, `npm run build` de Next.js exitoso, tipos TypeScript generados desde el esquema (`src/lib/supabase/database.types.ts`).
- Dos errores reales encontrados y corregidos gracias a esta validación: (1) `es_admin()` se declaraba antes de existir `public.usuarios` — PostgreSQL valida el cuerpo de funciones `language sql` al crearlas; (2) el seed usaba una función en `pg_temp`, que no sobrevive entre lotes de ejecución del CLI.

Rebanadas siguientes de la Fase 1 (en orden): inventario+secretos, ciclo comercial, proveedores+finanzas, rama Spotify, verificación de hogar Netflix, vistas seguras + pruebas RLS. Detalle en `09-fase-1-setup.md`.

## 5. Qué hacer si hay que reiniciar desde cero

- Borrar únicamente `src/`, `supabase/` (excepto este `docs/`) y `tests/` — nunca `docs/`.
- Releer este archivo y `06-decisiones-pendientes.md`.
- Repetir la sección 3 (stack) tal cual, salvo que el usuario pida cambiarlo explícitamente.
- No hace falta repetir ninguna de las preguntas ya resueltas (`DEC-01` a `DEC-95`): son decisiones de negocio, no de implementación, y no caducan porque el código se reescriba.
