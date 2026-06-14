import dotenv from "dotenv";

dotenv.config();

export type GatewayMode = "QR" | "OFFICIAL";

export interface TenantConfig {
  pit: string;
  instanceName: string;
  gateway?: GatewayMode;
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
  conversationProviderId?: string;
}

const parseBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const parseGatewayMode = (value: string | undefined): GatewayMode => {
  const normalized = (value || "QR").toUpperCase();
  if (normalized !== "QR" && normalized !== "OFFICIAL") {
    throw new Error(`ACTIVE_GATEWAY must be QR or OFFICIAL. Received: ${value}`);
  }
  return normalized;
};

const parseTenants = (): Record<string, TenantConfig> => {
  let tenantsStr = process.env.GHL_TENANTS;
  if (!tenantsStr) {
    return {};
  }

  tenantsStr = tenantsStr.trim();
  if (
    (tenantsStr.startsWith("'") && tenantsStr.endsWith("'")) ||
    (tenantsStr.startsWith('"') && tenantsStr.endsWith('"'))
  ) {
    tenantsStr = tenantsStr.slice(1, -1);
  }

  try {
    const parsed = JSON.parse(tenantsStr) as Record<string, TenantConfig>;
    for (const [locationId, tenant] of Object.entries(parsed)) {
      if (!tenant.pit || !tenant.instanceName) {
        throw new Error(`Tenant ${locationId} must include pit and instanceName.`);
      }
      if (tenant.gateway) {
        tenant.gateway = parseGatewayMode(tenant.gateway);
      }
    }
    return parsed;
  } catch (error: any) {
    console.error("[Config] Failed to parse GHL_TENANTS JSON:", error.message);
    return {};
  }
};

export const config = {
  port: Number(process.env.PORT || 8086),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "https://wa.salesmasterplus.cloud",
  jsonLimit: process.env.JSON_LIMIT || "256kb",
  nodeEnv: process.env.NODE_ENV || "development",

  // Shared gateway protection. When a secret is configured, requests must pass it
  // in x-salesmaster-gateway-secret or as ?gatewaySecret=... for providers that
  // cannot send custom headers.
  gatewaySharedSecret: process.env.GATEWAY_SHARED_SECRET || "",
  requireGatewaySecret: parseBool(
    process.env.REQUIRE_GATEWAY_SECRET,
    Boolean(process.env.GATEWAY_SHARED_SECRET)
  ),

  // GHL global config.
  ghlApiBase: process.env.GHL_API_BASE || "https://services.leadconnectorhq.com",
  ghlVersion: process.env.GHL_VERSION || "2021-07-28",
  ghlLocationPit: process.env.GHL_LOCATION_PIT || "",
  ghlInboundType: process.env.GHL_INBOUND_TYPE || "SMS",
  allowDefaultTenant: parseBool(process.env.ALLOW_DEFAULT_TENANT, false),
  tenants: parseTenants(),

  // Evolution API config (WhatsApp QR).
  evolutionBaseUrl: process.env.EVOLUTION_BASE_URL || "http://localhost:8085",
  evolutionApiKey: process.env.EVOLUTION_API_KEY || "",
  evolutionInstanceName: process.env.EVOLUTION_INSTANCE_NAME || "",

  // Meta Cloud API config (WhatsApp Oficial).
  metaGraphVersion: process.env.META_GRAPH_VERSION || "v20.0",
  metaPhoneNumberId: process.env.META_PHONE_NUMBER_ID || "",
  metaAccessToken: process.env.META_ACCESS_TOKEN || "",
  metaVerifyToken: process.env.META_VERIFY_TOKEN || "",
  metaAppSecret: process.env.META_APP_SECRET || "",

  activeGateway: parseGatewayMode(process.env.ACTIVE_GATEWAY),
  logMessageBodies: parseBool(process.env.LOG_MESSAGE_BODIES, false)
};
