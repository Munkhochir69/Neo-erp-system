
import { GoogleGenAI, Type } from "@google/genai";
import { AppState } from "../types";

// Follow @google/genai guidelines: Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIInsights = async (state: AppState) => {
  const inventorySummary = state.inventory.map(i => `${i.name} (Үлдэгдэл: ${i.stock}/${i.reorderPoint})`).join(', ');
  const recentOrders = state.orders.slice(-5).map(o => `${o.id}: $${o.amount} (${o.status})`).join(', ');
  
  const prompt = `
    NEO ERP системийн бизнесийн ахлах зөвлөхийн дүрээр ажиллана уу. 
    Дараах өгөгдөлд дүн шинжилгээ хийж, 3 товч бөгөөд хэрэгжүүлж болохуйц зөвлөмжийг МОНГОЛ хэлээр өгнө үү:
    
    Бараа материалын төлөв: ${inventorySummary}
    Сүүлийн захиалгууд: ${recentOrders}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
                description: "Бизнесийн зөвлөмж"
              }
            }
          },
          required: ["insights"]
        }
      }
    });

    // Extracting text output from GenerateContentResponse using .text property
    const text = response.text;
    const result = JSON.parse(text || '{"insights": []}');
    return result.insights as string[];
  } catch (error) {
    console.error("AI Insights failed:", error);
    return [
      "Бараа материалын нөөцийн түвшинг тогтмол хянах шаардлагатай.",
      "Хүлээгдэж буй захиалгуудын саатлыг шалгаж шийдвэрлэх.",
      "Дараагийн улирлын борлуулалтын чиг хандлагад дүн шинжилгээ хийх."
    ];
  }
};
