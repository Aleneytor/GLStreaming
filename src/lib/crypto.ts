import crypto from "node:crypto";

/**
 * Cifrado de secretos de streaming a nivel de aplicación.
 *
 * - Algoritmo: AES-256-GCM (cifra y además autentica: si el texto cifrado se
 *   altera, el descifrado falla en vez de devolver basura).
 * - La clave (32 bytes) vive SOLO en la variable de entorno GLS_ENCRYPTION_KEY,
 *   nunca junto al dato en Postgres. Perder/rotar la clave se controla con
 *   `version_clave` en las tablas de secretos.
 * - Este módulo es solo de servidor. Importarlo en el navegador debe fallar
 *   (usa `node:crypto`).
 *
 * Formato del texto cifrado: base64( iv(12) || authTag(16) || ciphertext ).
 */

const ALGORITMO = "aes-256-gcm";
const IV_BYTES = 12; // recomendado para GCM
const TAG_BYTES = 16;

function obtenerClave(): Buffer {
  const hex = process.env.GLS_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "GLS_ENCRYPTION_KEY inválida: se esperan 64 caracteres hex (32 bytes).",
    );
  }
  return Buffer.from(hex, "hex");
}

/** Cifra un texto y devuelve una cadena base64 lista para guardar. */
export function cifrarSecreto(textoPlano: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITMO, obtenerClave(), iv);
  const ct = Buffer.concat([cipher.update(textoPlano, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

/** Descifra una cadena producida por `cifrarSecreto`. */
export function descifrarSecreto(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ct = raw.subarray(IV_BYTES + TAG_BYTES);
  const decipher = crypto.createDecipheriv(ALGORITMO, obtenerClave(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/**
 * Huella (fingerprint) HMAC-SHA256 de un valor. Sirve para detectar duplicados
 * (ej. "¿ya existe una cuenta con este login?") sin guardar ni exponer el valor
 * en claro. No es reversible.
 */
export function huellaSecreto(valor: string): string {
  return crypto
    .createHmac("sha256", obtenerClave())
    .update(valor.trim().toLowerCase())
    .digest("hex");
}

/**
 * Máscara de un correo generada en el servidor (ej. "a***@gmail.com").
 * Es lo único que puede llegar a la grilla administrativa; el correo completo
 * requiere un comando de revelado específico y auditado.
 */
export function enmascararCorreo(correo: string): string {
  const [usuario, dominio] = correo.split("@");
  if (!dominio || usuario.length === 0) return "***";
  const inicial = usuario[0];
  return `${inicial}***@${dominio}`;
}

/** Máscara genérica para un login que no es correo (deja ver solo la inicial). */
export function enmascararLogin(login: string): string {
  if (login.includes("@")) return enmascararCorreo(login);
  if (login.length <= 1) return "***";
  return `${login[0]}***`;
}
