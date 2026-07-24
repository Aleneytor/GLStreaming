-- ============================================================================
-- Pruebas de la importación masiva (migración de cartera).
-- Se ejecuta en una transacción y se revierte: no deja datos.
--
-- Compara siempre filas creadas por esta misma suite (se marcan con un correo
-- propio y con `set_config`), nunca totales absolutos: la base de desarrollo
-- tiene datos reales del usuario.
-- ============================================================================
begin;

insert into auth.users (id, email) values (gen_random_uuid(), 'admin-imp@test.local') returning id as admin_id \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

select id as prod from public.productos_plataforma where codigo = 'netflix' \gset
select id as prod_extra from public.productos_plataforma where codigo = 'netflix-extra' \gset
select plataforma_id as plat from public.productos_plataforma where id = :'prod' \gset
select id as m_perfil from public.modalidades where plataforma_id = :'plat' and tipo_modalidad = 'perfil' \gset
select id as m_extra  from public.modalidades where plataforma_id = :'plat' and tipo_modalidad = 'extra' \gset

-- Tasas controladas: 100 Bs/USD (BCV) y 50 (paralela).
insert into public.tasas_cambio (tipo, bs_por_usd, fecha_vigencia, fuente, fuente_registro_id, observada_fuente_at, revalidada_at, estado)
values ('bcv', 100, current_date, 'prueba', 'imp-bcv', now(), now(), 'vigente');
insert into public.tasas_cambio (tipo, bs_por_usd, fuente, fuente_registro_id, observada_fuente_at, revalidada_at, estado)
values ('paralela', 50, 'prueba', 'imp-par', now(), now(), 'vigente');

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

select public.abrir_sesion_carga(:'prod', 'prueba') as sesion \gset

-- ---------------------------------------------------------------------------
-- 1. Dos filas del MISMO correo se agrupan en una sola cuenta madre
-- ---------------------------------------------------------------------------
-- (huella del correo simulada: en la app la calcula huellaSecreto)
-- La primera fila CREA la cuenta con costo (3.50 @CapyVentas) y renovación de
-- proveedor el 09/08 (se pasa el inicio del ciclo = 09/07).
select public.importar_servicio_existente(
  :'sesion', :'prod', 5, 'cif-correo-A', 'huella-A', 'cif-pass',
  'Cuenta A', 1, 'Ana', 'cif-pin', :'m_perfil',
  'Ana Perez', '04141234567', '2026-07-01'::date, '2026-08-01'::date, 250, null,
  3.50, '@CapyVentas', '2026-07-09'::date
) as r1 \gset

-- La segunda fila reutiliza la cuenta: su costo (si lo trajera) NO se vuelve a sumar.
select public.importar_servicio_existente(
  :'sesion', :'prod', 5, 'cif-correo-A', 'huella-A', 'cif-pass',
  'Cuenta A', 2, 'Beto', null, :'m_perfil',
  'Beto Gomez', null, '2026-07-01'::date, '2026-08-01'::date, 300, null,
  3.50, '@CapyVentas'
) as r2 \gset

select set_config('pruebas.cuenta', (:'r1'::jsonb ->> 'cuenta_id'), true);

select 'La primera fila crea la cuenta madre' as prueba,
       (:'r1'::jsonb ->> 'cuenta_creada')::boolean = true as pass
union all select 'La segunda fila reutiliza la misma cuenta (no crea otra)',
       (:'r2'::jsonb ->> 'cuenta_creada')::boolean = false
union all select 'Ambas filas apuntan a la misma cuenta madre',
       (:'r1'::jsonb ->> 'cuenta_id') = (:'r2'::jsonb ->> 'cuenta_id')
union all select 'La cuenta tiene sus 5 perfiles',
       (select count(*) from public.unidades_inventario
        where cuenta_id = current_setting('pruebas.cuenta')::uuid) = 5;

-- ---------------------------------------------------------------------------
-- 2. El cliente queda asignado, con período de carga inicial y cobro
-- ---------------------------------------------------------------------------
select set_config('pruebas.susc1', (:'r1'::jsonb ->> 'suscripcion_id'), true);
select set_config('pruebas.periodo1', (:'r1'::jsonb ->> 'periodo_id'), true);

select 'La fila con cliente queda vendida' as prueba,
       (:'r1'::jsonb ->> 'vendida')::boolean = true as pass
union all select 'El periodo es una carga_inicial (no una venta del dia)',
       (select tipo_operacion from public.periodos_servicio
        where id = current_setting('pruebas.periodo1')::uuid) = 'carga_inicial'
