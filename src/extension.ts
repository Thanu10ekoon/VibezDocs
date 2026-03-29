import * as vscode from "vscode";
import * as path from "path";
import { VibezDocsService } from "./application/VibezDocsService";
import { VibezDocsCoordinator } from "./application/VibezDocsCoordinator";
import { ContextBuilder } from "./application/ContextBuilder";
import { DocMarkdownGenerator } from "./application/DocMarkdownGenerator";
import { FeatureDetector } from "./application/FeatureDetector";
import { NoiseFilter } from "./application/NoiseFilter";
import { DocumentChangeTracker } from "./infrastructure/DocumentChangeTracker";
import { DocFileRepository } from "./infrastructure/DocFileRepository";
import { InMemorySnapshotStore } from "./infrastructure/InMemorySnapshotStore";
import { LineDiffEngine } from "./infrastructure/LineDiffEngine";
import { LlmCallLimiter } from "./infrastructure/LlmCallLimiter";
import { ProjectSnapshotService } from "./infrastructure/ProjectSnapshotService";
import { HttpClient } from "./infrastructure/llm/HttpClient";
import { LLMProviderFactory } from "./infrastructure/llm/LLMProviderFactory";

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? path.dirname(context.extensionPath);

  const tracker = new DocumentChangeTracker();
  const coordinator = new VibezDocsCoordinator({
    workspaceRoot,
    tracker,
    diffEngine: new LineDiffEngine(),
    snapshotStore: new InMemorySnapshotStore(),
    detector: new FeatureDetector(),
    contextBuilder: new ContextBuilder(),
    snapshotService: new ProjectSnapshotService(),
    llmFactory: new LLMProviderFactory(new HttpClient()),
    markdownGenerator: new DocMarkdownGenerator(),
    docRepository: new DocFileRepository(),
    noiseFilter: new NoiseFilter(),
    callLimiter: new LlmCallLimiter(),
  });
  tracker.register(context, () => coordinator.scheduleAutoUpdate());

  const service = new VibezDocsService(coordinator);

  context.subscriptions.push(
    vscode.commands.registerCommand("vibezdocs.generateNow", async () => {
      await service.generateNow();
      void vscode.window.showInformationMessage("VibezDocs: manual generation completed.");
    })
  );
}

export function deactivate(): void {
  // no-op
}
