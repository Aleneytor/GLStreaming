# Arquitectura y seguridad

## 1. Decisión arquitectónica

Se recomienda un **monolito modular**:

```text
Administrador / Revendedor
            |
            v
Next.js + TypeScript + Tailwind
  interfaz SPA, renderizado y frontera de servidor
            |
            v
Supabase
  Auth + PostgreSQL + RLS + vistas/funciones
```

Next.js se elige sobre una SPA puramente cliente porque proporciona una frontera de servidor para mutaciones, sincronización de tasas y acceso explícito a secretos, sin perder navegación interactiva. No se necesitan microservicios para el alcance actual.

No se fijan versiones hasta iniciar la fase técnica; en ese momento se validarán las versiones estables y compatibles en documentación oficial.

Tampoco se cerrarán tablas hasta revisar el catálogo completo de `docs/plataformas/`. Netflix será la primera implementación vertical, pero HBO, Disney+, Prime Video, Crunchyroll, YouTube, Spotify, Canva y las demás fichas aprobadas condicionan previamente el núcleo. Spotify confirma que una suscripción puede depender simultáneamente de una identidad de acceso y una cobertura proveedor, por lo que el catálogo separará plataforma, producto, identidad, cobertura, estado comercial y modalidad; las diferencias de entrega se implementarán como arquetipos o estrategias dentro del monolito, no como aplicaciones copiadas por plataforma.

## 2. Responsabilidades

### Navegador

- Renderizar grillas, tarjetas, filtros y formularios.
- Mantener solo estado efímero de interfaz.
- Enviar comandos validados sin claves privilegiadas.
- No decidir autorización ni calcular totales financieros como fuente oficial.

Filtros compartibles —plataforma, producto, modalidad, estado comercial/operativo, fechas, búsqueda— vivirán en parámetros de URL. Zustand solo se incorporará si existe estado de UI transversal que no encaje en URL o estado local; no será el caché de la base de datos.

### Servidor Next.js

- Validar comandos nuevamente.
- Distinguir y autorizar `carga_inicial`, `venta_nueva`, `renovacion` y `renovacion_tardia`; el estado comercial se comprueba también dentro de la transacción. `carga_inicial` exige administrador, sesión de corte abierta y clave idempotente.
- Ejecutar ventas, renovaciones y reservas como operaciones atómicas.
- Confirmar cada venta/renovación con precio USD introducido manualmente, BCV de cobro y paralela contemporánea, congelando ambos tipos de tasa y el monto esperado/recibido en VES dentro de la misma operación.
- Sincronizar la paralela con objetivo de cinco minutos y detectar las publicaciones BCV de las 5:00 p. m. mediante adaptadores ejecutados solo en servidor, con idempotencia por fila fuente y control de antigüedad.
- Preparar y cerrar resultados mensuales reproducibles a partir de los rangos diarios reales.
- Proteger cualquier secreto de servidor.
- Formatear respuestas por caso de uso, evitando `select *`.
- Registrar auditoría de acciones sensibles.

La clave `service_role` de Supabase nunca llega al navegador. Las operaciones normales usan la identidad del usuario para que RLS siga aplicando. Cualquier bypass administrativo debe ser pequeño, explícito y auditado.

### PostgreSQL/Supabase

- Ser la fuente de verdad.
- Aplicar claves foráneas, checks, unicidad y prevención de solapamientos.
- Aplicar RLS y privilegios de tabla/columna.
- Calcular vistas de alertas y finanzas.
- Ejecutar funciones transaccionales para carga de cartera, asignación y renovación, validando producto/modalidad, titularidad, reutilización y estado comercial; se serializan por cuenta cuando una modalidad completa compite con unidades internas o una cobertura familiar cambia de disponibilidad.
- Mantener separadas la identidad que recibe el cliente y la cobertura Premium que la habilita. Una suscripción Spotify familiar conserva ambas relaciones sin confundir la cuenta de acceso con el cupo de la madre.

## 3. Estructura prevista del repositorio

