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
- Dashboard privado para operar instancias QR, copiar URLs y probar clientes.

## Arranque rapido

```bash
cp .env.example .env
cd docker
docker compose --env-file ../.env up -d --build
```

Configura Caddy con `caddy/Caddyfile.example`.

Healthcheck:

```bash
curl https://wa.salesmasterplus.cloud/healthz
```

Dashboard operativo:

```text
https://wa.salesmasterplus.cloud/dashboard
```

El dashboard pide el `GATEWAY_SHARED_SECRET` y desde ahi permite crear instancias Evolution, conectar el QR del cliente, configurar el webhook inbound y copiar la Delivery URL para GHL.

## Documentacion principal

- `docs/DASHBOARD_QR_SMP.md`
- `docs/HIGHLEVEL_RELEASE_RADAR_2026-06-12.md`
- `docs/CONFIGURACION_PASO_PASO.md`
- `docs/CONFIGURACION_MULTITENANT.md`
- `docs/PLAYBOOK_CLIENTES_SALESMASTERULTRA.md`
- `docs/SCHEMA_MAPPING.md`
- `docs/AUDITORIA_PRIVADA_GOGHL_2026-06-14.md`

## Estado

Listo como MVP operativo endurecido con dashboard QR privado. Pendiente para paridad avanzada con GoGHL:

- Cola persistente e idempotencia duradera.
- Webhooks de delivery/read ack reales.
- Media/audio/botones nativos.
