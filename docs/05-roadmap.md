# Roadmap por entregas

Cada fase debe cerrarse y validarse antes de comenzar la siguiente. Seguridad, historial y restricciones se diseñan desde el inicio aunque sus pantallas aparezcan más tarde.

## Correspondencia con el blueprint original

| Blueprint original | Ejecución propuesta | Motivo del ajuste |
|---|---|---|
| Fase 1: tres tablas relacionales | Fases 0, 1 y 3 | Inventario, usuarios, secretos, ventas y renovaciones necesitan historia y restricciones desde el esquema. |
| Fase 2: sidebar, grid y badges | Fase 2 | Se conserva la experiencia, alimentada por vistas derivadas y capacidades configurables. |
| Fase 3: motor financiero | Fase 4 | Requiere períodos/pagos de cliente y ciclos/pagos de proveedor creados en fases anteriores. |
| Fase 4: roles y RLS | Fundación en Fase 1; portal en Fase 5 | La seguridad no puede agregarse al final. La UI del revendedor sí puede construirse después. |

No se elimina ninguna capacidad solicitada; se cambia el orden para evitar sobrescribir historia, duplicar costos o exponer secretos.

## Fase 0 — Decisiones de dominio y saneamiento de exposición

### Entregables

- Catálogo y ficha funcional de cada plataforma/producto previsto para el lanzamiento, con inventario comprado, modalidad vendida, mecanismo de entrega, capacidad, exclusiones, renovación, fallas y seguridad.
- Matriz `plataforma → producto → capacidad → modalidades permitidas` y clasificación de cada producto por arquetipo: cuenta híbrida, recurso indivisible, membresía por invitación, asiento de equipo u otros que aparezcan.
- Estado comercial por producto (`abierto | solo_cartera | cerrado`), permiso separado de renovación, titularidad/reutilización y tratamiento de cartera previa al corte.
- Regla común de cuentas compartidas: entrega de correo/contraseña/perfil/PIN/fecha, datos maestros solo admin, traslado conservando período y limpieza obligatoria antes de reutilizar un slot.
- Decisión por plataforma sobre revocación al liberar un perfil, cupo o cuenta completa: cierre de sesiones/dispositivos como regla normal, rotación de credenciales cuando no exista cierre selectivo, o salida de grupo familiar cuando corresponda. También queda por cerrar qué rol puede generar cada entrega.
- Ficha YouTube: tres servicios existentes sobre Gmail del cliente, sin nuevas ventas, proveedor operativo propio/editable, retención de credenciales, permiso de renovación y posible plan/cupo proveedor por confirmar.
- Ficha Spotify: identidad de acceso separada de cobertura Premium; individuales propias/proveedor; familia de madre más cinco miembros; venta excepcional del uso de madre concurrente; bloqueo de admisiones; reemplazo técnico por falla sin reiniciar períodos y destrucción de credenciales cliente al finalizar.
- Rotación/eliminación de credenciales o medios de pago expuestos en las hojas existentes.
- Confirmación de periodicidad mensual, política de fin de mes, tipos de unidad y capacidades.
- Separación entre fecha flexible del cliente, pausa/retención manual y ancla fija del proveedor.
- Precio comercial introducido manualmente y congelado en USD; cobro completo del cliente en Bs calculado a BCV; paralela contemporánea congelada para rentabilidad; costos/pagos en USDT y definición exacta de ingreso, gasto, caja y margen.
- Contrato de tasas: endpoint BCV identificado y lectura actual de Kuanto definida mediante `p2p_rate_history`, aislada en un adaptador; quedan como acciones P0 rotar el secreto expuesto, endurecer el scraper BCV y corregir la programación duplicada/desalineada de Kuanto.
- Política de cierre mensual, datos tardíos, reapertura y reservas ociosas.
- Política de pagos siempre completos, renovaciones tardías y cambios de costo proveedor.
- Categorías simples de gastos operativos en USDT y valorización automática con tasa paralela.
- Matriz definitiva de permisos del revendedor.

