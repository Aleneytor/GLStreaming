# Integración de tasas

Este documento registra las fuentes y contratos auditados el 22/07/2026. La revisión de Kuanto se hizo en modo de solo lectura sobre el repositorio público `Aleneytor/Kuanto-App`, rama `main`, [commit `cbd29a9`](https://github.com/Aleneytor/Kuanto-App/tree/cbd29a921843a9d68e262062d4635cb7a451d3c2). Todavía no se ha programado ningún sincronizador ni se ha copiado ninguna credencial del repositorio.

## 1. Tasa BCV

Fuente confirmada, propiedad del usuario:

```text
GET https://bcvscrapper.vercel.app/api/bcv
```

El endpoint devuelve actualmente:

```json
{
  "success": true,
  "date": "YYYY-MM-DD",
  "usd": 0.0,
  "eur": 0.0,
  "source": "bcv-direct",
  "fetchedAt": "ISO-8601"
}
```

Mapeo para GL Streaming:

| Campo API | Campo interno | Regla |
|---|---|---|
| `success` | validación | Debe ser `true`. |
| `date` | `fecha_vigencia` | Fecha oficial entregada por la API, incluido el siguiente día hábil cuando corresponda. |
| `usd` | `bs_por_usd` | Debe ser decimal, finito y mayor que cero. |
| `eur` | payload original | No se usa inicialmente en los cálculos de GL Streaming. |
| `source` | `fuente` | Identificador de procedencia. |
| `fetchedAt` | `observada_fuente_at` | Instante en que el scraper obtuvo la lectura. |
| hora de recepción | `obtenida_at` | Instante en que GL Streaming recibió y validó la respuesta. |

El contrato actual no devuelve `publishedAt`. Por tanto, `publicada_at` será opcional y no se falsificará copiando `fetchedAt`: la primera indica publicación oficial y la segunda una observación técnica. Si la API incorpora ese campo en el futuro, se mapeará directamente.

La identidad lógica de una publicación BCV usa tipo, `date`, `usd` y `source`; consultar varias veces el mismo valor no crea duplicados aunque cambie `fetchedAt`. Un valor diferente para la misma fecha crea una versión corregida y nunca reescribe operaciones anteriores.

### Endurecimiento requerido antes de producción

El [código revisado del scraper](https://github.com/Aleneytor/Kuanto-App/blob/cbd29a921843a9d68e262062d4635cb7a451d3c2/bcv-scraper-vercel/api/bcv.js) desactiva actualmente la validación TLS con `rejectUnauthorized: false` y, si no encuentra la fecha oficial, sustituye `date` por la fecha UTC de la consulta. Antes de usar esta fuente para cierres financieros se debe:

- restablecer la validación de certificados;
- fallar de forma explícita si falta la fecha oficial, en vez de inventar una vigencia;
- validar tipo de contenido, estructura, fecha y valores antes de aceptar la respuesta;
- conservar la última publicación válida sin modificarla cuando una consulta nueva falle.

## 2. Tasa paralela de Kuanto

Fuentes confirmadas, también propiedad del usuario:

- aplicación: `https://kuanto.online/app/`;
- repositorio: `https://github.com/Aleneytor/Kuanto-App`;
- [productor vigente](https://github.com/Aleneytor/Kuanto-App/blob/cbd29a921843a9d68e262062d4635cb7a451d3c2/supabase/functions/update-p2p-rates/index.ts): `supabase/functions/update-p2p-rates/index.ts`;
- [lector usado por el frontend](https://github.com/Aleneytor/Kuanto-App/blob/cbd29a921843a9d68e262062d4635cb7a451d3c2/src/services/rateService.js): `src/services/rateService.js`;
- [tabla y políticas RLS](https://github.com/Aleneytor/Kuanto-App/blob/cbd29a921843a9d68e262062d4635cb7a451d3c2/src/database/01_setup_p2p_table.sql): `src/database/01_setup_p2p_table.sql`.

La implementación autoritativa actual es `update-p2p-rates`, que escribe en `p2p_rate_history`. La función antigua `update-rates`, que escribe en `crypto_rates`, se considera legado y **no** será fuente para GL Streaming porque el frontend vigente de Kuanto no consulta esa tabla.

### Fórmula observada

```text
price = promedio no ponderado de los agregados BUY positivos disponibles:
        binance.buy, bybit.buy y yadio.buy
```

Reglas exactas del productor auditado:

- Binance consulta hasta diez anuncios `USDT/VES` por lado. Calcula la mediana, excluye valores que se alejen más de 10 % de ella y promedia los restantes. Aunque un comentario del código dice que omite el primer anuncio, la implementación actual no lo hace.
- Bybit consulta hasta diez anuncios `USDT/VES` por lado y promedia cada lado sin el filtro de mediana.
- Yadio usa `USD.rate` y replica el mismo valor como `buy` y `sell` dentro del detalle.
- Solo los valores `buy` participan en `price`; los `sell` se guardan para diagnóstico, pero no afectan la tasa consolidada.
- Si una fuente falla o devuelve cero, se excluye del denominador. Si fallan todas, no se inserta una observación.

La fila persistida tiene este contrato:

```text
p2p_rate_history
  id          bigint identity, clave primaria
  price       numeric, obligatorio
  details     jsonb
    binance   { buy, sell }
    bybit     { buy, sell }
    yadio     { buy, sell }
  created_at  timestamptz, generado al insertar
```

`created_at` es el instante de inserción en Kuanto y el mejor proxy disponible de observación. Las APIs consultadas no entregan aquí un timestamp común de mercado. No se usará `parallelUpdate` del frontend de Kuanto porque representa la hora local de una consulta del navegador, no la hora de la fila original.

## 3. Contrato de lectura para GL Streaming

La vía disponible hoy es una lectura directa de Supabase. Se acepta como contrato inicial porque la tabla tiene RLS habilitado, una política de lectura pública y la inserción queda reservada a `service_role`. La ingestión dependerá temporalmente de esa política pública, pero los datos y snapshots ya guardados por GL Streaming permanecerán dentro de su propia base. Un adaptador de servidor aislará esta dependencia para que un cambio futuro de tabla o la creación de un endpoint propio solo exija modificar ese componente.

Consulta lógica:

```text
tabla: p2p_rate_history
select: id, price, details, created_at
order: created_at descendente, id descendente
limit: 1
```

Equivalente PostgREST, usando únicamente variables de entorno:

```text
GET ${KUANTO_SUPABASE_URL}/rest/v1/p2p_rate_history
    ?select=id,price,details,created_at
    &order=created_at.desc,id.desc
    &limit=1

apikey: ${KUANTO_SUPABASE_PUBLISHABLE_KEY}
```

No se copiarán del repositorio valores reales de URL o claves. La clave de lectura será pública/publicable y estará sujeta a RLS; nunca se utilizará `service_role` desde GL Streaming ni se invocará `update-p2p-rates` para leer, porque cada llamada a esa función vuelve a consultar las fuentes e inserta otra fila.

Mapeo:

| Campo Kuanto | Campo interno | Regla |
|---|---|---|
| `id` | `fuente_registro_id` | Identidad estable para hacer idempotentes las lecturas de una misma fila. |
| `price` | `bs_por_usd` | Bs por USDT; en GL Streaming se usa bajo la convención interna `1 USDT = 1 USD de referencia`. |
| `details` | `detalle_fuentes` | Payload diagnóstico por exchange; no se recalcula `price` en GL Streaming. |
| `created_at` | `observada_fuente_at` y `vigente_desde` | Instante original de inserción en Kuanto y proxy de observación, no timestamp individual de cada exchange. |
| hora de recepción | `obtenida_at` | Instante en que GL Streaming recibió y validó la fila. |

La unicidad interna usa `(fuente, fuente_registro_id)`. Si el mismo registro se consulta varias veces, no se duplica. Esto da idempotencia de lectura, pero no convierte en una sola observación las filas distintas creadas por los dos programadores actuales, porque tienen IDs diferentes. Una operación confirmada congela la tasa interna enlazada, el valor, el identificador externo, la observación original y la hora de recepción; una tasa posterior jamás recalcula el pasado.

En una venta o renovación de cliente se usan ambas fuentes en una sola confirmación:

```text
precio_comercial_usd               = introducido manualmente
monto_ves_esperado                 = round_half_up(precio_comercial_usd * bcv.bs_por_usd, 2)
equivalente_economico_paralelo_usd = monto_ves_cobrado / paralela.bs_por_usd
```

La BCV determina el cobro ordinario en bolívares y la paralela permite medir su valor económico frente a costos pagados en USDT. La transacción congela los IDs de ambas observaciones, el precio USD, el monto esperado y el monto efectivamente cobrado. No existe selector BCV/paralela para decidir el cobro ni una tarifa USD obligatoria suministrada por estas APIs.

En el futuro se puede publicar un endpoint propio de solo lectura, por ejemplo `GET /api/rates/parallel/latest`, sin cambiar el dominio financiero. Sería una mejora de desacoplamiento, no un bloqueo para comenzar el desarrollo local.

## 4. Cadencia: intención frente al estado observado

La regla de negocio confirmada es que Kuanto debe producir una tasa cada cinco minutos, todos los días. Sin embargo, la auditoría encontró tres estados distintos:

- el [SQL versionado](https://github.com/Aleneytor/Kuanto-App/blob/cbd29a921843a9d68e262062d4635cb7a451d3c2/src/database/02_setup_cron_trigger.sql) programa `update-p2p-rates` cada hora;
- el frontend de Kuanto refresca su lectura cada diez minutos, lo cual no determina la frecuencia del productor;
- una muestra de 300 filas en vivo del 21–22/07/2026 mostró ciclos cercanos a diez minutos y, en 149 de 151 ciclos, dos inserciones casi simultáneas.

Esto indica que la configuración desplegada no coincide con el SQL del repositorio ni con la cadencia objetivo y probablemente existen dos disparadores activos. Antes de depender de Kuanto en producción se debe revisar `cron.job`/programadores desplegados, conservar un solo job y fijarlo a cinco minutos. La corrección no debe borrar el historial ni intentar fusionar automáticamente pares históricos que tengan valores distintos.

GL Streaming no asumirá que una fila nueva existe exactamente cada cinco minutos. Leerá de forma determinista la última observación por `created_at DESC, id DESC` al abrir un formulario sensible y nuevamente al confirmar una operación; el guardado idempotente por `fuente_registro_id` tolerará consultas repetidas. El umbral de advertencia/bloqueo por antigüedad queda registrado como `RATE-10` en el registro de decisiones.

## 5. Seguridad de Kuanto antes de integrar

Durante la revisión apareció una credencial con formato de secreto de Supabase escrita literalmente tres veces en `SCHEDULE_CRON.sql`, dentro del repositorio público. No se probó, no se copió y no se usará en GL Streaming. Eliminarla del archivo no basta porque permanece en el historial Git. Su rotación es inmediata e independiente del calendario de GL Streaming; mientras no se confirme, cualquier desarrollo local de esta integración usará datos simulados y no el proyecto Kuanto en vivo.

Acciones P0 para Kuanto:

1. revocar/rotar inmediatamente la credencial en Supabase;
2. actualizar los jobs desplegados para usar la nueva credencial desde Vault o un almacén de secretos;
3. eliminar el valor del árbol actual y reescribir el historial público donde aparezca;
4. invalidar cachés o artefactos desplegados que puedan contenerlo;
5. activar el escaneo de secretos y la protección de pushes del repositorio;
6. verificar que `update-p2p-rates` solo pueda ser ejecutada por el programador autorizado y no por cualquier cliente con la clave pública.

La clave anónima/publicable usada por el frontend no tiene la misma criticidad que `service_role`, pero debe seguir protegida por RLS y cargarse por configuración. En GL Streaming solo existirá como variable de entorno del adaptador. La ingestión de la tasa dependerá de la lectura pública mientras no exista un endpoint propio; los datos internos del negocio y sus snapshots no se expondrán mediante esa política.

## 6. Criterios de aceptación de la futura integración

- BCV rechaza respuestas sin fecha oficial, valores válidos o HTTPS verificable.
- Kuanto se lee mediante el adaptador de servidor y nunca invocando el productor.
- No se usa ninguna credencial privilegiada de Kuanto.
- Cada observación se guarda como máximo una vez por `fuente_registro_id`.
- `price`, `details`, `created_at` y la hora de recepción quedan auditables.
- La corrección de un valor crea una observación/version nueva y no reescribe operaciones confirmadas.
- La interfaz muestra valor, fuente y antigüedad de la tasa aplicada.
- La confirmación de una venta o renovación vuelve a consultar BCV y paralela, muestra ambas y las congela dentro de la transacción junto con precio USD y cobro VES.
- La confirmación de un egreso USDT vuelve a consultar y congela exclusivamente la paralela.
- Una falla temporal conserva la última tasa válida, muestra su antigüedad y nunca inventa un valor.
- Antes de cualquier integración con Kuanto en vivo, la credencial expuesta fue rotada; antes de producción, además fue purgada del historial y existe un solo programador a cinco minutos.
