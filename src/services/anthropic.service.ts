import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env.js";

function extractJsonBlock(text: string) {
  const cleaned = text.trim();
  if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
    return cleaned;
  }

  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

export class AnthropicService {
  private client: Anthropic | null;

  constructor() {
    this.client = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;
  }

  get isConfigured() {
    return Boolean(this.client);
  }

  async generateJson(systemPrompt: string, userPrompt: string) {
    if (!this.client) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt
        }
      ]
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return JSON.parse(extractJsonBlock(text));
  }
}
