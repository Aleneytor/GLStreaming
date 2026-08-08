/**
 * Crea los usuarios de negocio en el proyecto Supabase de PRODUCCIÓN.
 *
 * A diferencia de `crear-usuarios-dev.mjs` (que corre como parte de db:reset),
 * este script se ejecuta UNA SOLA VEZ al configurar el proyecto hosted.
 *
 * Requisitos:
 *   1. El proyecto Supabase hosted ya debe estar creado y las migraciones aplicadas.
 *   2. `.env.local` debe tener las variables de producción:
 *      NEXT_PUBLIC_SUPABASE_URL=<url del proyecto hosted>
 *      SUPABASE_SERVICE_ROLE_KEY=<service_role del proyecto hosted>
 *
 * Uso:
 *   node --env-file=.env.local scripts/crear-usuarios-prod.mjs
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
    console.error(
        "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (¿.env.local apunta a producción?).",
    );
    process.exit(1);
}

// ⚠️ CAMBIA estas credenciales ANTES de ejecutar en producción.
// Son las contraseñas iniciales; cada usuario debe cambiarlas al primer login
// desde el panel de autenticación de Supabase o desde la app.
const usuarios = [
    {
        email: "alejandro@glcuenta.com",       // ← CAMBIAR por el correo real del admin
        password: "cambiar-esta-clave-ya",      // ← CAMBIAR por una contraseña fuerte
        nombre: "Alejandro (admin)",
        rol: "admin",
    },
    // Descomenta y ajusta para cada revendedor que necesite acceso:
    // {
    //   email: "revendedor@glcuenta.com",
    //   password: "cambiar-esta-clave-ya",
    //   nombre: "Nombre del Revendedor",
    //   rol: "revendedor",
    // },
];

const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
};

for (const u of usuarios) {
    // 1. Crear el usuario de Auth (el trigger `on_auth_user_created` crea su fila en `public.usuarios`).
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
        console.log(`  ✅ creado: ${u.email}`);
    } else {
        // Si ya existe (porque el script ya corrió antes), obtener su ID.
        const detalle = await alta.text();
        const lista = await fetch(`${url}/auth/v1/admin/users`, { headers });
        const { users = [] } = await lista.json();
        id = users.find((x) => x.email === u.email)?.id;
        if (id) {
            console.log(`  ⚠️  ya existía: ${u.email} (se actualiza el rol)`);
        } else {
            console.error(`  ❌ no se pudo crear ${u.email} (HTTP ${alta.status}): ${detalle}`);
            continue;
        }
    }

    // 2. Asegurar el rol (el trigger los crea siempre como `revendedor`).
    if (id && u.rol === "admin") {
        const patch = await fetch(`${url}/rest/v1/usuarios?id=eq.${id}`, {
            method: "PATCH",
            headers: { ...headers, Prefer: "return=minimal" },
            body: JSON.stringify({ rol: "admin" }),
        });
        if (!patch.ok) console.error(`  ❌ no se pudo promover a admin: ${await patch.text()}`);
        else console.log(`  ✅ promovido a admin: ${u.email}`);
    }
}

console.log("\n✅ Usuarios de producción listos.");
console.log("⚠️  Recuerda: cada usuario debe cambiar su contraseña en el primer login.");