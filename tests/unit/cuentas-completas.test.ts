import { describe, expect, it } from "vitest";
import { esCuentaCompletaLegada } from "@/domain/cuentas-completas";

describe("esCuentaCompletaLegada", () => {
  it.each(["Cuenta Completa", " completa ", "COMPLETA"])(
    "reconoce el nombre exacto %s en una cuenta con unidades",
    (nombreVisible) => {
      expect(
        esCuentaCompletaLegada({
          tipoInventario: "cuenta_con_unidades",
          numeroSlot: 1,
          nombreVisible,
        }),
      ).toBe(true);
    },
  );

  it("funciona para cualquier producto con unidades sin depender de su código", () => {
    expect(
      esCuentaCompletaLegada({
        tipoInventario: "cuenta_con_unidades",
        numeroSlot: 1,
        nombreVisible: "Cuenta Completa",
      }),
    ).toBe(true);
  });

  it("no confunde Spotify individual con una cuenta completa fusionable", () => {
    expect(
      esCuentaCompletaLegada({
        tipoInventario: "recurso_indivisible",
        numeroSlot: 1,
        nombreVisible: "Cuenta Completa",
      }),
    ).toBe(false);
  });

  it("solo acepta el primer slot del formato legado", () => {
    expect(
      esCuentaCompletaLegada({
        tipoInventario: "cuenta_con_unidades",
        numeroSlot: 2,
        nombreVisible: "Cuenta Completa",
      }),
    ).toBe(false);
  });

  it("no acepta coincidencias parciales en nombres normales", () => {
    expect(
      esCuentaCompletaLegada({
        tipoInventario: "cuenta_con_unidades",
        numeroSlot: 1,
        nombreVisible: "Cliente cuenta completa Pedro",
      }),
    ).toBe(false);
  });
});

describe("esCuentaCompletaLegada (casos límite)", () => {
  it("un nombre ausente o vacío no es cuenta completa", () => {
    expect(
      esCuentaCompletaLegada({ tipoInventario: "cuenta_con_unidades", numeroSlot: 1, nombreVisible: null }),
    ).toBe(false);
    expect(
      esCuentaCompletaLegada({ tipoInventario: "cuenta_con_unidades", numeroSlot: 1, nombreVisible: undefined }),
    ).toBe(false);
    expect(
      esCuentaCompletaLegada({ tipoInventario: "cuenta_con_unidades", numeroSlot: 1, nombreVisible: "" }),
    ).toBe(false);
  });

  it("ignora mayúsculas y espacios alrededor del nombre", () => {
    expect(
      esCuentaCompletaLegada({ tipoInventario: "cuenta_con_unidades", numeroSlot: 1, nombreVisible: "  CUENTA COMPLETA  " }),
    ).toBe(true);
  });
});