### Criterio de salida

Las decisiones P0 de `06-decisiones-pendientes.md` están respondidas, todas las plataformas de lanzamiento tienen ficha aprobada y no queda ninguna duda capaz de cambiar entidades o restricciones. Para YouTube, esto incluye `YT-01` a `YT-07`: activación, retención/destrucción de contraseña, reemplazo de Gmail, significado del costo, posible plan/cupo proveedor y permiso de renovación. Spotify ya confirma las dos capas identidad/cobertura; su futura forma de detectar que terminó el bloqueo de admisiones puede permanecer como detalle operativo manual porque no cambia el esquema. Existen ejemplos definidos manualmente de perfil, cuenta completa, principal concurrente, recurso propiedad del cliente, invitación/asiento, renovación de varios meses con costo proveedor mensual y reemplazo de inventario.

## Fase 1 — Fundación técnica y base de datos

### Entregables

- Proyecto Next.js/TypeScript/Tailwind y Supabase local.
- Migraciones de plataformas, productos, modalidades permitidas/habilitadas, usuarios, beneficiarios/contactos de cobro, identidades de acceso, coberturas, inventario, secretos, entregas de acceso, preparación/limpieza de slots, historial comercial, tasas y cierres mensuales.
- Titularidad de recursos, proveedor operativo separado del financiero, estado comercial, sesiones versionadas de corte y origen `carga_inicial`.
- Auth, roles, RLS, vistas seguras y generación de tipos.
- Seeds completamente sintéticos.
- Pruebas SQL de restricciones y aislamiento.

### Criterios de salida

- Admin accede a su operación completa.
- Revendedor A no puede leer datos de B ni tablas sensibles mediante llamadas directas.
- No se pueden duplicar slots ni solapar asignaciones; una asignación de cuenta completa excluye cualquier asignación o reserva de sus unidades internas.
- Un recurso activo cumple la estructura de su producto: slots exactos para cuentas con unidades o capacidad uno sin hijos para un recurso indivisible.
- Cada venta, reserva y solicitud rechaza una modalidad o alcance no permitido para el producto elegido.
- `solo_cartera` rechaza nuevas ventas/reservas/solicitudes en UI y base de datos; las renovaciones dependen de un permiso separado y un recurso propiedad del cliente nunca vuelve a stock.
- Producto, titular, cliente propietario y reutilización quedan inmutables al activar un recurso de cliente o crear historia; el proveedor operativo permanece editable y no reescribe snapshots.
- El proveedor operativo acepta `Yo`; un tercero exige nombre, teléfono o ambos. Ninguno crea un ciclo/pago por sí solo.
- Gmail y contraseña se almacenan cifrados fuera de tablas operativas en claro; anónimos, revendedores y usuarios deshabilitados no acceden al ciphertext ni al comando de revelado.
- El revelado de credenciales cliente es un comando administrativo específico, temporal y auditado. Las respuestas generales no contienen valores completos y la grilla admin recibe solo una máscara de Gmail producida por servidor.
- `carga_inicial` exige administrador, sesión de corte abierta y clave idempotente; inserts directos o una carga después del cierre se rechazan.
- Credenciales, costos y PIN no aparecen en la respuesta de stock disponible.
- El comando admin-only de entrega solo acepta una asignación vigente, devuelve el paquete de acceso efímero y registra versiones/metadatos sin persistir secretos descifrados.
- Ningún cliente dispone de una mutación para credenciales, recuperación, plan o datos maestros de una cuenta compartida.
- Periodicidad/capacidad son configurables; el ancla fija pertenece al proveedor y la fecha del cliente se recalcula desde cada renovación confirmada.
- El esquema conserva precio contractual USD, cobro VES, BCV y paralela de la confirmación, egresos USDT, snapshots Bs y referencias a tasas históricas sin depender todavía de una API concreta.
- Los casos híbridos se representan sin unidades artificiales: Netflix estándar/HBO/Crunchyroll con cinco perfiles y Disney+/Prime Video con siete, todos con venta completa de alcance de cuenta y costo proveedor único.
- Netflix extra se representa como producto de capacidad uno y modalidad `extra`, nunca como slot 6 de una cuenta estándar.
- Spotify puede relacionar una suscripción con identidad y cobertura simultáneas; una venta de madre no bloquea sus cinco miembros, una madre operativa no genera vacancia y una familia bloqueada no admite ventas nuevas.

