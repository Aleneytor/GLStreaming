import { describe, expect, it } from "vitest";
import { clasificarServiciosOperativos } from "@/domain/operaciones";

describe("clasificarServiciosOperativos", () => {
  it("saca un servicio pausado y vencido de la atención urgente", () => {
    const servicios = [
      { id: "activo-vencido", estado: "activa", dias: -2 },
      { id: "pausado-vencido", estado: "pausada", dias: -8 },
      { id: "activo-hoy", estado: "activa", dias: 0 },
    ];

    const grupos = clasificarServiciosOperativos(servicios);

    expect(grupos.vencidos.map((item) => item.id)).toEqual(["activo-vencido"]);
    expect(grupos.hoy.map((item) => item.id)).toEqual(["activo-hoy"]);
    expect(grupos.pausados.map((item) => item.id)).toEqual(["pausado-vencido"]);
  });

  it("mantiene en próximos solo servicios activos de los próximos cinco días", () => {
    const servicios = [
      { id: "activo-3", estado: "activa", dias: 3 },
      { id: "pausado-3", estado: "pausada", dias: 3 },
      { id: "activo-6", estado: "activa", dias: 6 },
    ];

    const grupos = clasificarServiciosOperativos(servicios);

    expect(grupos.proximos.map((item) => item.id)).toEqual(["activo-3"]);
    expect(grupos.resto.map((item) => item.id)).toEqual(["activo-6"]);
    expect(grupos.pausados.map((item) => item.id)).toEqual(["pausado-3"]);
  });
});
