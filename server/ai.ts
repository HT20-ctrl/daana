import OpenAI from "openai";
import { Message, KnowledgeBase } from "@shared/schema";
import fs from "fs";
import { promisify } from "util";
import mammoth from 'mammoth';
// Import our mock PDF parser as ES module
import parsePdf from './mockPdfParser';

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "dummy_key" });

// Extract text from uploaded files
export async function extractTextFromFiles(filePath: string, mimeType: string): Promise<string> {
  try {
    // Read file content
    const readFile = promisify(fs.readFile);
    const fileBuffer = await readFile(filePath);

    // Extract text based on file type
    if (mimeType === "application/pdf") {
      try {
        const pdfData = await parsePdf(fileBuffer);
        return pdfData.text;
      } catch (error) {
        console.error("Error parsing PDF:", error);
        return "Error extracting PDF content";
      }
    } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    } else {
      // Plain text
      return fileBuffer.toString('utf-8');
    }
  } catch (error) {
    console.error("Error extracting text from file:", error);
    throw new Error("Failed to extract text from file");
  }
}

// Generate AI response using OpenAI API
export async function generateAIResponse(
  message: string,
  messageHistory: Message[],
  knowledgeBase: KnowledgeBase[]
): Promise<string> {
  try {
    // Format conversation history
    const conversationHistory = messageHistory.map(msg => ({
      role: msg.isFromCustomer ? "user" : "assistant",
      content: msg.content
    }));

    // Extract knowledge base content
    const knowledgeBaseContent = knowledgeBase.map(kb => kb.content).join("\n\n");

    // Create system prompt with knowledge base
    const systemPrompt = `You are a helpful customer service AI assistant for a company. Your goal is to provide accurate, helpful responses to customer inquiries.
    
    ${knowledgeBaseContent ? `Use the following company knowledge to inform your responses:\n${knowledgeBaseContent}` : ""}
    
    When you don't know the answer or the information is not in the provided knowledge, be honest about not having that information. 
    Be concise, professional, and friendly in your responses.`;

    // Create messages array for API call
    const messages = [
      { role: "system", content: systemPrompt } as any,
      ...conversationHistory as any[],
      { role: "user", content: message } as any
    ];

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response at this time.";
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "I apologize, but I'm having trouble generating a response right now. Please try again later.";
  }
}

// Analyze sentiment from text
export async function analyzeSentiment(text: string): Promise<number> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a sentiment analysis expert. Analyze the sentiment of the text and provide a rating from 0 to 100, where 0 is extremely negative and 100 is extremely positive. Respond with just the number."
        } as any,
        {
          role: "user",
          content: text
        } as any
      ],
      temperature: 0.3,
      max_tokens: 10
    });

    const score = parseInt(response.choices[0].message.content || "50");
    return isNaN(score) ? 50 : Math.max(0, Math.min(100, score));
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    return 50; // Default neutral sentiment
  }
}