## Fase 2 — Inventario Netflix y carga manual

### Entregables

- CRUD de plataformas, productos, modalidades permitidas por producto, proveedores, cuentas/recursos y unidades.
- Grid padre/hijos con filtros y vista móvil.
- Asistente de alta manual que comienza por producto y solo ofrece su capacidad y modalidades permitidas; luego registra cuenta/recurso, titularidad, proveedor operativo, unidades cuando existan, ciclo financiero cuando corresponda y estado inicial.
- Avisos de proveedor calculados, todavía sin mensajería externa.

### Criterios de salida

- La vertical Netflix reproduce capacidades uno y cinco, distingue estándar/extra y resume la venta completa de la cuenta estándar sin duplicar costos. La grilla nace configurable y una prueba sintética de capacidad siete evita hardcodear cinco antes de activar las demás plataformas.
- Los límites del aviso de proveedor `6`, `5`, `0` y `-1` días pasan pruebas.
- Un proveedor con ancla 31 sí ajusta febrero al último día válido y recupera 31/03.
- La carga se confirma como una transacción y no deja cuentas parciales.
- El selector de proveedor permite un registro propio `Yo` y terceros identificados por nombre, teléfono o ambos; editarlo no reescribe ciclos históricos.

## Fase 3 — Ciclo comercial

### Entregables

- Clientes, ventas, reservas, renovación flexible, pausa/reactivación, cancelación y liberación explícita.
- Historial de estados para reconstruir cortesía activa y pausas con unidad retenida.
- Recordatorio opcional `Recontactar el` para promesas de pago, sin modificar el período financiero.
- Asignaciones históricas para mover una suscripción entre unidades sin crear otra venta.
- Períodos históricos y pagos de cliente.
- Precio USD manual y snapshots de BCV/paralela por venta o renovación, sin tarifario obligatorio.
- Alertas de cliente calculadas y separadas de su estado operativo.
- Caja diaria inicial: ventas nuevas, renovaciones, cobros, pagos y flujo neto.
- Operaciones atómicas y auditoría.
- Listas de próximos vencimientos y vencidos.
- Subentrega **YouTube — cartera existente**: carga manual controlada de sus tres servicios sobre Gmail del cliente, proveedor `Yo` predeterminado, credenciales restringidas y comandos de consulta/pausa/finalización sin habilitar ventas o stock; renovación solo si `YT-07` la confirma.
- Fundaciones comunes para Spotify: contacto de cobro distinto del beneficiario, identidad/cobertura simultáneas, operaciones remotas por lote y destrucción de secretos propiedad del cliente.

### Criterios de salida

