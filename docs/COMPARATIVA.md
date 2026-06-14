# ⚖️ Comparativa de Alternativas WhatsApp para Sales Master (GHL)

Este documento detalla la comparativa técnica, financiera y operativa entre usar **WhatsApp QR (Evolution API)** y **WhatsApp Cloud API Oficial (Meta)** directa por n8n para tus subcuentas.

---

## 📊 Tabla Comparativa Resumida

| Criterio | WhatsApp QR (Evolution API) | WhatsApp Cloud API Oficial |
| :--- | :--- | :--- |
| **Costo Mensual Fijo** | **$0** (Autohospedado en tu VPS) | **$0** (Sin el addon de $10 de GHL si se integra por n8n) |
| **Costo por Mensaje** | **$0** (Ilimitados) | **1,000 chats mensuales GRATIS**. Luego, tarifas por conversación de 24h (~€0.015 - €0.035) |
| **Riesgo de Bloqueo** | **Medio-Alto** (Si no se toman medidas antiban) | **Casi Cero** (Canal oficial aprobado por Meta) |
| **Tipo de Línea** | Cualquier número (Personal o Business regular) | Número limpio (No se puede usar la app móvil normal) |
| **Primer Contacto (Outbound)**| Texto libre ilimitado | Requiere **Plantillas Aprobadas (Templates)** |
| **Configuración** | Sencilla (Docker Compose + Escanear QR) | Media (Cuenta de Meta Business, tarjeta, dominio) |
| **Integridad de Marca** | Media-Baja (Meta puede suspender el número) | Alta (Certificado oficial, nombre comercial visible) |

---

## 🛡️ Alternativa 1: WhatsApp QR (Evolution API) — Estrategias Antiban
Cuando se emula WhatsApp Web mediante librerías como Baileys (usada por Evolution API), Meta analiza patrones inusuales para detectar automatizaciones comerciales. Si un número es nuevo o se automatiza agresivamente, será bloqueado.

### Reglas de Oro para Evitar Bloqueos en QR:
1. **Calentamiento del Número (Warm-up):**
   * Antes de automatizar un número nuevo, úsalo manualmente durante 7 a 10 días. Chatea con contactos guardados, envía notas de voz y recibe respuestas de forma orgánica.
2. **Presence & Typing Simulation:**
   * En tu flujo de n8n, antes de enviar un mensaje, activa el estado de presencia `composing` (escribiendo) o `recording` (grabando audio) durante 1.5 a 3 segundos. Esto simula la interacción de un usuario humano y rompe los patrones de bots instantáneos.
3. **Delay Aleatorio (Random Delays):**
   * Configura retrasos aleatorios entre la recepción del webhook y el envío de la respuesta (ej. de 3 a 8 segundos). Si respondes en menos de 1 segundo de forma sistemática, Meta detectará el bot.
4. **Respuesta Reactiva Exclusiva:**
   * **NUNCA** utilices el conector QR para realizar difusiones masivas (broadcasts) o mensajes fríos no solicitados a personas que no te tienen en su lista de contactos. Limita su uso a responder consultas entrantes (formularios, clicks en la web).
5. **No usar números principales:**
   * Usa siempre un chip/línea dedicada para la automatización, nunca el número personal principal del dueño del negocio, por si ocurre una suspensión.

---

## 📈 Alternativa 2: WhatsApp Cloud API — Costes y Gestión
La API Oficial es ideal para clientes corporativos que quieren total seguridad y no pueden permitirse perder su número telefónico.

### ¿Cómo ahorrar costes con la API Oficial?
1. **Los 1,000 Chats Gratis:**
   * Meta regala 1,000 conversaciones iniciadas por el usuario al mes por cuenta comercial (WABA). Para pequeños negocios locales, esto suele cubrir el 100% de su tráfico mensual, haciendo que el coste sea de **$0**.
2. **Saltarse los $10 de GHL:**
   * GHL te cobra $10 al mes por subcuenta para activar su conector directo con Meta. 
   * **Nuestra solución:** Al conectar Meta directamente con n8n en el VPS y mapearlo a la API de GHL Conversations, eliminamos ese coste mensual por completo en todas tus subcuentas.
3. **Manejo de Plantillas (Templates):**
   * Si quieres enviar un mensaje inicial (ej. "Hola {{nombre}}, vimos tu solicitud de cotización..."), debes pre-registrar la plantilla en Meta Manager. Una vez aprobada, n8n la dispara. Si el cliente responde, tienes 24 horas para chatear libremente gratis.

---

## 🎯 Recomendación de Arquitectura para Sales Master
* **Para Clientes Pequeños/Pruebas (B&B Cleaning, etc.):** La opción de **WhatsApp QR (Evolution API)** es excelente para validar la integración rápido sin configuraciones engorrosas y a coste cero, siempre aplicando las estrategias antiban en n8n.
* **Para Clientes Consolidados (Instalaciones García, etc.):** La opción de **WhatsApp Cloud API Oficial** es obligatoria para proteger la reputación de sus números telefónicos y darles soporte oficial certificado por Meta sin riesgos.