union all select 'La carga inicial NO tiene fecha_venta (no ensucia Caja)',
       (select fecha_venta from public.periodos_servicio
        where id = current_setting('pruebas.periodo1')::uuid) is null
union all select 'Respeta la fecha de vencimiento del Excel (01/08)',
       (select fecha_renovacion from public.periodos_servicio
        where id = current_setting('pruebas.periodo1')::uuid) = '2026-08-01'
union all select 'Cobra los bolivares indicados (250)',
       (select monto_ves from public.pagos_cliente pc
        join public.periodos_servicio ps on ps.id = pc.periodo_servicio_id
        where ps.id = current_setting('pruebas.periodo1')::uuid and pc.tipo = 'cobro') = 250
union all select 'El USD se deriva del monto: 250 / 100 = 2.5',
       (select precio_comercial_usd from public.periodos_servicio
        where id = current_setting('pruebas.periodo1')::uuid) = 2.5;

-- ---------------------------------------------------------------------------
-- 2c. El revendedor (columna «Vendió») queda registrado en la venta
-- ---------------------------------------------------------------------------
insert into public.vendedores (nombre) values ('Gabriel Nadales') returning id as vend \gset

select public.importar_servicio_existente(
  :'sesion', :'prod', 5, 'cif-correo-A', 'huella-A', 'cif-pass',
  'Cuenta A', 4, 'Rafael', null, :'m_perfil',
  'Rafael Mora', null, '2026-07-01'::date, '2026-08-01'::date, 300, :'vend'
) as r4 \gset

select set_config('pruebas.susc4', (:'r4'::jsonb ->> 'suscripcion_id'), true);
select set_config('pruebas.periodo4', (:'r4'::jsonb ->> 'periodo_id'), true);

select 'La suscripcion guarda el vendedor de origen' as prueba,
       (select vendedor_origen_id from public.suscripciones
        where id = current_setting('pruebas.susc4')::uuid) = :'vend' as pass
union all select 'El periodo guarda el vendedor',
       (select vendedor_id from public.periodos_servicio
        where id = current_setting('pruebas.periodo4')::uuid) = :'vend';

-- ---------------------------------------------------------------------------
-- 2d. El costo del proveedor se registra UNA vez por cuenta, valorizado a paralela
-- ---------------------------------------------------------------------------
-- La cuenta A se creó en la fila r1 con costo 3.50 USDT y proveedor @CapyVentas
-- (ver el bloque de más abajo, donde r1 ahora lleva costo). Aquí se comprueba.
select set_config('pruebas.cuentaA', current_setting('pruebas.cuenta'), true);

select 'La cuenta madre tiene UN solo ciclo de proveedor' as prueba,
       (select count(*) from public.ciclos_proveedor
        where cuenta_id = current_setting('pruebas.cuentaA')::uuid and estado = 'vigente') = 1 as pass
union all select 'El ciclo guarda el costo en USDT (3.50)',
       (select costo_usdt from public.ciclos_proveedor
        where cuenta_id = current_setting('pruebas.cuentaA')::uuid and estado = 'vigente') = 3.50
union all select 'El costo se valoriza a paralela: 3.50 x 50 = 175 Bs',
       (select costo_ves_snapshot from public.ciclos_proveedor
        where cuenta_id = current_setting('pruebas.cuentaA')::uuid and estado = 'vigente') = 175
union all select 'La renovacion del proveedor cae el 09/08 (dada por el Excel)',
       (select proxima_renovacion from public.ciclos_proveedor
        where cuenta_id = current_setting('pruebas.cuentaA')::uuid and estado = 'vigente') = '2026-08-09'
union all select 'El dia ancla del proveedor es 9',
       (select dia_ancla_proveedor from public.ciclos_proveedor
        where cuenta_id = current_setting('pruebas.cuentaA')::uuid and estado = 'vigente') = 9
union all select 'La cuenta quedó con el proveedor @CapyVentas',
       (select p.nombre_o_alias from public.proveedores p
        join public.cuentas c on c.proveedor_operativo_id = p.id
        where c.id = current_setting('pruebas.cuentaA')::uuid) = '@CapyVentas'
union all select 'No se registró ningún pago (Caja) por la migración',
       (select count(*) from public.pagos_proveedor pp
        join public.ciclos_proveedor cp on cp.id = pp.ciclo_proveedor_id
        where cp.cuenta_id = current_setting('pruebas.cuentaA')::uuid) = 0;

