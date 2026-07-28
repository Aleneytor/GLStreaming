"use client";

import { useActionState, useState } from "react";
import { venderUnidadRapidaAction } from "./actions";

export type VendedorOp = {
  id: string;
  nombre: string;
  alias: string | null;
  tipo: "revendedor" | "intermediario";
  cobraEnParalela: boolean;
};

export function ModalVentaRapida({
  cuentaId,
  unidadId,
  nombrePerfil,
  clienteLogin,
  clienteClave,
  clienteTipoCorreo,
  esSpotifyFamiliar = false,
  slug,
  vendedores = [],
  onCerrar,
}: {
  cuentaId: string;
  unidadId: string | null;
  nombrePerfil: string;
  clienteLogin?: string | null;
  clienteClave?: string | null;
  clienteTipoCorreo?: string | null;
  esSpotifyFamiliar?: boolean;
  slug: string;
  vendedores?: VendedorOp[];
  onCerrar: () => void;
}) {
  const [estado, action, pendiente] = useActionState(venderUnidadRapidaAction, null);
  const [seleccionVendedor, setSeleccionVendedor] = useState<string>("");
  // El tipo (revendedor/intermediario) y la base de tasa se guardan en el
  // vendedor: al elegirlo reflejan lo guardado; al confirmar, se persisten.
  const [tipoVendedor, setTipoVendedor] = useState<"revendedor" | "intermediario">(
    "intermediario",
  );
  const [cobraParalela, setCobraParalela] = useState(false);
  const correoPreparadoEsDominio = /@(glstreaming\.org|glcuenta\.com)$/i.test(
    clienteLogin ?? "",
  );
  const [tipoCorreoSpotify, setTipoCorreoSpotify] = useState<
    "dominio_gl" | "gmail_propio" | "correo_cliente"
  >(
    clienteTipoCorreo === "dominio_gl" ||
      clienteTipoCorreo === "gmail_propio" ||
      clienteTipoCorreo === "correo_cliente"
      ? clienteTipoCorreo
      : correoPreparadoEsDominio
        ? "dominio_gl"
        : clienteLogin
          ? "gmail_propio"
          : "dominio_gl",
  );
  const [editarIdentidadPreparada, setEditarIdentidadPreparada] = useState(false);
  const requiereIdentidadSpotify =
    esSpotifyFamiliar && (!clienteLogin || editarIdentidadPreparada);

  const revendedores = vendedores.filter((v) => v.tipo === "revendedor");
  const intermediarios = vendedores.filter((v) => v.tipo !== "revendedor");

  function onCambiarVendedor(valor: string) {
    setSeleccionVendedor(valor);
    const v = vendedores.find((x) => x.id === valor);
    // Existente: hereda su tipo/base. Nuevo: intermediario por defecto (casual).
    setTipoVendedor(v?.tipo ?? "intermediario");
    setCobraParalela(v?.cobraEnParalela ?? false);
  }

  function onCambiarTipo(t: "revendedor" | "intermediario") {
    setTipoVendedor(t);
  }

  const hoyIso = new Date().toISOString().split("T")[0];
  const esNombreGenerico =
    !nombrePerfil ||
    nombrePerfil.toLowerCase().startsWith("perfil ") ||
    nombrePerfil.toLowerCase().startsWith("miembro ") ||
    nombrePerfil === "Vacío (+ Vender)" ||
    nombrePerfil === "Cuenta Completa";
  const clienteInicial = esNombreGenerico ? "" : nombrePerfil;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              ⚡ Registrar Venta Directa / Revendedor
            </h3>
            <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
              {nombrePerfil}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            ✕
          </button>
        </div>

        <form
          action={action}
          onReset={(evento) => evento.preventDefault()}
          className="space-y-4"
        >
          <input type="hidden" name="cuenta_id" value={cuentaId} />
          {unidadId && <input type="hidden" name="unidad_id" value={unidadId} />}
          <input type="hidden" name="slug" value={slug} />

          {esSpotifyFamiliar && clienteLogin && !editarIdentidadPreparada && (
            <>
              <input type="hidden" name="spotify_login" value={clienteLogin} />
              <input type="hidden" name="spotify_clave" value={clienteClave ?? ""} />
              <input
                type="hidden"
                name="spotify_tipo_correo"
                value={tipoCorreoSpotify}
              />
            </>
          )}

          {requiereIdentidadSpotify && (
            <section className="space-y-3 rounded-xl border border-green-300 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/25">
              <div>
                <p className="text-xs font-bold text-green-950 dark:text-green-100">
                  1. Acceso del miembro de Spotify
                </p>
                <p className="mt-0.5 text-[11px] text-green-800 dark:text-green-300">
                  {clienteLogin
                    ? "Sustituye el correo o la clave preparados antes de vincularlos al cliente."
                    : "Este cupo no tiene correo preparado. Define primero el acceso que usará el cliente."}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className={`cursor-pointer rounded-lg border p-2 text-[11px] ${
                  tipoCorreoSpotify === "dominio_gl"
                    ? "border-green-600 bg-white text-green-950 dark:bg-green-950 dark:text-green-100"
                    : "border-green-200 text-green-800 dark:border-green-900 dark:text-green-300"
                }`}>
                  <input
                    type="radio"
                    name="spotify_tipo_correo"
                    value="dominio_gl"
                    checked={tipoCorreoSpotify === "dominio_gl"}
                    onChange={() => setTipoCorreoSpotify("dominio_gl")}
                    className="mr-1.5"
                  />
                  <strong>Correo a mi dominio</strong>
                  <span className="mt-0.5 block opacity-75">Reutilizable después de sanear.</span>
                </label>
                <label className={`cursor-pointer rounded-lg border p-2 text-[11px] ${
                  tipoCorreoSpotify === "gmail_propio"
                    ? "border-green-600 bg-white text-green-950 dark:bg-green-950 dark:text-green-100"
                    : "border-green-200 text-green-800 dark:border-green-900 dark:text-green-300"
                }`}>
                  <input
                    type="radio"
                    name="spotify_tipo_correo"
                    value="gmail_propio"
                    checked={tipoCorreoSpotify === "gmail_propio"}
                    onChange={() => setTipoCorreoSpotify("gmail_propio")}
                    className="mr-1.5"
                  />
                  <strong>Gmail/correo mío</strong>
                  <span className="mt-0.5 block opacity-75">Tuyo y reutilizable.</span>
                </label>
                <label className={`cursor-pointer rounded-lg border p-2 text-[11px] ${
                  tipoCorreoSpotify === "correo_cliente"
                    ? "border-green-600 bg-white text-green-950 dark:bg-green-950 dark:text-green-100"
                    : "border-green-200 text-green-800 dark:border-green-900 dark:text-green-300"
                }`}>
                  <input
                    type="radio"
                    name="spotify_tipo_correo"
                    value="correo_cliente"
                    checked={tipoCorreoSpotify === "correo_cliente"}
                    onChange={() => setTipoCorreoSpotify("correo_cliente")}
                    className="mr-1.5"
                  />
                  <strong>Correo del cliente</strong>
                  <span className="mt-0.5 block opacity-75">Personal y no reutilizable.</span>
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-green-950 dark:text-green-100">
                    Correo de acceso *
                  </label>
                  <input
                    type="email"
                    name="spotify_login"
                    required
                    defaultValue={clienteLogin ?? ""}
                    placeholder={
                      tipoCorreoSpotify === "dominio_gl"
                        ? "spotify000@glstreaming.org"
                        : tipoCorreoSpotify === "gmail_propio"
                          ? "micorreo@gmail.com"
                          : "cliente@gmail.com"
                    }
                    className="w-full rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs text-neutral-900 dark:border-green-800 dark:bg-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-green-950 dark:text-green-100">
                    Contraseña de acceso *
                  </label>
                  <input
                    type="password"
                    name="spotify_clave"
                    required
                    defaultValue={clienteClave ?? ""}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs text-neutral-900 dark:border-green-800 dark:bg-neutral-900 dark:text-white"
                  />
                </div>
              </div>
              {clienteLogin && (
                <button
                  type="button"
                  onClick={() => setEditarIdentidadPreparada(false)}
                  className="text-[11px] font-semibold text-green-800 underline dark:text-green-300"
                >
                  Mantener el acceso preparado
                </button>
              )}
            </section>
          )}

          {(clienteLogin || clienteClave) && !editarIdentidadPreparada && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
              <div className="flex items-start justify-between gap-3">
                <strong>Acceso Spotify preparado para este cupo</strong>
                <button
                  type="button"
                  onClick={() => setEditarIdentidadPreparada(true)}
                  className="shrink-0 rounded-md border border-emerald-500 px-2 py-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-200"
                >
                  Cambiar correo o clave
                </button>
              </div>
              <div className="mt-2 grid gap-1 font-mono text-[11px]">
                <span className="break-all">Correo: {clienteLogin ?? "Sin correo"}</span>
                <span className="break-all">Clave: {clienteClave ?? "Sin clave"}</span>
              </div>
              <p className="mt-2 opacity-75">
                Al confirmar, este acceso quedará enlazado automáticamente al cliente.
              </p>
            </div>
          )}

          <div>
            {esSpotifyFamiliar && (
              <p className="mb-2 text-xs font-bold text-neutral-900 dark:text-white">
                {requiereIdentidadSpotify ? "2. Datos del cliente y de la venta" : "Datos del cliente y de la venta"}
              </p>
            )}
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Nombre del Cliente *
            </label>
            <input
              name="cliente_nombre"
              required
              defaultValue={clienteInicial}
              placeholder="Ej. Luis Martínez"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              WhatsApp / Teléfono (Opcional)
            </label>
            <input
              name="cliente_whatsapp"
              placeholder="+584121234567"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Fecha de Inicio / Venta *
              </label>
              <input
                type="date"
                name="fecha_inicio"
                required
                defaultValue={hoyIso}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Precio Comercial ($ USD) *
              </label>
              <input
                name="precio_usd"
                required
                inputMode="decimal"
                placeholder="2.50"
                defaultValue="2.50"
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Revendedor / Vendedor
            </label>
            <select
              name="vendedor_id"
              value={seleccionVendedor}
              onChange={(e) => onCambiarVendedor(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              <option value="">Venta Directa (yo, sin intermediario)</option>
              {revendedores.length > 0 && (
                <optgroup label="Revendedores (con portal)">
                  {revendedores.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre} {v.alias ? `(${v.alias})` : ""}
                      {v.cobraEnParalela ? " · paralela" : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              {intermediarios.length > 0 && (
                <optgroup label="Intermediarios (sin portal)">
                  {intermediarios.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre} {v.alias ? `(${v.alias})` : ""}
                      {v.cobraEnParalela ? " · paralela" : " · BCV"}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="__nuevo__">+ Registrar nuevo...</option>
            </select>

            {seleccionVendedor === "__nuevo__" && (
              <input
                name="vendedor_nombre_custom"
                required
                placeholder="Nombre (ej. Gabriel Nadales)"
                className="mt-2 w-full rounded-lg border border-emerald-500 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none dark:bg-neutral-800 dark:text-white"
              />
            )}

            {seleccionVendedor !== "" && (
              <div className="mt-2 space-y-2 rounded-lg bg-neutral-50 px-2.5 py-2 dark:bg-neutral-800/60">
                <div className="flex flex-col gap-1 text-[11px] text-neutral-700 dark:text-neutral-300">
                  <label className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="vendedor_tipo"
                      value="intermediario"
                      checked={tipoVendedor === "intermediario"}
                      onChange={() => onCambiarTipo("intermediario")}
                      className="mt-0.5"
                    />
                    <span>
                      <strong>Intermediario</strong> — compra para conocidos, sin
                      usuario ni portal.
                    </span>
                  </label>
                  <label className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="vendedor_tipo"
                      value="revendedor"
                      checked={tipoVendedor === "revendedor"}
                      onChange={() => onCambiarTipo("revendedor")}
                      className="mt-0.5"
                    />
                    <span>
                      <strong>Revendedor</strong> — afiliado, tendrá usuario y verá
                      sus clientes en el portal.
                    </span>
                  </label>
                </div>

                <label className="flex items-start gap-2 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    <input
                      type="checkbox"
                      name="vendedor_cobra_paralela"
                      checked={cobraParalela}
                      onChange={(e) => setCobraParalela(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Cobra a <strong>tasa paralela</strong> (si no, a BCV). Se
                      aplica a sus ventas y renovaciones.
                    </span>
                  </label>
              </div>
            )}
          </div>

          {estado?.error && (
            <p className="rounded-md bg-red-50 p-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
              ⚠️ {estado.error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pendiente}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {pendiente ? "Procesando..." : "Confirmar Venta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
