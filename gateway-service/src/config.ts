import dotenv from "dotenv";
dotenv.config();

export interface TenantConfig {
  pit: string;
  instanceName: string;
}

const parseTenants = (): Record<string, TenantConfig> => {
  let tenantsStr = process.env.GHL_TENANTS;
  if (!tenantsStr) {
    return {};
  }
  // Limpiar posibles comillas simples al principio y al final
  tenantsStr = tenantsStr.trim();
  if (tenantsStr.startsWith("'") && tenantsStr.endsWith("'")) {
    tenantsStr = tenantsStr.slice(1, -1);
  }
  try {
    return JSON.parse(tenantsStr);
  } catch (error: any) {
    console.error("[Config] Failed to parse GHL_TENANTS JSON:", error.message);
    console.error("[Config] Payload was:", tenantsStr);
    return {};
  }
};

export const config = {
  port: process.env.PORT || 8086,
  
  // GHL Global Config
  ghlApiBase: process.env.GHL_API_BASE || "https://services.leadconnectorhq.com",
  ghlVersion: process.env.GHL_VERSION || "2021-07-28",
  
  // El PIT de cada ubicación se puede configurar de forma estática aquí para una sola cuenta,
  // o se puede mapear dinámicamente mediante una base de datos/objeto si manejas multitenant.
  ghlLocationPit: process.env.GHL_LOCATION_PIT || "",
  
  // Multitenancy: mapeo dinámico
  tenants: parseTenants(),

  // Evolution API Config (WhatsApp QR)
  evolutionBaseUrl: process.env.EVOLUTION_BASE_URL || "http://localhost:8085",
  evolutionApiKey: process.env.EVOLUTION_API_KEY || "",
  evolutionInstanceName: process.env.EVOLUTION_INSTANCE_NAME || "bb-cleaning-360",

  // Meta Cloud API Config (WhatsApp Oficial)
  metaPhoneNumberId: process.env.META_PHONE_NUMBER_ID || "",
  metaAccessToken: process.env.META_ACCESS_TOKEN || "",
  metaVerifyToken: process.env.META_VERIFY_TOKEN || "",

  // Tipo de gateway activo: "QR" o "OFFICIAL"
  activeGateway: (process.env.ACTIVE_GATEWAY || "QR").toUpperCase() as "QR" | "OFFICIAL"
};