```text
GLStreaming/
|-- src/
|   |-- app/
|   |   |-- (auth)/
|   |   `-- (panel)/
|   |       |-- dashboard/
|   |       |-- plataformas/[slug]/
|   |       |   `-- productos/[productId]/
|   |       |-- inventario/
|   |       |-- clientes/
|   |       |-- suscripciones/
|   |       |-- proveedores/
|   |       |   `-- pagos/
|   |       |-- caja/
|   |       |   `-- gastos/
|   |       |-- finanzas/
|   |       |-- revendedores/
|   |       |-- solicitudes/
|   |       `-- configuracion/
|   |-- features/
|   |   |-- auth/
|   |   |-- catalogo/
|   |   |-- inventario/
|   |   |-- ventas/
|   |   |-- alertas/
|   |   |-- caja/
|   |   |-- gastos/
|   |   |-- finanzas/
|   |   |-- proveedores/
|   |   |-- revendedores/
|   |   |-- tasas-cambio/
|   |   `-- cierres-mensuales/
|   |-- domain/
|   |   |-- fechas/
|   |   |-- dinero/
|   |   |-- permisos/
|   |   `-- estados/
|   |-- server/
|   |   |-- actions/
|   |   |-- queries/
|   |   |-- jobs/
|   |   `-- repositories/
|   |-- components/
|   |   |-- ui/
|   |   `-- data-grid/
|   `-- lib/
|       |-- supabase/
|       `-- validation/
|-- supabase/
|   |-- migrations/
|   |-- seed.sql
|   `-- tests/
|-- tests/
|   |-- unit/
|   |-- integration/
|   |-- e2e/
|   `-- fixtures/
`-- docs/
```

Se usará organización por funcionalidad en `features/`; así inventario, ventas o finanzas agrupan sus componentes, esquemas y casos de uso. `components/ui` contiene solo piezas genéricas.

## 4. Seguridad por capas

### RLS y proyecciones

RLS decide **qué filas** puede leer o modificar una identidad. No evita que una columna sensible aparezca en una fila permitida. Por eso:

1. `credenciales_cuenta`, `secretos_unidad` y costos quedan en tablas con permisos admin-only.
2. Se revoca acceso directo a tablas base que no deban consumirse desde el cliente.
3. El revendedor usa vistas o funciones con una lista explícita de columnas.
4. Las vistas respetan la identidad invocadora y no se convierten accidentalmente en un bypass.
5. El frontend oculta controles por experiencia de uso, pero la base de datos mantiene la autorización real.

### Matriz de pruebas RLS

Cada política se prueba con:

- administrador;
- revendedor A;
- revendedor B;
- usuario autenticado deshabilitado;
- usuario anónimo.

Casos mínimos: lectura directa por ID conocido, filtros manipulados, joins, inserción con `vendedor_id` ajeno, actualización de rol, lectura de stock y acceso a secretos. El stock saneado conserva producto y modalidades permitidas, pero nunca mezcla recursos Netflix estándar/extra ni revela credenciales.

YouTube añade pruebas explícitas: stock y solicitudes nunca incluyen el recurso propiedad del cliente; las respuestas generales, Caja, reportes y exportaciones nunca incluyen Gmail completo o contraseña. El recurso sí puede aparecer, sin secretos, en vistas operativas/financieras autorizadas del administrador. Un revendedor tampoco recibe máscara Gmail ni contacto del proveedor operativo salvo permiso futuro expreso.

Spotify añade pruebas equivalentes para el correo/contraseña de una identidad propiedad del cliente, para el Gmail pagador de GPay y para la cuenta madre familiar. El stock saneado puede indicar modalidad y disponibilidad, pero nunca devuelve esos identificadores completos. Una madre vendida continúa bajo control administrativo de GL Streaming y no habilita comandos de gestión de miembros para el cliente o revendedor.

### Secretos de streaming

- Separados del inventario y cifrados con una clave no guardada junto al dato.
- Nunca presentes en logs, errores, analítica, fixtures o backups de desarrollo.
- Revelado manual, temporal y auditado en vez de mostrarse siempre en la grilla.
- Rotación registrable y acceso revocable.
- Datos productivos reemplazados por valores sintéticos en local y staging.

