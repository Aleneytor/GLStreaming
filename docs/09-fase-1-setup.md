# Fase 1 — Puesta en marcha local

Instrucciones para levantar el esqueleto de GL Streaming en tu máquina. Todo es
**local**: no se toca el VPS, `glcuenta.com` ni el proyecto Kuanto en vivo.

## Requisitos

| Herramienta | Estado en tu equipo (22/07/2026) | Nota |
|---|---|---|
| Node.js | ✅ v25.2.1 | OK |
| npm | ✅ 11.6.2 | OK |
| Git | ✅ 2.52 | OK |
| **Docker Desktop** | ❌ falta | **Necesario** para levantar Supabase local |
| Supabase CLI | ❌ (se instala con el proyecto) | Viene como `devDependency`; se usa con `npx supabase` |

### Instalar Docker Desktop (Windows)

1. Descárgalo de https://www.docker.com/products/docker-desktop/
2. Instálalo y reinicia si lo pide (activa WSL2 si Windows lo solicita).
3. Ábrelo y espera a que diga "Engine running".
4. Verifica en una terminal: `docker --version`.

Sin Docker corriendo, `npx supabase start` no funcionará (Supabase local usa
contenedores).

## Pasos

```bash
# 1. Instalar dependencias del proyecto (incluye el CLI de Supabase)
npm install

# 2. Inicializar la config local de Supabase (genera supabase/config.toml)
#    Si pregunta por sobrescribir seed.sql, responde N (No).
npx supabase init

# 3. Levantar el stack local (Postgres + Auth + API). Requiere Docker corriendo.
#    La primera vez descarga imágenes; puede tardar unos minutos.
npx supabase start

#    Al terminar imprime las claves locales: API URL, anon key y service_role key.

# 4. Crear .env.local a partir de la plantilla y pegar esos valores
cp .env.example .env.local
#    Rellena NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#    SUPABASE_SERVICE_ROLE_KEY con lo que imprimió el paso 3.
#    Genera la clave de cifrado:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
#    y pégala en GLS_ENCRYPTION_KEY.

# 5. Aplicar migraciones + seed (recrea la base desde cero)
npx supabase db reset

# 6. Generar los tipos TypeScript del esquema
npm run db:types

# 7. Arrancar la app
npm run dev
#    Abre http://localhost:3000
```

## Probar desde el teléfono (mobile-first)

La app es mobile-first, así que conviene probarla en un móvil real, no solo en el
navegador de escritorio.

1. El PC y el teléfono deben estar en la **misma red Wi-Fi**.
2. Averigua la IP local del PC:
   `Get-NetIPAddress -AddressFamily IPv4 | Where-Object InterfaceAlias -eq 'Wi-Fi'`
3. En `.env.local`, `NEXT_PUBLIC_SUPABASE_URL` **debe apuntar a esa IP**, no a
   `127.0.0.1`. Desde el teléfono, `127.0.0.1` es el teléfono mismo: el login
   fallaría con un error de red (Supabase local ya escucha en `0.0.0.0`).
4. Añade esa IP a `allowedDevOrigins` en `next.config.ts`.
5. Arranca con `npx next dev -H 0.0.0.0` y abre `http://<IP>:3000` en el móvil.
6. Tras cambiar `.env.local` hay que **reiniciar** el servidor de desarrollo, y
   conviene recargar sin caché en el móvil (puede tener el bundle viejo).

> La IP cambia si te reconectas a otra red o el router reasigna DHCP; entonces
> hay que actualizar los pasos 3 y 4. En producción esto desaparece: será el
> dominio `glcuenta.com` por HTTPS.

## Verificación rápida

- `npx supabase start` deja disponible **Supabase Studio** (panel visual) en
  http://127.0.0.1:54323 — ahí puedes ver las tablas y el catálogo sembrado.
- En Studio → Table editor deberías ver 15 filas en `plataformas`, los productos
  con sus capacidades (Netflix 5, Disney+ 7, Canva 500, etc.) y el proveedor `Yo`.
- `npm run typecheck` no debe dar errores.

## Crear el primer administrador

El seed no crea usuarios (eso requiere el sistema de Auth). Para tener un admin:

1. En Supabase Studio → Authentication → Add user, crea un usuario con correo y
   contraseña. El trigger `handle_new_user` le crea automáticamente su fila en
   `usuarios` con rol `revendedor`.
2. En Studio → SQL editor, promuévelo a admin:
   ```sql
   update public.usuarios set rol = 'admin' where id = '<uuid del usuario>';
   ```

A partir de ahí, ese usuario pasa el chequeo `es_admin()` y puede escribir en el
catálogo mediante la app.

## Qué NO hacer todavía

- No conectar a Kuanto en vivo: el secreto expuesto sigue sin rotar. En local se
  usarán datos de tasa simulados hasta que se resuelva (ver `07-integracion-tasas.md`).
- No desplegar nada al VPS ni a `glcuenta.com` (eso es Fase 6).

## Qué viene después (siguientes rebanadas de la Fase 1)

Esta primera entrega cubre la **capa de fundación/catálogo**. Las siguientes
migraciones añadirán, en orden:

1. **Inventario y secretos**: `cuentas`, `unidades_inventario`, `credenciales_cuenta`,
   `secretos_unidad`, `reservas_inventario`, cifrado AES-256-GCM a nivel de app.
2. **Clientes y ciclo comercial**: `clientes`, `contactos_comerciales`,
   `suscripciones`, `asignaciones_inventario`, `periodos_servicio`, `pagos_cliente`,
   `sesiones_carga_inicial`.
3. **Proveedores y finanzas**: `ciclos_proveedor`, `pagos_proveedor`,
   `gastos_operativos`, `tasas_cambio`, `cierres_mensuales`.
4. **Rama Spotify**: identidades, coberturas, controles de pago, incidencias.
5. **Vistas seguras + suite de pruebas RLS** contra los 5 perfiles.
