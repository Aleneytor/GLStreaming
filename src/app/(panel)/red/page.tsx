import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  EditorProveedor,
  EditorVendedor,
  type ProveedorFila,
  type VendedorFila,
} from "@/features/catalogo/editores";
import { FormCrearRevendedor } from "@/features/usuarios/form-crear-revendedor";
import { BotonCambiarPassword } from "@/features/usuarios/boton-cambiar-password";
import { Icono } from "@/components/iconos";

export const dynamic = "force-dynamic";

const secciones = [
  { clave: "vendedores", etiqueta: "Vendedores", icono: "♟", descripcion: "Quién origina ventas" },
  { clave: "proveedores", etiqueta: "Proveedores", icono: "◇", descripcion: "A quién se compra" },
  { clave: "usuarios", etiqueta: "Accesos", icono: "▣", descripcion: "Cuentas de la app" },
] as const;

export default async function RedComercialPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const { ver } = await searchParams;
  const seccion = secciones.some((item) => item.clave === ver) ? ver! : "vendedores";
  const supabase = await createClient();

  const [
    { data: vendedores },
    { data: proveedores },
    { data: usuarios },
  ] = await Promise.all([
    supabase
      .from("vendedores")
      .select("id, nombre, alias, telefono_original, usuario_id, tipo, cobra_en_paralela, activo")
      .order("nombre"),
    supabase
      .from("proveedores")
      .select("id, tipo, nombre_o_alias, telefono_original, notas, activo")
      .order("nombre_o_alias"),
    supabase.from("usuarios").select("id, nombre, rol, activo").order("nombre"),
  ]);

  const usuariosList = usuarios ?? [];
  const vendedoresList = vendedores ?? [];
  const vendedoresTipo = vendedoresList.filter((v) => v.tipo === "revendedor");

  const resumen = [
    { valor: (vendedoresList).filter((item) => item.activo).length, etiqueta: "vendedores" },
    { valor: (proveedores ?? []).filter((item) => item.activo).length, etiqueta: "proveedores" },
    { valor: usuariosList.length, etiqueta: "usuarios" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400">
          Personas del negocio
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Red comercial</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
          Vendedores, revendedores, proveedores y accesos a la plataforma.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {resumen.map((dato) => (
            <div key={dato.etiqueta} className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-950/60">
              <p className="font-mono text-xl font-bold text-neutral-900 dark:text-white">{dato.valor}</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{dato.etiqueta}</p>
            </div>
          ))}
        </div>
      </header>

      <nav aria-label="Secciones" className="grid grid-cols-3 gap-2">
        {secciones.map((item) => {
          const activa = seccion === item.clave;
          return (
            <Link
              key={item.clave}
              href={`/red?ver=${item.clave}`}
              aria-current={activa ? "page" : undefined}
              className={`rounded-xl border p-3 transition active:scale-[0.99] ${
                activa
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-700"
              }`}
            >
              <span className="text-lg">{item.icono}</span>
              <p className="mt-1 text-sm font-semibold">{item.etiqueta}</p>
              <p className="text-[11px] opacity-75">{item.descripcion}</p>
            </Link>
          );
        })}
      </nav>

      {seccion === "vendedores" && (
        <section className="space-y-4">
          <div>
            <h2 className="font-semibold">Vendedores y revendedores</h2>
            <p className="text-xs text-neutral-500">
              Distingue afiliados con portal de intermediarios ocasionales y define su base de cobro.
            </p>
          </div>
          <details className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <summary className="cursor-pointer text-sm font-semibold text-blue-700 dark:text-blue-400">+ Registrar vendedor</summary>
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
          <details className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <summary className="cursor-pointer text-sm font-semibold text-blue-700 dark:text-blue-400">+ Registrar proveedor</summary>
            <div className="mt-4"><EditorProveedor /></div>
          </details>
          <div className="grid gap-3 lg:grid-cols-2">
            {(proveedores ?? []).map((proveedor) => (
              <EditorProveedor key={proveedor.id} proveedor={proveedor as ProveedorFila} />
            ))}
          </div>
        </section>
      )}

      {seccion === "usuarios" && (
        <section className="space-y-4">
          <div>
            <h2 className="font-semibold">Cuentas de acceso</h2>
            <p className="text-xs text-neutral-500">
              Crea cuentas para que tus revendedores puedan iniciar sesión y ver sus ventas.
            </p>
          </div>

          <FormCrearRevendedor vendedores={vendedoresTipo} />

          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            {usuariosList.length === 0 ? (
              <p className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                No hay usuarios registrados todavía.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {usuariosList.map((u) => {
                  const vendedorVinculado = vendedoresList.find(
                    (v) => v.usuario_id === u.id,
                  );
                  return (
                    <li
                      key={u.id}
                      className="flex items-center justify-between gap-4 px-5 py-3.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                            {u.nombre}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              u.rol === "admin"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                            }`}
                          >
                            {u.rol}
                          </span>
                          {!u.activo && (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                              inactivo
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                          {vendedorVinculado ? (
                            <span className="inline-flex items-center gap-1">
                              <Icono nombre="usuario" className="size-3" />
                              Vinculado a: {vendedorVinculado.nombre}
                            </span>
                          ) : u.rol === "revendedor" ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              Sin vendedor vinculado — no verá ventas
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <BotonCambiarPassword userId={u.id} nombre={u.nombre} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
