/**
 * Crea los usuarios de prueba del entorno LOCAL.
 *
 * `supabase db reset` reconstruye la base desde cero y eso borra también
 * `auth.users`. Este script los vuelve a crear para no quedarse sin poder
 * entrar. Se ejecuta automáticamente al final de `npm run db:reset`.
 *
 * Usa la API de administración de Auth (no SQL) para que las contraseñas y los
 * registros internos queden exactamente como GoTrue los espera.
 *
 * SOLO PARA DESARROLLO LOCAL: estas credenciales son públicas y triviales.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (¿existe .env.local?).",
  );
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

const usuarios = [
  {
    email: "admin@glstreaming.local",
    password: "admin123456",
    nombre: "Alejandro (admin)",
    rol: "admin",
  },
  {
    email: "revendedor@glstreaming.local",
    password: "revend123456",
    nombre: "Revendedor Demo",
    rol: "revendedor",
  },
];

for (const u of usuarios) {
  // 1. Crear el usuario de Auth (el trigger crea su fila en `usuarios`).
  const alta = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { nombre: u.nombre },
    }),
  });

  let id;
  if (alta.ok) {
    id = (await alta.json()).id;
    console.log(`  creado: ${u.email}`);
  } else {
    // Puede fallar porque ya existía (normal) o por otra razón (a mostrar).
    const detalle = await alta.text();
    const lista = await fetch(`${url}/auth/v1/admin/users`, { headers });
    const { users = [] } = await lista.json();
    id = users.find((x) => x.email === u.email)?.id;
    if (id) {
      console.log(`  ya existía: ${u.email}`);
    } else {
      console.error(`  ⚠️ no se pudo crear ${u.email} (HTTP ${alta.status}): ${detalle}`);
    }
  }

  // 2. Asegurar el rol (el trigger los crea siempre como `revendedor`).
  if (id && u.rol === "admin") {
    const patch = await fetch(`${url}/rest/v1/usuarios?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ rol: "admin" }),
    });
    if (!patch.ok) console.error(`  no se pudo promover a admin: ${await patch.text()}`);
    else console.log(`  promovido a admin: ${u.email}`);
  }
}

console.log("\nUsuarios de desarrollo listos:");
for (const u of usuarios) console.log(`  ${u.rol.padEnd(10)} ${u.email}  /  ${u.password}`);
