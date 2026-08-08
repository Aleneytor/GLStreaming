import Link from "next/link";
import { redirect } from "next/navigation";
import { diasParaRenovar } from "@/domain/fechas";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uno } from "@/lib/supabase/util";
import {
  EditorCliente,
  type ClienteFila,
  type ServicioCliente,
} from "@/features/clientes/editor-cliente";
import { EstadoVacio } from "@/components/estado-vacio";

export const dynamic = "force-dynamic";

function hoyCaracas(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const { q, estado } = await searchParams;
  const hoy = hoyCaracas();
  const supabase = await createClient();

  const { data: clientes, error } = await supabase
    .from("clientes")
    .select(
      `id, nombre, whatsapp_original, notas,
       suscripciones (
         id, estado,
         productos_plataforma ( nombre, codigo, plataformas ( nombre, slug ) ),
         vendedores ( nombre, telefono_normalizado ),
         periodos_servicio ( inicio, fecha_renovacion, precio_comercial_usd )
       )`,
    )
    .is("archived_at", null)
    .order("nombre");

  if (error) throw new Error(`No se pudo cargar la cartera de clientes: ${error.message}`);

  const cartera: ClienteFila[] = (clientes ?? []).map((cliente) => {
    const servicios: ServicioCliente[] = (cliente.suscripciones ?? [])
      .filter((suscripcion) => suscripcion.estado === "activa")
      .map((suscripcion) => {
        const producto = uno(suscripcion.productos_plataforma);
        const plataforma = uno(producto?.plataformas);
        const vendedor = uno(suscripcion.vendedores);
        const periodo = [...(suscripcion.periodos_servicio ?? [])].sort((a, b) =>
          a.fecha_renovacion < b.fecha_renovacion ? 1 : -1,
        )[0];

        return {
          suscripcionId: suscripcion.id,
          producto: producto?.nombre ?? "Servicio",
          plataforma: plataforma?.nombre ?? "Sin plataforma",
          plataformaSlug: plataforma?.slug ?? null,
          vence: periodo?.fecha_renovacion ?? null,
          dias: periodo ? diasParaRenovar(periodo.fecha_renovacion, hoy) : null,
          precioUsd:
            periodo?.precio_comercial_usd == null
              ? null
              : Number(periodo.precio_comercial_usd),
          vendedor: vendedor?.nombre ?? null,
        };
      })
      .sort((a, b) => (a.vence ?? "9999").localeCompare(b.vence ?? "9999"));

    // Un teléfono es "referencia del vendedor" (no contacto del cliente) cuando
    // coincide con el de un vendedor que le vendió un servicio y el cliente no
    // ES ese vendedor. El caso cliente = revendedor se conserva: ahí la venta
    // se le hace a él mismo y el teléfono es legítimamente suyo.
    const normalizar = (valor: string | null | undefined) => (valor ?? "").replace(/[^0-9+]/g, "");
    const telCliente = normalizar(cliente.whatsapp_original);
    const whatsappEsReferenciaVendedor =
      telCliente.length > 0 &&
      (cliente.suscripciones ?? []).some((suscripcion) => {
        const vendedor = uno(suscripcion.vendedores);
        if (!vendedor?.telefono_normalizado) return false;
        return (
          normalizar(vendedor.telefono_normalizado) === telCliente &&
          vendedor.nombre?.trim().toLowerCase() !== cliente.nombre.trim().toLowerCase()
        );
      });

    const revendedores = [
      ...new Set(
        servicios
          .map((servicio) => servicio.vendedor)
          .filter((nombre): nombre is string => Boolean(nombre)),
      ),
    ];

    return {
      id: cliente.id,
      nombre: cliente.nombre,
      whatsapp_original: cliente.whatsapp_original,
      notas: cliente.notas,
      servicios,
      revendedores,
      whatsappEsReferenciaVendedor,
    };
  });

  const termino = (q ?? "").trim().toLowerCase();
  const filtro = estado ?? "todos";
  const filas = cartera.filter((cliente) => {
    const coincideTexto =
      !termino ||
      cliente.nombre.toLowerCase().includes(termino) ||
      cliente.whatsapp_original?.toLowerCase().includes(termino) ||
      cliente.servicios.some(
        (servicio) =>
          servicio.plataforma.toLowerCase().includes(termino) ||
          servicio.producto.toLowerCase().includes(termino) ||
          servicio.vendedor?.toLowerCase().includes(termino),
      );
    if (!coincideTexto) return false;
    if (filtro === "proximos") {
      return cliente.servicios.some((servicio) => servicio.dias != null && servicio.dias >= 0 && servicio.dias <= 5);
    }
    if (filtro === "vencidos") {
      return cliente.servicios.some((servicio) => servicio.dias != null && servicio.dias < 0);
    }
    if (filtro === "sin-contacto") return !cliente.whatsapp_original || cliente.whatsappEsReferenciaVendedor;
    return true;
  });

  const totalServicios = cartera.reduce((total, cliente) => total + cliente.servicios.length, 0);
  const proximos = cartera.filter((cliente) =>
    cliente.servicios.some((servicio) => servicio.dias != null && servicio.dias >= 0 && servicio.dias <= 5),
  ).length;
  const vencidos = cartera.filter((cliente) =>
    cliente.servicios.some((servicio) => servicio.dias != null && servicio.dias < 0),
  ).length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400">Cartera activa</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Clientes</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Contactos, servicios y próximos vencimientos en un solo lugar.</p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { valor: cartera.length, etiqueta: "clientes" },
            { valor: totalServicios, etiqueta: "servicios activos" },
            { valor: proximos, etiqueta: "próximos 5 días" },
            { valor: vencidos, etiqueta: "con vencidos" },
          ].map((dato) => (
            <div key={dato.etiqueta} className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-950/60">
              <p className="font-mono text-xl font-bold text-neutral-900 dark:text-white">{dato.valor}</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{dato.etiqueta}</p>
            </div>
          ))}
        </div>
      </header>

      <form className="grid gap-2 rounded-xl border border-neutral-200 bg-white p-3 sm:grid-cols-[1fr_190px_auto] dark:border-neutral-800 dark:bg-neutral-900">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Nombre, WhatsApp, plataforma o vendedor…"
          aria-label="Buscar clientes"
          className="min-w-0 rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base outline-none focus:border-blue-600 dark:border-neutral-700 dark:bg-neutral-950"
        />
        <select
          name="estado"
          defaultValue={filtro}
          aria-label="Filtrar clientes"
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        >
          <option value="todos">Todos los clientes</option>
          <option value="proximos">Próximos 5 días</option>
          <option value="vencidos">Con servicios vencidos</option>
          <option value="sin-contacto">Sin WhatsApp</option>
        </select>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">Aplicar</button>
          {(q || filtro !== "todos") && (
            <Link href="/clientes" className="rounded-lg border px-3 py-2.5 text-sm">Limpiar</Link>
          )}
        </div>
      </form>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Directorio operativo</h2>
            <p className="text-xs text-neutral-500">{filas.length} resultados; los clientes se crean normalmente al registrar una venta.</p>
          </div>
        </div>

        {filas.length === 0 ? (
          <EstadoVacio
            icono="personas"
            titulo={q || filtro !== "todos" ? "No hay coincidencias" : "Aún no hay clientes"}
            sugerencia={
              q || filtro !== "todos"
                ? "Prueba otra búsqueda o limpia los filtros."
                : "Aparecerán aquí cuando registres las ventas."
            }
          />
        ) : (
          <div className="grid items-start gap-3 lg:grid-cols-2">
            {filas.map((cliente) => <EditorCliente key={cliente.id} cliente={cliente} />)}
          </div>
        )}
      </section>

      <details className="rounded-xl border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
        <summary className="cursor-pointer text-sm font-medium text-neutral-600 dark:text-neutral-300">Registrar un cliente sin venta</summary>
        <p className="mt-2 text-xs text-neutral-500">Úsalo solo si necesitas preparar el contacto antes de asignarle un servicio.</p>
        <div className="mt-3"><EditorCliente /></div>
      </details>
    </div>
  );
}
