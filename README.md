# Sales Master WhatsApp Gateway

Conector privado para integrar WhatsApp con GoHighLevel mediante:

- GoHighLevel Custom Conversation Provider
- Evolution API para conexion WhatsApp QR
- Meta WhatsApp Cloud API para conexion oficial
- Gateway TypeScript para enrutar mensajes inbound/outbound por tenant
- Workflows n8n de referencia

Este repositorio es una exportacion saneada para analisis tecnico y colaboracion. No incluye credenciales reales.

## Estructura

- `gateway-service/`: microservicio Express/TypeScript.
- `docker/`: compose base para Evolution API, Postgres y gateway.
- `caddy/`: ejemplo de reverse proxy.
- `n8n-workflows/`: workflows de referencia.
- `docs/`: guias, schema mapping, comparativa QR vs Meta y auditoria.

## Configuracion

1. Copia `.env.example` a `.env` en el entorno donde despliegues.
2. Rellena tokens y tenants reales fuera de Git.
3. Revisa `docs/AUDITORIA_PRIVADA_GOGHL_2026-06-14.md` antes de ponerlo en produccion.

## Estado

Base funcional en fase de auditoria. Antes de compartirlo con clientes hay que cerrar seguridad, routing, tenant isolation, colas/idempotencia y validacion contra payloads reales de HighLevel.