Para cuentas compartidas, `entregar_acceso` valida una asignación vigente y construye en memoria el paquete autorizado: correo, contraseña, nombre de perfil, PIN y fecha `Renueva/Vence`; en venta completa incluye los datos de perfiles aplicables. La respuesta es efímera. La auditoría conserva versiones de credencial/PIN, actor, cliente, asignación y fecha, nunca los secretos descifrados. Stock, listados generales, Caja y reportes no reutilizan este endpoint. En el MVP es admin-only; cualquier permiso futuro de revendedor quedará limitado por RLS a su venta propia vigente después de resolver `SEC-02`.

El cliente recibe permiso de uso, no de administración. No existe comando cliente para cambiar login, contraseña, recuperación, plan o datos de la cuenta madre; esas rotaciones son acciones administrativas. Si la plataforma externa no puede impedir técnicamente el cambio, la restricción sigue siendo una política de entrega y operación, no una garantía falsa de la aplicación.

El Gmail y la contraseña que el cliente entrega para YouTube usan el mismo contenedor cifrado, pero se marcan como `titular_tipo = cliente`. Los valores completos quedan fuera de la grilla, búsquedas, logs y exportaciones generales; la grilla administrativa solo puede recibir una máscara calculada por el servidor. Un endpoint/comando específico permite el revelado temporal únicamente al administrador y audita cada acceso. La política impide reutilizar un comando de credenciales del negocio para leer credenciales `titular_tipo = cliente` sin esa autorización concreta. El sistema no guarda códigos 2FA, recuperación, cookies ni tokens temporales en notas libres.

En Spotify, el cliente puede entregar el correo y la contraseña de su cuenta **Spotify**, nunca la contraseña de su correo electrónico. Esos secretos se cifran mientras el servicio permanezca administrado y se destruyen al finalizar definitivamente; la suscripción, los cobros y la auditoría mínima permanecen. Si durante una recreación el cliente comparte un código temporal, solo se usa en memoria y jamás se persiste. Las identidades creadas sobre dominios de GL Streaming sí pueden conservarse y reutilizarse después de saneamiento.

El Gmail pagador de una individual activada por GPay es una identidad operativa uno a uno con esa cuenta Spotify: permite cancelar o cambiar el plan si cambia el acceso Spotify. Se almacena como referencia restringida separada del proveedor, cliente y login entregado. La aplicación no guarda su contraseña, recuperación, 2FA ni datos completos del instrumento de pago.

### Datos de tarjetas

