# Pase visual para un modelo CON VISIÓN — GL Streaming (handoff 2026-08-08)

> **Para qué sirve este documento**: es un pase **autónomo** para abrir un chat
> nuevo con un modelo **con visión** (Claude Sonnet/Opus, GPT-4o o Gemini) y
> retomar el trabajo de diseño visual de la app. Pégalo tal cual como mensaje
> inicial del chat nuevo.
>
> La auditoría completa vive en [`docs/10-auditoria-visual.md`](10-auditoria-visual.md);
> este pase la resume y le añade el contexto y el plan de ejecución que un chat
> nuevo necesita para empezar sin depender de esta conversación.

---

## 0. Instrucciones para el agente que recibe este pase

1. **Tienes visión.** Antes de tocar código, inspecciona las imágenes de marca de
   la sección §2 y descríbelas (colores, forma, fondo, tipografía) para que el
   usuario confirme que entiendes la identidad visual.
2. Lee [`AGENTS.md`](../AGENTS.md) y [`GEMINI.md`](../GEMINI.md) en la raíz del
   repo: son la guía de dominio y el mapa técnico. Respeta las **decisiones
   confirmadas por el usuario** (sección §3 y AGENTS.md).
3. Trabaja por **rebanadas pequeñas**: escribir → validar → **commit** (un commit
   por rebanada). No acumules cambios sin commitear.
4. **No programes de más** (regla de oro n.º 4 de AGENTS.md / DEC-97). Si una
   propuesta requiere una decisión del usuario, **pregúntale antes** de aplicarla.
