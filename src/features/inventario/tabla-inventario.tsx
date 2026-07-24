import Link from "next/link";
import type { BadgeVencimiento } from "@/domain/fechas";

/**
 * Tabla densa del inventario (solo admin), pensada para ver MUCHOS clientes de
 * un vistazo, como la hoja de cálculo del negocio. Una fila por cupo vendible
 * (perfil, miembro de familia, individual o cuenta completa).
 *
 * Las credenciales llegan YA descifradas desde el servidor (el admin las ve a
 * la vista; en la base siguen cifradas). El revendedor nunca llega aquí.
 */

export type FilaInventario = {
  clave: string;
  cuentaId: string;
  /** Correo/usuario de la CUENTA (madre), descifrado. */
  correo: string;
  contrasena: string;
  /** Etiqueta del cupo: «Perfil 3», «Miembro 2», «Cuenta completa», «Uso madre». */
  cupo: string;
  /** Cliente: nombre, o su correo si no tiene nombre; null = cupo libre. */
  cliente: string | null;
  /** Acceso propio del cliente (Spotify): su login y clave, descifrados. */
  clienteLogin: string | null;
  clienteClave: string | null;
  /** PIN del perfil (Netflix y similares), descifrado. */
  pin: string | null;
  vence: string | null;
  badge: BadgeVencimiento | null;
  suscEstado: string | null;
  cuentaEstado: string;
};

function Copiable({ texto }: { texto: string | null }) {
  if (!texto) return <span className="text-neutral-300 dark:text-neutral-700">—</span>;
  return (
    <span className="font-mono text-xs text-neutral-700 dark:text-neutral-300" title={texto}>
      {texto}
    </span>
  );
}

export function TablaInventario({ filas }: { filas: FilaInventario[] }) {
  return (
    // La tabla desborda en horizontal si hace falta; la página no.
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-neutral-100 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
          <tr>
            <th className="px-3 py-2 font-medium">Cliente</th>
            <th className="px-3 py-2 font-medium">Cupo</th>
            <th className="px-3 py-2 font-medium">Correo cuenta</th>
            <th className="px-3 py-2 font-medium">Contraseña</th>
            <th className="px-3 py-2 font-medium">Acceso del cliente</th>
            <th className="px-3 py-2 font-medium">Vence</th>
            <th className="px-3 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr
              key={f.clave}
              className="border-t border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900/50"
            >
              <td className="px-3 py-1.5">
                {f.cliente ? (
                  <span className="font-medium">{f.cliente}</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">libre</span>
                )}
                {f.suscEstado && f.suscEstado !== "activa" && (
                  <span className="ml-1 text-xs capitalize text-neutral-400">
                    {f.suscEstado}
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                {f.cupo}
              </td>
              <td className="px-3 py-1.5">
                <Copiable texto={f.correo} />
              </td>
              <td className="px-3 py-1.5">
                <Copiable texto={f.contrasena} />
              </td>
              <td className="px-3 py-1.5">
                {f.clienteLogin ? (
                  // Spotify: el cliente entra con SU propio login.
                  <span className="block leading-tight">
                    <Copiable texto={f.clienteLogin} />
                    <br />
                    <Copiable texto={f.clienteClave} />
                  </span>
                ) : f.pin ? (
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    PIN <Copiable texto={f.pin} />
                  </span>
                ) : (
                  <span className="text-neutral-300 dark:text-neutral-700">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-1.5">
                {f.vence ? (
                  <span className="flex items-center gap-1.5">
                    <span className="tabular-nums text-xs text-neutral-500 dark:text-neutral-400">
                      {f.vence}
                    </span>
                    {f.badge && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                          f.badge.color === "rojo"
                            ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                            : f.badge.color === "amarillo"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        {f.badge.etiqueta}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-neutral-300 dark:text-neutral-700">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right">
                <Link
                  href={`/inventario/cuenta/${f.cuentaId}/editar`}
                  className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                >
                  Editar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
