# 🌐 Configuración Multitenant de la Pasarela WhatsApp QR (GHL Gateway)

Este documento describe la arquitectura multitenant implementada para dar servicio a múltiples subcuentas de GoHighLevel (GHL) utilizando una sola aplicación privada del Developer Portal de la Agencia y una sola instancia del microservicio `ghl-whatsapp-gateway` en un VPS privado.

---

## 1. 📂 Ubicación en el Workspace
Toda la lógica y los archivos de configuración locales se encuentran en el siguiente Workspace:
👉 **`/Users/rafaelcasasdelaspenas/Library/CloudStorage/GoogleDrive-rcdelasp@gmail.com/My Drive/Antigravity_Workspace/Proyectos_Activos/SalesMastersUltra`**

Subcarpetas de interés:
*   📁 **Código del Gateway:** `Recursos/whatsapp-connector/gateway-service/`
*   📁 **Despliegue Docker/Caddy:** `Recursos/whatsapp-connector/docker/`
*   📁 **Cliente VPX Hoteles:** `Clientes/vpx-hoteles/`
*   📁 **Cliente AirPro Marbella:** `Clientes/airpro-marbella/`

---

## 2. 🔑 Datos de la App y Proveedor de Conversación (GHL)
Hemos registrado la App Privada en el Developer Portal de la Agencia:
*   **App ID:** `GHL_APP_ID`
*   **Client ID:** `GHL_CLIENT_ID`
*   **Client Secret:** `GHL_CLIENT_SECRET`
*   **Provider ID (SMS Module):** `GHL_CONVERSATION_PROVIDER_ID`
*   **Delivery URL:** `https://wa.salesmasterplus.cloud/ghl-outbound`

---

## 3. 🗺️ Mapeo Multitenant Configurado en el VPS
El gateway en el VPS utiliza la variable de entorno `GHL_TENANTS` (un string JSON estructurado) para discernir a qué subcuenta e instancia de WhatsApp QR pertenece cada mensaje.

Actualmente están configurados los siguientes dos clientes de prueba y producción en `/opt/whatsapp-connector/docker/docker-compose.yml`:

| Cliente | Location ID GHL | Location PIT (Token Secreto) | Instancia WhatsApp QR |
| :--- | :--- | :--- | :--- |
| **Cliente A** | `GHL_LOCATION_ID_A` | `GHL_LOCATION_PIT_A` | `cliente-a` |
| **Cliente B** | `GHL_LOCATION_ID_B` | `GHL_LOCATION_PIT_B` | `cliente-b` |

### Fragmento de configuración en `docker-compose.yml` (VPS):
```yaml
  gateway-service:
    # ...
    environment:
      - PORT=8086
      - ACTIVE_GATEWAY=QR
      - GHL_TENANTS='{"GHL_LOCATION_ID_A":{"pit":"GHL_LOCATION_PIT_A","instanceName":"cliente-a"},"GHL_LOCATION_ID_B":{"pit":"GHL_LOCATION_PIT_B","instanceName":"cliente-b"}}'
      - EVOLUTION_BASE_URL=http://evolution-api:8085
      - EVOLUTION_API_KEY=EVOLUTION_API_KEY
      - EVOLUTION_INSTANCE_NAME=cliente-a
```

---

## 4. 🔄 Cómo añadir un Nuevo Cliente en el futuro
Para añadir un tercer cliente (por ejemplo, `nuevo-cliente`), sigue estos pasos:

1.  **Obtén los datos del cliente:**
    *   `Location ID` (desde la URL de su subcuenta en GHL).
    *   `Location PIT` (generado en su subcuenta en *Settings -> Integrations -> Private Integrations*).
    *   Decide el nombre de su instancia de WhatsApp (ej. `nuevo-cliente`).

2.  **Instala la App en su subcuenta:**
    *   Entra a tu **Developer Portal** de GHL.
    *   Ve a **MANAGE -> Versions**.
    *   Haz clic en los `...` de la versión `draft` y selecciona **Install App**.
    *   Elige la subcuenta del nuevo cliente y autoriza.

3.  **Actualiza el docker-compose del VPS:**
    *   Conéctate por SSH al VPS.
    *   Edita `/opt/whatsapp-connector/docker/docker-compose.yml`.
    *   Añade el nuevo registro al JSON de la variable `GHL_TENANTS`.
    *   Reinicia el servicio:
        ```bash
        cd /opt/whatsapp-connector/docker
        docker compose up -d gateway-service
        ```

4.  **Crea su instancia en Evolution API:**
    *   Entra a tu panel de Evolution API (`https://wa.salesmasterplus.cloud/`).
    *   Crea una instancia llamada igual que pusiste en el JSON (ej. `nuevo-cliente`).
    *   Escanea el código QR de WhatsApp de ese cliente desde el panel.
    *   Configura el Webhook de esa instancia para que apunte a:
        `https://wa.salesmasterplus.cloud/webhook/evolution-inbound?locationId=ID_DE_LA_SUB_CUENTA`

5.  **Activa el Proveedor en la subcuenta:**
    *   Entra a la subcuenta del cliente en GHL.
    *   Ve a **Settings -> Phone Numbers -> Advanced Settings**.
    *   En **SMS Provider**, selecciona `Sales Master WhatsApp QR` y guarda.

---

## 5. 🔮 Futura Ampliación: Múltiples Números por Subcuenta
Para cuando decidas expandir la integración para soportar múltiples números de WhatsApp dentro de una sola subcuenta del CRM (ej. diferentes líneas para diferentes agentes), la arquitectura ya está preparada para evolucionar de la siguiente forma:

### A. Estructura de Configuración Sugerida (JSON `GHL_TENANTS`):
Modificaríamos el objeto JSON para asociar múltiples instancias de Evolution API bajo un mismo `locationId`, mapeadas por prioridades o usuarios asignados de GHL:
```json
{
  "GHL_LOCATION_ID_A": {
    "pit": "GHL_LOCATION_PIT_A",
    "instances": {
      "default": "vpx-hotel",
      "user_SMP_USER_ID_1": "vpx-hotel-ventas",
      "user_SMP_USER_ID_2": "vpx-hotel-recepcion",
      "tag_Soporte": "vpx-hotel-soporte"
    }
  }
}
```

### B. Adaptación en la lógica del Gateway:
1.  **Salida (Outbound):** Al recibir el payload de GHL en `/ghl-outbound`, el gateway leerá el `assignedUserId` (si viene en el payload) o las etiquetas del contacto, buscará el valor en el mapa `instances` y enviará a la instancia de WhatsApp de ese agente. Si no coincide nada, usará la de por defecto (`default`).
2.  **Entrada (Inbound):** Al recibir el mensaje en `/webhook/evolution-inbound`, el webhook sabrá de qué instancia viene (ej. `vpx-hotel-ventas`). El gateway buscará a qué `locationId` pertenece esa instancia en el mapa de tenants y usará el respectivo `Location PIT` para insertar el chat en el CRM de GHL bajo esa ubicación.
