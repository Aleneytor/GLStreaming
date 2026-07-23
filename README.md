# GL Streaming

Base de planificación para sustituir el Excel operativo por una aplicación web de inventario, ventas, renovaciones, finanzas y gestión de revendedores. Los datos se cargarán manualmente; el Excel solo sirve como referencia funcional.

## Estado actual

El workspace comenzó vacío. En esta primera entrega solo se documentó y estructuró el proyecto; todavía no se ha generado la aplicación ni se han fijado versiones de dependencias. Esto respeta el enfoque modular del documento maestro y evita programar sobre reglas de negocio aún ambiguas.

La propuesta técnica es un monolito modular con Next.js, TypeScript, Tailwind CSS y Supabase (Auth, PostgreSQL y RLS). Netflix será el primer caso implementado. El catálogo funcional inicial, incluido Spotify, ya está documentado para que modalidades, capacidades y mecanismos de entrega nazcan del negocio real; todavía deben reconciliarse las decisiones transversales pendientes antes de cerrar el esquema. No se ha programado ni generado el proyecto técnico.

Todo el desarrollo y las pruebas se realizarán localmente. El usuario ya dispone de un VPS y del dominio `glcuenta.com`, reservados como destino final de producción; no se tocarán hasta la fase de despliegue expresamente autorizada.

## Documentación

- [Plan maestro — punto de partida único](docs/00-plan-maestro.md)
- [Alcance y reglas de negocio](docs/01-alcance-y-reglas.md)
- [Modelo de dominio y datos](docs/02-modelo-dominio.md)
- [Arquitectura y seguridad](docs/03-arquitectura-y-seguridad.md)
- [Carga manual y transición desde Excel](docs/04-carga-manual.md)
- [Roadmap por entregas](docs/05-roadmap.md)
- [Decisiones pendientes](docs/06-decisiones-pendientes.md)
- [Integración de tasas](docs/07-integracion-tasas.md)
- [Próximo paso](docs/08-proximo-paso.md)
- [Catálogo de comportamiento por plataforma](docs/plataformas/README.md)

## Hallazgos que cambian el blueprint original

