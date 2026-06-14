# Seguridad

Nunca subas credenciales reales a Git.

Credenciales que deben vivir fuera del repo:

- GHL PITs
- GHL Client Secret
- Evolution API key
- Meta access tokens
- Meta app secret
- Password de Postgres
- IPs o rutas SSH sensibles

Antes de produccion:

1. Rota cualquier secreto que haya aparecido en docs antiguas, capturas o logs.
2. Usa `.env` en el VPS o un secret manager.
3. Mantiene `REQUIRE_GATEWAY_SECRET=true`.
4. Mantiene `ALLOW_DEFAULT_TENANT=false`.
5. Mantiene `LOG_MESSAGE_BODIES=false`.
6. Valida firma Meta con `META_APP_SECRET`.
7. No uses QR para cold outreach ni mensajes masivos.

