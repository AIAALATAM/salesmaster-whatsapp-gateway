# Auditoria: Sales Master WhatsApp Gateway privado tipo GoGHL

Fecha: 2026-06-14
Alcance: `Recursos/whatsapp-connector`

## Estado tras remediacion

Remediado en esta version:

- Secretos reales retirados de `docker-compose`, docs principales y config por defecto.
- `.env.example`, `.gitignore`, `README.md` y `SECURITY.md` creados.
- Caddy enruta `/ghl-outbound`, `/webhook/evolution-inbound`, `/webhook/meta-whatsapp` y `/healthz` al gateway en `8086`.
- Gateway acepta payload HighLevel v3 (`message`/`phone`) y legacy (`body`/`to`).
- Inbound migra a `/conversations/messages/inbound`.
- Tenant strict por defecto con `ALLOW_DEFAULT_TENANT=false`.
- Proteccion por secreto compartido con `GATEWAY_SHARED_SECRET`.
- Validacion opcional de firma Meta con `META_APP_SECRET`.
- Logs dejan de imprimir cuerpos de mensajes por defecto.
- Workflows n8n legacy corregidos para phone formatting y endpoint inbound.

Pendiente para paridad avanzada con GoGHL:

- Cola persistente e idempotencia duradera.
- Webhooks de delivery/read ack reales.
- Portal visual para QR por cliente.
- Media/audio/botones nativos.

## Resumen ejecutivo

El conector actual ya contiene la base correcta para un "GoGHL privado": un gateway TypeScript, modo QR con Evolution API, modo oficial con Meta Cloud API, instalacion como app privada de GHL y una primera estrategia multitenant por `locationId`.

Todavia no esta listo para operar como producto privado para clientes de Sales Master. Los bloqueantes principales son: secretos reales en archivos versionados, rutas publicas sin autenticacion propia, Caddy configurado solo hacia Evolution API y no hacia el gateway, payload outbound posiblemente incompatible con el esquema actual de HighLevel, uso de endpoint inbound que debe validarse contra la version actual de API, falta de UI/onboarding para QR por cliente, falta de cola/rate limiting/idempotencia y soporte limitado de media, voz, adjuntos, botones y multi-numero.

Referencia externa revisada:
- GoGHL se posiciona con QR connect, integracion nativa en GHL, sin Twilio ni coste por mensaje, white label, multi-numero, spintax, drip, voice/media, botones y n8n.
- Docs oficiales de HighLevel revisadas para Conversation Providers, Provider Outbound Message, Add Inbound Message y Update Message Status.

## Hallazgos bloqueantes

### 1. Secretos y tokens expuestos en repo/docs

Impacto: critico.

Evidencia:
- `docs/CONFIGURACION_MULTITENANT.md:21-24` expone App ID, Client ID, Client Secret y Provider ID.
- `docs/CONFIGURACION_MULTITENANT.md:34-37` lista PITs por cliente.
- `docs/CONFIGURACION_MULTITENANT.md:46-49` repite PITs y API key dentro de `GHL_TENANTS`.
- `docker/docker-compose.yml:10`, `docker/docker-compose.yml:36`, `docker/docker-compose.yml:41`, `docker/docker-compose.yml:61`, `docker/docker-compose.yml:63` contienen passwords, API key y PITs.
- `gateway-service/src/config.ts:44` usa una API key por defecto.
- `gateway-service/src/config.ts:50` usa un verify token por defecto.

Riesgo:
- Cualquier persona con acceso al repo o backup puede leer datos de clientes y/o enviar mensajes.
- Dificulta afirmar que es "privado" o GDPR-friendly.

Accion recomendada:
- Rotar inmediatamente todos los Client Secrets, PITs, API keys y passwords publicados.
- Sustituir valores por placeholders.
- Crear `.env.example` sin secretos.
- Mover secretos reales a un secret manager o, minimo, archivos `.env` fuera de Git.
- Anadir escaneo de secretos en pre-commit/CI.

### 2. El Caddyfile publicado no enruta el gateway

Impacto: critico.

