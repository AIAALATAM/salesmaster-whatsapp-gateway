import express from "express";
import { config } from "./config";
import { GhlService } from "./services/ghl";
import { EvolutionService } from "./services/evolution";
import { MetaService } from "./services/meta";

const app = express();
app.use(express.json());

console.log(`[Gateway Service] Starting in ${config.activeGateway} mode...`);

/**
 * 1. GHL OUTBOUND DELIVERY WEBHOOK (GHL -> VPS Gateway -> WhatsApp)
 * Este endpoint es el 'Delivery URL' de tu Custom Conversation Provider en GHL.
 */
app.post("/ghl-outbound", async (req, res) => {
  const { messageId, body, to, locationId, contactId } = req.body;
  
  if (!body || !to) {
    console.warn("[GHL Outbound] Received incomplete message payload:", req.body);
    return res.status(400).json({ error: "Missing body or recipient phone ('to')" });
  }

  // Resolver tenant dinámico
  const tenant = locationId ? config.tenants[locationId] : null;
  const instanceName = tenant ? tenant.instanceName : config.evolutionInstanceName;
  const locationPit = tenant ? tenant.pit : config.ghlLocationPit;

  console.log(`[GHL Outbound] Sending message to ${to} using instance ${instanceName} (Location: ${locationId || 'default'}). ID: ${messageId}`);

  // Responder rápido a GHL para evitar timeouts en su API
  res.status(200).json({ status: "processing" });

  // Procesamiento asíncrono
  try {
    let result;
    if (config.activeGateway === "QR") {
      result = await EvolutionService.sendText(to, body, instanceName);
    } else {
      result = await MetaService.sendText(to, body);
    }

    // Actualizar estado en GHL a 'delivered'
    if (messageId) {
      await GhlService.updateMessageStatus(messageId, "delivered", locationPit);
    }
  } catch (error: any) {
    console.error(`[GHL Outbound] Failed to dispatch message to ${to}:`, error.message);
    if (messageId) {
      await GhlService.updateMessageStatus(messageId, "failed", locationPit);
    }
  }
});

/**
 * 2. EVOLUTION API INBOUND WEBHOOK (WhatsApp QR -> VPS Gateway -> GHL)
 * Registra esta URL en el Evolution API Manager de tu instancia.
 */
app.post("/webhook/evolution-inbound", async (req, res) => {
  try {
    const { event, data, instance } = req.body;

    // Solo nos interesan los mensajes entrantes creados
    if (event !== "messages.upsert" || !data || data.key.fromMe) {
      return res.status(200).json({ status: "ignored" });
    }

    const rawJid = data.key.remoteJid || "";
    const phone = rawJid.split("@")[0];
    const messageText = data.message?.conversation || data.message?.extendedTextMessage?.text || "";
    const contactName = data.pushName || "WhatsApp QR Contact";

    if (!phone || !messageText) {
      return res.status(200).json({ status: "empty_or_non_text" });
    }

    // Resolver tenant dinámico
    let locationPit = config.ghlLocationPit;
    let locationId = "default";
    
    // Obtener la instancia del body o de la query string
    const currentInstance = instance || req.query.instance || "";
    const queryLocationId = req.query.locationId as string;

    if (queryLocationId && config.tenants[queryLocationId]) {
      locationId = queryLocationId;
      locationPit = config.tenants[queryLocationId].pit;
    } else if (currentInstance) {
      const matchedLocationId = Object.keys(config.tenants).find(
        id => config.tenants[id].instanceName === currentInstance
      );
      if (matchedLocationId) {
        locationId = matchedLocationId;
        locationPit = config.tenants[matchedLocationId].pit;
      }
    }

    console.log(`[Evolution Inbound] Received message from ${phone} in instance "${currentInstance}" (Resolved Location: ${locationId}): "${messageText}"`);

    // 1. Buscar contacto en GHL
    let contact = await GhlService.findContactByPhone(phone, locationPit);

    // 2. Si no existe, crearlo
    if (!contact) {
      console.log(`[Evolution Inbound] Contact not found in GHL. Creating: ${contactName} (${phone})`);
      contact = await GhlService.createContact(phone, contactName, locationPit);
    }

    // 3. Inyectar el mensaje recibido en el chat nativo de GHL
    const contactId = contact.id;
    await GhlService.injectInboundMessage(contactId, messageText, locationPit);

    res.status(200).json({ status: "success" });
  } catch (error: any) {
    console.error("[Evolution Inbound] Error processing inbound webhook:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 3. META CLOUD API HANDSHAKE VERIFICATION (GET)
 * Requerido por Meta para verificar el webhook al configurarlo en el Developer Console.
 */
app.get("/webhook/meta-whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.metaVerifyToken) {
    console.log("[Meta Webhook] Validation successful.");
    return res.status(200).send(challenge);
  }
  
  console.warn("[Meta Webhook] Validation failed. Tokens do not match.");
  return res.status(403).send("Forbidden");
});

/**
 * 4. META CLOUD API INBOUND WEBHOOK (POST)
 * Recibe y procesa los mensajes entrantes oficiales de Meta.
 */
app.post("/webhook/meta-whatsapp", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    // Ignorar si no es un mensaje entrante de un cliente
    if (!message || message.from === undefined) {
      return res.status(200).json({ status: "ignored" });
    }

    const phone = message.from;
    const messageText = message.text?.body || "[Media or unsupported message type]";
    const contactName = value.contacts?.[0]?.profile?.name || "WhatsApp Official Contact";

    console.log(`[Meta Inbound] Received message from ${phone}: "${messageText}"`);

    // 1. Buscar contacto en GHL
    let contact = await GhlService.findContactByPhone(phone);

    // 2. Si no existe, crearlo
    if (!contact) {
      console.log(`[Meta Inbound] Contact not found in GHL. Creating: ${contactName} (${phone})`);
      contact = await GhlService.createContact(phone, contactName);
    }

    // 3. Inyectar el mensaje en el chat unificado de GHL
    const contactId = contact.id;
    await GhlService.injectInboundMessage(contactId, messageText);

    res.status(200).json({ status: "success" });
  } catch (error: any) {
    console.error("[Meta Inbound] Error processing inbound webhook:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Arrancar el Servidor
app.listen(config.port, () => {
  console.log(`[Gateway Service] Listening on port ${config.port}`);
});
