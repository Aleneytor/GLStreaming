# Catálogo de comportamiento por plataforma

Este catálogo es un requisito previo a la programación. Su propósito no es copiar una pantalla por plataforma, sino descubrir qué conceptos son compartidos, qué reglas son configurables y qué flujos necesitan comportamiento especializado antes de cerrar el esquema de datos.

Las reglas financieras, de calendario, seguridad, clientes, pagos, proveedores y cierres de los documentos principales continúan siendo globales. Cada ficha describe cómo se organiza, entrega, ocupa, pausa, reemplaza y cierra su inventario o servicio, incluido un recurso externo propiedad del cliente.

## Estado del catálogo

| Plataforma | Arquetipo preliminar | Estado funcional | Documento |
|---|---|---|---|
| Netflix | Cuenta estándar híbrida de cinco perfiles + perfil extra de capacidad uno | Cuenta estándar alineada; quedan activación/costo del extra | [Netflix](netflix.md) |
| HBO | Cuenta híbrida de cinco perfiles | Documentada; queda nombre predeterminado de perfiles | [HBO](hbo.md) |
| Disney+ | Cuenta híbrida de siete perfiles | Documentada; queda nombre predeterminado de perfiles | [Disney+](disney-plus.md) |
| Prime Video | Cuenta híbrida de siete perfiles | Documentada; queda nombre predeterminado de perfiles | [Prime Video](prime-video.md) |
| Crunchyroll | Cuenta híbrida de cinco perfiles | Documentada; usa cierre de sesiones/dispositivos por perfil cuando aplique | [Crunchyroll](crunchyroll.md) |
| Paramount+ | Cuenta híbrida de seis perfiles | Documentada | [Paramount+](paramount-plus.md) |
| Universal+ | Cuenta híbrida con seis perfiles físicos y cinco vendibles | Documentada; queda precisar sexto perfil en venta completa | [Universal+](universal-plus.md) |
| VIX | Cuenta híbrida de cinco perfiles | Documentada | [VIX](vix.md) |
| FlujoTV | Cuenta por tres dispositivos/cupos | Documentada; excepción de revocación por rotación de credenciales | [FlujoTV](flujotv.md) |
| Telelatino | Cuenta completa de tres dispositivos observada | Parcial; falta confirmar si admite venta individual y cómo revoca acceso | [Telelatino](telelatino.md) |
| CapCut | Cuenta por tres dispositivos, dos vendibles por seguridad | Documentada; falta precisar venta completa y revocación | [CapCut](capcut.md) |
| Gemini / Google Cloud | Grupo familiar de cinco miembros | Parcial; falta separar productos/casos especiales | [Gemini / Google Cloud](gemini-google-cloud.md) |
| Canva | Panel educativo por invitación a correo del cliente | Documentada; falta confirmar capacidad real e invitación pendiente | [Canva](canva.md) |
| YouTube | Servicio sobre Gmail propiedad del cliente; cobertura proveedor por confirmar | Tres servicios existentes y ventas nuevas cerradas; falta confirmar plan/cupo, renovación, activación, retención de contraseña y costo real cuando proveedor es `Yo` | [YouTube](youtube.md) |
| Spotify | Servicio compuesto: identidad de acceso + cobertura individual o grupo familiar de cinco miembros | Documentada; queda observar cómo se recupera el bloqueo de nuevas altas de una familia | [Spotify](spotify.md) |

Se agregarán las demás plataformas cuando el usuario indique cuáles maneja. No se asumirán capacidades, límites o mecanismos a partir de semejanzas comerciales.

## Regla de avance

Antes de crear la base de datos deben cumplirse estas condiciones:

1. todas las plataformas que formarán parte del lanzamiento tienen una ficha;
2. cada ficha identifica la unidad que se compra y la que se vende;
3. están definidos el mecanismo de entrega y las exclusiones de inventario;
4. se conocen los estados y acciones que pueden cambiar disponibilidad;
5. se sabe qué ocurre ante falla, traslado, pausa, renovación y cancelación;
6. las dudas capaces de cambiar tablas o restricciones están resueltas;
7. los arquetipos comunes están identificados y no dependen de nombres como `perfil` cuando el producto realmente es una invitación o un asiento.
8. están definidos estado comercial, titularidad, reutilización y qué operaciones siguen permitidas sobre cartera existente;
9. se sabe si la cuenta/identidad la aporta el negocio, el proveedor o el cliente, y cómo se protegen/retiran sus secretos.
10. toda cuenta compartida define cómo limpia el perfil/cupo y cómo revoca el acceso externo antes de reutilizarlo.

