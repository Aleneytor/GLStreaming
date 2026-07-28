export const CAMPO_ROTAR_CREDENCIALES = "rotar_credenciales";

export function formularioSolicitaRotarCredenciales(
  formData: Pick<FormData, "get">,
): boolean {
  return (
    formData.get(CAMPO_ROTAR_CREDENCIALES) === "on" ||
    formData.get("creds_cambiadas") === "1"
  );
}
