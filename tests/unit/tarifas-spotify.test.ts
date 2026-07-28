import { describe, expect, it } from "vitest";
import { tarifaSpotify, tipoTarifaSpotifyDesdeCorreo } from "@/domain/tarifas-spotify";

describe("tarifas de Spotify", () => {
  it("sugiere los paquetes con correo del dominio GL", () => {
    expect([1, 3, 6, 12].map((meses) => tarifaSpotify("dominio_gl", meses))).toEqual([
      4, 10, 18, 32,
    ]);
  });

  it("sugiere los paquetes con correo del cliente", () => {
    expect([1, 3, 6, 12].map((meses) => tarifaSpotify("correo_cliente", meses))).toEqual([
      5, 13, 22, 40,
    ]);
  });

  it("reconoce los dos dominios propios y trata un correo externo como del cliente", () => {
    expect(tipoTarifaSpotifyDesdeCorreo("uno@glstreaming.org")).toBe("dominio_gl");
    expect(tipoTarifaSpotifyDesdeCorreo("dos@glcuenta.com")).toBe("dominio_gl");
    expect(tipoTarifaSpotifyDesdeCorreo("roberto@gmail.com")).toBe("correo_cliente");
  });
});
