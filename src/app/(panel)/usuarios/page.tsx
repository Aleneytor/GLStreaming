import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FormCrearRevendedor } from "@/features/usuarios/form-crear-revendedor";
import { BotonCambiarPassword } from "@/features/usuarios/boton-cambiar-password";
import { Icono } from "@/components/iconos";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: usuarios }, { data: vendedores }] = await Promise.all([
    supabase
      .from("usuarios")
      .select("id, nombre, rol, activo")
      .order("nombre"),
    supabase
      .from("vendedores")
      .select("id, nombre, usuario_id")
      .eq("tipo", "revendedor")
      .order("nombre"),
  ]);

  const usuariosList = usuarios ?? [];
  const vendedoresList = vendedores ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400">
          Acceso a la plataforma
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
          Revendedores
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
          Crea cuentas para que tus revendedores puedan entrar a ver sus ventas y
          estados de cuenta.
        </p>
      </header>

      {/* Formulario de creación */}
      <FormCrearRevendedor vendedores={vendedoresList} />

      {/* Lista de usuarios existentes */}
      <section className="space-y-1">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Usuarios activos ({usuariosList.length})
        </h2>
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
    </div>
  );
}
