import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uno } from "@/lib/supabase/util";
import { descifrarSecreto } from "@/lib/crypto";
import { badgeVencimiento, diasParaRenovar } from "@/domain/fechas";
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

/**
 * Inventario de UNA plataforma como tabla densa (solo admin), una fila por cupo
 * vendible. Las credenciales se descifran aquí, en el servidor, y se muestran a
 * la vista: en la base siguen cifradas. El revendedor nunca entra (redirige).
 */
export default async function PlataformaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const { slug } = await params;
  const { q, estado } = await searchParams;
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
       credenciales_cuenta ( login_cifrado, contrasena_cifrada, eliminada_at ),
       unidades_inventario ( id, numero_slot, nombre_visible, secretos_unidad ( pin_cifrado ) ),
       asignaciones_inventario (
         id, alcance, unidad_id, fin,
         suscripciones ( id, estado, clientes ( nombre ),
           periodos_servicio ( fecha_renovacion ),
           vinculos_identidad_spotify ( fin,
             identidades_spotify ( login_cifrado, contrasena_cifrada ) ) ) )`,
    )
    .eq("productos_plataforma.plataforma_id", plataforma.id);

  if (estado) consulta = consulta.eq("estado", estado);

  const { data: cuentas } = await consulta.order("created_at", { ascending: false });

  // --- Aplanado: una fila por cupo vendible (o por cuenta si es indivisible) --
  type CuentaFila = NonNullable<typeof cuentas>[number];

  const datosVenta = (asig: CuentaFila["asignaciones_inventario"][number] | undefined) => {
    const susc = uno(asig?.suscripciones);
    if (!susc) return null;
    const ult = [...(susc.periodos_servicio ?? [])].sort((a, b) =>
      a.fecha_renovacion < b.fecha_renovacion ? 1 : -1,
    )[0];
    const dias = ult ? diasParaRenovar(ult.fecha_renovacion, hoy) : null;
    const ident = uno(
      (susc.vinculos_identidad_spotify ?? []).find((v) => v.fin === null)?.identidades_spotify,
    );
    return {
      cliente: uno(susc.clientes)?.nombre ?? null,
      estado: susc.estado as string,
      vence: ult?.fecha_renovacion ?? null,
      badge: dias === null ? null : badgeVencimiento(dias),
      clienteLogin: ident ? desc(ident.login_cifrado) : null,
      clienteClave: ident ? desc(ident.contrasena_cifrada) : null,
    };
  };

  // Un bloque por CUENTA, con sus cupos (perfiles/miembros) dentro. Los bloques
  // se agrupan por producto para que «Netflix cuenta» y «Netflix extra» —o
  // Spotify individual y familiar— salgan en secciones separadas.
  const grupos = new Map<string, { nombre: string; cuentas: BloqueCuenta[] }>();

  for (const c of cuentas ?? []) {
    const prod = uno(c.productos_plataforma);
    if (!prod) continue;
    const cred = uno(c.credenciales_cuenta);

    const abiertas = (c.asignaciones_inventario ?? []).filter((a) => a.fin === null);
    const completa = abiertas.find((a) => a.alcance === "cuenta");
    const principal = abiertas.find((a) => a.alcance === "principal"); // uso de la madre
    const porUnidad = new Map(
      abiertas.filter((a) => a.unidad_id).map((a) => [a.unidad_id as string, a]),
    );

    const filas: CupoFila[] = [];

    if (completa) {
      const v = datosVenta(completa);
      filas.push({
        clave: `${c.id}-completa`,
        cupo: "Cuenta completa",
        cliente: v?.cliente ?? null,
        clienteLogin: v?.clienteLogin ?? null,
        clienteClave: v?.clienteClave ?? null,
        pin: null,
        vence: v?.vence ?? null,
        badge: v?.badge ?? null,
        suscEstado: v?.estado ?? null,
      });
    } else if (prod.tipo_inventario === "cuenta_con_unidades") {
      const unidades = [...(c.unidades_inventario ?? [])].sort(
        (a, b) => a.numero_slot - b.numero_slot,
      );
      for (const u of unidades) {
        const v = datosVenta(porUnidad.get(u.id));
        filas.push({
          clave: `${c.id}-u${u.id}`,
          cupo: u.nombre_visible ?? `Cupo ${u.numero_slot}`,
          cliente: v?.cliente ?? null,
          clienteLogin: v?.clienteLogin ?? null,
          clienteClave: v?.clienteClave ?? null,
          pin: desc(uno(u.secretos_unidad)?.pin_cifrado) || null,
          vence: v?.vence ?? null,
          badge: v?.badge ?? null,
          suscEstado: v?.estado ?? null,
        });
      }
      if (principal) {
        const v = datosVenta(principal);
        filas.push({
          clave: `${c.id}-madre`,
          cupo: "Uso de la madre",
          cliente: v?.cliente ?? null,
          clienteLogin: v?.clienteLogin ?? null,
          clienteClave: v?.clienteClave ?? null,
          pin: null,
          vence: v?.vence ?? null,
          badge: v?.badge ?? null,
          suscEstado: v?.estado ?? null,
        });
      }
    } else {
      // Recurso indivisible sin venta abierta: una fila libre.
      filas.push({
        clave: `${c.id}-solo`,
        cupo: "—",
        cliente: null,
        clienteLogin: null,
        clienteClave: null,
        pin: null,
        vence: null,
        badge: null,
        suscEstado: null,
      });
    }

    const grupo = grupos.get(prod.id) ?? { nombre: prod.nombre as string, cuentas: [] };
    grupo.cuentas.push({
      cuentaId: c.id as string,
      correo: desc(cred?.login_cifrado),
      contrasena: desc(cred?.contrasena_cifrada),
      cuentaEstado: c.estado as string,
      proveedor: uno(c.proveedores)?.nombre_o_alias ?? null,
      filas,
    });
    grupos.set(prod.id, grupo);
  }

  // Búsqueda (sobre datos ya descifrados): si el correo de la cuenta coincide,
  // se mantiene el bloque entero; si no, solo los cupos que casan (cliente o su
  // propio login). Así una familia entera aparece al buscar su correo madre.
  const busqueda = (q ?? "").trim().toLowerCase();
  let totalFilas = 0;
  const gruposFiltrados = [...grupos.values()]
    .map((g) => {
      const cuentasFiltradas = g.cuentas
        .map((cta) => {
          if (!busqueda || cta.correo.toLowerCase().includes(busqueda)) return cta;
          const filas = cta.filas.filter(
            (f) =>
              f.cliente?.toLowerCase().includes(busqueda) ||
              f.clienteLogin?.toLowerCase().includes(busqueda),
          );
          return { ...cta, filas };
        })
        .filter((cta) => cta.filas.length > 0);
      totalFilas += cuentasFiltradas.reduce((n, cta) => n + cta.filas.length, 0);
      return { ...g, cuentas: cuentasFiltradas };
    })
    .filter((g) => g.cuentas.length > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link
          href="/inventario"
          className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          ← Inventario
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{plataforma.nombre}</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {cuentas?.length ?? 0} {cuentas?.length === 1 ? "cuenta" : "cuentas"} ·{" "}
              {totalFilas} {totalFilas === 1 ? "cupo" : "cupos"}
            </p>
          </div>
          <Link
            href={`/inventario/nueva?plataforma=${plataforma.slug}`}
            className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] dark:bg-white dark:text-neutral-900"
          >
            + Nueva
          </Link>
        </div>
      </div>

      <FiltrosInventario
        estados={[
          { valor: "activa", etiqueta: "Activas" },
          { valor: "mantenimiento", etiqueta: "En mantenimiento" },
          { valor: "suspendida", etiqueta: "Suspendidas" },
          { valor: "archivada", etiqueta: "Archivadas" },
        ]}
      />

      {gruposFiltrados.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          {q || estado
            ? "Nada coincide con el filtro."
            : `Todavía no hay cuentas de ${plataforma.nombre}.`}
        </p>
      ) : (
        gruposFiltrados.map((g) => (
          <section key={g.nombre} className="space-y-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {g.nombre} ({g.cuentas.length} {g.cuentas.length === 1 ? "cuenta" : "cuentas"})
            </h2>
            <TablaInventario cuentas={g.cuentas} />
          </section>
        ))
      )}
    </div>
  );
}
