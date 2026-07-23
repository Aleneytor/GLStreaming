import { beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";

// Clave de prueba (32 bytes = 64 hex) fijada ANTES de importar el módulo.
beforeAll(() => {
  process.env.GLS_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
});

// Import dinámico para que el módulo lea la clave ya puesta en beforeAll.
async function cargar() {
  return import("@/lib/crypto");
}

describe("cifrado de secretos", () => {
  it("cifra y descifra de vuelta el mismo texto (round-trip)", async () => {
    const { cifrarSecreto, descifrarSecreto } = await cargar();
    const original = "contraseña-super-secreta-123";
    const cifrado = cifrarSecreto(original);

    expect(cifrado).not.toContain(original); // no aparece en claro
    expect(descifrarSecreto(cifrado)).toBe(original);
  });

  it("produce texto cifrado distinto cada vez (IV aleatorio)", async () => {
    const { cifrarSecreto } = await cargar();
    const a = cifrarSecreto("mismo-valor");
    const b = cifrarSecreto("mismo-valor");
    expect(a).not.toBe(b); // dos cifrados del mismo dato no coinciden
  });

  it("falla al descifrar si el texto cifrado fue alterado (autenticación GCM)", async () => {
    const { cifrarSecreto, descifrarSecreto } = await cargar();
    const cifrado = cifrarSecreto("dato");
    // Alteramos un carácter del payload base64.
    const alterado = cifrado.slice(0, -2) + (cifrado.slice(-2) === "AA" ? "BB" : "AA");
    expect(() => descifrarSecreto(alterado)).toThrow();
  });

  it("la huella es estable e insensible a mayúsculas/espacios", async () => {
    const { huellaSecreto } = await cargar();
    expect(huellaSecreto("Correo@Gmail.com")).toBe(huellaSecreto("  correo@gmail.com "));
    expect(huellaSecreto("a@x.com")).not.toBe(huellaSecreto("b@x.com"));
  });

  it("enmascara correos y logins sin revelar el valor", async () => {
    const { enmascararCorreo, enmascararLogin } = await cargar();
    expect(enmascararCorreo("alejandro@gmail.com")).toBe("a***@gmail.com");
    expect(enmascararLogin("usuario123")).toBe("u***");
  });
});
