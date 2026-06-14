# Playbook clientes SalesMastersUltra

Este playbook deja el conector listo para operar con clientes del workspace `Clientes/{slug}`.

## Checklist por cliente

Para cada cliente:

- Slug del cliente: `Clientes/{slug}`
- Location ID GHL
- PIT de la subcuenta
- Tipo de canal: `QR` u `OFFICIAL`
- Instancia Evolution: normalmente el mismo slug
- Telefono WhatsApp dedicado
- Opt-in documentado para automatizacion

## Plantilla de tenant QR

```json
"GHL_LOCATION_ID": {
  "pit": "GHL_LOCATION_PIT",
  "instanceName": "slug-del-cliente",
  "gateway": "QR"
}
```

## Plantilla de tenant Meta oficial

```json
"GHL_LOCATION_ID": {
  "pit": "GHL_LOCATION_PIT",
  "instanceName": "slug-del-cliente",
  "gateway": "OFFICIAL",
  "metaPhoneNumberId": "META_PHONE_NUMBER_ID",
  "metaAccessToken": "META_ACCESS_TOKEN"
}
```

## Criterio de decision

Usa `QR` para:

- Pruebas internas.
- Clientes pequenos.
- Respuestas reactivas con volumen bajo.
- Numeros no criticos.

Usa `OFFICIAL` para:

- Clientes con reputacion alta.
- Numeros principales.
- Campanas con plantillas.
- Operacion estable a largo plazo.

## Validacion antes de marcar cliente listo

1. `curl /healthz` devuelve `status: ok`.
2. Tenant existe en `GHL_TENANTS`.
3. Evolution muestra instancia conectada o Meta webhook validado.
4. Envio outbound desde GHL llega a WhatsApp.
5. Respuesta inbound desde WhatsApp aparece en GHL.
6. Logs no muestran cuerpos de mensaje si `LOG_MESSAGE_BODIES=false`.
7. No hay fallback default: `ALLOW_DEFAULT_TENANT=false`.
8. Secreto activo: `REQUIRE_GATEWAY_SECRET=true`.

## Incidencias comunes

- `Unknown GHL locationId`: el tenant no existe o GHL envia otro `locationId`.
- `Invalid gateway secret`: revisar query/header configurado en GHL o Evolution.
- `Evolution instance does not match`: el webhook de una instancia apunta al `locationId` de otro cliente.
- `Meta signature invalid`: revisar `META_APP_SECRET` y que Caddy no modifique el body.
- Inbound no aparece: confirmar PIT, scopes y endpoint `/conversations/messages/inbound`.

