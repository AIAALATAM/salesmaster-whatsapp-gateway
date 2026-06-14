import axios from "axios";
import { config } from "../config";

const ghlClient = axios.create({
  baseURL: config.ghlApiBase,
  timeout: 15000,
  headers: {
    Version: config.ghlVersion,
    "Content-Type": "application/json"
  }
});

const getHeaders = (locationPit?: string) => {
  const token = locationPit || config.ghlLocationPit;
  if (!token) {
    throw new Error("No GHL Location PIT configured or provided.");
  }
  return {
    Authorization: `Bearer ${token}`
  };
};

const toE164 = (phone: string) => {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits.replace(/\D/g, "")}`;
};

export class GhlService {
  static async findContactByPhone(phone: string, locationPit?: string): Promise<any> {
    try {
      const response = await ghlClient.get("/contacts/", {
        params: { phone: toE164(phone) },
        headers: getHeaders(locationPit)
      });

      if (response.data?.contacts?.length > 0) {
        return response.data.contacts[0];
      }
      return null;
    } catch (error: any) {
      console.error("Error finding GHL contact:", error?.response?.data || error.message);
      return null;
    }
  }

  static async createContact(phone: string, firstName: string, locationPit?: string): Promise<any> {
    try {
      const response = await ghlClient.post(
        "/contacts/",
        {
          firstName,
          phone: toE164(phone)
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

  static async injectInboundMessage(
    contactId: string,
    text: string,
    locationPit?: string,
    options?: {
      conversationProviderId?: string;
      type?: string;
      attachments?: string[];
    }
  ): Promise<any> {
    try {
      const payload: Record<string, any> = {
        type: options?.type || config.ghlInboundType,
        contactId,
        message: text
      };

      if (options?.conversationProviderId) {
        payload.conversationProviderId = options.conversationProviderId;
      }
      if (options?.attachments?.length) {
        payload.attachments = options.attachments;
      }

      const response = await ghlClient.post("/conversations/messages/inbound", payload, {
        headers: getHeaders(locationPit)
      });

      return response.data;
    } catch (error: any) {
      console.error("Error injecting inbound message to GHL:", error?.response?.data || error.message);
      throw error;
    }
  }

  static async updateMessageStatus(
    messageId: string,
    status: "sent" | "delivered" | "failed",
    locationPit?: string
  ): Promise<any> {
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
