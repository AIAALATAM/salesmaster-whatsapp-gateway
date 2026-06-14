# Configuracion multitenant del Sales Master WhatsApp Gateway

Este gateway sirve a multiples subcuentas de GoHighLevel desde una sola app privada de Sales Master. Cada cliente se resuelve por `locationId` y se enruta a su propia instancia de WhatsApp QR o a su numero oficial de Meta.

## Archivos relevantes

- Codigo: `gateway-service/`
- Docker: `docker/docker-compose.yml`
- Proxy: `caddy/Caddyfile.example`
- Variables: `.env` en el VPS, creado desde `.env.example`
- Auditoria: `docs/AUDITORIA_PRIVADA_GOGHL_2026-06-14.md`

## Regla de oro

No guardes PITs, Client Secrets, API keys, tokens Meta, passwords ni IPs sensibles en Git. Todo secreto real vive en `.env` del VPS o en un secret manager.

## Estructura de `GHL_TENANTS`

`GHL_TENANTS` es un JSON en una sola linea. La clave es el `locationId` de la subcuenta GHL.

```json
{
  "GHL_LOCATION_ID_BB_CLEANING": {
    "pit": "GHL_LOCATION_PIT_BB_CLEANING",
    "instanceName": "bb-cleaning-360",
    "gateway": "QR",
    "conversationProviderId": "OPTIONAL_PROVIDER_ID"
  },
  "GHL_LOCATION_ID_CLEANPRO": {
    "pit": "GHL_LOCATION_PIT_CLEANPRO",
    "instanceName": "cleanpro-marbella",
    "gateway": "QR"
  },
  "GHL_LOCATION_ID_OFFICIAL_META": {
    "pit": "GHL_LOCATION_PIT_META_CLIENT",
    "instanceName": "meta-client-placeholder",
    "gateway": "OFFICIAL",
    "metaPhoneNumberId": "META_PHONE_NUMBER_ID",
    "metaAccessToken": "META_ACCESS_TOKEN"
  }
}
```

Campos:

- `pit`: Private Integration Token de la subcuenta GHL.
- `instanceName`: nombre de la instancia en Evolution API. Es obligatorio incluso si el tenant usa Meta, para mantener forma consistente.
- `gateway`: `QR` u `OFFICIAL`. Si se omite, usa `ACTIVE_GATEWAY`.
- `conversationProviderId`: opcional; se usa si el provider fue configurado como canal custom adicional.
- `metaPhoneNumberId` y `metaAccessToken`: obligatorios para tenants `OFFICIAL` que no usen los valores globales de Meta.

## Seguridad multitenant

`ALLOW_DEFAULT_TENANT=false` debe quedarse asi en produccion. Si un mensaje llega sin `locationId` o con una instancia desconocida, el gateway rechaza la peticion en vez de usar un cliente por defecto.

`REQUIRE_GATEWAY_SECRET=true` obliga a enviar el secreto compartido:

- Header recomendado: `x-salesmaster-gateway-secret: <GATEWAY_SHARED_SECRET>`
- Fallback cuando el proveedor no permite headers: `?gatewaySecret=<GATEWAY_SHARED_SECRET>`

Para Evolution inbound, configura el webhook de cada instancia asi:

```text
https://wa.salesmasterplus.cloud/webhook/evolution-inbound?locationId=GHL_LOCATION_ID_DEL_CLIENTE&gatewaySecret=GATEWAY_SHARED_SECRET
```

Para GHL outbound, usa como Delivery URL:

```text
https://wa.salesmasterplus.cloud/ghl-outbound?gatewaySecret=GATEWAY_SHARED_SECRET
```

## Alta de un cliente SalesMastersUltra

1. Abre `Clientes/{slug}/01_BRIEF.json` y confirma nombre, subcuenta GHL y telefono de WhatsApp.
2. En GHL, instala la app privada `Sales Master WhatsApp Gateway` en la subcuenta.
3. Genera un PIT de la subcuenta con scopes de contactos y conversaciones.
4. Crea o identifica la instancia Evolution con nombre igual al slug del cliente, por ejemplo `bb-cleaning-360`.
5. Anade el tenant al JSON `GHL_TENANTS` del `.env`.
6. Configura el webhook inbound de Evolution con `locationId` y `gatewaySecret`.
7. En GHL, activa el provider en `Settings > Phone Numbers > Advanced Settings > SMS Provider`.
8. Reinicia el gateway:

```bash
cd /opt/whatsapp-connector/docker
docker compose up -d --build gateway-service
```

9. Prueba:

```bash
curl https://wa.salesmasterplus.cloud/healthz
```

10. Envia un SMS desde Conversations en GHL y responde desde WhatsApp para validar ida y vuelta.

## Offboarding

1. Desactiva el provider en GHL.
2. Borra o desconecta la instancia Evolution.
3. Elimina el tenant de `GHL_TENANTS`.
4. Rota el PIT del cliente.
5. Reinicia `gateway-service`.

