import { describe, expect, it } from "vitest";
import {
  CAMPO_ROTAR_CREDENCIALES,
  datosCuentaDesdeFormData,
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

describe("datosCuentaDesdeFormData — contrato del alta de cuenta", () => {
  it("mapea las claves del formulario al contrato tipado", () => {
    const formulario = new FormData();
    formulario.set("producto_id", "11111111-1111-4111-a111-111111111101");
    formulario.set("capacidad", "5");
    formulario.set("alias", "  Familia Spotify  ");
    formulario.set("proveedor", "  Distribuidor A ");
    formulario.set("correo", " admin@spotify.com ");
    formulario.set("contrasena", "clave-secreta");
    formulario.set("costo_usdt", " 9.50 ");
    formulario.set("ciclo_inicio", " 2026-08-01 ");
    formulario.set("gmail_pagador", " pagador@gmail.com ");
    formulario.set("origen_gpay", "gpay_nigeria");

    expect(datosCuentaDesdeFormData(formulario)).toEqual({
      productoId: "11111111-1111-4111-a111-111111111101",
      capacidad: "5",
      alias: "Familia Spotify",
      proveedor: "Distribuidor A",
      notas: "",
      correo: "admin@spotify.com",
      contrasena: "clave-secreta",
      costoUsdt: "9.50",
      cicloInicio: "2026-08-01",
      gmailPagador: "pagador@gmail.com",
      origenGpay: "gpay_nigeria",
    });
  });

  it("recorta espacios y normaliza el origen GPay por defecto a USA", () => {
    const formulario = new FormData();
    formulario.set("producto_id", "abc");
    formulario.set("capacidad", "4");
    formulario.set("correo", "c");
    formulario.set("contrasena", "x");

    const datos = datosCuentaDesdeFormData(formulario);
    expect(datos.alias).toBe("");
    expect(datos.proveedor).toBe("");
    expect(datos.costoUsdt).toBe("");
    expect(datos.origenGpay).toBe("gpay_usa");
  });

  it("la fecha del ciclo llega cruda al contrato (el ancla se deriva luego)", () => {
    const formulario = new FormData();
    formulario.set("producto_id", "abc");
    formulario.set("capacidad", "1");
    formulario.set("correo", "c");
    formulario.set("contrasena", "x");
    formulario.set("ciclo_inicio", "2026-03-31");

    expect(datosCuentaDesdeFormData(formulario).cicloInicio).toBe("2026-03-31");
  });
});