Netflix seguirá siendo la primera implementación vertical, pero el núcleo se diseñará contra todas las fichas aprobadas. Así se evita terminar el código de Netflix y descubrir después que Spotify o Canva requieren rehacer suscripciones, asignaciones o inventario.

## Clasificación que se validará

```text
Suscripción comercial
  └─ mecanismo de entrega
       ├─ cuenta híbrida
       │    ├─ perfil/unidad interna
       │    └─ cuenta completa (exclusiva)
       ├─ servicio sobre cuenta del cliente
       │    ├─ identidad privada no reutilizable
       │    └─ cobertura proveedor opcional y separada
       ├─ cuenta por dispositivos/cupos
       ├─ membresía por invitación / grupo familiar
       └─ asiento dentro de equipo/workspace
```

Los mecanismos anteriores no siempre describen por sí solos todo el servicio. Una plataforma puede componer una identidad de acceso con una cobertura que cambia sin crear otra venta:

```text
Servicio compuesto
  ├─ identidad de acceso
  │    ├─ propiedad de GL Streaming y reutilizable solo tras saneamiento
  │    └─ propiedad del cliente y no reutilizable como inventario
  └─ cobertura
       ├─ suscripción individual
       └─ cupo dentro de un recurso compartido
```

La ficha de cada plataforma debe indicar si usa esta composición y definir por separado la titularidad, reutilización, reemplazo y cierre de ambos componentes.

El [arquetipo de cuenta híbrida](arquetipos/cuenta-hibrida.md) ya está confirmado para las cuentas estándar de Netflix, HBO, Disney+, Prime Video, Crunchyroll, Paramount+, Universal+ y VIX. El usuario indicó que la mayoría de las plataformas basadas en cuentas se comportan así, pero cada ficha debe confirmar su capacidad y excepciones. Netflix además demuestra que una plataforma puede ofrecer más de un producto de inventario: su perfil extra no pertenece a la cuenta estándar.

FlujoTV, Telelatino y CapCut introducen el [arquetipo de cuenta por dispositivos o cupos](arquetipos/cuenta-dispositivos.md). Gemini/Google Cloud y Canva introducen el [arquetipo de grupo, panel o membresía por invitación](arquetipos/grupo-familiar.md).

YouTube introduce el [arquetipo de servicio sobre cuenta del cliente](arquetipos/cuenta-cliente.md): el Gmail pertenece a una persona concreta, no vuelve a stock y puede permanecer administrable aunque el producto ya no acepte ventas nuevas. Su estructura total sigue provisional hasta confirmar si consume un cupo dentro de un plan compartido.

Spotify confirma el servicio compuesto y amplía el [arquetipo de grupo familiar](arquetipos/grupo-familiar.md). La identidad Spotify puede ser administrada por GL Streaming y reutilizarse después de sanearla, o pertenecer al cliente y no volver a inventario; su cobertura Premium puede cambiar entre activación individual y familia sin alterar la venta vigente. La familia conserva una cuenta principal bajo propiedad y control de GL Streaming más cinco miembros. El uso normal de la principal puede venderse excepcionalmente y coexistir con los cinco miembros, pero no transfiere administración; si no se vende, es un recurso operativo y no una vacancia. Una restricción para agregar personas bloquea nuevas altas en toda la familia aunque queden cupos físicos, y una falla de la familia se atiende como incidencia en lote sobre todos sus servicios activos.

## Método para incorporar una plataforma

Cada nueva plataforma se documentará usando la [plantilla](plantilla.md). Las capturas de Excel sirven para interpretar el flujo, pero no se copian correos, contraseñas, PIN, teléfonos ni datos de pago a estas fichas.

Una ficha puede conservar preguntas pendientes, pero debe indicar si son:

- **bloqueantes de esquema:** pueden cambiar entidades, relaciones o restricciones y deben resolverse antes de programar;
- **bloqueantes de flujo:** deben resolverse antes de implementar esa plataforma;
- **no bloqueantes:** afectan textos, valores predeterminados o detalles de interfaz y pueden confirmarse posteriormente.
