# 🔀 Documentación de Mapeo de Esquemas JSON

Este documento detalla la estructura y el flujo de los objetos de datos procesados por el microservicio `gateway-service` para sincronizar los mensajes bidireccionalmente.

---

## 📤 1. Mensaje Saliente (GHL -> VPS Gateway)
Petición `POST` recibida en `/ghl-outbound` enviada de forma nativa por GHL.

```json
{
  "type": "SMS",
  "locationId": "string (ID de la subcuenta en GHL)",
  "conversationId": "string (ID del hilo de chat en GHL)",
  "messageId": "string (ID único del mensaje generado por GHL)",
  "body": "string (El texto escrito por el agente o workflow)",
  "attachments": "array (URLs de adjuntos opcionales)",
  "contactId": "string (ID del contacto del CRM)",
  "to": "string (Teléfono en formato E.164, ej: +34663396642)"
}
```

---

## 📥 2. Inyección de Mensaje Entrante (VPS Gateway -> GHL API v2)
Llamada `POST` realizada a `https://services.leadconnectorhq.com/conversations/messages` para pintar el chat del cliente.

```json
{
  "type": "WhatsApp",
  "contactId": "string (ID del contacto resuelto en GHL)",
  "body": "string (El texto del WhatsApp del cliente)",
  "direction": "inbound",
  "status": "delivered"
}
```

---

## 📈 3. Actualización de Check de Entrega (VPS Gateway -> GHL API v2)
Llamada `PUT` a `https://services.leadconnectorhq.com/conversations/messages/{messageId}/status` para actualizar la confirmación de lectura.

```json
{
  "status": "delivered" // Valores válidos: "sent" | "delivered" | "failed"
}
```

---

## 📱 4. Envío a Evolution API QR (VPS Gateway -> Evolution API)
Petición `POST` a `/message/sendText/{instanceName}` para despachar mediante la sesión QR.

```json
{
  "number": "string (Solo dígitos del teléfono, ej: 34663396642)",
  "options": {
    "delay": 0, // Delay de colas nativo
    "presence": "composing" // Muestra "Escribiendo..." en el chat del cliente
  },
  "textMessage": {
    "text": "string (El mensaje a enviar)"
  }
}
```

---

## 💼 5. Envío a Meta Cloud API Oficial (VPS Gateway -> Meta API)
Petición `POST` a `https://graph.facebook.com/v20.0/{phoneNumberId}/messages` para despachar de forma oficial.

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "string (Solo dígitos)",
  "type": "text",
  "text": {
    "body": "string (Cuerpo del mensaje)"
  }
}
```
