# Configuracion paso a paso: WhatsApp privado para Sales Master

Esta guia despliega la ruta recomendada: GHL Custom Conversation Provider -> gateway propio -> Evolution API QR o Meta Cloud API.

## 1. Preparar variables

En el VPS:

```bash
cd /opt/whatsapp-connector
cp .env.example .env
nano .env
```

Completa como minimo:

- `PUBLIC_BASE_URL`
- `GATEWAY_SHARED_SECRET`
- `EVOLUTION_API_KEY`
- `EVOLUTION_POSTGRES_PASSWORD`
- `GHL_TENANTS`

En produccion:

```env
REQUIRE_GATEWAY_SECRET=true
ALLOW_DEFAULT_TENANT=false
LOG_MESSAGE_BODIES=false
```

## 2. Levantar Docker

```bash
cd /opt/whatsapp-connector/docker
docker compose up -d --build
docker compose ps
```

Comprueba healthcheck:

```bash
curl https://wa.salesmasterplus.cloud/healthz
```

## 3. Configurar Caddy

Copia `caddy/Caddyfile.example` a `/etc/caddy/Caddyfile`, ajusta el dominio y recarga:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Las rutas del gateway deben ir a `localhost:8086`:

- `/healthz`
- `/dashboard`
- `/api/dashboard`
- `/ghl-outbound`
- `/webhook/evolution-inbound`
- `/webhook/meta-whatsapp`

Evolution queda en `localhost:8085`.

## 4. Configurar la app privada en GHL

En el Developer Portal:

- App Distribution: `Private`
- Conversation Provider: activo
- Provider Type: `SMS`
- Delivery URL:

```text
https://wa.salesmasterplus.cloud/ghl-outbound?gatewaySecret=GATEWAY_SHARED_SECRET
```

Scopes minimos:

- `contacts.readonly`
- `contacts.write`
- `conversations.readonly`
- `conversations.write`
- `conversations/message.readonly`
- `conversations/message.write`

Instala la app en cada subcuenta de cliente.

## 5. Configurar cliente QR con Evolution

Ruta recomendada desde el dashboard:

```text
https://wa.salesmasterplus.cloud/dashboard
```

1. Introduce el `GATEWAY_SHARED_SECRET`.
2. Selecciona el tenant del cliente.
3. Crea la instancia Evolution si todavia no existe.
4. Pulsa `Conectar QR` y escanea el codigo con el WhatsApp dedicado del cliente.
5. Pulsa `Activar webhook` para apuntar esa instancia al `locationId` correcto.

Ruta alternativa por API, util si estas en terminal:

Crea la instancia:

```bash
curl -X POST https://wa.salesmasterplus.cloud/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: EVOLUTION_API_KEY" \
  -d '{
    "instanceName": "slug-del-cliente",
    "qrcode": true
  }'
```

Conecta QR:

```text
https://wa.salesmasterplus.cloud/instance/connect/slug-del-cliente
```

Configura el webhook de la instancia:

```text
https://wa.salesmasterplus.cloud/webhook/evolution-inbound?locationId=GHL_LOCATION_ID&gatewaySecret=GATEWAY_SHARED_SECRET
```

## 6. Configurar cliente oficial Meta

Para clientes que no pueden arriesgar bloqueo de numero:

1. Crea o usa WABA aprobada.
2. Configura `META_PHONE_NUMBER_ID`, `META_ACCESS_TOKEN`, `META_VERIFY_TOKEN` y `META_APP_SECRET`, o valores por tenant dentro de `GHL_TENANTS`.
3. En Meta Developers, webhook callback:

```text
https://wa.salesmasterplus.cloud/webhook/meta-whatsapp
```

4. Verify token: igual a `META_VERIFY_TOKEN`.
5. Suscribe el campo `messages`.

## 7. Prueba end-to-end

1. En GHL, instala la app en la subcuenta del cliente.
2. En la subcuenta, ve a `Settings > Phone Numbers > Advanced Settings > SMS Provider` y selecciona `Sales Master WhatsApp QR`.
3. Abre `Conversations`.
4. Crea o abre un contacto con telefono E.164.
5. Envia un SMS desde la UI de GHL.
6. Valida que llega por WhatsApp.
7. Responde desde WhatsApp.
8. Valida que el inbound aparece en la conversacion de GHL.
9. Revisa logs:

```bash
cd /opt/whatsapp-connector/docker
docker compose logs -f gateway-service
```

## 8. Regla operativa

Usa QR solo para clientes pequenos, pruebas y conversaciones reactivas con opt-in. Para clientes consolidados, usa Meta Cloud API oficial.