-- ---------------------------------------------------------------------------
-- 3. Un perfil sin cliente se carga libre (inventario, sin suscripción)
-- ---------------------------------------------------------------------------
select public.importar_servicio_existente(
  :'sesion', :'prod', 5, 'cif-correo-A', 'huella-A', 'cif-pass',
  'Cuenta A', 3, 'Libre', null, :'m_perfil',
  null, null, null, null, null, null
) as r3 \gset

select 'Un perfil sin cliente no queda vendido' as prueba,
       (:'r3'::jsonb ->> 'vendida')::boolean = false as pass
union all select 'Ese perfil sigue disponible para vender',
       not exists (
         select 1 from public.asignaciones_inventario a
         where a.unidad_id = (:'r3'::jsonb ->> 'unidad_id')::uuid and a.fin is null);

-- ---------------------------------------------------------------------------
-- 4. Un extra es su propia cuenta madre (capacidad 1, correo propio)
-- ---------------------------------------------------------------------------
select public.abrir_sesion_carga(:'prod_extra', 'prueba extra') as sesion_extra \gset

select public.importar_servicio_existente(
  :'sesion_extra', :'prod_extra', 1, 'cif-correo-X', 'huella-X', 'cif-pass',
  null, 1, 'Extra Cli', 'cif-pin', :'m_extra',
  'Cliente Extra', '04125550000', '2026-07-10'::date, '2026-08-10'::date, 180, null
) as rx \gset

select 'El extra crea su propia cuenta madre' as prueba,
       (:'rx'::jsonb ->> 'cuenta_creada')::boolean = true as pass
union all select 'El extra queda vendido a su cliente',
       (:'rx'::jsonb ->> 'vendida')::boolean = true;

-- ---------------------------------------------------------------------------
-- 5. No se puede pasar de la capacidad ni pisar un perfil ocupado
-- ---------------------------------------------------------------------------
select set_config('pruebas.sesion', :'sesion', true);
select set_config('pruebas.prod', :'prod', true);
select set_config('pruebas.mperfil', :'m_perfil', true);

do $$
declare ok boolean := false;
begin
  begin
    perform public.importar_servicio_existente(
      current_setting('pruebas.sesion')::uuid, current_setting('pruebas.prod')::uuid, 5,
      'cif-correo-A', 'huella-A', 'cif-pass', 'Cuenta A', 1, 'Otro', null,
      current_setting('pruebas.mperfil')::uuid, 'Intruso', null, null, null, null, null);
  exception when others then ok := true;
  end;
  raise notice 'Rechaza asignar un perfil ya ocupado: %', case when ok then 'PASS' else 'FAIL' end;

  ok := false;
  begin
    perform public.importar_servicio_existente(
      current_setting('pruebas.sesion')::uuid, current_setting('pruebas.prod')::uuid, 5,
      'cif-correo-A', 'huella-A', 'cif-pass', 'Cuenta A', 9, 'NoExiste', null,
      current_setting('pruebas.mperfil')::uuid, 'Cliente', null, null, null, null, null);
  exception when others then ok := true;
  end;
  raise notice 'Rechaza un slot fuera de la capacidad: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Sin sesión de carga abierta, no se importa
-- ---------------------------------------------------------------------------
select public.cerrar_sesion_carga(:'sesion');
select set_config('pruebas.sesion_cerrada', :'sesion', true);

do $$
declare ok boolean := false;
begin
  begin
    perform public.importar_servicio_existente(
      current_setting('pruebas.sesion_cerrada')::uuid, current_setting('pruebas.prod')::uuid, 5,
      'cif-correo-B', 'huella-B', 'cif-pass', 'Cuenta B', 1, 'X', null,
      current_setting('pruebas.mperfil')::uuid, 'Cliente', null, null, null, null, null);
  exception when others then ok := true;
  end;
  raise notice 'Rechaza importar con la sesion cerrada: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Un revendedor no puede importar
-- ---------------------------------------------------------------------------
reset role;
insert into auth.users (id, email) values (gen_random_uuid(), 'rev-imp@test.local') returning id as rev_id \gset
select set_config('request.jwt.claims', json_build_object('sub', :'rev_id', 'role', 'authenticated')::text, true);
set role authenticated;

do $$
declare ok boolean := false;
begin
  begin
    perform public.abrir_sesion_carga(null, 'intento');
  exception when others then ok := true;
  end;
  raise notice 'El revendedor no puede abrir sesiones de carga: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

reset role;
rollback;
