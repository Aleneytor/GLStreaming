# Pendientes — MVP en prueba de 1 mes (desde 2026-08-08)

> 🧪 **FASE DE PRUEBA.** La app está operativa en `https://glcuenta.com`.
> El administrador la usa en el día a día. No se agregan features nuevos:
> solo se corrigen bugs críticos. Al terminar el mes se revisa todo.

---

## Resumen de lo completado en esta sesión (2026-08-08)

- ✅ Despliegue en producción: Supabase Free Tier + Netlify + glcuenta.com
- ✅ 61 migraciones aplicadas al proyecto hosted
- ✅ Usuario admin creado: alejandro@glcuenta.com
- ✅ Página `/usuarios` fusionada dentro de Red comercial como pestaña "Accesos"
- ✅ Crear usuarios revendedores desde la UI (email + contraseña)
- ✅ Cambiar contraseña de cualquier usuario desde el panel
- ✅ Menú reorganizado: Personal en el header, Catálogo al final
- ✅ Catálogo dividido: Catálogo (productos/plataformas) + Red comercial (vendedores/proveedores/accesos)
- ✅ Panel del revendedor: nombres simplificados (Perfil/Perfil extra/Cuenta completa)
- ✅ Panel del revendedor: colores sutiles por plataforma
- ✅ Service Worker arreglado: network-first en vez de cache-first (ya no rompe los deploys)
- ✅ CSP configurable, PWA funcional, cabeceras de seguridad
- ✅ Guía de despliegue completa en `docs/14-guia-despliegue-supabase-netlify.md`
- ✅ `netlify.env` con todas las variables de producción
- ✅ 214 unitarias, typecheck y build en verde

## Próxima sesión (septiembre 2026)

El usuario revisará:
- Qué funciona bien en el día a día
- Qué ajustes o features faltan
- Si la app reemplaza completamente el Excel