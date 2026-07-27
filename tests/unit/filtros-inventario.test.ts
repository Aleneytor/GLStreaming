import { describe, expect, it } from "vitest";
import {
  coincideFiltroInventario,
  normalizarFiltroInventario,
} from "../../src/domain/filtros-inventario";

const libre = { suscripcionId: null, dias: null };
const vendida = (dias: number | null) => ({ suscripcionId: "suscripcion-qa", dias });

describe("filtros operativos del inventario", () => {
  it("solo considera vendible un cupo libre dentro de una cuenta activa", () => {
    expect(coincideFiltroInventario(libre, "disponibles", "activa")).toBe(true);
    expect(coincideFiltroInventario(vendida(10), "disponibles", "activa")).toBe(false);
    expect(coincideFiltroInventario(libre, "disponibles", "suspendida")).toBe(false);
  });

  it("limita próximos vencimientos al intervalo de 1 a 5 días", () => {
    expect(coincideFiltroInventario(vendida(1), "proximas", "activa")).toBe(true);
    expect(coincideFiltroInventario(vendida(5), "proximas", "activa")).toBe(true);
    expect(coincideFiltroInventario(vendida(0), "proximas", "activa")).toBe(false);
    expect(coincideFiltroInventario(vendida(6), "proximas", "activa")).toBe(false);
  });

  it("separa los que vencen hoy de los ya vencidos", () => {
    expect(coincideFiltroInventario(vendida(0), "hoy", "activa")).toBe(true);
    expect(coincideFiltroInventario(vendida(-1), "hoy", "activa")).toBe(false);
    expect(coincideFiltroInventario(vendida(-1), "vencidas", "activa")).toBe(true);
    expect(coincideFiltroInventario(vendida(0), "vencidas", "activa")).toBe(false);
  });

  it("conserva el filtro técnico útil de cuentas suspendidas", () => {
    expect(coincideFiltroInventario(vendida(20), "suspendida", "suspendida")).toBe(true);
    expect(coincideFiltroInventario(libre, "suspendida", "activa")).toBe(false);
  });

  it("ignora valores viejos o desconocidos de la URL", () => {
    expect(normalizarFiltroInventario("activa")).toBe("");
    expect(normalizarFiltroInventario("cualquier-cosa")).toBe("");
    expect(normalizarFiltroInventario("proximas")).toBe("proximas");
  });
});
