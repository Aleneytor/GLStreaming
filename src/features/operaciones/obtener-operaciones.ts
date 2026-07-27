import { createClient } from "@/lib/supabase/server";
import { uno } from "@/lib/supabase/util";
import { badgeVencimiento, diasParaRenovar, type BadgeVencimiento } from "@/domain/fechas";
import { obtenerTasasVigentes } from "@/features/tasas/actions";
import { confirmadaAt, evaluarFrescura } from "@/domain/tasas";

export type SuscripcionOperativa = {
  id: string;
  estado: string;
  recontactar_el: string | null;
  nota: string | null;
  clienteId: string | null;
  clienteNombre: string;
  clienteWhatsapp: string | null;
  vendedorNombre: string | null;
  plataformaNombre: string;
  productoNombre: string;
  perfilNombre: string | null;
  renovacion: string | null;
  dias: number | null;
  badge: BadgeVencimiento | null;
};

export type LimpiezaPendiente = {
  id: string;
  tipo: string;
  iniciadaAt: string;
  plataformaNombre: string;
  cuentaAlias: string | null;
  unidadNombre: string;
};

export type DatosOperaciones = {
  bcv: number | null;
  vencidos: SuscripcionOperativa[];
  hoy: SuscripcionOperativa[];
  proximos: SuscripcionOperativa[];
  resto: SuscripcionOperativa[];
  todas: SuscripcionOperativa[];
  limpiezas: LimpiezaPendiente[];
};

function hoyCaracas(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function obtenerDatosOperaciones(): Promise<DatosOperaciones> {
  const hoy = hoyCaracas();
  const supabase = await createClient();

  const [{ bcv: bcvTasa }, { data: suscripciones }, { data: limpiezasData }] = await Promise.all([
    obtenerTasasVigentes(),
    supabase
      .from("suscripciones")
      .select(
        `id, estado, recontactar_el, nota_renovacion,
         clientes ( id, nombre, whatsapp_original ),
         vendedores ( nombre ),
         productos_plataforma ( nombre, plataformas ( nombre ) ),
         periodos_servicio ( inicio, fecha_renovacion ),
         asignaciones_inventario ( unidad_id, fin, unidades_inventario ( nombre_visible ) )`,
      )
      .in("estado", ["activa", "pausada"]),
    supabase
      .from("operaciones_remotas")
      .select(
        `id, tipo, iniciada_at,
         cuentas ( alias, productos_plataforma ( nombre, plataformas ( nombre ) ) ),
         unidades_inventario ( nombre_visible, numero_slot )`,
      )
      .eq("estado", "pendiente"),
  ]);

  const bcvUsable =
    bcvTasa && evaluarFrescura(confirmadaAt(bcvTasa)).nivel !== "inservible"
      ? bcvTasa.bs_por_usd
      : null;

  const todas: SuscripcionOperativa[] = (suscripciones ?? [])
    .map((s) => {
      const cli = uno(s.clientes);
      const prod = uno(s.productos_plataforma);
      const plat = uno(prod?.plataformas);
      const periodos = s.periodos_servicio ?? [];
      const ultimo = [...periodos].sort((a, b) =>
        a.fecha_renovacion < b.fecha_renovacion ? 1 : -1,
      )[0];
      const dias = ultimo ? diasParaRenovar(ultimo.fecha_renovacion, hoy) : null;
      const asignacion = (s.asignaciones_inventario ?? []).find((a) => a.fin === null);
      const unidad = uno(asignacion?.unidades_inventario);

      return {
        id: s.id,
        estado: s.estado,
        recontactar_el: s.recontactar_el,
        nota: s.nota_renovacion,
        clienteId: cli?.id ?? null,
        clienteNombre: cli?.nombre ?? "Sin nombre",
        clienteWhatsapp: cli?.whatsapp_original ?? null,
        vendedorNombre: uno(s.vendedores)?.nombre ?? null,
        plataformaNombre: plat?.nombre ?? "Plataforma",
        productoNombre: prod?.nombre ?? "Producto",
        perfilNombre: unidad?.nombre_visible ?? null,
        renovacion: ultimo?.fecha_renovacion ?? null,
        dias,
        badge: dias !== null ? badgeVencimiento(dias) : null,
      };
    })
    .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0));

  const vencidos = todas.filter((f) => (f.dias ?? 0) < 0);
  const hoyMismo = todas.filter((f) => f.dias === 0);
  const proximos = todas.filter((f) => (f.dias ?? 0) > 0 && (f.dias ?? 0) <= 5);
  const resto = todas.filter((f) => (f.dias ?? 0) > 5);

  const limpiezas: LimpiezaPendiente[] = (limpiezasData ?? []).map((o) => {
    const cta = uno(o.cuentas);
    const prod = uno(cta?.productos_plataforma);
    const plat = uno(prod?.plataformas);
    const unidad = uno(o.unidades_inventario);

    return {
      id: o.id,
      tipo: o.tipo,
      iniciadaAt: o.iniciada_at,
      plataformaNombre: plat?.nombre ?? "Plataforma",
      cuentaAlias: cta?.alias ?? prod?.nombre ?? null,
      unidadNombre: unidad?.nombre_visible ?? `Perfil ${unidad?.numero_slot ?? ""}`,
    };
  });

  return {
    bcv: bcvUsable,
    vencidos,
    hoy: hoyMismo,
    proximos,
    resto,
    todas,
    limpiezas,
  };
}