Evidencia:
- `docs/GUIA_PORTAL_DESARROLLADORES.md:52-54` indica que `https://wa.salesmasterplus.cloud/ghl-outbound` debe llegar al gateway en puerto 8086.
- `docs/CONFIGURACION_MULTITENANT.md:83` indica que Evolution debe enviar inbound a `/webhook/evolution-inbound`.
- `docker/docker-compose.yml:54` expone `gateway-service` solo en `127.0.0.1:8086`.
- `caddy/Caddyfile.example:10-12` hace `reverse_proxy localhost:8085`, es decir, todo el dominio va a Evolution API.

Riesgo:
- GHL podria enviar `/ghl-outbound` a Evolution API en vez de al gateway.
- Evolution podria intentar enviar inbound al gateway, pero Caddy lo mandaria a Evolution API.

Accion recomendada:
- Configurar rutas por path:
  - `/ghl-outbound` -> `localhost:8086`
  - `/webhook/evolution-inbound` -> `localhost:8086`
  - `/webhook/meta-whatsapp` -> `localhost:8086`
  - `/instance/*`, `/message/*`, panel Evolution -> `localhost:8085`
- Valorar separar dominios: `wa-api.salesmasterplus.cloud` para Evolution y `wa-gateway.salesmasterplus.cloud` para el gateway.

### 3. Endpoints publicos sin autenticacion propia ni validacion de origen

Impacto: critico.

Evidencia:
- `gateway-service/src/index.ts:16` recibe `/ghl-outbound` sin verificar firma, token compartido o allowlist.
- `gateway-service/src/index.ts:59` recibe `/webhook/evolution-inbound` sin verificar que venga de Evolution.
- `gateway-service/src/index.ts:142` recibe `/webhook/meta-whatsapp` sin verificar firma `X-Hub-Signature-256`.
- `gateway-service/src/index.ts:8` acepta JSON globalmente sin limite explicito.

Riesgo:
- Un tercero podria llamar `/ghl-outbound` y enviar mensajes por WhatsApp si conoce la URL y un `locationId` valido o cae en el tenant por defecto.
- Un tercero podria inyectar mensajes falsos en GHL.
- Riesgo de abuso por payloads grandes.

Accion recomendada:
- Requerir `X-SalesMaster-Gateway-Secret` o firma HMAC en rutas internas.
- Validar firma de Meta en inbound oficial.
- Validar API key o IP/origen de Evolution.
- Anadir `express.json({ limit: "256kb" })`.
- Anadir rate limiting por IP, tenant e instancia.

### 4. Payload outbound probablemente no coincide con el webhook oficial actual

Impacto: alto.

Evidencia:
- El codigo espera `{ body, to }` en `gateway-service/src/index.ts:17-21`.
- La documentacion oficial actual de HighLevel para Provider Outbound Message muestra campos `message` y `phone`, no `body` y `to`.
- El doc local `docs/SCHEMA_MAPPING.md:16-19` documenta `body` y `to`.

Riesgo:
- El gateway podria devolver 400 o no enviar nada cuando GHL dispare el provider real.

Accion recomendada:
- Soportar ambos esquemas:
  - `text = payload.message ?? payload.body`
  - `phone = payload.phone ?? payload.to`
- Guardar fixtures reales del webhook de GHL y testearlos.

### 5. Endpoint inbound hacia GHL debe verificarse contra API actual

Impacto: alto.

Evidencia:
- `gateway-service/src/services/ghl.ts:77-85` postea inbound a `/conversations/messages` con `direction: "inbound"`.
- `n8n-workflows/evolution-inbound.json:130` y `n8n-workflows/meta-inbound.json:178` hacen lo mismo.
- La doc oficial actual de HighLevel muestra `POST /conversations/messages/inbound` para Add Inbound Message.

Riesgo:
- Inbound puede fallar silenciosamente, crear threads incorrectos o depender de una version antigua.

Accion recomendada:
- Validar en staging con la version API configurada (`GHL_VERSION=v3`).
- Si aplica, migrar a `/conversations/messages/inbound`.
- Incluir `contactId` o `conversationId`, canal, endpoint phone e `idempotencyKey`.

### 6. Multi-tenant aun no esta aislado de forma segura

Impacto: alto.

Evidencia:
- Si `locationId` no existe, outbound cae en `config.evolutionInstanceName` y `config.ghlLocationPit` (`gateway-service/src/index.ts:24-28`).
- En inbound, si no hay match por query o instancia, se usa el tenant default (`gateway-service/src/index.ts:77-96`).
- La config tenant vive en JSON de environment (`gateway-service/src/config.ts:9-24`, `docker/docker-compose.yml:61`).

