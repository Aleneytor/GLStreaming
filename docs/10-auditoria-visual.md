# Auditoría visual del panel — GL Streaming (2026-08-08)

> Propuesta, sin tocar código. Objetivo: decir qué funciona del sistema visual
> actual y proponer mejoras concretas y priorizadas sobre las pantallas clave
> (login, dashboard/Centro de Operaciones, inventario y finanzas), respetando la
> paleta calmada y el oscuro «dim» decididos el 2026-07-29.

## 1. Alcance y método

Lectura de código de UI (no ejecución) de las pantallas y piezas clave:

- Login: [`src/app/(auth)/login/page.tsx`](../src/app/(auth)/login/page.tsx)
- Layout del panel y navegación: [`src/app/(panel)/layout.tsx`](../src/app/(panel)/layout.tsx), [`src/components/nav-panel.tsx`](../src/components/nav-panel.tsx)
- Dashboard admin: [`src/app/(panel)/dashboard/page.tsx`](../src/app/(panel)/dashboard/page.tsx), [`src/features/operaciones/centro-operaciones.tsx`](../src/features/operaciones/centro-operaciones.tsx)
- Inventario: [`src/app/(panel)/inventario/page.tsx`](../src/app/(panel)/inventario/page.tsx), [`src/app/(panel)/inventario/[slug]/page.tsx`](../src/app/(panel)/inventario/[slug]/page.tsx), [`src/features/inventario/tabla-inventario.tsx`](../src/features/inventario/tabla-inventario.tsx), [`src/features/inventario/logos-plataforma.tsx`](../src/features/inventario/logos-plataforma.tsx)
- Finanzas: [`src/app/(panel)/(finanzas)/layout.tsx`](../src/app/(panel)/(finanzas)/layout.tsx), [`src/features/finanzas/sub-nav.tsx`](../src/features/finanzas/sub-nav.tsx), [`caja/page.tsx`](../src/app/(panel)/(finanzas)/caja/page.tsx), [`cierre/page.tsx`](../src/app/(panel)/(finanzas)/cierre/page.tsx), [`cobros/page.tsx`](../src/app/(panel)/(finanzas)/cobros/page.tsx), [`egresos/page.tsx`](../src/app/(panel)/(finanzas)/egresos/page.tsx), [`tasas/page.tsx`](../src/app/(panel)/(finanzas)/tasas/page.tsx)
- Base: [`tailwind.config.ts`](../tailwind.config.ts), [`src/app/globals.css`](../src/app/globals.css)

## 2. Lo que ya funciona bien (conservar)

- **Sistema de tarjetas coherente**: `rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs` con su par oscuro (`dark:bg-neutral-900 dark:border-neutral-800`) en toda la app. Muy estable.
- **Paleta**: un solo acento azul + escala `neutral` + color solo semántico (esmeralda = entra/ok, rojo = pierde/vencido, ámbar = pendiente). Regla respetada casi sin excepciones.
- **Semántica de dinero**: `tabular-nums`, ingresos en verde, salidas en rojo, unidades claras (Bs/USDT/USD). El `centro-operaciones` reserva el color a la franja/número, sobre tarjeta neutra.
- **KPI con franja de acento** (`border-l-4`): patrón dominante y efectivo.
- **Segmented control de finanzas** (`SubNavFinanzas`): bien resuelto, con scroll horizontal en móvil y activo `bg-white text-blue-700 shadow-xs`.
- **Logos de marca** en el inventario (Simple Icons, color solo en el trazo): identifica plataformas sin romper la paleta.
- **Nav responsive**: sidebar de escritorio + barra inferior fija en móvil con `env(safe-area-inset-bottom)`.
- **Estados vacíos y avisos ámbar**: claros y no alarmistas.

## 3. Inconsistencias detectadas (rápidas, bajo riesgo)

### 3.1 Finanzas: eyebrow del layout en `neutral-400` (caso único)

[`src/app/(panel)/(finanzas)/layout.tsx`](../src/app/(panel)/(finanzas)/layout.tsx:12) usa `text-neutral-400 dark:text-neutral-500` para «Finanzas del negocio». Todas las demás pantallas usan el eyebrow azul canónico `text-blue-700 dark:text-blue-400` dentro de una tarjeta de cabecera. Además hay **doble cabecera**: el eyebrow del layout flotando sobre el segmented control, y luego cada página hija repite su propia tarjeta con eyebrow azul + h1 (caja, cobros, egresos, tasas, cierre).

**Propuesta**: o bien unificar el eyebrow del layout a azul, o —mejor— **quitar el eyebrow del layout** y dejar solo el segmented control, porque cada pantalla hija ya trae su título propio. Menos ruido arriba.

### 3.2 Caja: «Flujo neto del día» sin línea de acento

[`caja/page.tsx`](../src/app/(panel)/(finanzas)/caja/page.tsx:129): las tarjetas «Recibiste» (esmeralda) y «Pagaste» (rojo) llevan `border-l-4`, pero la tercera («Flujo neto del día») no tiene franja. Rompe el patrón visual de la fila de 3.

**Propuesta**: darle franja azul (`border-l-blue-500`) — es un valor derivado, no entrada ni salida — o `border-l-neutral-500` para marcar que es neutro. Lo importante es que las tres tarjetas compartan la misma estructura.

### 3.3 Login: sin ancla de marca y foco fuera del sistema

[`login/page.tsx`](../src/app/(auth)/login/page.tsx:50) usa un emoji `📺` como logo, inputs con foco `focus:border-neutral-900` (el resto de la app usa `focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`) y un fondo plano sin jerarquía. Es la pantalla más «genérica» de la app.

