-- ============================================================================
-- Seed sintético — catálogo de plataformas
-- ----------------------------------------------------------------------------
-- Datos NO sensibles: solo el catálogo comercial (plataformas, modalidades,
-- productos, mecanismos de entrega) con las capacidades confirmadas en el
-- catálogo de dominio. No contiene credenciales, correos, PIN ni datos reales
-- de clientes: eso se carga manualmente en la app (ver docs/04-carga-manual.md).
--
-- Capacidades confirmadas (docs/06-decisiones-pendientes.md, DEC-38..DEC-95):
--   Netflix estándar 5 · Netflix extra 1 · HBO 5 · Disney+ 7 · Prime Video 7
--   Crunchyroll 5 · Paramount+ 6 · Universal+ 5 · VIX 5
--   FlujoTV 3 · Telelatino 3 (solo cuenta completa) · CapCut 3 física/2 vendible
--   Gemini/Google Cloud 5 · Canva 500 · YouTube solo_cartera · Spotify ind. 1 / fam. 5
-- ============================================================================

-- Proveedor canónico propio.
insert into public.proveedores (tipo, nombre_o_alias, activo)
values ('propio', 'Yo', true);

-- ----------------------------------------------------------------------------
-- Mecanismos de entrega
-- ----------------------------------------------------------------------------
insert into public.mecanismos_entrega (codigo, nombre, tipo, politica_revocacion_acceso) values
  ('credenciales_cuenta',   'Credenciales de cuenta',           'credenciales_cuenta',   'cierre_sesion_perfil'),
  ('credenciales_y_unidad', 'Credenciales + unidad (perfil)',   'credenciales_y_unidad', 'cierre_sesion_perfil'),
  ('credenciales_cliente',  'Credenciales del cliente',         'credenciales_cliente',  'otro'),
  ('identidad_y_cobertura', 'Identidad + cobertura (Spotify)',  'identidad_y_cobertura', 'rotacion_credenciales'),
  ('dispositivo',           'Cupo por dispositivo',             'dispositivo',           'rotacion_credenciales'),
  ('grupo_familiar',        'Invitación a grupo familiar',      'grupo_familiar',        'salida_grupo_familiar'),
  ('panel_educativo',       'Invitación a panel educativo',     'panel_educativo',       'salida_grupo_familiar');

-- ----------------------------------------------------------------------------
-- Plataformas
-- ----------------------------------------------------------------------------
insert into public.plataformas (nombre, slug) values
  ('Netflix',              'netflix'),
  ('HBO Max',              'hbo'),
  ('Disney+',              'disney-plus'),
  ('Prime Video',          'prime-video'),
  ('Crunchyroll',          'crunchyroll'),
  ('Paramount+',           'paramount-plus'),
  ('Universal+',           'universal-plus'),
  ('VIX',                  'vix'),
  ('FlujoTV',              'flujotv'),
  ('Telelatino',           'telelatino'),
  ('CapCut',               'capcut'),
  ('Gemini / Google Cloud','gemini-google-cloud'),
  ('Canva',                'canva'),
  ('YouTube',              'youtube'),
  ('Spotify',              'spotify');

-- ----------------------------------------------------------------------------
-- Modalidades (por plataforma)
-- ----------------------------------------------------------------------------
-- Híbridas (perfil + cuenta completa)
insert into public.modalidades (plataforma_id, nombre, tipo_modalidad, alcance_asignacion)
select id, 'Perfil individual', 'perfil', 'unidad' from public.plataformas
where slug in ('netflix','hbo','disney-plus','prime-video','crunchyroll',
               'paramount-plus','universal-plus','vix');
insert into public.modalidades (plataforma_id, nombre, tipo_modalidad, alcance_asignacion)
select id, 'Cuenta completa', 'cuenta_completa', 'cuenta' from public.plataformas
where slug in ('netflix','hbo','disney-plus','prime-video','crunchyroll',
               'paramount-plus','universal-plus','vix','flujotv','telelatino','capcut');

-- Netflix perfil extra
insert into public.modalidades (plataforma_id, nombre, tipo_modalidad, alcance_asignacion)
select id, 'Perfil extra', 'extra', 'unidad' from public.plataformas where slug = 'netflix';

-- Por dispositivo
insert into public.modalidades (plataforma_id, nombre, tipo_modalidad, alcance_asignacion)
select id, 'Cupo por dispositivo', 'dispositivo', 'unidad' from public.plataformas
where slug in ('flujotv','capcut');  -- Telelatino: solo cuenta completa por ahora (TEL-01)