Riesgo:
- Mensajes de un cliente pueden terminar usando otra instancia o PIT default.
- Un error de config puede mezclar conversaciones entre clientes.

Accion recomendada:
- Rechazar mensajes sin tenant resoluble: no default en produccion.
- Mover tenants a base de datos con estado, owner, instanceName, PIT/OAuth token, webhook secret, plan, limits.
- Registrar auditoria por tenant y correlationId.

## Hallazgos funcionales

### 7. n8n tenia phone formatting incorrecto al crear contactos

Estado: remediado.

Impacto original: alto si se usaba n8n en produccion.

Evidencia:
- Los workflows usaban un prefijo extra al construir el telefono.
- Ahora construyen el E.164 con un solo `+`.

Riesgo:
- Se crean contactos con telefonos invalidos.

Accion recomendada:
- Cambiar a `=+{{ ...phone }}` o construir el E.164 en un nodo previo.

### 8. Outbound n8n estaba hardcoded a B&B Cleaning

Estado: remediado como workflow legacy de referencia.

Impacto original: alto si se usaba n8n.

Evidencia:
- `n8n-workflows/evolution-outbound.json` usaba una instancia concreta.
- Ahora usa `YOUR_EVOLUTION_INSTANCE_NAME`.

Riesgo:
- Un workflow importado para otro cliente enviaria desde la instancia equivocada.

Accion recomendada:
- Eliminar workflows por-cliente como ruta principal, o parametrizar por tenant.
- Para producto privado, preferir gateway central + DB tenant.

### 9. Soporte limitado de media, voz, botones y adjuntos

Impacto: medio-alto.

Evidencia:
- `gateway-service/src/index.ts:70` solo toma `conversation` o `extendedTextMessage.text`.
- `gateway-service/src/index.ts:154-156` transforma cualquier media Meta en texto generico.
- `gateway-service/src/index.ts:17` ignora `attachments`.
- `gateway-service/src/services/evolution.ts:37-45` solo envia texto.

Gap contra GoGHL:
- Falta imagen/video/PDF, audio/voice notes, transcripcion, botones/listas, groups, TTS y adjuntos desde GHL.

Accion recomendada:
- Fase 1: attachments outbound GHL -> WhatsApp y media inbound -> GHL.
- Fase 2: audio inbound con transcripcion y voice note outbound.
- Fase 3: builder interno de botones/listas y acciones n8n.

### 10. No hay cola, reintentos ni idempotencia

Impacto: alto.

Evidencia:
- `/ghl-outbound` responde 200 antes de procesar (`gateway-service/src/index.ts:31-35`), pero luego solo ejecuta el envio en memoria.
- No hay persistencia de jobs, `messageId` procesados, retry/backoff o dead-letter queue.

Riesgo:
- Si el proceso muere despues del 200, el mensaje se pierde.
- Un retry externo puede duplicar mensajes.

Accion recomendada:
- Introducir cola persistente (Redis/BullMQ o Postgres jobs).
- Idempotencia por `messageId`/provider message id.
- Retries con backoff y DLQ.

### 11. Estados de entrega demasiado optimistas

Impacto: medio.

Evidencia:
- Tras enviar a Evolution/Meta, se marca GHL como `delivered` inmediatamente (`gateway-service/src/index.ts:43-46`).
- No se procesa ack real de WhatsApp/Evolution/Meta.

Riesgo:
- GHL mostrara entregas no verificadas.

Accion recomendada:
- Marcar `sent/queued` tras aceptar el proveedor.
- Actualizar `delivered/read/failed` mediante webhooks de estado reales.

### 12. Observabilidad insuficiente y logs con PII

Impacto: medio-alto.

Evidencia:
- `gateway-service/src/index.ts:98` loguea telefono y texto completo del mensaje.
- No hay endpoint `/health`, metricas, trazas, correlationId ni alertas.

Riesgo:
- Dificil operar clientes.
- Exposicion de PII en logs.

Accion recomendada:
- Redactar telefonos y texto en logs por defecto.
- Log estructurado JSON con tenant, messageId, eventType, status.
- Healthcheck, metrics y alertas por desconexion QR, cola, errores 4xx/5xx.

## Gap contra GoGHL para una version privada Sales Master

