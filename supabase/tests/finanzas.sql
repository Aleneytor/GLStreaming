-- ============================================================================
-- Pruebas del motor financiero (Fase 4): cobros, egresos, caja y cierre.
-- Se ejecuta en una transacción y se revierte: no deja datos.
--
-- OJO: la base de desarrollo tiene datos reales del usuario. Toda comprobación
-- compara DELTAS o apunta a filas creadas por esta misma suite; nunca a totales
-- absolutos ni a un `limit 1` cualquiera.
-- ============================================================================
begin;

insert into auth.users (id, email) values (gen_random_uuid(), 'admin-f@test.local') returning id as admin_id \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

select id as prod from public.productos_plataforma where codigo = 'netflix' \gset
select plataforma_id as plat from public.productos_plataforma where id = :'prod' \gset
select id as m_perfil from public.modalidades where plataforma_id = :'plat' and tipo_modalidad = 'perfil' \gset

-- Tasas controladas por la prueba: 100 Bs/USD (BCV) y 50 Bs/USD (paralela).
insert into public.tasas_cambio (tipo, bs_por_usd, fecha_vigencia, fuente, fuente_registro_id, observada_fuente_at, revalidada_at, estado)
values ('bcv', 100, current_date, 'prueba', 'test-bcv-1', now(), now(), 'vigente')
returning id as tasa_bcv \gset
insert into public.tasas_cambio (tipo, bs_por_usd, fuente, fuente_registro_id, observada_fuente_at, revalidada_at, estado)
values ('paralela', 50, 'prueba', 'test-par-1', now(), now(), 'vigente')
returning id as tasa_par \gset

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

-- ---------------------------------------------------------------------------
-- 1. `tasa_utilizable` elige la última confirmada y rechaza la rancia
-- ---------------------------------------------------------------------------
select 'tasa_utilizable devuelve la BCV de la prueba' as prueba,
       (select id from public.tasa_utilizable('bcv')) = :'tasa_bcv' as pass
union all select 'tasa_utilizable devuelve la paralela de la prueba',
       (select id from public.tasa_utilizable('paralela')) = :'tasa_par';

-- Una tasa SIMULADA nunca puede congelar dinero, por reciente que sea.
reset role;
insert into public.tasas_cambio (tipo, bs_por_usd, fuente, fuente_registro_id, observada_fuente_at, revalidada_at, obtenida_at, estado)
values ('paralela', 999, 'simulada', 'test-sim-1', now(), now(), now() + interval '1 minute', 'vigente');
select set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

select 'Una tasa simulada, aun siendo la mas nueva, no es utilizable' as prueba,
       (select id from public.tasa_utilizable('paralela')) = :'tasa_par' as pass;

reset role;
delete from public.tasas_cambio where fuente_registro_id = 'test-sim-1';
select set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

-- ---------------------------------------------------------------------------
-- 2. Cobro del cliente: congela tasas y calcula el esperado
-- ---------------------------------------------------------------------------
insert into public.clientes (nombre) values ('Cliente Finanzas') returning id as cli \gset
select public.crear_cuenta_con_unidades(:'prod', 5, 'Fin-1', null, 'A', 'ha', 'p', null, null, 'Yo') as cta \gset
select id as u1 from public.unidades_inventario where cuenta_id = :'cta' and numero_slot = 1 \gset

-- Período de 31 días exactos (julio) para que el prorrateo sea comprobable.
-- Se vende SIN cobrar todavía, para probar el cobro por separado.
select public.vender_unidad(
  :'cli', :'cta', :'m_perfil', :'u1', null, '2026-07-01'::date, 1, null, '2026-07-01'::date
) as susc \gset
select id as periodo from public.periodos_servicio where suscripcion_id = :'susc' \gset

-- El dato de entrada son los BOLIVARES recibidos; el USD se deriva (300/100=3).
select public.registrar_cobro_cliente(:'periodo', 300, 'REF-1') as pago \gset

