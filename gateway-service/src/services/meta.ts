import axios from "axios";
import { config } from "../config";

export class MetaService {
  /**
   * Envía un mensaje de texto plano a través de la API de WhatsApp Cloud oficial de Meta
   */
  static async sendText(phone: string, text: string, phoneNumberId?: string, accessToken?: string): Promise<any> {
    const phoneId = phoneNumberId || config.metaPhoneNumberId;
    const token = accessToken || config.metaAccessToken;
    
    if (!phoneId || !token) {
      throw new Error("Meta phone ID or access token is missing.");
    }

    const cleanPhone = phone.replace(/[^0-9]/g, ""); // Asegura solo números para Meta (ej: 34663396642)

    try {
      const response = await axios.post(
        `https://graph.facebook.com/v20.0/${phoneId}/messages`,
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
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      console.log(`[Meta API] Message sent successfully to ${cleanPhone}`);
      return response.data;
    } catch (error: any) {
      console.error("[Meta API] Error sending message:", error?.response?.data || error.message);
      throw error;
    }
  }
}
