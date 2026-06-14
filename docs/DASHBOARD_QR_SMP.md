# Dashboard QR privado para Sales Master

Esta consola convierte el conector en una herramienta operativa para probar clientes reales de Sales Master sin exponer la API key de Evolution en el navegador.

## URL

Produccion:

```text
https://wa.salesmasterplus.cloud/dashboard
```

Local:

```text
http://localhost:8086/dashboard
```

El dashboard pide `GATEWAY_SHARED_SECRET`. Ese secreto se manda al gateway como header `x-salesmaster-gateway-secret`; Evolution sigue protegido en backend con `EVOLUTION_API_KEY`.

## Lo que puedes hacer

- Ver tenants cargados desde `GHL_TENANTS`.
- Crear una instancia Evolution por cliente.
- Pedir el QR de conexion para escanearlo con el WhatsApp del cliente.
- Configurar el webhook inbound de Evolution hacia el `locationId` correcto.
- Copiar la Delivery URL para el Conversation Provider de GHL.
- Ver donde activar el provider dentro de la subcuenta.

## Flujo de prueba por cliente

1. Abre el dashboard.
2. Introduce `GATEWAY_SHARED_SECRET`.
3. Selecciona el tenant del cliente.
4. Verifica que el tenant muestra:
   - `locationId`
   - `instanceName`
   - gateway `QR`
5. Si la instancia no existe, crea la instancia.
6. Pulsa `Conectar QR`.
7. Escanea el QR con el WhatsApp dedicado del cliente.
8. Pulsa `Activar webhook`.
9. Copia la `Delivery URL` y configurala en el Developer Portal si todavia no esta configurada.
10. En GHL, instala la app en la subcuenta del cliente.
11. En la subcuenta, ve a:

```text
Settings > Phone Numbers > Advanced Settings > SMS Provider
```

12. Selecciona `Sales Master WhatsApp QR` y guarda.
13. Abre `Conversations`, crea o abre un contacto con telefono E.164 y envia un SMS.
14. Confirma que el mensaje llega al WhatsApp QR.
15. Responde desde WhatsApp y confirma que el inbound aparece dentro de la conversacion de GHL.

## Rutas que usa el dashboard

Todas estas rutas viven dentro del `gateway-service`:

```text
GET  /api/dashboard/summary
GET  /api/dashboard/evolution/instances
POST /api/dashboard/evolution/instances
POST /api/dashboard/evolution/instances/:instanceName/connect
POST /api/dashboard/evolution/instances/:instanceName/webhook
```

## Enlace desde el SMP dashboard

El dashboard principal de Sales Master tiene una opcion lateral:

```text
WhatsApp QR
```

Por defecto abre:

```text
https://wa.salesmasterplus.cloud/dashboard
```

Para apuntarlo a local o staging:

```env
VITE_WHATSAPP_GATEWAY_URL=http://localhost:8086/dashboard
```

## Notas de seguridad

- `REQUIRE_GATEWAY_SECRET=true` debe estar activo en produccion.
- `ALLOW_DEFAULT_TENANT=false` debe estar activo en produccion.
- No uses el WhatsApp principal de un cliente grande con QR. Para operacion estable y alto volumen, usa Meta Cloud API oficial.
- QR es recomendable para pilotos, clientes pequenos, opt-in manual y pruebas reactivas.