- Renovar no altera el período anterior.
- Los límites del badge de cliente `6`, `5`, `0` y `-1` días pasan pruebas.
- Una venta 22/07 muestra `Renueva 22/08` y permite acceso/pago durante todo el 22/08; queda vencida el 23/08.
- Una venta 31/01 renueva el 28/02 en año normal y permite acceso todo ese día. Si se confirma allí, la siguiente fecha del cliente es 28/03.
- La grilla admite simultáneamente `Activo · Vencido hace 2 días` y `Pausado · Vencido hace 2 días`.
- La fecha de renovación no cambia el estado ni libera la unidad automáticamente.
- El cliente dispone de todo el día de renovación; al finalizarlo se puede mantener activo, pausar o cancelar/liberar.
- Una pausa conserva la asignación. La renovación tardía inicia en el pago completo si seguía activa o, si estaba pausada, en la fecha posterior entre pago completo y reactivación.
- En el caso 22/07–22/08 sin pago, cortar al final del 22/08 clasifica ese día como cortesía; reactivar el 25/08 clasifica 23–24/08 como pausa retenida y crea el nuevo período 25/08–25/09.
- El sistema rechaza un cobro de renovación que no iguale el monto VES completo calculado desde el precio USD y la BCV congelada para el período.
- Dos operadores no pueden vender la misma unidad.
- Reemplazar una cuenta cierra la asignación anterior y conserva la misma suscripción/período.
- Precio USD acordado, monto VES esperado y pago VES recibido se consultan por separado junto con BCV y paralela históricas.
- Fecha de venta, inicio del servicio, fecha de pago y `created_at` permanecen separadas.
- Caja puede filtrar el día por plataforma, producto, modalidad y vendedor y abrir el detalle de movimientos.
- Liberar una unidad inicia disponibilidad solo cuando no requiere saneamiento o después de confirmar limpieza y revocación externa.
- Trasladar por falla a un perfil compatible —o a una cuenta totalmente libre para alcance completo— conserva el mismo período, precio, cobro y fecha de renovación, genera únicamente otro tramo/entrega y deja el origen en mantenimiento, nunca disponible.
- No renovación deja asignación en `cierre_pendiente` y slot `pendiente_limpieza`; confirmar restablecimiento más revocación externa cierra/habilita ambos atómicamente. Un fallo no publica stock y reutilizar conserva intacto todo el historial anterior.
- Crunchyroll crea exactamente cinco perfiles, permite perfil/completa y pasa las mismas pruebas de exclusión, entrega, traslado y liberación.
- Cargar los tres servicios YouTube requiere administrador y sesión abierta, no aumenta ventas nuevas, no inventa vendedor, fecha de venta, tasa, cobro o pago y no impone un máximo técnico de tres.
- Reintentar una misma clave no duplica cliente, recurso, credencial, suscripción, asignación, período ni movimientos.
- Cerrar la sesión después de conciliar la cartera deshabilita `Cargar servicio existente`; una carga posterior se rechaza y una corrección exige otra sesión auditada.
- Cualquier venta nueva/reserva/solicitud YouTube se rechaza; la renovación de una suscripción existente se prueba según la decisión `YT-07`.
- Finalizar YouTube archiva el recurso del cliente y nunca inicia disponibilidad.
- Gmail completo y contraseña no aparecen en listados, Caja o reportes; la máscara admin, revelado específico y actualización de contraseña dejan el comportamiento y auditoría esperados.

## Fase 4 — Proveedores, motor financiero y cierre mensual

### Entregables

- Ciclos y renovaciones de proveedor.
- Apartado `Pagos a proveedores` con próximos, vencidos, pendientes, pagados, anulados e historial.
- Acción transaccional `Registrar renovación y pago` desde la cuenta/recurso con ciclo financiero.
- Apartado compacto `Gastos operativos` dentro de Caja, con categorías, monto USDT, tasa paralela automática y snapshot Bs.
- Paralela sincronizada con objetivo de cinco minutos, idempotencia por fila fuente y control de antigüedad; historial versionado de publicaciones BCV.
- Dashboard por plataforma, producto, modalidad y rango de fechas.
- Ingreso contractual, caja, costo, margen bruto y capacidad ociosa en Bs.
- Resultado diario con ingreso/costo devengado, margen, días pagados, cortesía, pausa retenida, saneamiento pendiente, ocupación y costo ocioso.
- Costo de cobertura no reutilizable sin ingreso, separado de vacancia vendible.
- Equivalentes simultáneos BCV y paralela para el panel de ganancias.
- Prorrateo por intersección diaria de cada período/ciclo con el mes calendario.
- Generación automática de borrador, revisión, cierre, detalle y reapertura/versionado auditado.
- Conciliación financiera documentada.

### Criterios de salida

