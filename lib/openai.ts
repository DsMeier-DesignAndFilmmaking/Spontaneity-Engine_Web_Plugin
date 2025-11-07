import OpenAI from "openai";

export const getOpenAI = () => {
  if (!process.env.OPENAI_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_KEY });
};