select 'Se registran los bolivares que entraron (300)' as prueba,
       (select monto_ves from public.pagos_cliente where id = :'pago') = 300 as pass
union all select 'El USD se deriva del monto: 300 / 100 = 3',
       (select precio_comercial_usd from public.periodos_servicio where id = :'periodo') = 3
union all select 'El periodo congela la BCV usada',
       (select tasa_bcv_id from public.periodos_servicio where id = :'periodo') = :'tasa_bcv'
union all select 'El periodo congela la paralela contemporanea',
       (select tasa_paralela_id from public.periodos_servicio where id = :'periodo') = :'tasa_par'
union all select 'Los datos financieros quedan completos',
       (select estado_datos_financieros from public.periodos_servicio where id = :'periodo') = 'completo'
union all select 'Ya no aparece en la bandeja de por cobrar',
       not exists (select 1 from public.v_periodos_por_cobrar where periodo_id = :'periodo');

-- El id viaja por `set_config` porque los bloques DO no ven las variables de psql.
select set_config('pruebas.periodo', :'periodo', true);

do $$
declare ok boolean := false;
begin
  begin
    perform public.registrar_cobro_cliente(current_setting('pruebas.periodo')::uuid, null);
  exception when others then ok := true;
  end;
  raise notice 'Exige indicar cuantos bolivares se recibieron: %', case when ok then 'PASS' else 'FAIL' end;

  ok := false;
  begin
    perform public.registrar_cobro_cliente(current_setting('pruebas.periodo')::uuid, 250);
  exception when others then ok := true;
  end;
  raise notice 'Rechaza cobrar dos veces el mismo periodo: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- ---------------------------------------------------------------------------
-- 2b. Renovar y cobrar son UNA sola operacion (el monto puede variar)
-- ---------------------------------------------------------------------------
select public.renovar_y_cobrar(:'susc', '2026-08-01'::date, 1, 450) as periodo2 \gset

select 'Renovar y cobrar crea el periodo nuevo' as prueba,
       (select count(*) from public.periodos_servicio
        where suscripcion_id = :'susc' and tipo_operacion = 'renovacion') = 1 as pass
union all select 'Y su cobro en la misma transaccion (450 Bs)',
       (select monto_ves from public.pagos_cliente
        where periodo_servicio_id = :'periodo2' and tipo = 'cobro') = 450
union all select 'El monto puede diferir del mes anterior (300 -> 450)',
       (select precio_comercial_usd from public.periodos_servicio where id = :'periodo2') = 4.5;

-- Renovar sin monto es valido: queda pendiente de cobro.
select public.renovar_y_cobrar(:'susc', '2026-09-01'::date, 1, null) as periodo3 \gset

select 'Renovar sin monto no crea cobro' as prueba,
       not exists (select 1 from public.pagos_cliente where periodo_servicio_id = :'periodo3') as pass
union all select 'Y queda listado en por cobrar',
       exists (select 1 from public.v_periodos_por_cobrar where periodo_id = :'periodo3');

-- ---------------------------------------------------------------------------
-- 3. Ciclo de proveedor y pago: costo cero no crea salida de caja
-- ---------------------------------------------------------------------------
select public.registrar_renovacion_y_pago(:'cta', 2.00, '2026-07-01'::date, null, 'PROV-1', true, '2026-07-01'::date) as ciclo \gset

select 'El pago iguala el costo del ciclo (2 USDT)' as prueba,
       (select monto_usdt from public.pagos_proveedor where ciclo_proveedor_id = :'ciclo') = 2.00 as pass
union all select 'El pago se valoriza a la paralela: 2 x 50 = 100 Bs',
       (select monto_ves_snapshot from public.pagos_proveedor where ciclo_proveedor_id = :'ciclo') = 100
union all select 'El ciclo congela su costo en Bs',
       (select costo_ves_snapshot from public.ciclos_proveedor where id = :'ciclo') = 100
