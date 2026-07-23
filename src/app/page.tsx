export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div className="flex items-center gap-3">
        <span className="text-3xl">📺</span>
        <h1 className="text-2xl font-semibold tracking-tight">GL Streaming</h1>
      </div>

      <p className="text-neutral-600 dark:text-neutral-400">
        Fundación técnica — Fase 1. Este esqueleto es el punto de partida del
        panel de inventario, ventas, renovaciones, finanzas y revendedores.
      </p>

      <div className="rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
        <p className="font-medium">Estado del boceto</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-neutral-600 dark:text-neutral-400">
          <li>Scaffold Next.js + TypeScript + Tailwind ✓</li>
          <li>Helpers de Supabase (cliente/servidor) ✓</li>
          <li>Migración de fundación/catálogo con RLS ✓</li>
          <li>Seed sintético del catálogo ✓</li>
          <li>Siguiente: capa de inventario, ciclo comercial y finanzas</li>
        </ul>
      </div>

      <p className="text-xs text-neutral-500">
        Para levantarlo en local: ver{" "}
        <code className="rounded bg-neutral-100 px-1 py-0.5 dark:bg-neutral-800">
          docs/09-fase-1-setup.md
        </code>
      </p>
    </main>
  );
}
