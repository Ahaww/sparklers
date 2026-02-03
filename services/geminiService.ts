
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDrawing = async (base64Image: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: "I have created an abstract light painting. Looking at the patterns, flow, and colors, can you give it a poetic name and describe the energy or emotion it conveys in a single short sentence?" },
            {
              inlineData: {
                mimeType: "image/png",
                data: base64Image
              }
            }
          ]
        }
      ],
      config: {
        temperature: 0.7,
        maxOutputTokens: 100
      }
    });

    return response.text || "A beautiful creation of light and energy.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Your creativity shines bright.";
  }
};
