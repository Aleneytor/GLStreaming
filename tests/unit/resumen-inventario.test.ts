import { describe, expect, it } from "vitest";
import { resumirCuentaInventario } from "@/domain/resumen-inventario";

describe("resumen del inventario", () => {
  it("cuenta Spotify individual sin unidades aporta un cupo", () => {
    expect(resumirCuentaInventario(0, [])).toEqual({ capacidad: 1, ocupados: 0 });
    expect(
      resumirCuentaInventario(0, [
        {
          fin: null,
          alcance: "cuenta",
          consume_capacidad: true,
          capacidad_vendible_consumida_snapshot: 1,
        },
      ]),
    ).toEqual({ capacidad: 1, ocupados: 1 });
  });

  it("cuenta completa ocupa todos sus perfiles", () => {
    expect(
      resumirCuentaInventario(5, [
        {
          fin: null,
          alcance: "cuenta",
          consume_capacidad: true,
          capacidad_vendible_consumida_snapshot: 5,
        },
      ]),
    ).toEqual({ capacidad: 5, ocupados: 5 });
  });

  it("Spotify familiar cuenta miembros, ignora cerradas y uso principal", () => {
    expect(
      resumirCuentaInventario(5, [
        { fin: null, alcance: "unidad", consume_capacidad: true, capacidad_vendible_consumida_snapshot: 1 },
        { fin: null, alcance: "unidad", consume_capacidad: true, capacidad_vendible_consumida_snapshot: 1 },
        { fin: null, alcance: "principal", consume_capacidad: false, capacidad_vendible_consumida_snapshot: 0 },
        { fin: "2026-07-01", alcance: "unidad", consume_capacidad: true, capacidad_vendible_consumida_snapshot: 1 },
      ]),
    ).toEqual({ capacidad: 5, ocupados: 2 });
  });
});

describe("resumen del inventario (casos límite)", () => {
  it("una venta completa sin snapshot consume toda la capacidad", () => {
    expect(
      resumirCuentaInventario(5, [
        { fin: null, alcance: "cuenta", consume_capacidad: true, capacidad_vendible_consumida_snapshot: null },
      ]),
    ).toEqual({ capacidad: 5, ocupados: 5 });
  });

  it("un snapshot negativo se ignora (clamp a cero)", () => {
    expect(
      resumirCuentaInventario(5, [
        { fin: null, alcance: "unidad", consume_capacidad: true, capacidad_vendible_consumida_snapshot: -3 },
      ]),
    ).toEqual({ capacidad: 5, ocupados: 0 });
  });

  it("los ocupados nunca superan la capacidad física", () => {
    expect(
      resumirCuentaInventario(2, [
        { fin: null, alcance: "unidad", consume_capacidad: true, capacidad_vendible_consumida_snapshot: 1 },
        { fin: null, alcance: "unidad", consume_capacidad: true, capacidad_vendible_consumida_snapshot: 1 },
        { fin: null, alcance: "unidad", consume_capacidad: true, capacidad_vendible_consumida_snapshot: 1 },
      ]),
    ).toEqual({ capacidad: 2, ocupados: 2 });
  });

  it("una asignación que no consume capacidad no ocupa cupo", () => {
    expect(
      resumirCuentaInventario(5, [
        { fin: null, consume_capacidad: false, capacidad_vendible_consumida_snapshot: 3 },
      ]),
    ).toEqual({ capacidad: 5, ocupados: 0 });
  });
});

