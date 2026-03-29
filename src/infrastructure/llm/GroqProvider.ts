import { LLMProvider } from "../../core/ports";
import { ContextPayload } from "../../core/types";
import { HttpClient } from "./HttpClient";

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export class GroqProvider implements LLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly httpClient: HttpClient
  ) {}

  public async generateDocs(context: ContextPayload): Promise<string> {
    if (!this.apiKey) {
      return this.fallback(context);
    }

    const prompt = [
      "Summarize this development change in 2 concise bullets:",
      `File: ${context.changedFile}`,
      `Feature: ${context.feature.kind} ${context.feature.name}`,
      `Summary: ${context.summary}`,
      "Snippet:",
      context.snippet,
    ].join("\n");

    const raw = await this.httpClient.request({
      url: "https://api.groq.com/openai/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages: [
          { role: "system", content: "You generate crisp developer documentation updates." },
          { role: "user", content: prompt },
        ],
      }),
    });

    const parsed = JSON.parse(raw) as GroqResponse;
    return parsed.choices?.[0]?.message?.content?.trim() || this.fallback(context);
  }

  private fallback(context: ContextPayload): string {
    return `- Updated ${context.changedFile}\n- Inferred ${context.feature.kind}: ${context.feature.name}`;
  }
}