- Costo cero produce resultados válidos.
- Una fecha vencida genera aviso, pero nunca crea un pago automático.
- Confirmar una renovación de proveedor crea exactamente un ciclo nuevo; con costo mayor que cero crea además un único pago, y con costo cero no inventa una salida de Caja, aunque la solicitud se reintente.
- Un pago proveedor anticipado o tardío conserva la cobertura y el ancla previstas; solo cambia la fecha de salida en Caja.
- El formulario permite confirmar un único `costo_ciclo_usdt`; si es mayor que cero, `monto_pago_usdt` se deriva con exactamente el mismo valor y ambos quedan separados solo para devengo frente a Caja.
- Un proveedor pagado uno o dos días tarde conserva el mismo inicio, cobertura, `dia_ancla_proveedor` y próxima renovación.
- Confirmar la renovación fija el costo y el pago con la paralela disponible en ese momento; el inicio futuro solo controla el devengo.
- Cambiar el costo de una renovación no altera ciclos anteriores.
- El costo de una cuenta se cuenta una vez aunque tenga varias unidades.
- Todo precio contractual de cliente permanece en USD y su cobro en Bs conserva BCV, paralela y snapshots históricos; todo costo/gasto permanece en USDT aunque cambien las tasas.
- Cada conversión histórica referencia tasa, tipo, fuente y fecha; los egresos USDT usan exclusivamente la paralela.
- El panel muestra total Bs, equivalente BCV y equivalente paralelo con la misma fecha de corte.
- La rentabilidad económica usa la paralela congelada al confirmar cada entrada y salida; la lectura BCV continúa visible y ninguna sustituye el monto real de Caja.
- La paralela se consulta con objetivo de cinco minutos y cada fila fuente se conserva como máximo una vez por `fuente_registro_id`. Esto hace idempotentes las lecturas repetidas, pero los IDs distintos de jobs duplicados solo desaparecen al corregir el programador de Kuanto.
- La BCV mapea `date`, `usd`, `source` y `fetchedAt`; viernes y feriados respetan directamente `date`. `publicada_at` permanece opcional porque el contrato actual no devuelve esa hora.
- Después de las 5:00 p. m. pueden coexistir BCV vigente/próxima; el formulario adopta automáticamente la nueva, muestra su vigencia y congela la fila usada.
- La paralela de Kuanto conserva `id`, `price`, detalle por exchange y `created_at`; GL Streaming la consume desde servidor mediante una clave pública/publicable protegida por RLS y un adaptador que permite sustituir la tabla por un endpoint futuro.
- Capacidad ociosa usa los 28–31 días reales y el snapshot de capacidad del producto/cuenta aplicable a cada tramo; el ciclo aporta cobertura y costo, no define la capacidad, y ningún gasto se duplica.
- Un período pagado 22/07–22/08 distribuye 10 días a julio y 21 a agosto; el 22/08 solo genera ingreso si comienza la renovación.
- Sumar los tramos mensuales reproduce exactamente el monto contractual VES congelado desde el precio USD y, para proveedores, tanto el costo USDT como su snapshot VES.
- Una unidad vacante afecta el margen por ausencia de ingreso; su costo ocioso no se resta dos veces.
- Cortesía activa, pausa retenida y saneamiento pendiente no generan ingreso, conservan el costo proveedor y se muestran separados de una unidad disponible; su costo explicativo no se resta dos veces.
- El cierre conserva tasas BCV/paralela, detalle, versión, actor y fecha.
- Reejecutar el job no duplica cierres y un cierre cerrado no cambia silenciosamente.
- La suma de resultados diarios coincide exactamente con el cierre mensual.
- Pagos proveedor aparecen en Caja por fecha efectiva y costos proveedor en resultados por días cubiertos, ambos en USDT y con snapshot Bs, sin doble descuento.
- Todo gasto operativo normal confirmado reduce el resultado una sola vez en su fecha. No se modelan transferencias ni aportes.
- Un gasto operativo no puede duplicar un pago proveedor.
- El proveedor operativo propio no genera costo ni pago; si YouTube tiene un desembolso real, se registra una sola vez contra su relación financiera confirmada.
- `Yo` sin desembolso produce costo cero y ningún pago; `Yo` con desembolso real produce exactamente un costo y un pago; un tercero válido puede identificarse por nombre, teléfono o ambos.
- Editar nombre/contacto de proveedor no altera ciclos ni snapshots históricos.
- Un recurso indivisible sin filas hijas produce un día-capacidad por día desde el padre; si es propiedad del cliente nunca genera vacancia vendible y solo muestra `costo_no_reutilizable_sin_ingreso` cuando existe cobertura financiera real.
- Un registro de `20 USDT` para recargar el banco de Nigeria conserva automáticamente la tasa paralela y su snapshot Bs; trader/nairas solo son nota opcional.
- La acción secundaria de reverso aporta signo contrario, queda auditada y nunca supera el saldo original.
- El cierre mensual desglosa gastos operativos por categoría y excluye gastos personales.

