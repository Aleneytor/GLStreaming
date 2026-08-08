export const CAMPO_ROTAR_CREDENCIALES = "rotar_credenciales";

export function formularioSolicitaRotarCredenciales(
  formData: Pick<FormData, "get">,
): boolean {
  return (
    formData.get(CAMPO_ROTAR_CREDENCIALES) === "on" ||
    formData.get("creds_cambiadas") === "1"
  );
}

/**
 * Contrato tipado del alta de cuenta ("Nueva cuenta").
 *
 * La server action recibe este objeto (no claves sueltas de FormData): así el
 * formulario y la acción negocian un único tipo y los errores de nombre de campo
 * (como el histórico `creds_cambiadas`/`rotar_credenciales`) se detectan en
 * tiempo de compilación, no en silencio en producción.
 */
export type OrigenGpay = "gpay_usa" | "gpay_nigeria" | "";

export type DatosCrearCuenta = {
  productoId: string;
  /** Cadena cruda del campo; la acción la coerce con zod. */
  capacidad: string;
  alias: string;
  proveedor: string;
  notas: string;
  correo: string;
  contrasena: string;
  costoUsdt: string;
  /** Única fecha del formulario: inicio del ciclo. El ancla se deriva de aquí. */
  cicloInicio: string;
  gmailPagador: string;
  origenGpay: string;
};

/** Adaptador FormData → DatosCrearCuenta (puro y testeable). */
export function datosCuentaDesdeFormData(formData: Pick<FormData, "get">): DatosCrearCuenta {
  return {
    productoId: String(formData.get("producto_id") ?? ""),
    capacidad: String(formData.get("capacidad") ?? ""),
    alias: String(formData.get("alias") ?? "").trim(),
    proveedor: String(formData.get("proveedor") ?? "").trim(),
    notas: String(formData.get("notas") ?? "").trim(),
    correo: String(formData.get("correo") ?? "").trim(),
    contrasena: String(formData.get("contrasena") ?? ""),
    costoUsdt: String(formData.get("costo_usdt") ?? "").trim(),
    cicloInicio: String(formData.get("ciclo_inicio") ?? "").trim(),
    gmailPagador: String(formData.get("gmail_pagador") ?? "").trim(),
    origenGpay:
      formData.get("origen_gpay") === "gpay_nigeria" ? "gpay_nigeria" : "gpay_usa",
  };
}
