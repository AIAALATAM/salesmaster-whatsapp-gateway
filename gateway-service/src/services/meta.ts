import axios from "axios";
import { config } from "../config";

export class MetaService {
  static async sendText(
    phone: string,
    text: string,
    phoneNumberId?: string,
    accessToken?: string
  ): Promise<any> {
    const phoneId = phoneNumberId || config.metaPhoneNumberId;
    const token = accessToken || config.metaAccessToken;

    if (!phoneId || !token) {
      throw new Error("Meta phone ID or access token is missing.");
    }

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (!cleanPhone) {
      throw new Error("Recipient phone is empty after normalization.");
    }

    try {
      const response = await axios.post(
        `https://graph.facebook.com/${config.metaGraphVersion}/${phoneId}/messages`,
        {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanPhone,
          type: "text",
          text: {
            body: text
          }
        },
        {
          timeout: 20000,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("[Meta API] Error sending message:", error?.response?.data || error.message);
      throw error;
    }
  }
}