La aplicación no procesará ni almacenará números completos de tarjeta o códigos de seguridad. PCI SSC indica que el código de verificación no puede conservarse después de autorizar una transacción, incluso cifrado: [FAQ 1280](https://www.pcisecuritystandards.org/faqs/1280/). También distingue ocultar un PAN al mostrarlo de volverlo ilegible al almacenarlo: [FAQ 1146](https://www.pcisecuritystandards.org/faqs/1146/).

El sistema guardará como máximo un alias no sensible —por ejemplo, nombre del banco y últimos cuatro dígitos cuando realmente sea necesario— o un token emitido por un proveedor de pagos. `Proveedor` y `medio de pago` son conceptos distintos.

### Datos personales

- WhatsApp, nombre de cliente y vendedor se entregan solo a roles con necesidad operativa.
- El Gmail usado como identidad de servicio se trata como dato personal restringido y no como identificador global del cliente.
- Exportaciones requieren autorización y auditoría.
- Borrado lógico e historial deben equilibrarse con la política legal de retención que se defina.

## 5. Operaciones atómicas

Se implementarán funciones o transacciones para:

- reservar inventario disponible con alcance de unidad o cuenta;
- cargar cartera existente sin crear una venta o cobro ficticios;
- aprobar una solicitud y asignar stock;
- crear suscripción, período y pago inicial;
- renovar a tiempo o tarde sin solapar períodos pagados;
- pausar/reactivar una suscripción conservando su asignación;
- trasladar una asignación por falla a un perfil libre o, para alcance completo, a una cuenta totalmente libre, preservando el período;
- liberar una cuenta compartida mediante `cierre_pendiente`/`pendiente_limpieza` y confirmar después el restablecimiento remoto y la política de revocación antes de publicarla como stock;
- registrar renovación y pago de proveedor, creando el nuevo ciclo en la misma transacción;
- registrar, confirmar o revertir un gasto operativo en USDT;
- cancelar/liberar explícitamente el inventario retenido;
- revertir un pago mediante un movimiento compensatorio;
- cerrar o reabrir un mes con bloqueo, versión y auditoría.
- bloquear o rehabilitar una familia Spotify para nuevas incorporaciones sin cortar a sus miembros actuales;
- procesar una falla de familia Spotify como incidente por lote, creando tareas idempotentes por cada servicio activo y preservando sus períodos comerciales;
- reemplazar una identidad Spotify restringida por cambio anual de familia, restaurar su contenido y enlazarla a otra cobertura sin crear una venta, cobro o renovación ficticios.

Una validación previa en React no sustituye el bloqueo o restricción de base de datos frente a dos usuarios concurrentes.

Para una cuenta híbrida, la transacción toma un bloqueo por cuenta antes de comprobar disponibilidad: una asignación completa excluye todas sus unidades y cualquier perfil retenido excluye la cuenta completa. La misma regla cubre Netflix estándar/HBO/Crunchyroll (cinco) y Disney+/Prime Video (siete). Netflix extra se bloquea como un recurso separado de capacidad uno y no compite con los cinco slots de una cuenta estándar. La disponibilidad observada en la interfaz nunca basta para autorizar la venta.

`trasladar_asignacion` bloquea origen y destino en orden determinista, verifica plataforma/producto/modalidad y disponibilidad, cierra el tramo fallido y abre el reemplazo desde el mismo instante. No toca el período, precio, cobro o fecha de renovación; revoca la entrega anterior en GL, genera otra para el destino y deja la unidad/cuenta origen en mantenimiento o cuarentena. Para alcance completo, el destino debe tener todas sus unidades libres, habilitadas y limpias.

La limpieza en la plataforma externa no puede formar parte de una transacción SQL. `iniciar_liberacion_por_no_renovacion` usa un workflow reintentable: mantiene la asignación retenida en `cierre_pendiente`, revoca la entrega dentro de GL, deja el slot `pendiente_limpieza` y crea operaciones remotas idempotentes. El administrador elimina/restablece el perfil, cierra la sesión/dispositivo, rota credenciales o saca al correo del grupo familiar según la plataforma; al confirmar limpieza y revocación externa, una sola transacción local cierra la asignación, cambia a `lista` y publica disponibilidad. Un fallo conserva asignación y slot bloqueados y visibles como tarea pendiente, nunca libres por error. La operación guarda estado y evidencia no sensible, no contraseñas o PIN.

La revocación externa se define en cada ficha de plataforma. La regla normal en cuentas compartidas por perfiles es cerrar las sesiones/dispositivos relacionados con el cliente vencido y mantener la contraseña madre. Si la plataforma no permite cierre selectivo, como FlujoTV, el comando versiona la credencial, revoca las entregas anteriores y crea una tarea de reentrega para cada asignación todavía activa. Hasta confirmar la revocación, el sistema no afirma que borrar el perfil haya eliminado todo acceso del cliente anterior.

La identidad YouTube no participa en la competencia de perfiles. Cada servicio asociado a un Gmail se registra provisionalmente como un recurso cliente indivisible de capacidad uno y no reutilizable; Gmail y contraseña son sus credenciales, no su identificador físico. `YT-06` decidirá si además consume un cupo dentro de un plan proveedor separado.

Spotify sí confirma las dos capas. La identidad Spotify conserva correo, titularidad, reutilización y versión técnica; la cobertura es un plan individual o un miembro de una familia. Una familia tiene cinco cupos de miembro y una identidad madre operativa. Vender el uso de la madre crea una asignación concurrente especial y nunca una retención de alcance `cuenta` que bloquee a los cinco miembros. Si la madre no está vendida, su uso administrativo no se clasifica como vacancia. El estado de admisión de la familia puede bloquear todos los nuevos miembros mientras mantiene vigentes los ya asignados.

Cuando falla una familia, el comando de incidente obtiene todos los servicios activos bajo bloqueo, crea una tarea por cada afectado y permite recrear la identidad técnica cuando la restricción anual impide moverla. Renombrar/retirar la instancia anterior, crear otra con el correo habitual, restaurar playlists y “Me gusta” y asignar una nueva cobertura son operaciones remotas confirmadas; no alteran suscripción, precio USD, pago, período o fecha de renovación. Una identidad antigua queda archivada y nunca vuelve automáticamente a stock. Para clientes antiguos puede usarse cobertura individual de rescate sin cobrar otro período.

La operación transaccional `registrar_servicio_existente`:

- solo admite rol administrador y un producto `solo_cartera`;
- exige una sesión de carga inicial abierta para YouTube;
- usa una clave de idempotencia única y devuelve el resultado existente al reintentar;
- crea o vincula cliente, recurso, credencial, combinación provisional `servicio_individual`, suscripción, asignación y período;
- permite que vendedor, fecha de venta, precio o tasa queden pendientes cuando el hecho histórico no se conoce;
- crea un cobro o pago únicamente cuando se aporta el movimiento real correspondiente;
- impide inserts directos equivalentes mediante privilegios/RLS y funciones de servidor;
- deja de aceptar cargas al cerrar la sesión después de la conciliación; una corrección exige otra sesión versionada, motivo y auditoría.

Cualquier `venta_nueva` YouTube se rechaza antes y después del corte. Finalizar nunca devuelve el Gmail a stock; el destino de un posible cupo proveedor dependerá de `YT-06`.

La renovación de proveedor usa un comando idempotente:

```text
cuenta por vencer
  -> formulario precargado
  -> confirmación explícita del admin
  -> validar pago completo = costo USDT y tasa paralela automática
  -> insertar pago proveedor en su fecha efectiva
  -> crear siguiente ciclo con cobertura/ancla contractual fija
  -> resolver aviso
  -> auditar
```

El comando nunca almacena datos completos de tarjeta, no acepta montos parciales y no marca como pagado por el simple paso del tiempo. Si se ejecuta uno o dos días tarde, la fecha efectiva solo afecta Caja y no desplaza el ciclo.

## 6. Integración de tasas

La aplicación dependerá de una interfaz interna estable alrededor de las dos fuentes propias del usuario para poder aislar sus contratos sin reescribir finanzas:

- BCV: `GET https://bcvscrapper.vercel.app/api/bcv`;
- paralela: lectura de `p2p_rate_history` de Kuanto mediante Supabase/PostgREST, aislada detrás de un adaptador de servidor.

```text
API de tasas
  -> adaptador de servidor
  -> normalización a Bs por USD
  -> validación (> 0, tipo, vigencia y momento de observación)
  -> inserción/versionado idempotente
  -> tasas_cambio
  -> panel y formularios
```

Reglas de integración:

- Consumir ambas fuentes desde el servidor. No exponer credenciales privadas ni depender del bundle web de Kuanto.
- Obtener y conservar por separado `bcv` y `paralela`.
- Mapear BCV como `date → fecha_vigencia`, `usd → bs_por_usd`, `source → fuente` y `fetchedAt → observada_fuente_at`; `obtenida_at` se genera al recibirla.
- No inventar `publicada_at`: el endpoint BCV actual no la devuelve; queda opcional hasta que se incorpore al contrato.
- Mapear Kuanto como `id → fuente_registro_id`, `price → bs_por_usd`, `details → detalle_fuentes` y `created_at → observada_fuente_at/vigente_desde`; `created_at` es la inserción en Kuanto y el mejor proxy de observación, mientras la recepción interna queda en `obtenida_at`.
- Consultar `id, price, details, created_at`, ordenados por `created_at DESC, id DESC` y con `LIMIT 1`; hacer idempotentes las lecturas repetidas mediante `(fuente, fuente_registro_id)`. IDs distintos creados por jobs duplicados no se fusionan automáticamente.
- Guardar fuente, valor, observación original, momento de obtención, fecha de vigencia disponible y versión.
- No sobrescribir una tasa ya usada; una corrección crea una versión nueva.
- Mostrar en la interfaz cuándo fue observada y su antigüedad actual.
- Hacer reintentos acotados y registrar el fallo sin duplicar filas.
- Consultar la paralela con objetivo de cinco minutos, al abrir formularios sensibles y nuevamente al confirmar; no asumir que el productor publicó exactamente a tiempo.
- Detectar de lunes a viernes a las 5:00 p. m. la nueva BCV y su próxima `fecha_vigencia`.
- Confiar en las fechas hábiles entregadas por la API: viernes, fines de semana y feriados no se recalculan dentro de GL Streaming.
- Permitir que coexistan `bcv_vigente` y `bcv_proxima` entre la publicación y el cambio de fecha.

La app pública de Kuanto consulta `p2p_rate_history` con RLS de lectura pública. GL Streaming usará únicamente una clave pública/publicable cargada por variables de entorno; nunca copiará una credencial del repositorio ni usará `service_role`. El adaptador evita que el dominio financiero conozca nombres de tablas y permite sustituir esta lectura por un endpoint propio sin cambiar los cálculos.

La auditoría encontró que el SQL versionado programa una hora, mientras una muestra del despliegue mostró ciclos de unos diez minutos con inserciones duplicadas, frente al objetivo confirmado de cinco minutos. Antes de producción se debe dejar un solo programador a cinco minutos. La credencial con formato de secreto expuesta en `SCHEDULE_CRON.sql` debe revocarse de inmediato y luego purgarse del historial; hasta confirmar la rotación, la integración local usará datos simulados. También se debe endurecer el scraper BCV para verificar TLS y fallar si no obtiene la fecha oficial. El detalle está en `docs/07-integracion-tasas.md`.

En ventas y renovaciones el administrador introduce manualmente el precio comercial en USD. El formulario toma la BCV aplicable para calcular el monto esperado en Bs y obtiene también la paralela contemporánea para la lectura económica. Antes de confirmar muestra precio USD, BCV y vigencia, monto esperado VES, paralela y equivalente económico; la transacción congela ambas filas históricas y el monto efectivamente cobrado. No existe selector BCV/paralela para decidir el cobro ordinario ni un tarifario obligatorio.

En pagos de proveedores y gastos operativos fuente en USDT no existe selector: el servidor aplica la última paralela disponible en `confirmado_at` y guarda `monto_ves_snapshot`. El panel de ganancias consulta ambos tipos para la fecha de corte y presenta simultáneamente los dos equivalentes del resultado consolidado en Bs.

## 7. Motor de cierre mensual

El motor financiero tendrá una granularidad diaria común. Las vistas de Caja consultan esos resultados por fecha y el cierre mensual los agrega, evitando mantener dos fórmulas distintas.

```text
períodos + asignaciones + pagos + ciclos + gastos + tasas
  -> resultado diario por plataforma/producto/modalidad/cuenta/unidad
  -> panel Caja del día
  -> suma de días
  -> cierre mensual
```

Ventas diarias se agrupan por `fecha_venta`; Caja por fecha efectiva de pago; devengo por pertenencia del día al rango pagado de servicio/costo. Ninguna de esas fechas se reemplaza con `created_at`. Los períodos pagados, el historial de estado, las asignaciones y la preparación del slot se combinan para clasificar por separado cortesía activa, pausa retenida, saneamiento pendiente y disponibilidad. El saneamiento bloquea capacidad y nunca se informa como vacancia vendible.

`carga_inicial` se concilia por separado y no aumenta ventas nuevas, no usa `created_at` como fecha de venta ni crea movimientos de Caja ficticios. Un período vigente puede participar en devengo desde el corte únicamente con precio y fechas reales conocidos. Los recursos no reutilizables nunca generan vacancia vendible; si conservan una cobertura financiera real pagada sin ingreso, el motor la clasifica como `costo_no_reutilizable_sin_ingreso`. Sin ciclo real no existe costo ficticio.

Cada registro operativo confirmado entra en Caja y resultado en su `fecha_gasto`, usando el snapshot en Bs calculado con la tasa paralela. Los ciclos de proveedor sí se prorratean por sus días reales de cobertura. Un reverso excepcional se registra como compensación auditada desde el detalle del movimiento. El motor no modela transferencias, aportes ni saldos de bancos.

El trabajo programado se ejecuta al comenzar el primer día del mes en `America/Caracas` y prepara el mes anterior:

```text
fin del mes
  -> bloqueo/idempotencia
  -> intersección diaria de períodos y ciclos
  -> devengo de ingresos y costos
  -> períodos pagados, cortesía, pausa, vacancia y costo asociado
  -> caja, gastos y ajustes
  -> tasas BCV/paralela de cierre
  -> borrador detallado
  -> revisión del administrador
  -> cierre inmutable
```

El cálculo vive en consultas/funciones de base de datos para que dashboard, exportación y cierre usen exactamente la misma regla. Se aplica un bloqueo por mes para impedir dos cierres simultáneos.

El detalle conserva cada contribución prorrateada y permite reconstruir el total. La alta precisión se mantiene hasta el agregado; cualquier residuo de redondeo se concilia en el último tramo del período.

Un dato ingresado después del cierre no lo modifica silenciosamente. La política definitiva elegirá entre:

- reabrir el mes, generar una versión nueva y conservar la anterior; o
- registrar el efecto como ajuste del mes abierto con referencia al mes originario.

En ambos casos se exige actor, motivo, hora y auditoría. Las tasas de cierre BCV y paralela permanecen vinculadas a la versión cerrada.

## 8. Estrategia de pruebas

- **Unitarias:** límites de badges, cliente con todo el día de renovación, meses cortos, renovación tardía, ancla fija del proveedor, año bisiesto, zona horaria, conversiones, redondeo, costo ocioso, costo no reutilizable y estados comerciales.
- **SQL/integración:** constraints, FKs compuestas producto/modalidad, cardinalidad condicional de slots, recurso indivisible sin unidad artificial, titularidad de cliente, exclusión completa↔completa y completa↔unidad, elegibilidad técnica/comercial, snapshots exactos 1/5/7, transacciones, vistas financieras y RLS.
- **Contrato de API:** campos BCV `success/date/usd/source/fetchedAt`, campos Kuanto `id/price/details/created_at`, cadencia objetivo de cinco minutos, filas repetidas, tasa antigua, coexistencia BCV vigente/próxima, viernes, feriados, correcciones e idempotencia.
- **E2E:** login, alta manual, venta con precio USD y cobro BCV, rechazo de cobro incompleto, renovación completa el mismo día o tardía, cliente activo vencido, pausa sin liberar, liberación explícita, traslado por falla, exclusión híbrida con capacidades cinco y siete —incluido Crunchyroll cinco—, Netflix extra de capacidad uno, rechazo de combinaciones producto/modalidad inválidas y solicitud de stock.
- **Finanzas:** cada venta congela precio USD, BCV, paralela, VES esperado y VES cobrado; el mismo total en Bs produce ambos equivalentes usando las tasas y fecha mostradas.
- **Caja diaria:** venta prepagada hoy con servicio futuro, renovación tardía confirmada solo al cobrar el total, reembolso y separación entre ventas/cobros/devengo.
- **Proveedores:** alta con pago inicial completo, aviso sin pago automático, costo y pago separados contablemente pero por igual monto, snapshot con la paralela de confirmación, pago completo uno o dos días tarde sin mover el ciclo e idempotencia.
- **Gastos operativos:** apartado compacto en Caja, monto USDT, paralela automática de confirmación, snapshot Bs, categorías, vínculo opcional a plataforma/cuenta, ejemplo de recarga bancaria y prohibición de gastos personales.
- **Cierres:** períodos que cruzan mes/año, febrero bisiesto, ciclos de 28–31 días, cortesía, pausa retenida, saneamiento pendiente, renovación tardía, cambios de asignación, vacancia parcial, redondeo y reapertura.
- **Reconciliación:** la suma de todos los cierres de un período equivale al monto contractual VES congelado desde su precio USD; la suma de un ciclo proveedor reproduce por separado su costo USDT y snapshot VES, sin residuos perdidos.
- **Reconciliación diaria:** sumar cada resultado diario de un mes reproduce exactamente su cierre mensual.
- **No duplicidad:** el costo proveedor participa en resultado/devengo y su pago en Caja, sin una segunda resta en ganancias.
- **Valorización de egresos:** un gasto de `20 USDT` usa la última paralela disponible en `confirmado_at`, conserva exactamente ese snapshot en Bs y reduce el resultado una sola vez.
- **Seguridad:** respuestas del revendedor inspeccionadas para comprobar que los campos secretos ni siquiera viajan.
- **Cuentas compartidas:** entrega efímera contiene solo correo, contraseña, perfil/cupo, PIN si aplica y fecha de la asignación autorizada; el evento no contiene secretos; el cliente no tiene mutación de cuenta madre; traslado conserva período/cobro, exige destino compatible y deja el origen fallido en mantenimiento; no renovación conserva `cierre_pendiente`, no publica stock y solo la confirmación de limpieza más revocación externa cierra/habilita el slot sin borrar historia.
- **YouTube:** sesión de carga inicial admin-only e idempotente; tres servicios conciliados sin límite hardcodeado ni ventas/movimientos ficticios; cualquier `venta_nueva` rechazada; carga posterior al cierre rechazada; renovación probada solo si `YT-07` la habilita; Gmail/contraseña cifrados y ausentes de respuestas generales; máscara solo en grilla admin; revelado específico auditado; proveedor `Yo` editable; cancelación sin stock; costo propio solo ante un desembolso real; recurso padre sin hijos contabilizado como un día-capacidad y nunca como vacancia vendible.
- **Spotify:** identidad y cobertura enlazadas sin duplicarse; Gmail pagador uno a uno y sin contraseña persistida; madre vendida concurrente con cinco miembros pero sin permisos administrativos; bloqueo de admisiones a nivel familia; incidente familiar por lote; recreación de identidades con el mismo correo visible sin solapamiento; restauración confirmada; reactivación proveedor sobre la misma individual; destrucción de secretos cliente al finalizar y conservación del período durante cualquier reemplazo.

## 9. Entornos y operación

- Durante las fases de construcción, aplicación, Supabase y pruebas se ejecutan exclusivamente en local. Ningún comando, migración ni secreto se dirige al VPS o al dominio sin una autorización posterior de despliegue.
- El destino final confirmado para la web es el VPS propio del usuario bajo `https://glcuenta.com`.
- Staging y producción se separarán cuando se abra la fase final. Todavía debe decidirse si Supabase de producción será administrado externamente o autoalojado en el VPS; disponer del servidor no obliga a mezclar web, base de datos y Auth.
- Migraciones SQL versionadas; no se modifica producción manualmente desde el panel.
- `.env.example` sin secretos y variables reales fuera del repositorio.
- Backups, restauración probada, monitoreo de errores y rotación de claves antes de producción.
- La fase de salida revisará sistema operativo/recursos del VPS, DNS, HTTPS, firewall, proxy inverso, persistencia, despliegue reproducible y plan de reversión antes de publicar el dominio.
- Una tarea programada intenta sincronizar la paralela cada cinco minutos y otra detecta publicaciones BCV; ambas exponen salud, última ejecución y antigüedad de la última tasa válida.
- El generador de cierres prepara el mes anterior una vez terminada la última fecha en Caracas; reintentar no duplica el cierre.
- Otras tareas programadas se reservan para notificaciones o materializaciones. El badge de vencimiento se calcula por fecha, pero ningún cron pausa, cancela o libera al cliente automáticamente.