-- Grupo familiar / panel
insert into public.modalidades (plataforma_id, nombre, tipo_modalidad, alcance_asignacion)
select id, 'Miembro familiar', 'miembro_familiar', 'unidad' from public.plataformas
where slug = 'gemini-google-cloud';
insert into public.modalidades (plataforma_id, nombre, tipo_modalidad, alcance_asignacion)
select id, 'Asiento por invitación', 'asiento', 'unidad' from public.plataformas where slug = 'canva';

-- YouTube (solo cartera)
insert into public.modalidades (plataforma_id, nombre, tipo_modalidad, alcance_asignacion)
select id, 'Servicio individual', 'servicio_individual', 'cuenta' from public.plataformas where slug = 'youtube';

-- Spotify (compuesto)
insert into public.modalidades (plataforma_id, nombre, tipo_modalidad, alcance_asignacion)
select id, 'Individual', 'servicio_individual', 'cuenta' from public.plataformas where slug = 'spotify';
insert into public.modalidades (plataforma_id, nombre, tipo_modalidad, alcance_asignacion)
select id, 'Miembro familiar', 'miembro_familiar', 'unidad' from public.plataformas where slug = 'spotify';
insert into public.modalidades (plataforma_id, nombre, tipo_modalidad, alcance_asignacion)
select id, 'Uso de la madre', 'uso_principal', 'principal' from public.plataformas where slug = 'spotify';

-- ----------------------------------------------------------------------------
-- Productos de plataforma
-- ----------------------------------------------------------------------------
-- Helper: inserta un producto híbrido estándar (cuenta_con_unidades, perfil).
insert into public.productos_plataforma
  (plataforma_id, nombre, codigo, tipo_inventario, tipo_unidad_fisica, regla_capacidad,
   capacidad_fija, capacidad_vendible_predeterminada)
select id, nombre || ' — cuenta', slug, 'cuenta_con_unidades', 'perfil', 'fija', cap, vend
from (values
  ('netflix',        5, 5),
  ('hbo',            5, 5),
  ('disney-plus',    7, 7),
  ('prime-video',    7, 7),
  ('crunchyroll',    5, 5),
  ('paramount-plus', 6, 6),
  ('universal-plus', 5, 5),   -- cinco perfiles, todos vendibles (DEC-96)
  ('vix',            5, 5)
) as v(slug_ref, cap, vend)
join public.plataformas on plataformas.slug = v.slug_ref;

-- Netflix perfil extra (producto B): capacidad 1, en cuenta madre separada.
insert into public.productos_plataforma
  (plataforma_id, nombre, codigo, tipo_inventario, tipo_unidad_fisica, regla_capacidad,
   capacidad_fija, capacidad_vendible_predeterminada, descripcion_operativa)
select id, 'Netflix — perfil extra', 'netflix-extra', 'cuenta_con_unidades', 'extra', 'fija',
       1, 1, 'Perfil en una cuenta madre propia separada, con credenciales y ciclo de proveedor propios (DEC-94).'
from public.plataformas where slug = 'netflix';

-- Por dispositivo
insert into public.productos_plataforma
  (plataforma_id, nombre, codigo, tipo_inventario, tipo_unidad_fisica, regla_capacidad,
   capacidad_fija, capacidad_vendible_predeterminada)
select id, nombre || ' — cuenta', slug, 'cuenta_con_unidades', 'dispositivo', 'fija', cap, vend
from (values
  ('flujotv',    3, 3),
  ('telelatino', 3, 3),
  ('capcut',     3, 2)    -- física 3, vendible 2 por seguridad (DEC-69)
) as v(slug_ref, cap, vend)
join public.plataformas on plataformas.slug = v.slug_ref;

-- Grupo familiar / panel
insert into public.productos_plataforma
  (plataforma_id, nombre, codigo, tipo_inventario, tipo_unidad_fisica, regla_capacidad,
   capacidad_fija, capacidad_vendible_predeterminada)
select id, 'Gemini / Google Cloud — grupo', 'gemini-google-cloud', 'cuenta_con_unidades',
       'miembro_familiar', 'fija', 5, 5
from public.plataformas where slug = 'gemini-google-cloud';

insert into public.productos_plataforma
  (plataforma_id, nombre, codigo, tipo_inventario, tipo_unidad_fisica, regla_capacidad,
   capacidad_fija, capacidad_vendible_predeterminada)
select id, 'Canva — panel educativo', 'canva', 'cuenta_con_unidades', 'asiento', 'fija', 500, 500
from public.plataformas where slug = 'canva';

-- YouTube: solo cartera, recurso indivisible propiedad del cliente, sin renovaciones por defecto.
insert into public.productos_plataforma
  (plataforma_id, nombre, codigo, tipo_inventario, regla_capacidad, capacidad_fija,
   capacidad_vendible_predeterminada, titularidad_predeterminada, reutilizable_predeterminado,
   estado_comercial, permite_renovaciones, descripcion_operativa)
