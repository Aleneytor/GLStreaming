"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: contrasena,
    });

    if (error) {
      // Se distingue un fallo de RED de una credencial inválida: agrupar todo
      // como "contraseña incorrecta" oculta problemas de configuración y hace
      // perder tiempo diagnosticando.
      const fallaDeRed =
        error.name === "AuthRetryableFetchError" || !error.status || error.status >= 500;

      setError(
        fallaDeRed
          ? `No se pudo conectar con el servidor. Revisa la conexión o la URL de Supabase. (${error.message})`
          : // Para credenciales: mensaje genérico, no revelamos si el correo existe.
            "Correo o contraseña incorrectos.",
      );
      setCargando(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* La marca es monocroma (blanco sobre oscuro, como en las piezas del
              negocio). En claro se invierte a negro: invertir una marca
              monocroma es su uso estándar, no un color nuevo. */}
          <h1>
            <Image
              src="/logo-gl-completo.png"
              alt="GL Streaming Services"
              width={900}
              height={608}
              priority
              className="mx-auto h-auto w-48 invert dark:invert-0"
            />
          </h1>
          <p className="mt-5 text-sm text-neutral-500 dark:text-neutral-400">
            Inicia sesión para continuar
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="correo" className="mb-1.5 block text-sm font-medium">
              Correo
            </label>
            <input
              id="correo"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="contrasena" className="mb-1.5 block text-sm font-medium">
              Contraseña
            </label>
            <input
              id="contrasena"
              type="password"
              autoComplete="current-password"
              required
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-blue-500"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-neutral-900 px-4 py-3 text-base font-medium text-white transition active:scale-[0.99] disabled:opacity-60 dark:bg-white dark:text-neutral-900"
          >
            {cargando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
