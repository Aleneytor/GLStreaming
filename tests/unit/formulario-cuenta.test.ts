import { describe, expect, it } from "vitest";
import {
  CAMPO_ROTAR_CREDENCIALES,
  formularioSolicitaRotarCredenciales,
} from "@/features/inventario/contrato-formulario-cuenta";

describe("contrato del editor de cuenta", () => {
  it("solicita rotación al modificar correo o contraseña", () => {
    const formulario = new FormData();
    formulario.set(CAMPO_ROTAR_CREDENCIALES, "on");

    expect(formularioSolicitaRotarCredenciales(formulario)).toBe(true);
  });

  it("mantiene compatibilidad con el nombre usado por el panel anterior", () => {
    const formulario = new FormData();
    formulario.set("creds_cambiadas", "1");

    expect(formularioSolicitaRotarCredenciales(formulario)).toBe(true);
  });

  it("no rota credenciales si los campos no fueron editados", () => {
    const formulario = new FormData();
    formulario.set(CAMPO_ROTAR_CREDENCIALES, "off");

    expect(formularioSolicitaRotarCredenciales(formulario)).toBe(false);
  });
});
