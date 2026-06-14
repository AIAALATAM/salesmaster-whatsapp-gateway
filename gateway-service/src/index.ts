import crypto from "crypto";
import express from "express";
import path from "path";
import { config, GatewayMode, TenantConfig } from "./config";
import { GhlService } from "./services/ghl";
import { EvolutionService } from "./services/evolution";
import { MetaService } from "./services/meta";

interface ResolvedTenant extends TenantConfig {
  locationId: string;
}

type StatusCode = 400 | 401 | 403 | 404 | 500;

class HttpError extends Error {
  constructor(
    public statusCode: StatusCode,
    message: string
  ) {
    super(message);
  }
}

const app = express();

app.use(
  express.json({
    limit: config.jsonLimit,
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    }
  })
);

const safeCompare = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const maskPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) {
    return "****";
  }
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};

const getSharedSecret = (req: express.Request) => {
  return (
    req.get("x-salesmaster-gateway-secret") ||
    req.query.gatewaySecret?.toString() ||
    req.query.secret?.toString() ||
    req.query.token?.toString() ||
    ""
  );
};

const requireGatewaySecret = (req: express.Request) => {
  if (!config.requireGatewaySecret) {
    return;
  }
  if (!config.gatewaySharedSecret) {
    throw new HttpError(500, "Gateway secret enforcement is enabled but no secret is configured.");
  }
  const supplied = getSharedSecret(req);
  if (!supplied || !safeCompare(supplied, config.gatewaySharedSecret)) {
    throw new HttpError(401, "Invalid gateway secret.");
  }
};