**Propuesta** (bajo riesgo, solo visual): reutilizar el icono de marca azul del header del panel ([`layout.tsx`](../src/app/(panel)/layout.tsx:45), recuadro `rounded-xl bg-blue-600 text-white`), foco azul en los inputs y un fondo sutil (gradiente neutro o patrón tenue) para dar ancla de marca.

### 3.4 Iconografía mixta: emojis junto a SVGs

Conviven emojis y SVGs inline (tipo heroicons):

- Emoji en items del nav ([`nav-panel.tsx`](../src/components/nav-panel.tsx)), `📺` en el login, `📞` en el teléfono de WhatsApp ([`centro-operaciones.tsx`](../src/features/operaciones/centro-operaciones.tsx:275)), `✓` en el estado vacío de cobros ([`cobros/page.tsx`](../src/app/(panel)/(finanzas)/cobros/page.tsx:76)).
- SVG inline en el header del panel, búsquedas, botones Renovar/Gestionar/Retiros.

Los emojis se ven **distintos en Windows, Android e iOS** (tipografía de cada sistema) y dan sensación informal/inconsistente.

**Propuesta**: migrar todos los emojis a un set de iconos SVG coherente (los paths heroicons que ya se usan, o lucide). Es la mejora de «limpieza» con mayor impacto percibido.

### 3.5 Jerarquía del encabezado de `/inventario/[slug]`

[`inventario/[slug]/page.tsx`](../src/app/(panel)/inventario/[slug]/page.tsx:558): encabezado mínimo (`h1 text-lg`, enlace «← Volver a Inventario», sin tarjeta de cabecera ni eyebrow), frente al patrón de tarjetas `rounded-2xl` con eyebrow azul del resto.

**Propuesta**: mantenerlo compacto (es una sub-página con tabla densa) pero alinear la tipografía (`text-2xl` como el resto) y, opcionalmente, un eyebrow azul pequeño («Inventario · Netflix»). Es un detalle, no una urgencia.

## 4. Propuestas de elevación (requieren decisión; mayor impacto)

### 4.1 CTA primario: ¿neutral-inverso o azul?

Hoy **todos** los botones primarios son `bg-neutral-900` / `dark:bg-white` (decisión 2026-07-29: botón primario neutral-inverse). En una app de dinero, un CTA primario **azul** (`bg-blue-600`) orienta el ojo y se siente más «producto»; el neutral casi negro puede leerse como «apagado».

**Propuesta**: probar un único CTA primario azul en la acción más usada del día a día («Renovar y Cobrar» del Centro de Operaciones) y comparar lado a lado antes de decidir. **No** cambiar toda la app sin probar: la decisión de la paleta es del usuario.

### 4.2 Login como primera impresión

Rediseño propuesto (solo visual): tarjeta centrada con el **icono de marca azul**, subtítulo, inputs con foco azul y —dado que es un negocio de reventa de streaming— un detalle de contexto (marcas de plataformas en tonos neutros o un degradado tenue) para que se sienta «la casa» y no un template. No toca lógica de auth.

### 4.3 Densidad vs legibilidad móvil

Mucho `text-xs` / `text-[11px]` (intencional en escritorio, tipo Excel). En móvil conviene revisar:

- **Objetivos táctiles** ≥ 44 px en acciones (Renovar, Gestionar, Vender) y en las filas de Operaciones.
- Los **números KPI** ya van grandes (`text-2xl`); mantenerlos como ancla de lectura rápida.

### 4.4 Estados vacíos unificados

Hoy hay variantes: cobros usa borde esmeralda con `✓` ([`cobros/page.tsx`](../src/app/(panel)/(finanzas)/cobros/page.tsx:74)), operaciones e inventario usan borde dashed neutro ([`centro-operaciones.tsx`](../src/features/operaciones/centro-operaciones.tsx:258), [`inventario/page.tsx`](../src/app/(panel)/inventario/page.tsx), [`inventario/[slug]/page.tsx`](../src/app/(panel)/inventario/[slug]/page.tsx:594)).

**Propuesta**: un pequeño componente `EstadoVacio` (icono + título + sugerencia) reutilizado en todos los casos, con variante semántica (neutra / esmeralda cuando «todo está bien», como en cobros).

### 4.5 Micro-detalles

- **Foco visible consistente** en botones y enlaces (hoy el foco azul vive sobre todo en inputs y buscadores).
- **`prefers-reduced-motion`**: el punto rojo urgente usa `animate-pulse` ([`centro-operaciones.tsx`](../src/features/operaciones/centro-operaciones.tsx:155)); conviene respetar la preferencia de movimiento reducido.
- **Cierre**: la tarjeta «Flujo neto valorizado» resalta con `bg-neutral-100` ([`cierre/page.tsx`](../src/app/(panel)/(finanzas)/cierre/page.tsx:319)) — es un buen patrón de «total destacado», mantenerlo como convención.

## 5. Orden recomendado (riesgo/impacto)

1. **Quick wins** (3.1, 3.2, 3.3, 3.5): toques rápidos, bajo riesgo, cierran las incoherencias visibles.
2. **Iconografía** (3.4): inversión media, gran ganancia de limpieza y de percepción «profesional».
3. **Decisión CTA + login** (4.1, 4.2): requieren decisión del usuario; probar antes de aplicar.
4. **Pulido continuo** (4.3–4.5): estados vacíos, foco, movimiento reducido.

## 6. Notas

- Es propuesta: **no se modificó código**. Validar visualmente en escritorio y móvil antes de aplicar cada bloque.
- La paleta calmada, el oscuro «dim» y la semántica de color se conservan intactas en todas las propuestas.