| Area | Estado actual | Necesario para "Sales Master privado" |
| --- | --- | --- |
| QR connect | Manual via Evolution/API | Portal privado con QR por cliente, estado de conexion y reconnect |
| GHL native | Base con Conversation Provider | Validar payload real, status, inbound moderno, app versionada |
| White label | Nombre Sales Master en docs | UI privada, dominio, logo, acceso por cliente/agencia |
| Multi-tenant | JSON env por location | DB tenant, onboarding, limites, secretos por tenant, no defaults |
| Seguridad | Sin auth propia en endpoints | HMAC/API key, firmas Meta, rate limit, secret manager |
| Anti-ban | Delay simple 3-6s | Warmup, pacing por tenant, spintax, limits, opt-in, suppression |
| Media/voice | Texto solo | Imagen, PDF, audio, transcripcion, TTS |
| Botones/listas | No implementado | Builder interno o accion n8n |
| AI replies | No implementado aqui | Integracion Conversation AI / n8n / OpenAI con guardrails |
| Operacion | Docker basico | Health, metrics, backups, alerts, reconnect, runbooks |
| Compliance | Docs reconocen riesgo QR | Consentimiento, DPA, retention, logs minimizados, tenant isolation |

## Arquitectura recomendada

### MVP privado robusto

1. Gateway unico en TypeScript.
2. Postgres para `tenants`, `instances`, `messages`, `events`, `secrets_ref`.
3. Secret manager o `.env` fuera de Git con rotacion.
4. Redis/BullMQ para cola outbound.
5. Evolution API solo detras del gateway; panel restringido por VPN/auth.
6. Caddy con rutas separadas y headers seguros.
7. Portal interno minimo:
   - login Sales Master/admin
   - cliente/subcuenta
   - crear instancia
   - mostrar QR
   - estado conectado/desconectado
   - enviar test
   - ver ultimos eventos
8. App GHL privada:
   - OAuth real por subcuenta si se quiere escalar
   - o PIT por cliente solo para beta controlada
9. Politica QR:
   - no cold outreach
   - opt-in obligatorio
   - warmup
   - limites diarios por numero/tenant
   - fallback a Meta Cloud API para clientes serios.

### Ruta de implementacion

Fase 0 - Seguridad inmediata:
- Rotar secretos.
- Sanear docs y compose.
- Arreglar Caddy.
- Bloquear endpoints con secret/HMAC.
- Rechazar tenant desconocido.

Fase 1 - Funcionamiento fiable:
- Compatibilidad con payload real `message/phone` y legacy `body/to`.
- Validar endpoint inbound correcto.
- Cola outbound + idempotencia.
- Healthchecks y logs redacted.
- Tests con fixtures GHL/Evolution/Meta.

Fase 2 - Producto privado:
- Portal QR por cliente.
- DB tenant.
- Estado de conexion, reconnect y envio de prueba.
- Dashboard de errores y volumen.
- Runbook de onboarding/offboarding.

Fase 3 - Paridad GoGHL esencial:
- Spintax.
- Smart drip/rate limits.
- Multi-numero por subcuenta.
- Media outbound/inbound.
- Voice note/transcripcion.
- Button/list builder.

Fase 4 - Premium:
- AI replies con Sales Master prompts.
- n8n nodes/actions privados.
- Staff notifications.
- Billing/usage interno.
- Compliance export/delete por cliente.

## Decision recomendada

Para clientes beta pequenos, QR con Evolution puede seguir siendo util, pero solo despues de cerrar los bloqueantes de seguridad y routing. Para clientes consolidados o con numero critico, usar Meta Cloud API oficial o un modo hibrido con fallback.

La posicion ideal de Sales Master no deberia ser "GoGHL publico clonado", sino "GoGHL privado y gobernado": menor superficie publica, datos dentro de infraestructura Sales Master, onboarding controlado, logs minimizados y reglas anti-abuso por cliente.

## Verificaciones realizadas

- Lectura estatica de `gateway-service`, `docker`, `caddy`, `docs` y `n8n-workflows`.
- Consulta externa de GoGHL y documentacion oficial actual de HighLevel.
- `npm run build` en `gateway-service`: no ejecutable localmente porque `tsc` no esta instalado en la carpeta.
- `docker compose config`: no ejecutable localmente porque `docker` no esta disponible en este entorno.