union all select 'El ancla es el dia del inicio (1)',
       (select dia_ancla_proveedor from public.ciclos_proveedor where id = :'ciclo') = 1;

select set_config('pruebas.ciclo', :'ciclo', true);
do $$
declare ok boolean := false;
begin
  begin
    perform public.registrar_pago_proveedor(current_setting('pruebas.ciclo')::uuid);
  exception when others then ok := true;
  end;
  raise notice 'Reintentar el pago no duplica: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- Cuenta con costo cero: ciclo válido, sin pago.
select public.crear_cuenta_con_unidades(:'prod', 5, 'Fin-0', null, 'B', 'hb', 'p', null, null, 'Yo') as cta0 \gset
select public.registrar_renovacion_y_pago(:'cta0', 0, '2026-07-01'::date, null, null, true, null) as ciclo0 \gset

select 'Costo cero crea el ciclo' as prueba,
       (select count(*) from public.ciclos_proveedor where id = :'ciclo0') = 1 as pass
union all select 'Costo cero NO crea salida de caja',
       (select count(*) from public.pagos_proveedor where ciclo_proveedor_id = :'ciclo0') = 0;

-- ---------------------------------------------------------------------------
-- 4. Gasto operativo
-- ---------------------------------------------------------------------------
select public.registrar_gasto_operativo(
  'recarga_banco', 20, '2026-07-05'::date, 'Recarga', 'Trader X', null, null, null, 'nairas') as gasto \gset

select 'El gasto se valoriza a paralela: 20 x 50 = 1000 Bs' as prueba,
       (select monto_ves_snapshot from public.gastos_operativos where id = :'gasto') = 1000 as pass;

-- ---------------------------------------------------------------------------
-- 5. Caja diaria: signos y flujo
-- ---------------------------------------------------------------------------
select 'El cobro entra en caja con signo positivo' as prueba,
       (select monto_ves from public.v_movimientos_caja
        where tipo = 'cobro_cliente' and origen_id = :'periodo') = 300 as pass
union all select 'El pago al proveedor sale con signo negativo',
       (select monto_ves from public.v_movimientos_caja
        where tipo = 'pago_proveedor' and origen_id = :'ciclo') = -100
union all select 'El gasto sale con signo negativo',
       (select monto_ves from public.v_movimientos_caja
        where tipo = 'gasto_operativo' and movimiento_id = :'gasto') = -1000;

-- ---------------------------------------------------------------------------
-- 6. Devengo y prorrateo — se mide sobre las filas de ESTA prueba
-- ---------------------------------------------------------------------------
-- Julio completo: el período (01/07→01/08, 31 días) cae entero dentro del mes.
select
  'Julio devenga el cobro completo (300 Bs)' as prueba,
  (select round(sum(pc.monto_ves
      * (least(ps.fecha_renovacion, '2026-08-01'::date) - greatest(ps.inicio, '2026-07-01'::date))
      / (ps.fecha_renovacion - ps.inicio)), 2)
   from public.periodos_servicio ps
   join public.pagos_cliente pc on pc.periodo_servicio_id = ps.id and pc.tipo = 'cobro'
   where ps.id = :'periodo') = 300 as pass;

-- Medio mes: del 01/07 al 16/07 son 15 de los 31 días del período.
select
  'Medio mes devenga 15/31 del cobro' as prueba,
  (select round(sum(pc.monto_ves
      * (least(ps.fecha_renovacion, '2026-07-16'::date) - greatest(ps.inicio, '2026-07-01'::date))
      / (ps.fecha_renovacion - ps.inicio)), 4)
   from public.periodos_servicio ps
   join public.pagos_cliente pc on pc.periodo_servicio_id = ps.id and pc.tipo = 'cobro'
   where ps.id = :'periodo') = round(300 * 15.0 / 31, 4) as pass;

