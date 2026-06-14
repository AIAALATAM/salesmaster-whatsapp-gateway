# HighLevel Release Radar 2026-06-08 a 2026-06-12

Impacto sobre `Sales Master WhatsApp Gateway`.

## Cambios relevantes

- `Public APIs V3`: relevante. El gateway debe enviar `Version: v3` en llamadas a LeadConnector/HighLevel.
- `LeadConnector Plugin V4`: no bloquea el gateway. Afecta al plugin LeadConnector, no al Conversation Provider privado.
- `Social Planner Comment Management Public API`: no afecta al flujo WhatsApp/GHL actual.
- `Media Library Files & Folders Auto-Rename`: no afecta al flujo WhatsApp/GHL actual.
- `Business Metrics in Agent Logs`: util para observabilidad futura, pero no requerido para probar QR.

## Decision aplicada

El valor recomendado queda:

```env
GHL_VERSION=v3
```

El gateway mantiene:

- Outbound desde GHL: `/ghl-outbound`
- Inbound a HighLevel: `/conversations/messages/inbound`
- Status update: `/conversations/messages/:messageId/status`
- Provider: SMS Conversation Provider privado

## Donde probar

1. Dashboard del gateway:

```text
https://wa.salesmasterplus.cloud/dashboard
```

2. Activacion en subcuenta:

```text
Settings > Phone Numbers > Advanced Settings > SMS Provider
```

3. Probar desde:

```text
Conversations > contacto con telefono E.164 > Send SMS
```