- El producto trabaja por meses calendario. La fecha del cliente es un recordatorio de cobro flexible; la renovación del proveedor sí conserva un día ancla estricto.
- Una venta del 22/07 se contacta para renovar el 22/08. El cliente puede usar el servicio y pagar durante todo ese día; si no paga, el administrador decide esa noche si lo mantiene activo, lo pausa o libera la unidad.
- Una suscripción puede seguir activa mostrando `Vencido hace X días`. La fecha no corta ni libera inventario automáticamente.
- Si el cliente renueva tarde y seguía activo, el nuevo mes comienza el día real del pago completo. Si estaba pausado, comienza en la fecha posterior entre pago completo y reactivación. La próxima fecha se mueve un mes desde ese inicio y el historial conserva los días de cortesía o pausa.
- Clientes y proveedores siempre pagan el monto completo. Pueden hacerlo tarde, pero no existirán abonos, complementos ni estados parciales.
- Cinco perfiles no es una regla universal. La capacidad física se separará de la modalidad comercial: una plataforma puede vender unidades internas, la cuenta completa o mecanismos posteriores como invitaciones y asientos.
- Netflix estándar, HBO, Disney+, Prime Video y Crunchyroll son cuentas híbridas vendibles por perfiles o completas. Sus capacidades son cinco, cinco, siete, siete y cinco. Netflix además maneja un producto separado `perfil extra`, de capacidad uno, que normalmente es más costoso y ha resultado más estable en la operación, vendido mediante modalidad `extra`.
- En las cuentas compartidas, el cliente recibe correo, contraseña, perfil, PIN y fecha comercial, pero no puede modificar los datos de la cuenta madre. Una falla traslada la suscripción a inventario compatible sin reiniciar el período; una no renovación limpia el perfil remoto y aplica la política de revocación configurada antes de devolver el slot al stock, conservando toda la historia.
- YouTube conserva tres servicios existentes sobre el Gmail y contraseña del cliente. Esa identidad pertenece al cliente, no es reutilizable y nunca vuelve a stock; las ventas nuevas están cerradas. Todavía se confirmarán la renovación de esa cartera y si cada servicio consume un cupo de un plan proveedor compartido. El proveedor operativo predeterminado es `Yo` y puede cambiarse por un nombre o teléfono editable sin crear gastos automáticos.
- Spotify separa la identidad de acceso de la cobertura Premium. Una identidad puede usar correo administrado por GL Streaming y ser reutilizable después de sanearla, o pertenecer al cliente y retirarse definitivamente al finalizar. La cobertura puede ser individual —propia mediante GPay o activada por un proveedor— o un cupo de una familia.
- Una familia Spotify contiene una cuenta madre administradora y cinco miembros. El uso de la madre puede venderse excepcionalmente al mismo tiempo que los cinco cupos, sin transferir al cliente permiso para administrar el grupo; por ello no equivale a una venta de cuenta completa exclusiva. Una madre no vendida es infraestructura operativa, no capacidad ociosa.
- Una restricción `no se puede` en Spotify bloquea nuevas incorporaciones para toda la familia y deja activos a sus miembros existentes. Si cae la familia, se procesa una incidencia por lote: se recrean las identidades necesarias, se restaura su contenido y se conserva cada período, precio, cobro y fecha de renovación.
- Guardar cliente, vendedor y fechas directamente en el perfil borraría el historial al renovar o revender. El diseño separa inventario, suscripciones y períodos de servicio.
- Una suscripción tampoco queda atada a un perfil: las asignaciones registran cada cuenta/unidad por la que pasa el cliente cuando existe una falla o reemplazo.
- El balance acumulado requiere pagos y costos históricos; no puede calcularse con las tres tablas de estado actual propuestas originalmente.
- RLS filtra filas, pero no oculta columnas. Credenciales y costos estarán físicamente separados y se expondrán mediante vistas o funciones seguras.
- El indicador llamado “pérdida” por perfiles vacíos representa costo asignado a capacidad ociosa. No debe restarse por segunda vez del margen.
- El administrador introduce manualmente y congela el precio comercial en USD para cada venta o renovación; no existe un tarifario obligatorio. El cliente paga en bolívares (`VES`, mostrados como `Bs`) calculados con la BCV aplicable. La operación conserva precio USD, BCV, paralela contemporánea, monto esperado en Bs y monto efectivamente cobrado en Bs.
- La rentabilidad usa la lectura económica a tasa paralela y el panel muestra simultáneamente las lecturas BCV y paralela. Los costos de proveedores y demás gastos operativos se registran en USDT y se valorizan en Bs con la paralela.
- Como convención interna de GL Streaming, `1 USDT = 1 USD de referencia`. Cada gasto conserva la última tasa paralela disponible al momento de confirmarlo y su equivalente histórico en Bs; el usuario no elige tasa para esos egresos.
- El panel de ganancias conservará el total en Bs y mostrará simultáneamente sus equivalentes a tasa BCV y paralela, indicando tasa y fecha efectivas.
- Cada mes calendario generará un cierre financiero auditable. Los ingresos y costos de proveedor se prorratearán por los días reales que intersectan el mes, independientemente del día de venta o renovación; los gastos operativos afectan su fecha registrada.
- El cierre mostrará resultado devengado, flujo de caja, días/unidades pagados, en cortesía, pausados y vacantes, costo de capacidad ociosa y equivalentes de cierre BCV/paralela.
- Caja tendrá un panel diario con ventas nuevas, renovaciones, cobros, salidas, flujo neto y ganancia devengada. La suma de los resultados diarios reconciliará con el cierre mensual.
- Cada cuenta/recurso con cobertura financiera tendrá ciclos de proveedor y una acción “Registrar renovación y pago”. Esto crea el siguiente ciclo, registra el pago real en USDT y anota la salida en Caja; un proveedor meramente operativo no obliga a crearla.
- Caja tendrá un apartado compacto de **Gastos operativos** para recargas de bancos usados por el negocio, compras, comisiones, herramientas y otros costos empresariales. Los gastos personales quedan fuera.
- Una recarga al banco de Nigeria puede registrarse como el gasto fuente en USDT. El trader y los nairas recibidos pueden conservarse como nota opcional, sin modelar transferencias, aportes ni saldos bancarios; si se usa esta ruta, los débitos posteriores financiados por esa recarga no se vuelven a registrar como costos/pagos de ciclos.
- La cadencia objetivo de Kuanto es una paralela cada cinco minutos, todos los días. La auditoría del despliegue actual encontró ciclos cercanos a diez minutos y dos inserciones por ciclo, mientras el SQL versionado indica una hora; esa configuración debe reconciliarse antes de producción.
- La BCV se consumirá desde `https://bcvscrapper.vercel.app/api/bcv`. Para la paralela ya se identificó el contrato actual de solo lectura de Kuanto (`p2p_rate_history`: `id`, `price`, `details`, `created_at`), que se aislará detrás de un adaptador de servidor; un endpoint propio posterior es una mejora, no un bloqueo.
- Cuando después de las 5:00 p. m. estén disponibles la BCV vigente y la próxima, los formularios en vivo adoptarán automáticamente la publicación nueva y mostrarán claramente su fecha de vigencia. Ambas quedan en el historial.
- El desarrollo será local. La publicación final se hará en el VPS propio bajo `glcuenta.com`; infraestructura, DNS y certificados quedan fuera de las fases actuales.
- Revisión exhaustiva del 22/07/2026: se resolvieron `NET-05`/`NET-06` (el perfil extra de Netflix vive en otra cuenta madre propia, con credenciales y ciclo de proveedor independientes), `CAN-01` (panel Canva admite 500 asientos), `GEM-01` (Gemini y Google Cloud son un solo producto) y `YT-06`/`YT-04` (cada Gmail de YouTube es un plan individual con costo real). YouTube queda despriorizado por decisión de negocio: dejó de venderse activamente y solo tiene 2 registros comerciales reales (el tercero es la cuenta personal del usuario, excluida del tracking). Detalle en `docs/06-decisiones-pendientes.md` (`DEC-91` a `DEC-94`).

