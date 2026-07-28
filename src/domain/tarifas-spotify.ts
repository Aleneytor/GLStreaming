export type TipoCorreoTarifaSpotify = "dominio_gl" | "correo_cliente";

const TARIFAS_SPOTIFY: Record<TipoCorreoTarifaSpotify, Record<number, number>> = {
  dominio_gl: { 1: 4, 3: 10, 6: 18, 12: 32 },
  correo_cliente: { 1: 5, 3: 13, 6: 22, 12: 40 },
};

export function tarifaSpotify(
  tipoCorreo: TipoCorreoTarifaSpotify,
  meses: number,
): number | null {
  return TARIFAS_SPOTIFY[tipoCorreo][meses] ?? null;
}

export function tipoTarifaSpotifyDesdeCorreo(
  correo: string | null | undefined,
  tipoRegistrado?: string | null,
): TipoCorreoTarifaSpotify {
  if (correo) {
    return /@(glstreaming\.org|glcuenta\.com)$/i.test(correo.trim())
      ? "dominio_gl"
      : "correo_cliente";
  }
  return tipoRegistrado === "correo_cliente" ? "correo_cliente" : "dominio_gl";
}
