import axios from "axios";
import { config } from "../config";

const evolutionClient = axios.create({
  baseURL: config.evolutionBaseUrl,
  headers: {
    "Content-Type": "application/json",
    "apikey": config.evolutionApiKey
  }
});

// Función de utilidad para pausar la ejecución (delay)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class EvolutionService {
  /**
   * Envía un mensaje de texto por WhatsApp QR emulando comportamiento humano
   */
  static async sendText(phone: string, text: string, instanceName?: string): Promise<any> {
    const instance = instanceName || config.evolutionInstanceName;
    const cleanPhone = phone.replace(/[^0-9]/g, ""); // Extrae solo los números para Evolution API

    try {
      // 1. Simular presencia 'composing' (escribiendo...) antes de enviar
      console.log(`[Evolution API] Simulating typing status for ${cleanPhone}...`);
      await evolutionClient.post(`/chat/updatePresence/${instance}`, {
        number: cleanPhone,
        presence: "composing"
      }).catch(err => console.warn("Could not set presence:", err.message));

      // 2. Delay aleatorio entre 3 y 6 segundos para imitar velocidad de tecleo humana
      const randomDelayMs = Math.floor(Math.random() * (6000 - 3000 + 1)) + 3000;
      console.log(`[Evolution API] Waiting ${randomDelayMs}ms before sending...`);
      await delay(randomDelayMs);

      // 3. Enviar el mensaje real
      const response = await evolutionClient.post(`/message/sendText/${instance}`, {
        number: cleanPhone,
        options: {
          delay: 0, // Ya manejamos el delay nosotros antes
          presence: "composing"
        },
        textMessage: {
          text
        }
      });

      console.log(`[Evolution API] Message sent successfully to ${cleanPhone}`);
      return response.data;
    } catch (error: any) {
      console.error("[Evolution API] Error sending message:", error?.response?.data || error.message);
      throw error;
    }
  }
}