## Acción de seguridad previa

Las capturas parecen contener credenciales reales y, en algunas celdas, datos completos de una tarjeta de pago. Esos datos no se copiaron a estos documentos ni formarán parte del sistema. Aunque no habrá migración, se debe eliminar todo código de seguridad de las hojas existentes y rotar las credenciales o medios de pago que hayan quedado expuestos.

La auditoría de Kuanto también encontró una credencial con formato de secreto de Supabase escrita en `SCHEDULE_CRON.sql` dentro del repositorio público. No se probó ni se copió. Debe revocarse/rotarse de inmediato, independientemente del calendario de este proyecto; luego hay que actualizar los jobs que la usen y purgarla del historial Git. Hasta confirmar la rotación no se conectará GL Streaming local al proyecto Kuanto en vivo.

**Estado confirmado el 22/07/2026: la credencial todavía no se ha rotado.** Sigue siendo una acción pendiente y urgente para el usuario, fuera de este workspace, junto con revisar los programadores (cron) desplegados de Kuanto y dejar uno solo a 5 minutos (hoy hay indicios de doble disparador con ciclos de ~10 minutos).

El siguiente paso es revisar el [catálogo de plataformas](docs/plataformas/README.md), reconciliar las decisiones transversales que todavía puedan cambiar el esquema y obtener aprobación funcional. No se iniciará la programación hasta recibir una instrucción expresa.
