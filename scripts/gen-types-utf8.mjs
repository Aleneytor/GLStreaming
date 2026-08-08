#!/usr/bin/env node
/**
 * Wrapper para `supabase gen types typescript --local` que garantiza UTF-8 sin BOM.
 *
 * El script `db:types` original usaba un redirect `>` de PowerShell, que escribe
 * UTF-16 LE (con BOM `FF FE`). Eso produce un archivo del doble de tamaño y
 * confunde a algunas herramientas. Este wrapper captura la salida stdout del
 * comando (siempre UTF-8 en Node) y la escribe con `fs.writeFileSync` en UTF-8
 * sin BOM.
 *
 * Uso:  node scripts/gen-types-utf8.mjs
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SALIDA = resolve("src/lib/supabase/database.types.ts");

// `supabase gen types typescript --local` imprime los tipos a stdout.
// Usamos execFileSync para capturar la salida directamente (sin shell).
const tipos = execFileSync("npx", ["supabase", "gen", "types", "typescript", "--local"], {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "inherit"],
});

// Escribe en UTF-8 sin BOM (el default de Node al pasar un string).
writeFileSync(SALIDA, tipos, "utf-8");

const bytes = Buffer.byteLength(tipos, "utf-8");
console.log(`Tipos generados: ${SALIDA} (${bytes} bytes, UTF-8 sin BOM).`);
