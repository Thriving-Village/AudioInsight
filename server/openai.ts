import OpenAI from "openai";

// Initialize OpenAI client with API key from environment
export const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "demo-api-key-replace-with-your-key"
});

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
