# 📑 Guía de Registro de la App Privada en GoHighLevel Developers

Para que tu microservicio actúe como un **Custom Conversation Provider** nativo (SMS/WhatsApp Provider) y sustituya a Twilio/LC Phone y al WhatsApp mensual de GHL, debes registrar tu aplicación en el Portal de Desarrolladores de GHL.

---

## Paso 1: Acceder al Developer Portal
1. Ve a [GHL Marketplace Developer Portal](https://marketplace.gohighlevel.com) e inicia sesión con tus credenciales de Agencia.
2. Haz clic en **My Apps** (Mis aplicaciones) en el menú superior y pulsa en **Create App** (Crear aplicación).

---

## Paso 2: Configurar Detalles de la Aplicación
1. **App Name:** Ponle un nombre descriptivo, por ejemplo, `Sales Master WhatsApp Gateway`.
2. **Scopes (Permisos):** En la sección de scopes, añade obligatoriamente:
   *   `conversations/message.write` (requerido para escribir y actualizar el estado de los mensajes).
   *   `conversations/message.readonly` (requerido para leer los hilos de chat).
   *   `conversations.readonly` y `conversations.write` (acceso a conversaciones).
   *   `contacts.readonly` y `contacts.write` (búsqueda y creación de contactos).
3. **OAuth Redirect URI:** Si implementas OAuth para tus clientes, añade la URL de redirect (ej: `https://wa.salesmasterplus.cloud/oauth/callback`). Si es de uso exclusivo interno mediante PIT, puedes poner una de relleno como tu web principal.

---

## Paso 3: Declarar la Capacidad de Conversation Provider
1. En el panel lateral de tu app, busca la sección **Capabilities** (Capacidades) o **Conversation Provider**.
2. Activa la casilla de **Conversation Provider** (Custom SMS Provider).
3. Configura los siguientes campos:
   *   **Delivery URL:** Registra la URL expuesta por tu Caddy en tu VPS que apunta al endpoint `/ghl-outbound` (ej: `https://wa.salesmasterplus.cloud/ghl-outbound`).
   *   **Provider Name:** El nombre que verán los usuarios en la UI (ej. `Sales Master WhatsApp QR`).
4. Guarda los cambios. GHL te asignará un **`conversationProviderId`** (ID único de proveedor).

---

## Paso 4: Instalar y Activar el Proveedor en la Subcuenta
1. Genera el enlace de instalación (Install App Link) desde el portal de desarrolladores.
2. Abre el enlace en tu navegador, selecciona la Subcuenta (Location) donde quieres activar el conector y autoriza los permisos.
3. Una vez instalada la app en la subcuenta:
   *   Ve a **Settings** (Configuración) -> **Phone Numbers** (Números de Teléfono).
   *   Haz clic en la pestaña **Advanced Settings** (Ajustes Avanzados).
   *   En la sección **SMS Provider** (o Conversation Provider), despliega la lista y selecciona tu app `Sales Master WhatsApp QR`.
   *   Haz clic en **Save** (Guardar).

¡Listo! A partir de este momento, todo mensaje saliente enviado desde la bandeja de entrada o disparado por workflows y campañas en GHL será interceptado y despachado de forma nativa por tu VPS y pasarela sin coste alguno.
