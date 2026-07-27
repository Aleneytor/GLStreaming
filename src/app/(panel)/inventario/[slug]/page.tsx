import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uno } from "@/lib/supabase/util";
import { descifrarSecreto } from "@/lib/crypto";
import { badgeVencimiento, diasParaRenovar } from "@/domain/fechas";
import {
  coincideFiltroInventario,
  normalizarFiltroInventario,
} from "@/domain/filtros-inventario";
import { esCuentaCompletaLegada } from "@/domain/cuentas-completas";
import { FiltrosInventario } from "@/features/inventario/filtros";
import {
  TablaInventario,
  type BloqueCuenta,
  type CupoFila,
} from "@/features/inventario/tabla-inventario";

export const dynamic = "force-dynamic";

/** Fecha de hoy en la zona horaria del negocio (America/Caracas). */
function hoyCaracas(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Descifra sin reventar la página si una fila quedó con clave vieja. */
function desc(cifrado: string | null | undefined): string {
  if (!cifrado) return "";
  try {
    return descifrarSecreto(cifrado);
  } catch {
    return "⚠ clave cambió";
  }
}

export default async function PlataformaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; estado?: string; producto?: string }>;
}) {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const { slug } = await params;
  const { q, estado, producto: productoSeleccionado } = await searchParams;
  const supabase = await createClient();

  const { data: plataforma } = await supabase
    .from("plataformas")
    .select("id, nombre, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!plataforma) notFound();

  const hoy = hoyCaracas();

  let consulta = supabase
    .from("cuentas")
    .select(
      `id, alias, capacidad, capacidad_vendible_habilitada, estado, created_at, notas,
       productos_plataforma!inner ( id, nombre, codigo, tipo_inventario, plataforma_id ),
       proveedores ( nombre_o_alias ),
       ciclos_proveedor ( costo_usdt, estado, proxima_renovacion ),
       credenciales_cuenta ( login_cifrado, contrasena_cifrada, eliminada_at ),
       unidades_inventario ( id, numero_slot, nombre_visible, secretos_unidad ( pin_cifrado ) ),
       asignaciones_inventario (
         id, alcance, unidad_id, fin,
         suscripciones ( id, estado,
           clientes ( id, nombre, whatsapp_original ),
           vendedores ( id, nombre, tipo, cobra_en_paralela ),
           periodos_servicio ( inicio, fecha_renovacion, precio_comercial_usd ),
           vinculos_identidad_spotify ( fin,
             identidades_spotify ( login_cifrado, contrasena_cifrada ) ) ) )`,
    )
    .eq("productos_plataforma.plataforma_id", plataforma.id);

  const { data: cuentas, error: errorCuentas } = await consulta.order("orden", { ascending: false });
  if (errorCuentas) throw new Error(`No se pudo cargar el inventario: ${errorCuentas.message}`);

  // El control de pago referencia `coberturas_spotify.cuenta_id` directamente.
  // Consultarlo aparte evita depender de un embed inverso ambiguo de PostgREST
  // y garantiza que el Gmail pagador llegue tanto a escritorio como a móvil.
  const pagadoresPorCuenta = new Map<
    string,
    { gmail_cifrado: string; origen: string | null }
  >();
  if (slug === "spotify" && (cuentas?.length ?? 0) > 0) {
    const { data: controles, error: errorControles } = await supabase
      .from("controles_pago_spotify")
      .select("cobertura_cuenta_id, gmail_cifrado, origen")
      .in("cobertura_cuenta_id", (cuentas ?? []).map((c) => c.id));

    if (errorControles) {
      throw new Error(`No se pudo cargar el Gmail pagador: ${errorControles.message}`);
    }
    for (const control of controles ?? []) {
      pagadoresPorCuenta.set(control.cobertura_cuenta_id, control);
    }
  }

  type CuentaFila = NonNullable<typeof cuentas>[number];

  const datosVenta = (asig: CuentaFila["asignaciones_inventario"][number] | undefined) => {
    const susc = uno(asig?.suscripciones);
    if (!susc) return null;

    const ult = [...(susc.periodos_servicio ?? [])].sort((a, b) =>
      a.fecha_renovacion < b.fecha_renovacion ? 1 : -1,
    )[0];

    const dias = ult ? diasParaRenovar(ult.fecha_renovacion, hoy) : null;
    const vinculos = susc.vinculos_identidad_spotify as Array<{ fin: string | null; identidades_spotify: unknown }> | undefined;
    const ident = uno((vinculos ?? []).find((v) => v.fin === null)?.identidades_spotify);
    const cli = uno(susc.clientes);
    const vend = uno(susc.vendedores);

    return {
      suscripcionId: susc.id as string,
      cliente: cli?.nombre ?? null,
      celular: cli?.whatsapp_original ?? null,
      vendio: vend?.nombre ?? null,
      vendedorId: vend?.id ?? null,
      vendedorTipo:
        vend?.tipo === "revendedor" ? ("revendedor" as const) : ("intermediario" as const),
      vendedorCobraEnParalela: vend?.cobra_en_paralela ?? false,
      clienteId: cli ? (cli as unknown as { id?: string }).id ?? null : null,
      estado: susc.estado as string,
      inicio: ult?.inicio ?? null,
      vence: ult?.fecha_renovacion ?? null,
      dias,
      badge: dias === null ? null : badgeVencimiento(dias),
      ingreso: ult?.precio_comercial_usd == null ? null : Number(ult.precio_comercial_usd),
      clienteLogin: ident ? desc((ident as { login_cifrado?: string }).login_cifrado) : null,
      clienteClave: ident ? desc((ident as { contrasena_cifrada?: string }).contrasena_cifrada) : null,
    };
  };

  const grupos = new Map<
    string,
    { codigo: string; nombre: string; cuentas: BloqueCuenta[] }
  >();

  for (const c of cuentas ?? []) {
    const prod = uno(c.productos_plataforma);
    if (!prod) continue;
    const cred = uno(c.credenciales_cuenta);

    const abiertas = (c.asignaciones_inventario ?? []).filter((a) => a.fin === null);
    const unidades = [...(c.unidades_inventario ?? [])].sort(
      (a, b) => a.numero_slot - b.numero_slot,
    );

    let asignacionCompleta = abiertas.find((a) => a.alcance === "cuenta");
    // Compatibilidad con cuentas completas importadas antes de que el modelo
    // usara `alcance = cuenta`: su venta vive en la primera unidad. Aplica a
    // cualquier plataforma con unidades, no solo a Netflix.
    if (!asignacionCompleta) {
      const primeraUnidad = unidades.find((u) => u.numero_slot === 1);
      if (
        primeraUnidad &&
        esCuentaCompletaLegada({
          tipoInventario: prod.tipo_inventario,
          numeroSlot: primeraUnidad.numero_slot,
          nombreVisible: primeraUnidad.nombre_visible,
        })
      ) {
        asignacionCompleta = abiertas.find((a) => a.unidad_id === primeraUnidad.id);
      }
    }

    const principal = abiertas.find((a) => a.alcance === "principal");
    const porUnidad = new Map(
      abiertas.filter((a) => a.unidad_id).map((a) => [a.unidad_id as string, a]),
    );

    const ctrl = pagadoresPorCuenta.get(c.id);
    const pagador = ctrl?.gmail_cifrado ? desc(ctrl.gmail_cifrado) : null;

    const filas: CupoFila[] = [];

    if (unidades.length > 0) {
      for (const u of unidades) {
        const vUnidad = datosVenta(porUnidad.get(u.id));
        const v = asignacionCompleta
          ? datosVenta(asignacionCompleta)
          : vUnidad;
        const esPrimerSlot = u.numero_slot === 1;

        filas.push({
          slotNumber: u.numero_slot,
          clave: `${c.id}-u${u.id}`,
          cupo:
            asignacionCompleta && esPrimerSlot
              ? "Cuenta Completa"
              : u.nombre_visible ?? `Perfil ${u.numero_slot}`,
          unidadId: u.id as string,
          nombreUnidad: u.nombre_visible ?? null,
          suscripcionId: v?.suscripcionId ?? null,
          clienteId: v?.clienteId ?? null,
          cliente: v?.cliente ?? null,
          celular: v?.celular ?? null,
          vendio: v?.vendio ?? null,
          vendedorId: v?.vendedorId ?? null,
          vendedorTipo: v?.vendedorTipo ?? null,
          vendedorCobraEnParalela: v?.vendedorCobraEnParalela ?? false,
          clienteLogin: v?.clienteLogin ?? null,
          clienteClave: v?.clienteClave ?? null,
          pin: desc(uno(u.secretos_unidad)?.pin_cifrado) || null,
          ingreso: asignacionCompleta && !esPrimerSlot ? null : (v?.ingreso ?? null),
          inicio: v?.inicio ?? null,
          vence: v?.vence ?? null,
          dias: v?.dias ?? null,
          badge: v?.badge ?? null,
          suscEstado: v?.estado ?? null,
        });
      }

      if (principal && !asignacionCompleta) {
        const v = datosVenta(principal);
        filas.push({
          slotNumber: unidades.length + 1,
          clave: `${c.id}-madre`,
          cupo: "Uso de la madre",
          unidadId: null,
          nombreUnidad: null,
          suscripcionId: v?.suscripcionId ?? null,
          clienteId: v?.clienteId ?? null,
          cliente: v?.cliente ?? null,
          celular: v?.celular ?? null,
          vendio: v?.vendio ?? null,
          vendedorId: v?.vendedorId ?? null,
          vendedorTipo: v?.vendedorTipo ?? null,
          vendedorCobraEnParalela: v?.vendedorCobraEnParalela ?? false,
          clienteLogin: v?.clienteLogin ?? null,
          clienteClave: v?.clienteClave ?? null,
          pin: null,
          ingreso: v?.ingreso ?? null,
          inicio: v?.inicio ?? null,
          vence: v?.vence ?? null,
          dias: v?.dias ?? null,
          badge: v?.badge ?? null,
          suscEstado: v?.estado ?? null,
        });
      }
    } else if (asignacionCompleta) {
      const v = datosVenta(asignacionCompleta);
      // Un recurso indivisible (Spotify individual, Canva…) es UNA sola línea,
      // como un perfil extra de Netflix. Una cuenta completa DE PERFILES
      // (Netflix) se muestra como bloque de 5 para conservar la altura uniforme.
      const esIndivisible = prod.tipo_inventario === "recurso_indivisible";
      const cap = esIndivisible ? 1 : Math.max(c.capacidad ?? 1, 5);
      for (let slot = 1; slot <= cap; slot++) {
        const esPrimerSlot = slot === 1;
        filas.push({
          slotNumber: slot,
          clave: `${c.id}-completa-${slot}`,
          cupo: esIndivisible
            ? "Individual"
            : esPrimerSlot
              ? "Cuenta Completa"
              : `Perfil ${slot}`,
          unidadId: null,
          nombreUnidad: null,
          suscripcionId: v?.suscripcionId ?? null,
          clienteId: v?.clienteId ?? null,
          cliente: v?.cliente ?? null,
          celular: v?.celular ?? null,
          vendio: v?.vendio ?? null,
          vendedorId: v?.vendedorId ?? null,
          vendedorTipo: v?.vendedorTipo ?? null,
          vendedorCobraEnParalela: v?.vendedorCobraEnParalela ?? false,
          clienteLogin: v?.clienteLogin ?? null,
          clienteClave: v?.clienteClave ?? null,
          pin: null,
          ingreso: esPrimerSlot ? (v?.ingreso ?? null) : null,
          inicio: v?.inicio ?? null,
          vence: v?.vence ?? null,
          dias: v?.dias ?? null,
          badge: v?.badge ?? null,
          suscEstado: v?.estado ?? null,
        });
      }
    } else {
      filas.push({
        slotNumber: 1,
        clave: `${c.id}-solo`,
        cupo: "—",
        unidadId: null,
        nombreUnidad: null,
        suscripcionId: null,
        clienteId: null,
        cliente: null,
        celular: null,
        vendio: null,
        vendedorId: null,
        vendedorTipo: null,
        vendedorCobraEnParalela: false,
        clienteLogin: null,
        clienteClave: null,
        pin: null,
        ingreso: null,
        inicio: null,
        vence: null,
        dias: null,
        badge: null,
        suscEstado: null,
      });
    }

    const cicloVigente = (c.ciclos_proveedor ?? []).find((x) => x.estado === "vigente");
    const renovarProv = cicloVigente?.proxima_renovacion ?? null;
    const diasProv = renovarProv ? diasParaRenovar(renovarProv, hoy) : null;

    const grupo = groupsGetOrCreate(
      grupos,
      prod.id,
      prod.codigo as string,
      prod.nombre as string,
    );
    grupo.cuentas.push({
      cuentaId: c.id as string,
      correo: desc(cred?.login_cifrado),
      contrasena: desc(cred?.contrasena_cifrada),
      pagador,
      pagadorOrigen: ctrl?.origen ?? null,
      alias: c.alias ?? null,
      notas: c.notas ?? null,
      cuentaEstado: c.estado as string,
      proveedor: uno(c.proveedores)?.nombre_o_alias ?? null,
      costo: cicloVigente ? Number(cicloVigente.costo_usdt) : null,
      renovarProveedor: renovarProv,
      diasProveedor: diasProv,
      // Solo las cuentas completas DE PERFILES ocupan el bloque alto de 5 filas.
      // Un recurso indivisible (Spotify individual, Canva…) va en una sola línea.
      esCuentaCompleta:
        Boolean(asignacionCompleta) && prod.tipo_inventario !== "recurso_indivisible",
      filas,
    });
    grupos.set(prod.id, grupo);
  }

  const etiquetaProducto = (codigo: string, nombre: string) => {
    if (codigo === "netflix") return "Cuenta estándar";
    if (codigo === "netflix-extra") return "Perfil extra";
    if (codigo === "spotify-individual") return "Individual";
    if (codigo === "spotify-familiar") return "Familiar";
    return nombre.replace(/^.*?\s[—-]\s/, "");
  };

  const ordenProducto: Record<string, number> = {
    netflix: 1,
    "netflix-extra": 2,
    "spotify-individual": 1,
    "spotify-familiar": 2,
  };
  const opcionesProducto = [...grupos.values()]
    .sort((a, b) => (ordenProducto[a.codigo] ?? 99) - (ordenProducto[b.codigo] ?? 99))
    .map((g) => ({
      valor: g.codigo,
      etiqueta: etiquetaProducto(g.codigo, g.nombre),
      cuentas: g.cuentas.length,
    }));

  const busqueda = (q ?? "").trim().toLowerCase();
  const filtroOperativo = normalizarFiltroInventario(estado);
  let totalFilas = 0;
  const gruposFiltrados = [...grupos.values()]
    .filter((g) => !productoSeleccionado || g.codigo === productoSeleccionado)
    .map((g) => {
      const cuentasFiltradas = g.cuentas
        .map((cta) => {
          const coincideCuenta =
            !busqueda ||
            cta.correo.toLowerCase().includes(busqueda) ||
            Boolean(cta.pagador?.toLowerCase().includes(busqueda));
          let filas = coincideCuenta
            ? cta.filas
            : cta.filas.filter(
                (f) =>
                  f.cliente?.toLowerCase().includes(busqueda) ||
                  f.celular?.includes(busqueda) ||
                  f.vendio?.toLowerCase().includes(busqueda) ||
                  f.clienteLogin?.toLowerCase().includes(busqueda),
              );

          filas = filas.filter((fila) =>
            coincideFiltroInventario(fila, filtroOperativo, cta.cuentaEstado),
          );

          return { ...cta, filas };
        })
        .filter((cta) => cta.filas.length > 0);
      totalFilas += cuentasFiltradas.reduce((n, cta) => n + cta.filas.length, 0);
      return { ...g, cuentas: cuentasFiltradas };
    })
    .filter((g) => g.cuentas.length > 0);
  const totalCuentasVisibles = gruposFiltrados.reduce(
    (total, grupo) => total + grupo.cuentas.length,
    0,
  );

  const { data: listaVendedores } = await supabase
    .from("vendedores")
    .select("id, nombre, alias, tipo, cobra_en_paralela")
    .eq("activo", true)
    .order("nombre");

  const vendedoresUI = (listaVendedores ?? []).map((v) => ({
    id: v.id,
    nombre: v.nombre,
    alias: v.alias,
    tipo: (v.tipo === "revendedor" ? "revendedor" : "intermediario") as
      | "revendedor"
      | "intermediario",
    cobraEnParalela: v.cobra_en_paralela,
  }));

  return (
    <div className="w-full space-y-4">
      <div>
        <Link
          href="/inventario"
          className="text-xs text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          ← Volver a Inventario
        </Link>
        <div className="mt-1 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{plataforma.nombre}</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {totalCuentasVisibles} {totalCuentasVisibles === 1 ? "cuenta" : "cuentas"} ·{" "}
              {totalFilas} {totalFilas === 1 ? "cupo" : "cupos"}
            </p>
          </div>
          <Link
            href={`/inventario/nueva?plataforma=${plataforma.slug}`}
            className="shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition active:scale-[0.98] dark:bg-white dark:text-neutral-900"
          >
            + Nueva Cuenta
          </Link>
        </div>
      </div>

      <FiltrosInventario
        productos={opcionesProducto}
        filtros={[
          { valor: "disponibles", etiqueta: "Disponibles para vender" },
          { valor: "proximas", etiqueta: "Próximos 5 días" },
          { valor: "hoy", etiqueta: "Vencen hoy" },
          { valor: "vencidas", etiqueta: "Vencidos" },
          { valor: "suspendida", etiqueta: "Cuentas suspendidas" },
        ]}
      />

      {gruposFiltrados.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          {q || estado || productoSeleccionado
            ? "Nada coincide con el filtro."
            : `Todavía no hay cuentas de ${plataforma.nombre}.`}
        </p>
      ) : (
        gruposFiltrados.map((g) => (
          <section key={g.codigo} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {g.nombre} ({g.cuentas.length} {g.cuentas.length === 1 ? "cuenta" : "cuentas"})
            </h2>
            <TablaInventario cuentas={g.cuentas} slug={slug} vendedores={vendedoresUI} />
          </section>
        ))
      )}
    </div>
  );
}

function groupsGetOrCreate(
  map: Map<string, { codigo: string; nombre: string; cuentas: BloqueCuenta[] }>,
  id: string,
  codigo: string,
  nombre: string,
) {
  return map.get(id) ?? { codigo, nombre, cuentas: [] };
}
