# 🚀 Guía Paso a Paso: Tu primera vez en el GHL Developer Portal

Si nunca has entrado al Portal de Desarrolladores de GoHighLevel, no te preocupes. Este es un manual detallado, paso a paso, con los clics exactos que debes hacer para registrar tu aplicación privada de WhatsApp.

---

## 🔑 Paso 1: Registro e Inicio de Sesión
1. Entra a tu navegador y ve a la siguiente URL:
   👉 **[https://marketplace.gohighlevel.com/](https://marketplace.gohighlevel.com/)**
2. En la esquina superior derecha, haz clic en **Login** (o **Sign In**).
3. Introduce el **email y la contraseña de tu cuenta de Agencia** (la cuenta de administrador principal con la que accedes a tu SaaS de HighLevel).
4. Una vez dentro, haz clic en **Developer Portal** (o accede directamente a **[https://developers.gohighlevel.com/](https://developers.gohighlevel.com/)**).

---

## 🆕 Paso 2: Crear tu Primera App
1. En el menú superior o lateral, haz clic en **My Apps** (Mis Aplicaciones).
2. Haz clic en el botón azul **Create App** (Crear Aplicación).
3. Te aparecerá un formulario con los siguientes campos obligatorios:
   *   **App Name:** Escribe `Sales Master WhatsApp Gateway` (o el nombre que gustes).
   *   **Developer Name:** Escribe tu nombre o el de tu agencia (`Sales Master Plus`).
   *   **Sector/Category:** Elige `Utilities` o `Messaging`.
4. En la opción **App Distribution**, asegúrate de que esté seleccionada **Private** (Privada). *Esto garantiza que tu aplicación solo se pueda instalar en tus propias subcuentas de agencia y no sea visible en la tienda pública de GHL.*
5. Haz clic en **Save** (Guardar).

---

## ⚙️ Paso 3: Configurar Autenticación y Scopes (Permisos)
Ahora que la App está creada, verás un panel de control con varias pestañas en el lateral izquierdo.

1. Ve a la pestaña **Auth** (Autenticación) en el menú izquierdo.
2. En el campo **Redirect URIs**, escribe la siguiente URL:
   `https://wa.salesmasterplus.cloud/`
   *(Si el flujo lo haces internamente con tu token PIT, esta URL solo actúa como requisito formal de GHL, pero debe ser una dirección HTTPS segura).*
3. Baja a la sección **Scopes** (Permisos). Aquí debes marcar las casillas de los permisos exactos que tu microservicio usará para leer y escribir. **Activa las siguientes:**
   *   `contacts.readonly` (para buscar si el contacto existe en tu base de datos antes de escribirle).
   *   `contacts.write` (para poder crear al contacto en GHL si nos escribe alguien nuevo por WhatsApp).
   *   `conversations.readonly` (para poder leer hilos de conversación).
   *   `conversations.write` (para gestionar conversaciones).
   *   `conversations/message.readonly` (para interceptar los mensajes).
   *   `conversations/message.write` (requerido para insertar las respuestas de los clientes en la bandeja de entrada).
4. Haz clic en **Save Settings** (Guardar Ajustes) al final de la página.

---

## 🔌 Paso 4: Configurar el Conversation Provider
Esta es la parte mágica que le dice a GHL: *"No uses Twilio para mandar SMS; envíalos a mi propio servidor"*.

1. En el menú izquierdo de tu aplicación, busca y haz clic en la opción **Capabilities** (Capacidades) o **Conversation Provider**.
2. Activa el interruptor que dice **Conversation Provider** (o *Custom SMS Provider*).
3. Rellena los campos correspondientes con los siguientes valores:
   *   **Delivery URL:** Escribe exactamente:
       `https://wa.salesmasterplus.cloud/ghl-outbound`
       *(Esta es la URL que tu Caddy en el VPS enrutará hacia el gateway puerto 8086).*
   *   **Provider Name:** Escribe `Sales Master WhatsApp QR` (es el nombre que verás en los desplegables de configuración de la subcuenta).
   *   **Provider Description:** `Conector WhatsApp QR en VPS propio`.
4. Haz clic en **Save** (Guardar).
5. Copia el **`conversationProviderId`** (un código largo que te dará el sistema).

---

## 📥 Paso 5: Instalar la App en tu Subcuenta de Cliente
Para activar la integración en una subcuenta específica (por ejemplo, `B&B Cleaning 360`):

1. Dentro de la configuración de tu App en el Developer Portal, en la pestaña **Auth** o en la esquina superior derecha, verás un botón que dice **Install App** (Instalar Aplicación).
2. Haz clic en él. Te abrirá una pestaña de autorización de GHL.
3. Te pedirá que **selecciones la ubicación/subcuenta** (Location) de tu cliente de la lista.
4. Selecciónala y haz clic en **Authorize / Install** (Autorizar).
5. Una vez autorizado, la aplicación ya estará vinculada a los contactos de esa subcuenta.

---

## 🎯 Paso 6: Activar el Canal de WhatsApp en la Subcuenta
El último paso se realiza dentro de la subcuenta seleccionada en el paso anterior:

1. Entra a tu CRM habitual de GHL y accede a la subcuenta (ej. `B&B Cleaning 360`).
2. En el menú inferior izquierdo de la subcuenta, haz clic en **Settings** (Configuración) -> **Phone Numbers** (Números de Teléfono).
3. Haz clic en la pestaña superior derecha que dice **Advanced Settings** (Ajustes Avanzados).
4. En el campo **SMS Provider** (o *Default Messaging Provider*), haz clic en el desplegable y selecciona tu app recién instalada: `Sales Master WhatsApp QR`.
5. Haz clic en **Save** (Guardar).

¡Enhorabuena! Has configurado tu primer Conversation Provider en el Developer Portal. A partir de ahora, todo Workflow que envíe un "SMS" o cualquier agente que responda en esa subcuenta pasará automáticamente por tu VPS y se enviará por WhatsApp QR.
