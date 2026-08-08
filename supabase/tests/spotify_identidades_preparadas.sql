-- Identidad de miembro precargada en un cupo Spotify familiar libre.
-- La prueba crea, vende y comprueba dentro de una transacción con rollback.
begin;

-- Tasas controladas por la prueba (tras un db:reset el seed no deja tasas):
-- 100 Bs/USD (BCV) y 50 Bs/USD (paralela), como hacen el resto de suites
-- que registran cobros. Se revierten con el rollback.
insert into public.tasas_cambio (tipo, bs_por_usd, fecha_vigencia, fuente, fuente_registro_id, observada_fuente_at, revalidada_at, estado)
values ('bcv', 100, current_date, 'prueba', 'sid-bcv-1', now(), now(), 'vigente');
insert into public.tasas_cambio (tipo, bs_por_usd, fuente, fuente_registro_id, observada_fuente_at, revalidada_at, estado)
values ('paralela', 50, 'prueba', 'sid-par-1', now(), now(), 'vigente');

insert into auth.users (id, email)
values (gen_random_uuid(), 'admin-preparada@test.local') returning id as admin_id \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

select id as producto from public.productos_plataforma
where codigo = 'spotify-familiar' \gset
select modalidad_id as modalidad from public.producto_modalidades pm
join public.modalidades m on m.id = pm.modalidad_id
where pm.producto_plataforma_id = :'producto'
  and m.alcance_asignacion = 'unidad' and pm.activa
limit 1 \gset

select set_config('request.jwt.claims', json_build_object(
  'sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

select public.abrir_sesion_carga(:'producto', 'identidad preparada QA') as sesion \gset
select public.importar_spotify_familiar(
  p_sesion_id => :'sesion',
  p_producto_id => :'producto',
  p_capacidad => 5,
  p_madre_login_cifrado => 'madre-cifrada',
  p_madre_login_fingerprint => 'madre-' || :'admin_id',
  p_madre_contrasena_cifrada => 'clave-madre-cifrada',
  p_miembro_login_cifrado => 'miembro-cifrado',
  p_miembro_login_fingerprint => 'miembro-' || :'admin_id',
  p_miembro_contrasena_cifrada => 'clave-miembro-cifrada',
  p_miembro_tipo_correo => 'dominio_gl',
  p_numero_slot => 1,
  p_modalidad_id => :'modalidad',
  p_cliente_nombre => null
) as importada \gset

select (:'importada'::jsonb ->> 'cuenta_id') as cuenta \gset
select (:'importada'::jsonb ->> 'unidad_id') as unidad \gset
select public.preparar_identidad_spotify(
  :'unidad', 'miembro-cifrado', 'miembro-' || :'admin_id',
  'clave-miembro-cifrada', 'dominio_gl'
) as identidad \gset

select 'Preparar credenciales no crea una venta' as prueba,
       not exists (
         select 1 from public.asignaciones_inventario
         where unidad_id = :'unidad' and fin is null
       ) as pass
union all select 'La identidad queda asociada al cupo libre',
       (select unidad_preparada_id = :'unidad'::uuid
        from public.identidades_spotify where id = :'identidad')
union all select 'El cupo sigue disponible en inventario',
       (select estado_operativo = 'habilitada' and estado_preparacion = 'lista'
        from public.unidades_inventario where id = :'unidad');

select public.vender_unidad(
  p_cuenta_id => :'cuenta',
  p_unidad_id => :'unidad',
  p_modalidad_id => :'modalidad',
  p_cliente_nombre => 'Cliente identidad preparada',
  p_precio_usd => 2,
  p_monto_usd => 2,
  p_inicio => current_date
) as suscripcion \gset

select 'La venta consume la identidad preparada' as prueba,
       (select unidad_preparada_id is null
        from public.identidades_spotify where id = :'identidad') as pass
union all select 'La misma identidad queda enlazada a la suscripción',
       exists (
         select 1 from public.vinculos_identidad_spotify
         where suscripcion_id = :'suscripcion'
           and identidad_spotify_id = :'identidad' and fin is null
       )
union all select 'Solo después de vender el cupo queda ocupado',
       exists (
         select 1 from public.asignaciones_inventario
         where suscripcion_id = :'suscripcion' and unidad_id = :'unidad' and fin is null
       );

reset role;
rollback;

