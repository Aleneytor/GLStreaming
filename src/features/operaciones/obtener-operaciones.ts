import { createClient } from "@/lib/supabase/server";
import { uno } from "@/lib/supabase/util";
import { badgeVencimiento, diasParaRenovar, hoyCaracas, type BadgeVencimiento } from "@/domain/fechas";
import { obtenerTasasVigentes } from "@/features/tasas/actions";
import { confirmadaAt, evaluarFrescura } from "@/domain/tasas";
import { descifrarSecreto } from "@/lib/crypto";
import { tipoTarifaSpotifyDesdeCorreo, type TipoCorreoTarifaSpotify } from "@/domain/tarifas-spotify";
import { clasificarServiciosOperativos } from "@/domain/operaciones";

export type SuscripcionOperativa = {
  id: string;
  estado: string;
  recontactar_el: string | null;
  nota: string | null;
  clienteId: string | null;
  clienteNombre: string;
  clienteWhatsapp: string | null;
  vendedorNombre: string | null;
  vendedorId: string | null;
  vendedorTipo: "revendedor" | "intermediario" | null;
  vendedorCobraEnParalela: boolean;
  plataformaNombre: string;
  productoNombre: string;
  perfilNombre: string | null;
  renovacion: string | null;
  dias: number | null;
  badge: BadgeVencimiento | null;
  tipoCorreoTarifaSpotify: TipoCorreoTarifaSpotify | null;
};

export type VendedorOperacion = {
  id: string;
  nombre: string;
  alias: string | null;
  tipo: "revendedor" | "intermediario";
  cobraEnParalela: boolean;
};

export type LimpiezaPendiente = {
  id: string;
  tipo: string;
  iniciadaAt: string;
  cuentaId: string;
  plataformaNombre: string;
  plataformaSlug: string;
  cuentaAlias: string | null;
  unidadNombre: string;
};

export type DatosOperaciones = {
  bcv: number | null;
  paralela: number | null;
  vencidos: SuscripcionOperativa[];
  hoy: SuscripcionOperativa[];
  proximos: SuscripcionOperativa[];
  resto: SuscripcionOperativa[];
  pausados: SuscripcionOperativa[];
  todas: SuscripcionOperativa[];
  limpiezas: LimpiezaPendiente[];
  vendedores: VendedorOperacion[];
};

