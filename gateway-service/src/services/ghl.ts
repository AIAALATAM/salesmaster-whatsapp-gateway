import axios from "axios";
import { config } from "../config";

const ghlClient = axios.create({
  baseURL: config.ghlApiBase,
  headers: {
    "Version": config.ghlVersion,
    "Content-Type": "application/json"
  }
});

// Resuelve dinámicamente las cabeceras con el PIT de la subcuenta
const getHeaders = (locationPit?: string) => {
  const token = locationPit || config.ghlLocationPit;
  if (!token) {
    throw new Error("No GHL Location PIT configured or provided.");
  }
  return {
    Authorization: `Bearer ${token}`
  };
};

export class GhlService {
  /**
   * Busca un contacto en GHL por su número de teléfono
   */
  static async findContactByPhone(phone: string, locationPit?: string): Promise<any> {
    try {
      // Formatear el teléfono para asegurar el '+'
      const cleanPhone = phone.startsWith("+") ? phone : `+${phone}`;
      
      const response = await ghlClient.get("/contacts/", {
        params: { phone: cleanPhone },
        headers: getHeaders(locationPit)
      });

      if (response.data && response.data.contacts && response.data.contacts.length > 0) {
        return response.data.contacts[0];
      }
      return null;
    } catch (error: any) {
      console.error("Error finding GHL contact:", error?.response?.data || error.message);
      return null;
    }
  }

  /**
   * Crea un nuevo contacto básico en GHL
   */
  static async createContact(phone: string, firstName: string, locationPit?: string): Promise<any> {
    try {
      const cleanPhone = phone.startsWith("+") ? phone : `+${phone}`;
      
      const response = await ghlClient.post(
        "/contacts/",
        {
          firstName,
          phone: cleanPhone
        },
        {
          headers: getHeaders(locationPit)
        }
      );

      return response.data?.contact || response.data;
    } catch (error: any) {
      console.error("Error creating GHL contact:", error?.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Inyecta un mensaje entrante (Inbound) de WhatsApp en la conversación de GHL
   */
  static async injectInboundMessage(contactId: string, text: string, locationPit?: string): Promise<any> {
    try {
      const response = await ghlClient.post(
        "/conversations/messages",
        {
          type: "WhatsApp",
          contactId,
          body: text,
          direction: "inbound",
          status: "delivered"
        },
        {
          headers: getHeaders(locationPit)
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Error injecting inbound message to GHL:", error?.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Actualiza el estado de un mensaje saliente enviado por GHL
   */
  static async updateMessageStatus(messageId: string, status: "sent" | "delivered" | "failed", locationPit?: string): Promise<any> {
    try {
      const response = await ghlClient.put(
        `/conversations/messages/${messageId}/status`,
        { status },
        {
          headers: getHeaders(locationPit)
        }
      );

      return response.data;
    } catch (error: any) {
      console.error(`Error updating message status for ${messageId}:`, error?.response?.data || error.message);
      return null;
    }
  }
}