-- Reconciliación: la suma de los días de julio = el mes completo.
select
  'Los dias de julio suman exactamente el mes' as prueba,
  round((select sum(r.resultado_operativo_ves)
         from generate_series('2026-07-01'::date, '2026-07-31'::date, '1 day') d
         cross join lateral public.resumen_financiero(d::date, d::date + 1) r), 6)
  = round((select resultado_operativo_ves
           from public.resumen_financiero('2026-07-01', '2026-08-01')), 6) as pass;

-- ---------------------------------------------------------------------------
-- 7. Reverso del cobro
-- ---------------------------------------------------------------------------
select public.revertir_cobro_cliente(:'pago', 'Devolucion de prueba') as reverso \gset

select 'El reverso conserva la paralela del cobro original' as prueba,
       (select tasa_paralela_id from public.pagos_cliente where id = :'reverso') = :'tasa_par' as pass
union all select 'El cobro original NO se borra ni cambia de estado',
       (select estado from public.pagos_cliente where id = :'pago') = 'confirmado'
union all select 'El periodo vuelve a la bandeja de por cobrar',
       exists (select 1 from public.v_periodos_por_cobrar where periodo_id = :'periodo');

select set_config('pruebas.pago', :'pago', true);
do $$
declare ok boolean := false;
begin
  begin
    perform public.revertir_cobro_cliente(current_setting('pruebas.pago')::uuid, 'otra vez');
  exception when others then ok := true;
  end;
  raise notice 'No se puede revertir dos veces: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- ---------------------------------------------------------------------------
-- 8. Cierre mensual: versionado y protección
-- ---------------------------------------------------------------------------
select public.cerrar_mes('2026-07-01') as cierre \gset

select 'El mes queda cerrado' as prueba,
       (select estado from public.cierres_mensuales where id = :'cierre') = 'cerrado' as pass
union all select 'El cierre guarda su detalle explicativo',
       (select count(*) from public.detalles_cierre_mensual where cierre_id = :'cierre') > 0;

do $$
declare ok boolean := false;
begin
  begin
    perform public.calcular_cierre_mensual('2026-07-01');
  exception when others then ok := true;
  end;
  raise notice 'Un mes cerrado no se recalcula en silencio: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

select public.reabrir_mes('2026-07-01', 'Llego un pago tardio') as cierre2 \gset

select 'La reapertura crea la version 2' as prueba,
       (select version from public.cierres_mensuales where id = :'cierre2') = 2 as pass
union all select 'El cierre anterior queda como reemplazado (no se borra)',
       (select estado from public.cierres_mensuales where id = :'cierre') = 'reemplazado';

do $$
declare ok boolean := false;
begin
  begin
    perform public.reabrir_mes('2026-07-01', '');
  exception when others then ok := true;
  end;
  raise notice 'La reapertura exige motivo: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- ---------------------------------------------------------------------------
-- 9. Aislamiento: un revendedor no ve nada de finanzas
-- ---------------------------------------------------------------------------
reset role;
insert into auth.users (id, email) values (gen_random_uuid(), 'rev-f@test.local') returning id as rev_id \gset
select set_config('request.jwt.claims', json_build_object('sub', :'rev_id', 'role', 'authenticated')::text, true);
set role authenticated;

select 'El revendedor no ve periodos por cobrar' as prueba,
       (select count(*) from public.v_periodos_por_cobrar) = 0 as pass
union all select 'El revendedor no ve movimientos de caja',
       (select count(*) from public.v_movimientos_caja) = 0
union all select 'El revendedor no ve ciclos de proveedor',
       (select count(*) from public.v_ciclos_proveedor_estado) = 0;

do $$
declare ok boolean := false;
begin
  begin
    perform public.registrar_gasto_operativo('otro_negocio', 5);
  exception when others then ok := true;
  end;
  raise notice 'El revendedor no puede registrar gastos: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

reset role;
rollback;