export async function obtenerDatosOperaciones(): Promise<DatosOperaciones> {
  const hoy = hoyCaracas();
  const supabase = await createClient();

  const [tasas, { data: suscripciones }, { data: limpiezasData }, { data: vendedoresData }] = await Promise.all([
    obtenerTasasVigentes(),
    supabase
      .from("suscripciones")
      .select(
        `id, estado, recontactar_el, nota_renovacion,
         clientes ( id, nombre, whatsapp_original ),
         vendedores ( id, nombre, tipo, cobra_en_paralela ),
         productos_plataforma ( nombre, plataformas ( nombre ) ),
         periodos_servicio ( inicio, fecha_renovacion ),
         asignaciones_inventario ( unidad_id, fin, unidades_inventario ( nombre_visible ) ),
         vinculos_identidad_spotify ( fin, identidades_spotify ( tipo_correo, login_cifrado ) )`,
      )
      .in("estado", ["activa", "pausada"]),
    supabase
      .from("operaciones_remotas")
      .select(
        `id, tipo, iniciada_at,
         cuentas ( id, alias, productos_plataforma ( nombre, plataformas ( nombre, slug ) ) ),
         unidades_inventario ( nombre_visible, numero_slot )`,
      )
      .eq("estado", "pendiente"),
    supabase
      .from("vendedores")
      .select("id, nombre, alias, tipo, cobra_en_paralela")
      .eq("activo", true)
      .order("nombre"),
  ]);

  const bcvUsable =
    tasas.bcv && evaluarFrescura(confirmadaAt(tasas.bcv)).nivel !== "inservible"
      ? tasas.bcv.bs_por_usd
      : null;
  const paralelaUsable =
    tasas.paralela && evaluarFrescura(confirmadaAt(tasas.paralela)).nivel !== "inservible"
      ? tasas.paralela.bs_por_usd
      : null;

  const todas: SuscripcionOperativa[] = (suscripciones ?? [])
    .map((s) => {
      const cli = uno(s.clientes);
      const vendedor = uno(s.vendedores);
      const prod = uno(s.productos_plataforma);
      const plat = uno(prod?.plataformas);
      const periodos = s.periodos_servicio ?? [];
      const ultimo = [...periodos].sort((a, b) =>
        a.fecha_renovacion < b.fecha_renovacion ? 1 : -1,
      )[0];
      const dias = ultimo ? diasParaRenovar(ultimo.fecha_renovacion, hoy) : null;
      const asignacion = (s.asignaciones_inventario ?? []).find((a) => a.fin === null);
      const unidad = uno(asignacion?.unidades_inventario);
      const vinculoSpotify = (s.vinculos_identidad_spotify ?? []).find((v) => v.fin === null);
      const identidadSpotify = uno(vinculoSpotify?.identidades_spotify);
      let correoSpotify: string | null = null;
      if (identidadSpotify?.login_cifrado) {
        try {
          correoSpotify = descifrarSecreto(identidadSpotify.login_cifrado);
        } catch {
          correoSpotify = null;
        }
      }

      return {
        id: s.id,
        estado: s.estado,
        recontactar_el: s.recontactar_el,
        nota: s.nota_renovacion,
        clienteId: cli?.id ?? null,
        clienteNombre: cli?.nombre ?? "Sin nombre",
        clienteWhatsapp: cli?.whatsapp_original ?? null,
        vendedorNombre: vendedor?.nombre ?? null,
        vendedorId: vendedor?.id ?? null,
        vendedorTipo: vendedor?.tipo ?? null,
        vendedorCobraEnParalela:
          Boolean(vendedor?.cobra_en_paralela),
        plataformaNombre: plat?.nombre ?? "Plataforma",
        productoNombre: prod?.nombre ?? "Producto",
        perfilNombre: unidad?.nombre_visible ?? null,
        renovacion: ultimo?.fecha_renovacion ?? null,
        dias,
        badge: dias !== null ? badgeVencimiento(dias) : null,
        tipoCorreoTarifaSpotify:
          plat?.nombre?.toLowerCase() === "spotify"
            ? tipoTarifaSpotifyDesdeCorreo(correoSpotify, identidadSpotify?.tipo_correo)
            : null,
      };
    })
    .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0));

  const { vencidos, hoy: hoyMismo, proximos, resto, pausados } =
    clasificarServiciosOperativos(todas);

  const limpiezas: LimpiezaPendiente[] = (limpiezasData ?? []).map((o) => {
    const cta = uno(o.cuentas);
    const prod = uno(cta?.productos_plataforma);
    const plat = uno(prod?.plataformas);
    const unidad = uno(o.unidades_inventario);

    return {
      id: o.id,
      tipo: o.tipo,
      iniciadaAt: o.iniciada_at,
      cuentaId: cta?.id ?? "",
      plataformaNombre: plat?.nombre ?? "Plataforma",
      plataformaSlug: plat?.slug ?? "",
      cuentaAlias: cta?.alias ?? prod?.nombre ?? null,
      unidadNombre: unidad?.nombre_visible ?? `Perfil ${unidad?.numero_slot ?? ""}`,
    };
  });

  const vendedores: VendedorOperacion[] = (vendedoresData ?? []).map((vendedor) => ({
    id: vendedor.id,
    nombre: vendedor.nombre,
    alias: vendedor.alias,
    tipo: vendedor.tipo,
    cobraEnParalela: Boolean(vendedor.cobra_en_paralela),
  }));

  return {
    bcv: bcvUsable,
    paralela: paralelaUsable,
    vencidos,
    hoy: hoyMismo,
    proximos,
    resto,
    pausados,
    todas,
    limpiezas,
    vendedores,
  };
}