select id, 'YouTube — servicio sobre Gmail del cliente', 'youtube', 'recurso_indivisible', 'fija', 1, 1,
       'cliente', false, 'solo_cartera', false,
       'Plan individual por Gmail, pagado con tarjeta propia (DEC-91). Ventas nuevas cerradas.'
from public.plataformas where slug = 'youtube';

-- Spotify: dos productos (individual + familiar).
insert into public.productos_plataforma
  (plataforma_id, nombre, codigo, tipo_inventario, regla_capacidad, capacidad_fija,
   capacidad_vendible_predeterminada)
select id, 'Spotify — individual', 'spotify-individual', 'recurso_indivisible', 'fija', 1, 1
from public.plataformas where slug = 'spotify';

insert into public.productos_plataforma
  (plataforma_id, nombre, codigo, tipo_inventario, tipo_unidad_fisica, regla_capacidad,
   capacidad_fija, capacidad_vendible_predeterminada)
select id, 'Spotify — familiar', 'spotify-familiar', 'cuenta_con_unidades', 'miembro_familiar',
       'fija', 5, 5
from public.plataformas where slug = 'spotify';

-- ----------------------------------------------------------------------------
-- producto_modalidades (qué modalidad permite cada producto + su mecanismo)
-- ----------------------------------------------------------------------------
-- El mecanismo de entrega se elige según el tipo de modalidad, en línea
-- (sin funciones temporales: el seed puede ejecutarse en varias sesiones).

-- Plataformas de un solo producto: enlazan todas sus modalidades.
insert into public.producto_modalidades (producto_plataforma_id, modalidad_id, mecanismo_entrega_id)
select p.id, m.id, me.id
from public.productos_plataforma p
join public.plataformas pl on pl.id = p.plataforma_id
join public.modalidades m on m.plataforma_id = p.plataforma_id
join public.mecanismos_entrega me
  on me.codigo = case
       when m.tipo_modalidad in ('perfil', 'extra')  then 'credenciales_y_unidad'
       when m.tipo_modalidad = 'cuenta_completa'     then 'credenciales_cuenta'
       when m.tipo_modalidad = 'dispositivo'         then 'dispositivo'
       when m.tipo_modalidad = 'miembro_familiar'    then 'grupo_familiar'
       when m.tipo_modalidad = 'asiento'             then 'panel_educativo'
       when m.tipo_modalidad = 'uso_principal'       then 'identidad_y_cobertura'
       when m.tipo_modalidad = 'servicio_individual' and pl.slug = 'youtube'
                                                     then 'credenciales_cliente'
       when m.tipo_modalidad = 'servicio_individual' then 'identidad_y_cobertura'
     end
where pl.slug not in ('netflix', 'spotify');

-- Netflix estándar: perfil + cuenta completa.
insert into public.producto_modalidades (producto_plataforma_id, modalidad_id, mecanismo_entrega_id)
select p.id, m.id, me.id
from public.productos_plataforma p
join public.modalidades m on m.plataforma_id = p.plataforma_id and m.tipo_modalidad in ('perfil','cuenta_completa')
join public.mecanismos_entrega me
  on me.codigo = case m.tipo_modalidad
       when 'perfil'          then 'credenciales_y_unidad'
       when 'cuenta_completa' then 'credenciales_cuenta'
     end
where p.codigo = 'netflix';

-- Netflix extra: solo modalidad extra.
insert into public.producto_modalidades (producto_plataforma_id, modalidad_id, mecanismo_entrega_id)
select p.id, m.id, me.id
from public.productos_plataforma p
join public.modalidades m on m.plataforma_id = p.plataforma_id and m.tipo_modalidad = 'extra'
join public.mecanismos_entrega me on me.codigo = 'credenciales_y_unidad'
where p.codigo = 'netflix-extra';

-- Spotify individual: servicio_individual.
insert into public.producto_modalidades (producto_plataforma_id, modalidad_id, mecanismo_entrega_id)
select p.id, m.id, me.id
from public.productos_plataforma p
join public.modalidades m on m.plataforma_id = p.plataforma_id and m.tipo_modalidad = 'servicio_individual'
join public.mecanismos_entrega me on me.codigo = 'identidad_y_cobertura'
where p.codigo = 'spotify-individual';

-- Spotify familiar: miembro_familiar + uso_principal.
insert into public.producto_modalidades (producto_plataforma_id, modalidad_id, mecanismo_entrega_id)
select p.id, m.id, me.id
from public.productos_plataforma p
join public.modalidades m on m.plataforma_id = p.plataforma_id and m.tipo_modalidad in ('miembro_familiar','uso_principal')
join public.mecanismos_entrega me on me.codigo = 'identidad_y_cobertura'
where p.codigo = 'spotify-familiar';
