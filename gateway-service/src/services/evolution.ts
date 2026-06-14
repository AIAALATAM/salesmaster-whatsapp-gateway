import axios from "axios";
import { config } from "../config";

const evolutionClient = axios.create({
  baseURL: config.evolutionBaseUrl,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
    apikey: config.evolutionApiKey
  }
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class EvolutionService {
  static async sendText(phone: string, text: string, instanceName: string): Promise<any> {
    if (!config.evolutionApiKey) {
      throw new Error("EVOLUTION_API_KEY is required for QR gateway mode.");
    }
    if (!instanceName) {
      throw new Error("Evolution instanceName is required for QR gateway mode.");
    }

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (!cleanPhone) {
      throw new Error("Recipient phone is empty after normalization.");
    }

    try {
      await evolutionClient
        .post(`/chat/updatePresence/${instanceName}`, {
          number: cleanPhone,
          presence: "composing"
        })
        .catch(err => console.warn("Could not set Evolution presence:", err.message));

      const randomDelayMs = Math.floor(Math.random() * (6000 - 3000 + 1)) + 3000;
      await delay(randomDelayMs);

      const response = await evolutionClient.post(`/message/sendText/${instanceName}`, {
        number: cleanPhone,
        options: {
          delay: 0,
          presence: "composing"
        },
        textMessage: {
          text
        }
      });

      return response.data;
    } catch (error: any) {
      console.error("[Evolution API] Error sending message:", error?.response?.data || error.message);
      throw error;
    }
  }
}
