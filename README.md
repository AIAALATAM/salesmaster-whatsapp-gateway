# Sales Master WhatsApp Gateway

Gateway privado para conectar GoHighLevel con WhatsApp usando infraestructura propia de Sales Master.

Soporta:

- GoHighLevel Custom Conversation Provider.
- WhatsApp QR via Evolution API.
- WhatsApp oficial via Meta Cloud API.
- Multi-tenant por `locationId`.
- Webhooks protegidos por secreto compartido.
- Inbound correcto a `/conversations/messages/inbound`.
- Payload outbound actual de HighLevel (`message`/`phone`) y legacy (`body`/`to`).

## Arranque rapido

```bash
cp .env.example .env
cd docker
docker compose up -d --build
```

Configura Caddy con `caddy/Caddyfile.example`.

Healthcheck:

```bash
curl https://wa.salesmasterplus.cloud/healthz
```

## Documentacion principal

- `docs/CONFIGURACION_PASO_PASO.md`
- `docs/CONFIGURACION_MULTITENANT.md`
- `docs/PLAYBOOK_CLIENTES_SALESMASTERULTRA.md`
- `docs/SCHEMA_MAPPING.md`
- `docs/AUDITORIA_PRIVADA_GOGHL_2026-06-14.md`

## Estado

Listo como MVP operativo endurecido. Pendiente para paridad avanzada con GoGHL:

- Cola persistente e idempotencia duradera.
- Webhooks de delivery/read ack reales.
- Portal visual para QR por cliente.
- Media/audio/botones nativos.

