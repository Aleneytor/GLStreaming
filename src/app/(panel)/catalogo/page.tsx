import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uno } from "@/lib/supabase/util";
import {
  EditorPlataforma,
  EditorProducto,
  EditorProveedor,
  EditorVendedor,
  type ProveedorFila,
  type VendedorFila,
} from "@/features/catalogo/editores";

export const dynamic = "force-dynamic";

const secciones = [
  { clave: "productos", etiqueta: "Productos", icono: "▦", descripcion: "Qué se vende" },
  { clave: "plataformas", etiqueta: "Plataformas", icono: "◫", descripcion: "Servicios disponibles" },
  { clave: "vendedores", etiqueta: "Vendedores", icono: "♟", descripcion: "Quién origina ventas" },
  { clave: "proveedores", etiqueta: "Proveedores", icono: "◇", descripcion: "A quién se compra" },
] as const;

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const { ver } = await searchParams;
  const seccion = secciones.some((item) => item.clave === ver) ? ver! : "productos";
  const supabase = await createClient();

  const [
    { data: plataformas },
    { data: productos },
    { data: proveedores },
    { data: vendedores },
    { data: usuarios },
  ] = await Promise.all([
    supabase.from("plataformas").select("id, nombre, slug, activa").order("nombre"),
    supabase
      .from("productos_plataforma")
      .select(
        "id, nombre, codigo, estado_comercial, permite_renovaciones, activo, capacidad_fija, capacidad_vendible_predeterminada, plataformas ( nombre )",
      )
      .order("codigo"),
    supabase
      .from("proveedores")
      .select("id, tipo, nombre_o_alias, telefono_original, notas, activo")
      .order("nombre_o_alias"),
    supabase
      .from("vendedores")
      .select("id, nombre, alias, usuario_id, tipo, cobra_en_paralela, activo")
      .order("nombre"),
    supabase.from("usuarios").select("id, nombre, rol").eq("activo", true).order("nombre"),
  ]);

  const resumen = [
    { valor: (productos ?? []).filter((item) => item.activo).length, etiqueta: "productos activos" },
    { valor: (plataformas ?? []).filter((item) => item.activa).length, etiqueta: "plataformas" },
    { valor: (vendedores ?? []).filter((item) => item.activo).length, etiqueta: "vendedores" },
    { valor: (proveedores ?? []).filter((item) => item.activo).length, etiqueta: "proveedores" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-neutral-950 to-neutral-800 p-5 text-white shadow-sm dark:border-neutral-800">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300">
          Configuración del negocio
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Catálogo</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-300">
          Controla lo que vendes y las personas que participan en cada operación.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {resumen.map((dato) => (
            <div key={dato.etiqueta} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
              <p className="font-mono text-xl font-bold">{dato.valor}</p>
              <p className="text-[11px] text-neutral-400">{dato.etiqueta}</p>
            </div>
          ))}
        </div>
      </header>

      <nav aria-label="Secciones del catálogo" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {secciones.map((item) => {
          const activa = seccion === item.clave;
          return (
            <Link
              key={item.clave}
              href={`/catalogo?ver=${item.clave}`}
              aria-current={activa ? "page" : undefined}
              className={`rounded-xl border p-3 transition active:scale-[0.99] ${
                activa
                  ? "border-violet-500 bg-violet-600 text-white shadow-sm"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
              }`}
            >
              <span className="text-lg" aria-hidden>{item.icono}</span>
              <span className="ml-2 text-sm font-semibold">{item.etiqueta}</span>
              <span className={`mt-1 block text-[11px] ${activa ? "text-violet-100" : "text-neutral-500"}`}>
                {item.descripcion}
              </span>
            </Link>
          );
        })}
      </nav>

      {seccion === "productos" && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-semibold">Productos y modalidades</h2>
              <p className="text-xs text-neutral-500">Abre una tarjeta solo cuando necesites cambiar su disponibilidad comercial.</p>
            </div>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs dark:bg-neutral-800">{productos?.length ?? 0}</span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {productos?.map((producto) => (
              <EditorProducto
                key={producto.id}
                plataforma={uno(producto.plataformas)?.nombre ?? "Sin plataforma"}
                producto={{
                  id: producto.id,
                  nombre: producto.nombre,
                  codigo: producto.codigo,
                  estado_comercial: producto.estado_comercial,
                  permite_renovaciones: producto.permite_renovaciones,
                  activo: producto.activo,
                  capacidad_fija: producto.capacidad_fija,
                  capacidad_vendible_predeterminada: producto.capacidad_vendible_predeterminada,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {seccion === "plataformas" && (
        <section className="space-y-3">
          <div>
            <h2 className="font-semibold">Plataformas</h2>
            <p className="text-xs text-neutral-500">Activa o pausa una marca completa sin alterar sus reglas técnicas.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plataformas?.map((plataforma) => (
              <EditorPlataforma key={plataforma.id} plataforma={plataforma} />
            ))}
          </div>
        </section>
      )}

      {seccion === "vendedores" && (
        <section className="space-y-4">
          <div>
            <h2 className="font-semibold">Vendedores y revendedores</h2>
            <p className="text-xs text-neutral-500">
              Distingue afiliados con portal de intermediarios ocasionales y define su base de cobro.
            </p>
          </div>
          <details className="rounded-xl border border-dashed border-violet-300 bg-violet-50/60 p-4 dark:border-violet-900 dark:bg-violet-950/20">
            <summary className="cursor-pointer text-sm font-semibold text-violet-800 dark:text-violet-200">+ Registrar vendedor</summary>
            <div className="mt-4"><EditorVendedor usuarios={usuarios ?? []} /></div>
          </details>
          <div className="grid gap-3 lg:grid-cols-2">
            {(vendedores ?? []).map((vendedor) => (
              <EditorVendedor
                key={vendedor.id}
                vendedor={vendedor as VendedorFila}
                usuarios={usuarios ?? []}
              />
            ))}
          </div>
        </section>
      )}

      {seccion === "proveedores" && (
        <section className="space-y-4">
          <div>
            <h2 className="font-semibold">Proveedores</h2>
            <p className="text-xs text-neutral-500">Contactos a quienes compras cuentas, perfiles o coberturas.</p>
          </div>
          <details className="rounded-xl border border-dashed border-violet-300 bg-violet-50/60 p-4 dark:border-violet-900 dark:bg-violet-950/20">
            <summary className="cursor-pointer text-sm font-semibold text-violet-800 dark:text-violet-200">+ Registrar proveedor</summary>
            <div className="mt-4"><EditorProveedor /></div>
          </details>
          <div className="grid gap-3 lg:grid-cols-2">
            {(proveedores ?? []).map((proveedor) => (
              <EditorProveedor key={proveedor.id} proveedor={proveedor as ProveedorFila} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
