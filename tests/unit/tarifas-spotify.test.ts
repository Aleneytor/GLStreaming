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

  it("respeta la titularidad guardada aunque sea un Gmail externo", () => {
    expect(tipoTarifaSpotifyDesdeCorreo("negocio@gmail.com", "gmail_propio")).toBe(
      "dominio_gl",
    );
    expect(tipoTarifaSpotifyDesdeCorreo("cliente@glcuenta.com", "correo_cliente")).toBe(
      "correo_cliente",
    );
  });
});

describe("tarifas de Spotify (casos límite)", () => {
  it("devuelve null para meses no ofertados", () => {
    expect(tarifaSpotify("dominio_gl", 2)).toBeNull();
    expect(tarifaSpotify("correo_cliente", 4)).toBeNull();
    expect(tarifaSpotify("dominio_gl", 24)).toBeNull();
    expect(tarifaSpotify("correo_cliente", 0)).toBeNull();
  });

  it("sin correo ni titularidad guardada asume el dominio GL", () => {
    expect(tipoTarifaSpotifyDesdeCorreo(null)).toBe("dominio_gl");
    expect(tipoTarifaSpotifyDesdeCorreo(undefined, null)).toBe("dominio_gl");
  });

  it("reconoce los dominios propios sin importar mayúsculas", () => {
    expect(tipoTarifaSpotifyDesdeCorreo("UNO@GLSTREAMING.ORG")).toBe("dominio_gl");
    expect(tipoTarifaSpotifyDesdeCorreo("Dos@GlCuenta.Com")).toBe("dominio_gl");
  });

  it("la titularidad registrada manda aunque falte el correo", () => {
    expect(tipoTarifaSpotifyDesdeCorreo(null, "gmail_propio")).toBe("dominio_gl");
    expect(tipoTarifaSpotifyDesdeCorreo(null, "correo_cliente")).toBe("correo_cliente");
  });
});
