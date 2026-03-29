import { LLMProvider } from "../../core/ports";
import { ContextPayload } from "../../core/types";
import { HttpClient } from "./HttpClient";

interface HfResponse {
  generated_text?: string;
}

export class HuggingFaceProvider implements LLMProvider {
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
      "Create 2 bullet points for docs based on this code update.",
      `File: ${context.changedFile}`,
      `Feature: ${context.feature.kind} ${context.feature.name}`,
      `Summary: ${context.summary}`,
      "Snippet:",
      context.snippet,
    ].join("\n");

    const raw = await this.httpClient.request({
      url: `https://api-inference.huggingface.co/models/${this.model}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    const parsed = JSON.parse(raw) as HfResponse | HfResponse[];
    if (Array.isArray(parsed)) {
      return parsed[0]?.generated_text?.trim() || this.fallback(context);
    }

    return parsed.generated_text?.trim() || this.fallback(context);
  }

  private fallback(context: ContextPayload): string {
    return `- Changed ${context.changedFile}\n- Feature signal: ${context.feature.kind}/${context.feature.name}`;
  }
}
