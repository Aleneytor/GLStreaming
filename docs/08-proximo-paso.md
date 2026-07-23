# Próximo paso

## Estado alcanzado

La ficha funcional de **Spotify** ya está documentada en `docs/plataformas/spotify.md` y el catálogo inicial de plataformas queda completo para esta ronda.

Spotify confirmó cambios transversales que deben formar parte de la revisión final del dominio:

- separación entre identidad de acceso y cobertura proveedor;
- precio manual congelado en USD, cobro VES a BCV y lectura económica paralela;
- familia con madre administradora más cinco miembros;
- uso de madre vendible de forma excepcional y concurrente, sin transferir administración;
- bloqueo recuperable de nuevas incorporaciones a nivel familia;
- incidentes familiares por lote y recreación de identidades sin reiniciar períodos;
- separación entre beneficiario, contacto de cobro e intermediario;
- destrucción de credenciales propiedad del cliente al finalizar.

## Pendiente inmediato

1. Revisar la ficha Spotify y las actualizaciones del modelo como una sola unidad funcional.
2. Reconciliar las decisiones P0 restantes de `docs/06-decisiones-pendientes.md`, especialmente seguridad, YouTube, Netflix extra, cierres y fuentes de tasas.
3. Confirmar que ninguna pregunta pendiente cambia entidades o restricciones de la Fase 1.
4. Aprobar el catálogo funcional y congelar una versión documental de referencia.
5. Mantener el proyecto sin código hasta recibir una instrucción expresa para iniciar la Fase 1.

La detección automática del fin del bloqueo Spotify `no se puede` no impide cerrar el esquema: por ahora seguirá siendo una prueba y confirmación manual del administrador.
