-- Renovación Spotify por paquete completo de varios meses. Rollback al final.
begin;

insert into auth.users (id, email)
values (gen_random_uuid(), 'admin-multimes@test.local')
returning id as admin_id \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

select id as producto
from public.productos_plataforma
where codigo = 'spotify-individual' \gset
select pm.modalidad_id as modalidad
from public.producto_modalidades pm
join public.modalidades m on m.id = pm.modalidad_id
where pm.producto_plataforma_id = :'producto'
  and m.tipo_modalidad = 'servicio_individual' \gset

insert into public.tasas_cambio (
  tipo, bs_por_usd, fecha_vigencia, fuente, fuente_registro_id,
  observada_fuente_at, revalidada_at, estado
) values (
  'bcv', 100, current_date, 'prueba', 'multimes-bcv', now(), now(), 'vigente'
);
insert into public.tasas_cambio (
  tipo, bs_por_usd, fuente, fuente_registro_id,
  observada_fuente_at, revalidada_at, estado
) values (
  'paralela', 120, 'prueba', 'multimes-par', now(), now(), 'vigente'
);

reset role;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'admin_id', 'role', 'authenticated')::text,
  true
);
set role authenticated;

select public.crear_cuenta_con_unidades(
  :'producto', 1, 'Spotify multimes', null,
  'correo', 'huella-multimes', 'clave', null, null, 'Yo'
) as cuenta \gset

select public.vender_unidad(
  p_cuenta_id => :'cuenta',
  p_unidad_id => null,
  p_modalidad_id => :'modalidad',
  p_cliente_nombre => 'Roberto QA Multimes',
  p_precio_usd => 5,
  p_monto_usd => 5,
  p_inicio => '2026-07-06'::date,
  p_cantidad_periodos => 1
) as suscripcion \gset

select public.renovar_y_cobrar(
  p_suscripcion_id => :'suscripcion',
  p_inicio => '2026-08-06'::date,
  p_meses => 3,
  p_monto_usd => 13,
  p_tardia => false
) as periodo \gset

select 'Crea un solo período de 3 meses' as prueba,
       (select cantidad_periodos from public.periodos_servicio where id = :'periodo') = 3 as pass
union all
select 'El paquete termina tres meses calendario después',
       (select fecha_renovacion from public.periodos_servicio where id = :'periodo')
       = '2026-11-06'::date
union all
select 'El ingreso total del paquete es 13 USD, no 39',
       (select precio_comercial_usd from public.periodos_servicio where id = :'periodo') = 13
union all
select 'El paquete crea un solo cobro',
       (select count(*) from public.pagos_cliente where periodo_servicio_id = :'periodo' and tipo = 'cobro') = 1;

select public.renovar_y_cobrar(
  p_suscripcion_id => :'suscripcion',
  p_inicio => '2026-11-06'::date,
  p_meses => 2,
  p_monto_usd => 8,
  p_tardia => false
) as periodo_dos_meses \gset

select 'Acepta también un paquete de 2 meses' as prueba,
       (select cantidad_periodos from public.periodos_servicio where id = :'periodo_dos_meses') = 2 as pass
union all
select 'Dos meses calendario terminan en la fecha correcta',
       (select fecha_renovacion from public.periodos_servicio where id = :'periodo_dos_meses')
       = '2027-01-06'::date;

reset role;
rollback;