5. Valida siempre antes de declarar completo: `npm run typecheck`, `npm test`,
   `npm run build` y revisión visual en `npm run dev` (http://localhost:3000).

---

## 1. Contexto del proyecto

Aplicación web **Next.js 15 (App Router) + TypeScript estricto + Tailwind 3.4**
que gestiona un negocio de **reventa de cuentas de streaming** (Netflix, Spotify,
Disney+, HBO, Canva, Crunchyroll, etc.): inventario, ventas, renovaciones,
finanzas en tres monedas (USD comercial / VES a BCV / USDT a paralela) y
revendedores. Reemplaza un Excel. Zona horaria `America/Caracas`. Código y
documentación **en español**.

Stack: Next.js 15, React 19, Tailwind 3.4 (darkMode por clase), Supabase local,
Zod, Vitest. Sin ORM.

---

## 2. Activos de marca — ¡inspeccionarlos con visión!

Están en **`assets_gl_streaming/`** en la raíz del repo. ⚠️ NO están dentro de
`public/`, así que Next.js aún no los sirve (ver §5.1). Archivos:

- **`Logo.jpg`** — logo del negocio, 1080×1080, **JPG opaco** (sin canal alfa →
  probable fondo blanco). **Confirma el fondo con visión** y decide cómo
  integrarlo en el tema oscuro «dim» (opciones: caja blanca redondeada, o pedirle
  al usuario una variante PNG con transparencia).
- **`Capcut Pro.jpg`** — 1024×1536, pieza publicitaria.
- **`Netflix y Spoti (3).jpg`** — 1080×1350, pieza publicitaria.
- **`Todas.jpg`** — 1080×1080, pieza publicitaria («todas las plataformas»).

Úsalos como referencia de la identidad de marca (colores, forma, estilo) para el
rediseño visual. Los tres JPG publicitarios son de consulta, no se integran.

---

## 3. Sistema visual vigente (decidido 2026-07-29 — NO cambiar sin avisar)

- **Una sola escala de grises `neutral`** (se erradicaron `slate`/`zinc`).
- **Un solo acento azul** (`blue-600`/`700`/`400`) para lo interactivo y de marca.
- **Color solo con significado semántico**: verde = entra/ok/dinero,
  rojo (`red`, no `rose`) = pierde/vencido/alerta, ámbar = pendiente. **Nunca**
  para decorar una plataforma o una categoría.
- **Headers neutros comunes**: `bg-white dark:bg-neutral-900`, eyebrow azul
  `text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400`,
  sin gradientes por pantalla.
- **Botón primario neutral-inverse**: `bg-neutral-900 text-white dark:bg-white dark:text-neutral-900`.
- **Oscuro «dim» por defecto**: `className="dark"` en `src/app/layout.tsx`;
  tonos `neutral-950=#16191f` (fondo), `900=#1e222b` (tarjetas),
  `800=#2b313c` (bordes) en `tailwind.config.ts`. **No cambiar a claro sin pedirlo**.
- **Tarjetas canónicas**: `rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900`.
- **KPI**: franja de acento `border-l-4` + número grande `text-2xl tabular-nums`.
- **Foco canónico** (inputs/buscadores): `focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`.
- **Logos de plataforma**: Simple Icons en
  `src/features/inventario/logos-plataforma.tsx`, color de marca solo en el trazo.
- **Modal (patrón canonizado)**: cáscara `max-h-[calc(100dvh-2rem)] w-full max-w-* overflow-y-auto`.

---

## 4. Resultado de la auditoría visual (completa en `docs/10-auditoria-visual.md`)

### 4.1 Lo que ya funciona bien (CONSERVAR)

- Sistema de tarjetas coherente en toda la app (`rounded-2xl` + borde + shadow-xs).
- Paleta con color solo semántico, respetada casi sin excepciones.
- `tabular-nums` para dinero; ingresos en verde, salidas en rojo, unidades claras.
- KPI con franja `border-l-4`; segmented control de finanzas (`SubNavFinanzas`);
  logos de marca; nav responsive (sidebar + barra inferior móvil con safe-area).

### 4.2 Inconsistencias rápidas (bajo riesgo) — 3.1 a 3.5

| # | Dónde | Problema | Propuesta |
|---|-------|----------|-----------|
| 3.1 | `src/app/(panel)/(finanzas)/layout.tsx:12` | Eyebrow del layout en `neutral-400` (caso único) + doble cabecera (layout + cada página hija) | Unificar a azul o, mejor, **quitar el eyebrow del layout** y dejar solo el segmented control |
| 3.2 | `src/app/(panel)/(finanzas)/caja/page.tsx:129` | «Flujo neto del día» sin `border-l-4` (las otras dos tarjetas sí lo tienen) | Darle franja `border-l-blue-500` (derivado) o `border-l-neutral-500` (neutro); igualar la fila de 3 |
| 3.3 | `src/app/(auth)/login/page.tsx:50` | Emoji `📺` como logo, foco `focus:border-neutral-900`, fondo plano sin ancla de marca | Marca real + foco azul canónico + fondo sutil (ver §5.1 y 4.3) |
| 3.4 | Nav, login, `centro-operaciones.tsx:275` (`📞`), `cobros/page.tsx:76` (`✓`) | Iconografía mixta emojis/SVGs (los emojis se ven distinto por sistema operativo) | Migrar emojis a iconos SVG coherentes (paths heroicons ya usados o lucide) |
| 3.5 | `src/app/(panel)/inventario/[slug]/page.tsx:558` | Encabezado mínimo (`h1 text-lg`, sin tarjeta ni eyebrow) vs. patrón del resto | Alinear tipografía `text-2xl` + eyebrow azul pequeño («Inventario · Netflix») |

### 4.3 Elevaciones (mayor impacto, REQUIEREN decisión del usuario) — 4.1 a 4.5

- **4.1 CTA primario azul**: hoy todo primario es neutral-inverse (decisión del
  2026-07-29). Probar un **único** CTA `bg-blue-600` en la acción más usada
  («Renovar y Cobrar» del Centro de Operaciones) y comparar antes de decidir. No
  cambiar toda la app sin preguntar.
- **4.2 Login como primera impresión**: tarjeta centrada con la marca real,
  subtítulo, foco azul y un detalle de contexto (marcas de plataformas en tonos
  neutros o degradado tenue) para que se sienta «la casa». No toca lógica de auth.
- **4.3 Densidad vs legibilidad móvil**: objetivos táctiles ≥ 44 px en acciones
  (Renovar, Gestionar, Vender) y filas de Operaciones.
- **4.4 Estados vacíos unificados**: hoy hay variantes (cobros usa borde esmeralda
  con `✓`, operaciones/inventario usan borde dashed neutro). Crear un componente
  `EstadoVacio` (icono + título + sugerencia) con variante semántica.
- **4.5 Micro-detalles**: foco visible consistente en botones/enlaces;
  `prefers-reduced-motion` para el `animate-pulse` del punto urgente
  (`centro-operaciones.tsx:155`); mantener el patrón «total destacado»
  (`bg-neutral-100`) del cierre (`cierre/page.tsx:319`) como convención.

### 4.4 Orden recomendado

1. Quick wins (3.1, 3.2, 3.3, 3.5) → 2. Iconografía (3.4) → 3. CTA + login
   (4.1, 4.2, con decisión del usuario) → 4. Pulido continuo (4.3–4.5).

---

## 5. Trabajo pendiente priorizado (para este chat con visión)

### 5.1 PRIMERA REBANADA: integrar el logo real como ancla de marca

1. Inspecciona `assets_gl_streaming/Logo.jpg` con visión y describe al usuario
   colores, forma y fondo antes de seguir.
2. Copia el logo a **`public/`** (p. ej. `public/logo.png` o `.jpg`). Next.js solo
   sirve estáticos desde `public/`; `assets_gl_streaming/` no es servible.
   Si hace falta una variante con transparencia, pídesela al usuario.
3. Aplica la marca en **dos puntos**, respetando el oscuro «dim»:
   - [`src/app/(auth)/login/page.tsx`](../src/app/(auth)/login/page.tsx) — sustituir
     el emoji `📺` por el logo y aplicar el foco azul canónico.
   - [`src/app/(panel)/layout.tsx`](../src/app/(panel)/layout.tsx:45) — header del
     panel (hoy usa el recuadro `rounded-xl bg-blue-600` con SVG).
4. Valida: `npm run typecheck`, `npm test`, `npm run build` y vista en
   `npm run dev`. Un commit.

### 5.2 Quick wins de la auditoría (3.1, 3.2, 3.3 restante, 3.5)

Aplicar en rebanadas independientes, una commit por rebanada.

### 5.3 Iconografía (3.4)

Migrar emojis del nav, login, WhatsApp y estados vacíos a SVGs coherentes.
Inversión media, gran ganancia de limpieza.

### 5.4 Elevaciones (4.1–4.5)

**Cada una requiere decisión del usuario**: presentar la propuesta (idealmente con
capturas o lado a lado) y preguntar antes de aplicar. Especialmente 4.1 (CTA azul)
y 4.2 (rediseño de login).

---

## 6. Archivos clave para la revisión visual

- Login: `src/app/(auth)/login/page.tsx`
- Layout del panel + navegación: `src/app/(panel)/layout.tsx`, `src/components/nav-panel.tsx`
- Dashboard admin: `src/app/(panel)/dashboard/page.tsx`, `src/features/operaciones/centro-operaciones.tsx`
- Panel del revendedor: `src/features/revendedor/panel-revendedor.tsx`
- Inventario: `src/app/(panel)/inventario/page.tsx`, `src/app/(panel)/inventario/[slug]/page.tsx`, `src/features/inventario/tabla-inventario.tsx`, `src/features/inventario/logos-plataforma.tsx`
- Finanzas: `src/app/(panel)/(finanzas)/layout.tsx`, `src/features/finanzas/sub-nav.tsx`, `src/app/(panel)/(finanzas)/caja/page.tsx`, `cierre/page.tsx`, `cobros/page.tsx`, `egresos/page.tsx`, `tasas/page.tsx`
- Personal: `src/app/(panel)/personal/page.tsx`
- Base: `tailwind.config.ts`, `src/app/globals.css`

---

## 7. Comandos de validación

```bash
npm run dev          # app en http://localhost:3000 (dev:lan para red local)
npm run typecheck    # tsc --noEmit
npm test             # pruebas unitarias (Vitest)
npm run build        # build de producción
```

⚠️ **Higiene**: NO regenerar `src/lib/supabase/database.types.ts` con un redirect
crudo de PowerShell (escribe UTF-16). Si se regenera (`npm run db:types`), hay que
convertir el resultado a UTF-8 sin BOM (leer como Unicode + escribir como UTF-8).

---

*Documento generado el 2026-08-08 como pase para retomar el trabajo visual con un
modelo con visión. La auditoría completa sin editar está en
`docs/10-auditoria-visual.md`.*
