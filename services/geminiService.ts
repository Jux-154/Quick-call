
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const summarizeCallContext = async (transcript: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Please provide a concise, professional summary of this meeting transcript. Highlight key decisions and action items: \n\n${transcript}`,
      config: {
        systemInstruction: "You are a highly efficient executive assistant. Your summaries are clear, structured with bullet points, and actionable.",
      }
    });
    return response.text || "No summary available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to generate AI summary.";
  }
};

export const getSmartResponse = async (context: string, lastMessage: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on the current call context: "${context}", suggest a smart response to the last statement: "${lastMessage}"`,
    });
    return response.text;
  } catch (error) {
    return null;
  }
};