const verifyMetaSignature = (req: express.Request) => {
  if (!config.metaAppSecret) {
    return;
  }

  const signature = req.get("x-hub-signature-256") || "";
  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!signature || !rawBody) {
    throw new HttpError(401, "Missing Meta signature.");
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", config.metaAppSecret)
    .update(rawBody)
    .digest("hex")}`;

  if (!safeCompare(signature, expected)) {
    throw new HttpError(401, "Invalid Meta signature.");
  }
};

const firstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const attachmentText = (attachments: unknown) => {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return "";
  }
  const urls = attachments.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return urls.length ? urls.map(url => `Adjunto: ${url}`).join("\n") : "";
};

const buildOutboundText = (payload: any) => {
  const text = firstString(payload.message, payload.body, payload.text);
  const attachments = attachmentText(payload.attachments);
  return [text, attachments].filter(Boolean).join("\n\n");
};

const resolveTenantByLocation = (locationId?: string): ResolvedTenant => {
  if (locationId && config.tenants[locationId]) {
    return { locationId, ...config.tenants[locationId] };
  }

  if (locationId && !config.allowDefaultTenant) {
    throw new HttpError(404, `Unknown GHL locationId: ${locationId}`);
  }

  if (config.allowDefaultTenant && config.ghlLocationPit && config.evolutionInstanceName) {
    return {
      locationId: locationId || "default",
      pit: config.ghlLocationPit,
      instanceName: config.evolutionInstanceName
    };
  }

  throw new HttpError(400, "locationId is required and must exist in GHL_TENANTS.");
};

const resolveTenantByEvolution = (locationId?: string, instanceName?: string): ResolvedTenant => {
  if (locationId) {
    const tenant = resolveTenantByLocation(locationId);
    if (instanceName && tenant.instanceName !== instanceName) {
      throw new HttpError(403, "Evolution instance does not match the configured tenant.");
    }
    return tenant;
  }

  if (instanceName) {
    const match = Object.entries(config.tenants).find(([, tenant]) => tenant.instanceName === instanceName);
    if (match) {
      return { locationId: match[0], ...match[1] };
    }
  }

  if (config.allowDefaultTenant && config.ghlLocationPit && config.evolutionInstanceName) {
    return {
      locationId: "default",
      pit: config.ghlLocationPit,
      instanceName: config.evolutionInstanceName
    };
  }

  throw new HttpError(400, "Could not resolve tenant from Evolution webhook.");
};

const resolveTenantByMetaPhone = (phoneNumberId?: string): ResolvedTenant => {
  if (phoneNumberId) {
    const match = Object.entries(config.tenants).find(
      ([, tenant]) => tenant.metaPhoneNumberId === phoneNumberId
    );
    if (match) {
      return { locationId: match[0], ...match[1] };
    }
  }

  if (config.allowDefaultTenant && config.ghlLocationPit && config.metaPhoneNumberId) {
    return {
      locationId: "default",
      pit: config.ghlLocationPit,
      instanceName: config.evolutionInstanceName,
      metaPhoneNumberId: config.metaPhoneNumberId,
      metaAccessToken: config.metaAccessToken
    };
  }

  throw new HttpError(400, "Could not resolve tenant from Meta phone_number_id.");
};

const sendWhatsApp = async (tenant: ResolvedTenant, phone: string, text: string) => {
  const gateway: GatewayMode = tenant.gateway || config.activeGateway;
  if (gateway === "QR") {
    return EvolutionService.sendText(phone, text, tenant.instanceName);
  }
  return MetaService.sendText(phone, text, tenant.metaPhoneNumberId, tenant.metaAccessToken);
};

const getEvolutionMessageText = (message: any) => {
  return firstString(
    message?.conversation,
    message?.extendedTextMessage?.text,
    message?.imageMessage?.caption,
    message?.videoMessage?.caption,
    message?.documentMessage?.caption,
    message?.audioMessage ? "[Audio recibido por WhatsApp]" : "",
    message?.imageMessage ? "[Imagen recibida por WhatsApp]" : "",
    message?.videoMessage ? "[Video recibido por WhatsApp]" : "",
    message?.documentMessage ? "[Documento recibido por WhatsApp]" : ""
  );
};

const handleError = (res: express.Response, context: string, error: any) => {
  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  console.error(`[${context}]`, error.message);
  return res.status(statusCode).json({ error: error.message });
};

const dashboardDir = path.resolve(__dirname, "../public/dashboard");

const dashboardAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    requireGatewaySecret(req);
    next();
  } catch (error: any) {
    handleError(res, "Dashboard", error);
  }
};

const getTenantSummaries = () => {
  const gatewaySecret = config.gatewaySharedSecret || "GATEWAY_SHARED_SECRET";
  return Object.entries(config.tenants).map(([locationId, tenant]) => ({
    locationId,
    instanceName: tenant.instanceName,
    gateway: tenant.gateway || config.activeGateway,
    hasPit: Boolean(tenant.pit),
    hasConversationProviderId: Boolean(tenant.conversationProviderId),
    hasMetaPhoneNumberId: Boolean(tenant.metaPhoneNumberId),
    deliveryUrl: `${config.publicBaseUrl}/ghl-outbound?gatewaySecret=${encodeURIComponent(gatewaySecret)}`,
    evolutionWebhookUrl: `${config.publicBaseUrl}/webhook/evolution-inbound?locationId=${encodeURIComponent(
      locationId
    )}&gatewaySecret=${encodeURIComponent(gatewaySecret)}`
  }));
};

app.get("/healthz", (_req, res) => {
  res.status(200).json({
    status: "ok",
    activeGateway: config.activeGateway,
    tenants: Object.keys(config.tenants).length,
    requireGatewaySecret: config.requireGatewaySecret,
    allowDefaultTenant: config.allowDefaultTenant
  });
});

app.use("/dashboard", express.static(dashboardDir));

app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(dashboardDir, "index.html"));
});

app.get("/api/dashboard/summary", dashboardAuth, (_req, res) => {
  res.status(200).json({
    gateway: {
      activeGateway: config.activeGateway,
      publicBaseUrl: config.publicBaseUrl,
      requireGatewaySecret: config.requireGatewaySecret,
      allowDefaultTenant: config.allowDefaultTenant,
      evolutionConfigured: Boolean(config.evolutionApiKey),
      metaConfigured: Boolean(config.metaPhoneNumberId && config.metaAccessToken)
    },
    tenants: getTenantSummaries()
  });
});

app.get("/api/dashboard/evolution/instances", dashboardAuth, async (_req, res) => {
  try {
    const instances = await EvolutionService.fetchInstances();
    res.status(200).json({ instances });
  } catch (error: any) {
    return handleError(res, "Dashboard Instances", error);
  }
});

app.post("/api/dashboard/evolution/instances", dashboardAuth, async (req, res) => {
  try {
    const instanceName = firstString(req.body?.instanceName);
    if (!instanceName) {
      throw new HttpError(400, "instanceName is required.");
    }
    const result = await EvolutionService.createInstance(instanceName);
    res.status(200).json({ result });
  } catch (error: any) {
    return handleError(res, "Dashboard Create Instance", error);
  }
});

app.post("/api/dashboard/evolution/instances/:instanceName/connect", dashboardAuth, async (req, res) => {
  try {
    const instanceName = firstString(req.params.instanceName);
    const result = await EvolutionService.connectInstance(instanceName);
    res.status(200).json({ result });
  } catch (error: any) {
    return handleError(res, "Dashboard Connect Instance", error);
  }
});

app.post("/api/dashboard/evolution/instances/:instanceName/webhook", dashboardAuth, async (req, res) => {
  try {
    const instanceName = firstString(req.params.instanceName);
    const locationId = firstString(req.body?.locationId);
    const tenant = resolveTenantByEvolution(locationId, instanceName);
    const webhookUrl = `${config.publicBaseUrl}/webhook/evolution-inbound?locationId=${encodeURIComponent(
      tenant.locationId
    )}&gatewaySecret=${encodeURIComponent(config.gatewaySharedSecret || "GATEWAY_SHARED_SECRET")}`;
    const result = await EvolutionService.setWebhook(instanceName, webhookUrl);
    res.status(200).json({ webhookUrl, result });
  } catch (error: any) {
    return handleError(res, "Dashboard Set Webhook", error);
  }
});

app.post("/ghl-outbound", async (req, res) => {
  let tenant: ResolvedTenant | null = null;
  const payload = req.body || {};
  const messageId = firstString(payload.messageId);

  try {
    requireGatewaySecret(req);

    const text = buildOutboundText(payload);
    const phone = firstString(payload.phone, payload.to);
    tenant = resolveTenantByLocation(firstString(payload.locationId));

    if (!text || !phone) {
      throw new HttpError(400, "Missing outbound message text or recipient phone.");
    }

    console.log(
      `[GHL Outbound] Accepted message ${messageId || "without-id"} for location ${tenant.locationId} to ${maskPhone(phone)}`
    );

    res.status(200).json({ status: "processing" });

    try {
      await sendWhatsApp(tenant, phone, text);
      if (messageId) {
        await GhlService.updateMessageStatus(messageId, "sent", tenant.pit);
      }
    } catch (error: any) {
      console.error(`[GHL Outbound] Failed to dispatch ${messageId || "message"}:`, error.message);
      if (messageId) {
        await GhlService.updateMessageStatus(messageId, "failed", tenant.pit);
      }
    }
  } catch (error: any) {
    return handleError(res, "GHL Outbound", error);
  }
});

app.post("/webhook/evolution-inbound", async (req, res) => {
  try {
    requireGatewaySecret(req);

    const { event, data, instance } = req.body || {};
    if (event !== "messages.upsert" || !data || data.key?.fromMe) {
      return res.status(200).json({ status: "ignored" });
    }

    const rawJid = data.key?.remoteJid || "";
    const phone = rawJid.split("@")[0];
    const messageText = getEvolutionMessageText(data.message);
    const contactName = data.pushName || "WhatsApp QR Contact";
    const tenant = resolveTenantByEvolution(firstString(req.query.locationId), firstString(instance, req.query.instance));

    if (!phone || !messageText) {
      return res.status(200).json({ status: "empty_or_non_text" });
    }

    console.log(
      `[Evolution Inbound] Message for location ${tenant.locationId} from ${maskPhone(phone)}${
        config.logMessageBodies ? `: ${messageText}` : ""
      }`
    );

    let contact = await GhlService.findContactByPhone(phone, tenant.pit);
    if (!contact) {
      contact = await GhlService.createContact(phone, contactName, tenant.pit);
    }

    await GhlService.injectInboundMessage(contact.id, messageText, tenant.pit, {
      conversationProviderId: tenant.conversationProviderId
    });

    return res.status(200).json({ status: "success" });
  } catch (error: any) {
    return handleError(res, "Evolution Inbound", error);
  }
});

app.get("/webhook/meta-whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.metaVerifyToken) {
    return res.status(200).send(challenge);
  }

  return res.status(403).send("Forbidden");
});

app.post("/webhook/meta-whatsapp", async (req, res) => {
  try {
    verifyMetaSignature(req);

    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message?.from) {
      return res.status(200).json({ status: "ignored" });
    }

    const tenant = resolveTenantByMetaPhone(value?.metadata?.phone_number_id);
    const phone = message.from;
    const messageText = firstString(
      message.text?.body,
      message.image ? "[Imagen recibida por WhatsApp]" : "",
      message.audio ? "[Audio recibido por WhatsApp]" : "",
      message.video ? "[Video recibido por WhatsApp]" : "",
      message.document ? "[Documento recibido por WhatsApp]" : "",
      "[Media or unsupported message type]"
    );
    const contactName = value.contacts?.[0]?.profile?.name || "WhatsApp Official Contact";

    console.log(
      `[Meta Inbound] Message for location ${tenant.locationId} from ${maskPhone(phone)}${
        config.logMessageBodies ? `: ${messageText}` : ""
      }`
    );

    let contact = await GhlService.findContactByPhone(phone, tenant.pit);
    if (!contact) {
      contact = await GhlService.createContact(phone, contactName, tenant.pit);
    }

    await GhlService.injectInboundMessage(contact.id, messageText, tenant.pit, {
      conversationProviderId: tenant.conversationProviderId
    });

    return res.status(200).json({ status: "success" });
  } catch (error: any) {
    return handleError(res, "Meta Inbound", error);
  }
});

app.listen(config.port, () => {
  console.log(
    `[Gateway Service] Listening on port ${config.port} in ${config.activeGateway} mode. Tenants loaded: ${
      Object.keys(config.tenants).length
    }`
  );
  if (!config.requireGatewaySecret) {
    console.warn("[Gateway Service] REQUIRE_GATEWAY_SECRET is disabled. Enable it before production.");
  }
});
