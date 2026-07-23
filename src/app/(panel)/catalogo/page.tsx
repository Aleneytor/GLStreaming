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

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const { ver } = await searchParams;
  const seccion = ver ?? "productos";
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
        .select("id, nombre, alias, usuario_id, activo")
        .order("nombre"),
      supabase.from("usuarios").select("id, nombre, rol").eq("activo", true).order("nombre"),
    ]);

  const pestañas = [
    { clave: "productos", etiqueta: "Productos" },
    { clave: "plataformas", etiqueta: "Plataformas" },
    { clave: "vendedores", etiqueta: "Vendedores" },
    { clave: "proveedores", etiqueta: "Proveedores" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Catálogo</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Qué se vende, de qué plataformas y a través de qué proveedores.
        </p>
      </div>

      <nav className="flex gap-2 overflow-x-auto">
        {pestañas.map((t) => (
          <a
            key={t.clave}
            href={`/catalogo?ver=${t.clave}`}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition ${
              seccion === t.clave
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "border border-neutral-300 dark:border-neutral-700"
            }`}
          >
            {t.etiqueta}
          </a>
        ))}
      </nav>

      {seccion === "productos" && (
        <section className="space-y-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            El <strong>estado comercial</strong> decide si un producto admite ventas
            nuevas. Ponerlo en <em>solo cartera</em> conserva lo vendido pero cierra las
            altas (así está YouTube).
          </p>
          {productos?.map((p) => (
            <div key={p.id} className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {uno(p.plataformas)?.nombre}
              </p>
              <EditorProducto
                producto={{
                  id: p.id,
                  nombre: p.nombre,
                  codigo: p.codigo,
                  estado_comercial: p.estado_comercial,
                  permite_renovaciones: p.permite_renovaciones,
                  activo: p.activo,
                  capacidad_fija: p.capacidad_fija,
                  capacidad_vendible_predeterminada: p.capacidad_vendible_predeterminada,
                }}
              />
            </div>
          ))}
        </section>
      )}

      {seccion === "plataformas" && (
        <section className="space-y-3">
          {plataformas?.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <EditorPlataforma plataforma={p} />
            </div>
          ))}
        </section>
      )}

      {seccion === "vendedores" && (
        <section className="space-y-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            A quién se le atribuye una venta. Un vendedor puede existir{" "}
            <strong>sin acceso a la app</strong>; vincularlo a un usuario es lo que
            le permite entrar y ver sus propias ventas.
          </p>
          <div>
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Nuevo vendedor
            </h2>
            <EditorVendedor usuarios={usuarios ?? []} />
          </div>
          <div className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Existentes
            </h2>
            {(vendedores ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                Aún no hay vendedores. Crea uno para poder atribuirle ventas.
              </p>
            ) : (
              (vendedores ?? []).map((v) => (
                <EditorVendedor
                  key={v.id}
                  vendedor={v as VendedorFila}
                  usuarios={usuarios ?? []}
                />
              ))
            )}
          </div>
        </section>
      )}

      {seccion === "proveedores" && (
        <section className="space-y-4">
          <div>
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Nuevo proveedor
            </h2>
            <EditorProveedor />
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Existentes
            </h2>
            {(proveedores ?? []).map((p) => (
              <EditorProveedor key={p.id} proveedor={p as ProveedorFila} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
