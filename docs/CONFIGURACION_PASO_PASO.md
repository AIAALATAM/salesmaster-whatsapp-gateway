# 🛠️ Guía de Configuración Paso a Paso: Integración WhatsApp con Sales Master

Esta guía detalla los pasos exactos para configurar cualquiera de las dos alternativas en tu ecosistema.

---

## 📱 Opción A: WhatsApp QR (Evolution API)

### 1. Despliegue en el VPS
1. Entra a tu VPS por SSH:
   ```bash
   ssh -i ~/.ssh/tu_llave root@TU_IP_DEL_VPS
   ```
2. Crea una carpeta para Evolution API:
   ```bash
   mkdir -p /opt/evolution-api
   ```
3. Copia el archivo `docker-compose.yml` que hemos creado en esa carpeta del VPS.
4. Levanta el contenedor en segundo plano:
   ```bash
   cd /opt/evolution-api
   docker compose up -d
   ```
5. Configura tu subdominio (`wa.salesmasterplus.cloud` u otro) apuntando a la IP de tu VPS en tu proveedor de DNS.
6. Edita el Caddyfile en `/etc/caddy/Caddyfile` agregando el bloque del proxy inverso (ver `caddy/Caddyfile.example`) y recarga:
   ```bash
   sudo systemctl reload caddy
   ```

### 2. Creación y Conexión de Instancia
1. **Crear Instancia:** Envía una petición `POST` al endpoint `/instance/create` utilizando tu herramienta preferida (o un nodo HTTP Request en n8n) para crear la sesión de WhatsApp:
   ```bash
   curl -X POST https://wa.salesmasterplus.cloud/instance/create \
     -H "Content-Type: application/json" \
     -H "apikey: ${EVOLUTION_API_KEY}" \
     -d '{
       "instanceName": "bb-cleaning-360",
       "token": "token_opcional_bbcleaning",
       "qrcode": true
     }'
   ```
2. **Obtener Código QR:** Llama a `/instance/connect/bb-cleaning-360` y escanea el código QR que se devolverá en formato base64 o como imagen en tu navegador.
3. **Vincular en n8n:** Importa los flujos de la carpeta `n8n-workflows/` de este conector en tu instancia de n8n.

---

## 💼 Opción B: WhatsApp Cloud API Oficial (Meta)

Esta opción te permite integrar WhatsApp oficial gratis (hasta 1000 chats mensuales) y sin pagar la suscripción de $10/mes de GHL al conectarlo por n8n.

### 1. Registro en Meta Developers
1. Ve a [Meta for Developers](https://developers.facebook.com/) e inicia sesión con tu cuenta de Facebook.
2. Haz clic en **Mis apps** -> **Crear app**.
3. Selecciona **Otro** -> **Siguiente** -> **Negocio** -> Ponle nombre (ej. `Sales Master WhatsApp Gateway`) y asóciala a tu Administrador comercial.
4. En el panel de la app, busca **WhatsApp** y haz clic en **Configurar**.

### 2. Configurar el Número de Teléfono
1. En el menú izquierdo de WhatsApp, selecciona **Configuración de la API**.
2. Añade un número de teléfono para WhatsApp (el número debe estar limpio: no puede estar registrado en una app móvil de WhatsApp regular).
3. Añade tu tarjeta de crédito/método de pago (requerido por Meta, aunque las primeras 1000 conversaciones del mes son gratis).
4. Genera un **Token de acceso permanente (System User Access Token)** en tu Meta Business Manager para que no expire a las 24 horas.

### 3. Configurar Webhooks en Meta
1. En el panel de Meta de tu app, en el menú de WhatsApp, ve a **Configuración**.
2. En la sección de Webhooks, haz clic en **Configurar un webhook**.
3. URL de devolución de llamada: URL del trigger HTTP de tu n8n (ej. `https://n8n.salesmasterplus.cloud/webhook/meta-whatsapp`).
4. Token de verificación: Elige una contraseña y configúrala también en n8n.
5. Suscríbete al campo `messages` en la sección de Webhooks.

---

## 🎯 Configuración en GoHighLevel (Sales Master)

Para capturar las respuestas y enviar los mensajes desde GHL en ambas opciones:

1. **Tokens de Integración (PIT):**
   * Ve a la subcuenta en GHL -> **Settings** -> **Integrations**.
   * Genera un **Private Integration Token (PIT)** y guárdalo de forma segura en las variables de entorno de tu n8n.
2. **Workflow Saliente (Outbound):**
   * En GHL ve a **Automation** -> **Workflows** -> **Create New Workflow**.
   * Trigger: `Message Created` -> Filtro: `Direction is Outbound` AND `Message Type is WhatsApp`.
   * Acción: **Webhook** -> Apunta a tu URL de n8n para mensajes salientes (ej. `https://n8n.salesmasterplus.cloud/webhook/ghl-outbound`).
   * Guarda y Publica el Workflow. Puedes agregarlo a tu Snapshot para automatizarlo.
