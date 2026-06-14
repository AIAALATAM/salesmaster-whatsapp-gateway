# Mapeo de esquemas JSON

## 1. GHL outbound -> Gateway

Endpoint:

```text
POST /ghl-outbound
```

HighLevel Provider Outbound Message v3 envia:

```json
{
  "contactId": "GHL_CONTACT_ID",
  "locationId": "GHL_LOCATION_ID",
  "messageId": "GHL_MESSAGE_ID",
  "type": "SMS",
  "phone": "+15864603685",
  "message": "Texto a enviar",
  "attachments": ["https://example.com/file.png"],
  "userId": "GHL_USER_ID"
}
```

El gateway tambien acepta payload legacy:

```json
{
  "locationId": "GHL_LOCATION_ID",
  "messageId": "GHL_MESSAGE_ID",
  "to": "+15864603685",
  "body": "Texto a enviar"
}
```

## 2. Gateway -> Evolution API QR

```text
POST /message/sendText/{instanceName}
```

```json
{
  "number": "15864603685",
  "options": {
    "delay": 0,
    "presence": "composing"
  },
  "textMessage": {
    "text": "Texto a enviar"
  }
}
```

## 3. Gateway -> Meta Cloud API

```text
POST https://graph.facebook.com/{META_GRAPH_VERSION}/{phoneNumberId}/messages
```

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "15864603685",
  "type": "text",
  "text": {
    "body": "Texto a enviar"
  }
}
```

## 4. Evolution inbound -> Gateway

Endpoint configurado en cada instancia Evolution:

```text
POST /webhook/evolution-inbound?locationId=GHL_LOCATION_ID&gatewaySecret=GATEWAY_SHARED_SECRET
```

El gateway procesa `messages.upsert`, ignora mensajes `fromMe`, resuelve el tenant y crea/inserta el inbound en GHL.

## 5. Meta inbound -> Gateway

Endpoint:

```text
GET/POST /webhook/meta-whatsapp
```

GET valida `hub.verify_token`. POST valida `X-Hub-Signature-256` si `META_APP_SECRET` esta configurado.

## 6. Gateway -> GHL inbound

Endpoint oficial:

```text
POST /conversations/messages/inbound
```

Payload:

```json
{
  "type": "SMS",
  "contactId": "GHL_CONTACT_ID",
  "message": "Texto recibido"
}
```

Si el provider fue configurado como canal custom adicional, el gateway incluye:

```json
{
  "conversationProviderId": "GHL_CONVERSATION_PROVIDER_ID"
}
```

## 7. Gateway -> GHL status update

Endpoint:

```text
PUT /conversations/messages/{messageId}/status
```

El gateway marca:

- `sent` cuando Evolution/Meta acepta el envio.
- `failed` cuando falla el dispatch.

No marca `delivered` hasta implementar webhooks de ack real del proveedor.

