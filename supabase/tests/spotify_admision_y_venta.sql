-- Bloqueo familiar y alta atómica con correo propio/del cliente.
begin;

insert into auth.users (id, email)
values (gen_random_uuid(), 'admin-spotify-alta@test.local') returning id as admin_id \gset
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

select public.abrir_sesion_carga(:'producto', 'alta Spotify QA') as sesion \gset
select public.importar_spotify_familiar(
  p_sesion_id => :'sesion', p_producto_id => :'producto', p_capacidad => 5,
  p_madre_login_cifrado => 'madre', p_madre_login_fingerprint => 'madre-' || :'admin_id',
  p_madre_contrasena_cifrada => 'clave-madre', p_numero_slot => 1,
  p_modalidad_id => :'modalidad', p_cliente_nombre => null
) as importada \gset
select (:'importada'::jsonb ->> 'cuenta_id') as cuenta \gset
select (:'importada'::jsonb ->> 'unidad_id') as unidad1 \gset
select id as unidad2 from public.unidades_inventario
where cuenta_id = :'cuenta' and numero_slot = 2 \gset
select id as unidad3 from public.unidades_inventario
where cuenta_id = :'cuenta' and numero_slot = 3 \gset

select public.vender_miembro_spotify_con_identidad(
  :'cuenta', :'unidad1', :'modalidad', 'Cliente correo propio', '+58001',
  2, current_date, null, 2, 'login-cifrado-1', 'huella-1-' || :'admin_id',
  'clave-cifrada-1', 'dominio_gl'
) as suscripcion1 \gset

select 'Correo de dominio queda vinculado a la venta' as prueba,
       exists (
         select 1 from public.vinculos_identidad_spotify v
         join public.identidades_spotify i on i.id = v.identidad_spotify_id
         where v.suscripcion_id = :'suscripcion1' and v.fin is null
           and i.tipo_correo = 'dominio_gl' and i.reutilizable
       ) as pass;

select public.vender_miembro_spotify_con_identidad(
  :'cuenta', :'unidad2', :'modalidad', 'Cliente correo personal', '+58002',
  3, current_date, null, 3, 'login-cifrado-2', 'huella-2-' || :'admin_id',
  'clave-cifrada-2', 'correo_cliente'
) as suscripcion2 \gset

select 'Correo del cliente conserva titularidad y no es reutilizable' as prueba,
       exists (
         select 1 from public.vinculos_identidad_spotify v
         join public.identidades_spotify i on i.id = v.identidad_spotify_id
         join public.suscripciones s on s.id = v.suscripcion_id
         where v.suscripcion_id = :'suscripcion2' and v.fin is null
           and i.tipo_correo = 'correo_cliente' and not i.reutilizable
           and i.titular_tipo = 'cliente' and i.cliente_titular_id = s.cliente_id
       ) as pass;

update public.coberturas_spotify
set estado_admision = 'bloqueada_por_spotify', bloqueada_at = now(),
    motivo_bloqueo = 'no se puede'
where cuenta_id = :'cuenta';

select set_config('pruebas.cuenta', :'cuenta', true);
select set_config('pruebas.unidad3', :'unidad3', true);
select set_config('pruebas.modalidad', :'modalidad', true);

do $$
begin
  begin
    perform public.vender_miembro_spotify_con_identidad(
      current_setting('pruebas.cuenta')::uuid,
      current_setting('pruebas.unidad3')::uuid,
      current_setting('pruebas.modalidad')::uuid,
      'Cliente bloqueado', null, 2, current_date, null, 2,
      'login-2', 'huella-2', 'clave-2', 'correo_cliente'
    );
    raise exception 'FAIL: admitió una venta en familia bloqueada';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'Familia bloqueada rechaza nuevas altas: PASS';
  end;
end $$;

reset role;
rollback;
