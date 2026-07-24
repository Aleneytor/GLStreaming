-- ============================================================================
-- Pruebas del portal del revendedor (Fase 5).
-- Verifican que la vista-pasarela le da a cada revendedor SOLO lo suyo, ya con
-- el vencimiento y el WhatsApp que necesita para atender a sus clientes; y que
-- la comprobación de propiedad (la que usa la entrega de acceso) no deja que un
-- revendedor toque la venta de otro.
-- Transacción con rollback: no deja datos.
-- ============================================================================
begin;

insert into auth.users (id, email) values (gen_random_uuid(), 'admin-p@test.local') returning id as admin_id \gset
insert into auth.users (id, email) values (gen_random_uuid(), 'reva-p@test.local')  returning id as reva_id  \gset
insert into auth.users (id, email) values (gen_random_uuid(), 'revb-p@test.local')  returning id as revb_id  \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

insert into public.vendedores (usuario_id, nombre) values (:'reva_id', 'Vendedor A') returning id as vend_a \gset
insert into public.vendedores (usuario_id, nombre) values (:'revb_id', 'Vendedor B') returning id as vend_b \gset

select id as prod from public.productos_plataforma where codigo = 'netflix' \gset
select plataforma_id as plat from public.productos_plataforma where id = :'prod' \gset
select id as m_perfil from public.modalidades where plataforma_id = :'plat' and tipo_modalidad = 'perfil' \gset

-- Cliente de A con teléfono, y su venta con un período que vence el 20/08.
insert into public.clientes (nombre, whatsapp_original, whatsapp_normalizado)
  values ('Cliente De A', '+58 412-1112233', '584121112233') returning id as cli_a \gset
insert into public.suscripciones (cliente_id, producto_plataforma_id, modalidad_id, vendedor_origen_id, estado)
  values (:'cli_a', :'prod', :'m_perfil', :'vend_a', 'activa') returning id as susc_a \gset
insert into public.periodos_servicio (suscripcion_id, tipo_operacion, inicio, fecha_renovacion, estado)
  values (:'susc_a', 'venta_nueva', '2026-07-20', '2026-08-20', 'vigente');

-- Cliente y venta de B.
insert into public.clientes (nombre) values ('Cliente De B') returning id as cli_b \gset
insert into public.suscripciones (cliente_id, producto_plataforma_id, modalidad_id, vendedor_origen_id, estado)
  values (:'cli_b', :'prod', :'m_perfil', :'vend_b', 'activa') returning id as susc_b \gset
insert into public.periodos_servicio (suscripcion_id, tipo_operacion, inicio, fecha_renovacion, estado)
  values (:'susc_b', 'venta_nueva', '2026-07-10', '2026-08-10', 'vigente');

-- ===================== REVENDEDOR A =====================
reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'reva_id', 'role', 'authenticated')::text, true);
set role authenticated;

select 'A ve exactamente 1 venta (la suya)' as prueba,
       (select count(*) from public.v_mis_ventas_revendedor) = 1 as pass
union all select 'A ve el vencimiento de su cliente (20/08)',
       (select fecha_renovacion from public.v_mis_ventas_revendedor
        where suscripcion_id = :'susc_a') = '2026-08-20'
union all select 'A ve el WhatsApp de su cliente para escribirle',
       (select cliente_whatsapp from public.v_mis_ventas_revendedor
        where suscripcion_id = :'susc_a') = '584121112233'
union all select 'La comprobacion de propiedad reconoce SU venta',
       exists (select 1 from public.v_mis_ventas_revendedor where suscripcion_id = :'susc_a')
union all select 'La comprobacion de propiedad RECHAZA la venta de B',
       not exists (select 1 from public.v_mis_ventas_revendedor where suscripcion_id = :'susc_b')
union all select 'A no ve tablas base (suscripciones)',
       (select count(*) from public.suscripciones) = 0;

-- ===================== REVENDEDOR B =====================
reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'revb_id', 'role', 'authenticated')::text, true);
set role authenticated;

select 'B ve solo su venta, no la de A' as prueba,
       (select count(*) from public.v_mis_ventas_revendedor) = 1
       and exists (select 1 from public.v_mis_ventas_revendedor where suscripcion_id = :'susc_b')
       and not exists (select 1 from public.v_mis_ventas_revendedor where suscripcion_id = :'susc_a') as pass;

reset role;
rollback;
