import * as vscode from "vscode";
import { LLMProvider } from "../../core/ports";
import { GroqProvider } from "./GroqProvider";
import { HuggingFaceProvider } from "./HuggingFaceProvider";
import { HttpClient } from "./HttpClient";

export class LLMProviderFactory {
  constructor(private readonly httpClient: HttpClient) {}

  public createFromSettings(): LLMProvider {
    const config = vscode.workspace.getConfiguration("vibezdocs");
    const provider = config.get<string>("provider", "groq");

    if (provider === "huggingface") {
      return new HuggingFaceProvider(
        config.get<string>("hfApiKey", ""),
        config.get<string>("hfModel", "meta-llama/Llama-3.1-8B-Instruct"),
        this.httpClient
      );
    }

    return new GroqProvider(
      config.get<string>("groqApiKey", ""),
      config.get<string>("groqModel", "llama-3.1-8b-instant"),
      this.httpClient
    );
  }
}
