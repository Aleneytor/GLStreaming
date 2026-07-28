-- Control administrativo de admisión y titularidad en familias Spotify.
begin;

insert into auth.users (id, email)
values (gen_random_uuid(), 'admin-edicion-spotify@test.local') returning id as admin_id \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

select id as producto from public.productos_plataforma
where codigo = 'spotify-familiar' \gset
select modalidad_id as modalidad from public.producto_modalidades pm
join public.modalidades m on m.id = pm.modalidad_id
where pm.producto_plataforma_id = :'producto'
  and m.alcance_asignacion = 'unidad' and pm.activa limit 1 \gset

reset role;
select set_config('request.jwt.claims', json_build_object(
  'sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

select public.crear_familia_spotify(
  :'producto', 5, 'QA edición', null, null,
  'madre-cifrada', 'madre-huella-edicion', 'madre-clave', null, null, null
) as cuenta \gset
select id as unidad from public.unidades_inventario
where cuenta_id = :'cuenta' and numero_slot = 1 \gset

select public.actualizar_admision_familia_spotify(
  :'cuenta', 'bloqueada_por_spotify', 'prueba temporal');
select 'El admin puede bloquear la admisión' as prueba,
       (select estado_admision from public.coberturas_spotify where cuenta_id = :'cuenta')
       = 'bloqueada_por_spotify' as pass;

select public.actualizar_admision_familia_spotify(:'cuenta', 'abierta', null);
select 'El admin puede volver a abrir la familia' as prueba,
       (select estado_admision from public.coberturas_spotify where cuenta_id = :'cuenta')
       = 'abierta' as pass
union all select 'Abrir limpia el motivo del bloqueo',
       (select motivo_bloqueo is null from public.coberturas_spotify where cuenta_id = :'cuenta');

select public.preparar_identidad_spotify(
  :'unidad', 'gmail-cifrado', 'gmail-huella-edicion', 'gmail-clave', 'gmail_propio'
) as identidad \gset
select public.vender_unidad(
  p_cuenta_id => :'cuenta', p_unidad_id => :'unidad', p_modalidad_id => :'modalidad',
  p_cliente_nombre => 'Cliente edición Spotify', p_precio_usd => 4
) as suscripcion \gset

select public.editar_acceso_miembro_spotify(
  :'unidad', :'suscripcion', 'gmail-nuevo-cifrado', 'gmail-nuevo-huella',
  'gmail-nueva-clave', 'gmail_propio'
) as identidad_nueva \gset

select 'Gmail propio sigue perteneciendo al negocio' as prueba,
       (select titular_tipo = 'negocio' and tipo_correo = 'gmail_propio' and reutilizable
        from public.identidades_spotify where id = :'identidad_nueva') as pass
union all select 'La identidad nueva queda vinculada a la venta',
       exists (
         select 1 from public.vinculos_identidad_spotify
         where suscripcion_id = :'suscripcion'
           and identidad_spotify_id = :'identidad_nueva' and fin is null
       );

select public.editar_acceso_miembro_spotify(
  :'unidad', :'suscripcion', 'cliente-cifrado', 'cliente-huella-edicion',
  'cliente-clave', 'correo_cliente'
) as identidad_cliente \gset
select public.editar_acceso_miembro_spotify(
  :'unidad', :'suscripcion', 'dominio-cifrado', 'dominio-huella-edicion',
  'dominio-clave', 'dominio_gl'
) as identidad_dominio \gset

select 'Un cupo vendido puede pasar de correo del cliente a dominio GL' as prueba,
       (select titular_tipo = 'negocio' and tipo_correo = 'dominio_gl' and reutilizable
        from public.identidades_spotify where id = :'identidad_dominio') as pass
union all select 'El correo anterior del cliente elimina sus secretos',
       (select estado = 'retirada' and secretos_eliminados_at is not null
          and login_cifrado is null and contrasena_cifrada is null
        from public.identidades_spotify where id = :'identidad_cliente');

reset role;
rollback;
