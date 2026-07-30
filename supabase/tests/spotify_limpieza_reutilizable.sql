-- Spotify familiar: retirar un miembro del negocio lo devuelve al cupo;
-- retirar un correo del cliente destruye sus secretos. Rollback al final.
begin;

insert into auth.users (id, email)
values (gen_random_uuid(), 'admin-spotify-limpieza@test.local')
returning id as admin_id \gset
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

select public.crear_familia_spotify(
  :'producto', 5, 'Familia limpieza QA', 'Yo', 'spotify limpieza',
  'madre-cifrada', 'madre-limpieza-' || :'admin_id', 'clave-madre',
  null, null, null
) as cuenta \gset

select identidad_madre_id as identidad_madre
from public.coberturas_spotify
where cuenta_id = :'cuenta' \gset

select id as unidad1 from public.unidades_inventario
where cuenta_id = :'cuenta' and numero_slot = 1 \gset
select id as unidad2 from public.unidades_inventario
where cuenta_id = :'cuenta' and numero_slot = 2 \gset

select public.vender_miembro_spotify_con_identidad(
  :'cuenta', :'unidad1', :'modalidad', 'Cliente GL', '+58011',
  4, current_date, null, 4, 'gl-login', 'gl-login-' || :'admin_id',
  'gl-clave', 'dominio_gl'
) as suscripcion_gl \gset

select public.vender_miembro_spotify_con_identidad(
  :'cuenta', :'unidad2', :'modalidad', 'Cliente correo personal', '+58022',
  5, current_date, null, 5, 'cliente-login', 'cliente-login-' || :'admin_id',
  'cliente-clave', 'correo_cliente'
) as suscripcion_cliente \gset

select (select identidad_spotify_id
        from public.vinculos_identidad_spotify
        where suscripcion_id = :'suscripcion_gl' and fin is null) as identidad_gl \gset
select (select identidad_spotify_id
        from public.vinculos_identidad_spotify
        where suscripcion_id = :'suscripcion_cliente' and fin is null) as identidad_cliente \gset

select public.cancelar_y_liberar(:'suscripcion_gl', 'no_renovacion') as oper_gl \gset
select public.confirmar_limpieza(:'oper_gl', 'retirado del grupo');

select 'El acceso GL vuelve preparado al mismo cupo' as prueba,
       exists (
         select 1 from public.identidades_spotify
         where id = :'identidad_gl'
           and unidad_preparada_id = :'unidad1'::uuid
           and tipo_correo = 'dominio_gl'
           and login_cifrado = 'gl-login'
           and contrasena_cifrada = 'gl-clave'
           and reutilizable
       ) as pass
union all
select 'El vínculo GL se cierra al confirmar el retiro',
       exists (
         select 1 from public.vinculos_identidad_spotify
         where suscripcion_id = :'suscripcion_gl'
           and identidad_spotify_id = :'identidad_gl'
           and fin is not null
       )
union all
select 'La identidad madre sigue intacta',
       exists (
         select 1 from public.identidades_spotify
         where id = :'identidad_madre'
           and login_cifrado = 'madre-cifrada'
           and contrasena_cifrada = 'clave-madre'
       );

select public.cancelar_y_liberar(:'suscripcion_cliente', 'no_renovacion') as oper_cliente \gset
select public.confirmar_limpieza(:'oper_cliente', 'cliente retirado');

select 'El correo del cliente se retira y borra secretos' as prueba,
       exists (
         select 1 from public.identidades_spotify
         where id = :'identidad_cliente'
           and unidad_preparada_id is null
           and estado = 'retirada'
           and login_cifrado is null
           and contrasena_cifrada is null
           and secretos_eliminados_at is not null
       ) as pass
union all
select 'El cupo del cliente vuelve a lista',
       (select estado_preparacion = 'lista'
        from public.unidades_inventario where id = :'unidad2');

reset role;
rollback;