## Fase 5 — Portal de revendedores

### Entregables

- Mis ventas y clientes relacionados.
- Disponibilidad saneada.
- Solicitudes, aprobación, rechazo y reserva de stock.
- Auditoría de cualquier acceso permitido a PIN.

### Criterios de salida

- Un revendedor solo ve sus propias operaciones.
- El inventario libre no revela credenciales, costos ni antiguos clientes.
- YouTube y cualquier recurso propiedad del cliente quedan fuera de stock/solicitudes; Gmail, contraseña y contacto de proveedor tampoco viajan en esas respuestas. Los reportes administrativos pueden mostrar el servicio saneado y su resultado financiero, nunca sus secretos.
- Si `SEC-02` autoriza entrega por revendedor, solo puede generar el paquete de una venta propia vigente mediante el comando; nunca obtiene tablas de secretos, credenciales de stock u otras ventas.
- Aprobar dos solicitudes concurrentes no asigna dos veces una unidad.

## Fase 6 — Otras plataformas y despliegue en `glcuenta.com`

### Entregables

- Incorporación gradual de HBO, Disney+, Prime Video, Crunchyroll, Spotify, Canva y las demás plataformas/productos ya aprobados en el catálogo.
- Pruebas de mecanismos de entrega, modalidades, capacidades y exclusiones particulares según cada ficha.
- Flujos Spotify de identidad/cobertura, madre concurrente, bloqueo de altas, reactivación proveedor y reemplazo masivo de una familia conservando todos los períodos.
- Responsive y accesibilidad finales.
- Backups, restauración, observabilidad, rotación de secretos y despliegue reproducible de la web en el VPS propio.
- Configuración final de DNS, HTTPS y proxy inverso para `glcuenta.com`.
- Decisión y configuración del alojamiento de Supabase de producción, separado del entorno local.
- Notificaciones externas solo si se aprueban como alcance.

### Criterios de salida

- Agregar una plataforma o un producto nuevo dentro de una plataforma existente no requiere copiar módulos ni cambiar fórmulas hardcodeadas.
- Staging y producción están separados.
- `https://glcuenta.com` responde con certificado válido y sin exponer puertos, secretos ni paneles internos.
- La restauración de backup fue probada.
- Flujos críticos pasan pruebas E2E y aceptación del administrador.

## Orden inmediato recomendado

1. Rotar de inmediato el secreto expuesto de Kuanto; hasta confirmarlo, usar datos simulados. Después, purgarlo del historial y dejar un solo programador a cinco minutos antes de cualquier integración productiva.
2. Revisar y aprobar el catálogo ya documentado, incluida la ficha compuesta de Spotify, y resolver primero las preguntas todavía bloqueantes de esquema.
3. Reconciliar y cerrar las demás decisiones P0.
4. Endurecer el scraper BCV para verificar TLS y rechazar respuestas sin fecha oficial.
5. No programar hasta recibir una instrucción expresa y cerrar el catálogo de plataformas.
6. Cuando se autorice, implementar solo la Fase 1 y revisar esquema/RLS antes del Data Grid.
7. Mantener VPS, DNS y `glcuenta.com` sin cambios hasta llegar a la Fase 6 y recibir autorización de despliegue.
