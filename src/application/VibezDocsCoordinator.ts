import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { DiffEngine, LLMProvider, SnapshotStore } from "../core/ports";
import { FileChange, TimelineEntry } from "../core/types";
import { DocMarkdownGenerator } from "./DocMarkdownGenerator";
import { ContextBuilder } from "./ContextBuilder";
import { FeatureDetector } from "./FeatureDetector";
import { NoiseFilter } from "./NoiseFilter";
import { DocFileRepository } from "../infrastructure/DocFileRepository";
import { DocumentChangeTracker } from "../infrastructure/DocumentChangeTracker";
import { ProjectSnapshotService } from "../infrastructure/ProjectSnapshotService";
import { LlmCallLimiter } from "../infrastructure/LlmCallLimiter";
import { LLMProviderFactory } from "../infrastructure/llm/LLMProviderFactory";

interface CoordinatorDeps {
  readonly workspaceRoot: string;
  readonly tracker: DocumentChangeTracker;
  readonly diffEngine: DiffEngine;
  readonly snapshotStore: SnapshotStore;
  readonly detector: FeatureDetector;
  readonly contextBuilder: ContextBuilder;
  readonly snapshotService: ProjectSnapshotService;
  readonly llmFactory: LLMProviderFactory;
  readonly markdownGenerator: DocMarkdownGenerator;
  readonly docRepository: DocFileRepository;
  readonly noiseFilter: NoiseFilter;
  readonly callLimiter: LlmCallLimiter;
}

export class VibezDocsCoordinator {
  private debounceHandle: NodeJS.Timeout | undefined;

  constructor(private readonly deps: CoordinatorDeps) {}

  public scheduleAutoUpdate(): void {
    const config = vscode.workspace.getConfiguration("vibezdocs");
    const autoUpdate = config.get<boolean>("autoUpdate", true);
    if (!autoUpdate) {
      return;
    }

    const delay = config.get<number>("updateFrequencyMs", 3000);
    if (this.debounceHandle) {
      clearTimeout(this.debounceHandle);
    }

    this.debounceHandle = setTimeout(() => {
      void this.processPending();
    }, delay);
  }

  public async processPending(): Promise<void> {
    const pending = this.deps.tracker.drainPendingDocuments();
    if (pending.length === 0) {
      return;
    }

    const provider = this.deps.llmFactory.createFromSettings();
    const docPath = path.join(this.deps.workspaceRoot, "docs", "Doc.md");
    const existingDoc = this.deps.docRepository.read(docPath) || this.deps.markdownGenerator.initial();
    const projectSnapshot = await this.deps.snapshotService.collect(this.deps.workspaceRoot);

    const architecture: string[] = [];
    const apis: string[] = [];
    const components: string[] = [];
    const database: string[] = [];
    const pages: string[] = [];
    const timeline: TimelineEntry[] = [];
    const llmNotes: string[] = [];

    for (const filePath of pending) {
      if (!fs.existsSync(filePath) || this.isInsideDocs(filePath)) {
        continue;
      }

      const currentContent = fs.readFileSync(filePath, "utf8");
      const previous = this.deps.snapshotStore.getSnapshot(filePath) ?? "";
      const rawChunks = this.deps.diffEngine.diff(previous, currentContent);
      const chunks = this.deps.noiseFilter.filter(rawChunks);
      this.deps.snapshotStore.setSnapshot(filePath, currentContent);

      if (chunks.length === 0) {
        continue;
      }

      const relativePath = path.relative(this.deps.workspaceRoot, filePath).replace(/\\/g, "/");
      const languageId = this.getLanguageId(filePath);
      const fileChange: FileChange = {
        relativePath,
        languageId,
        chunks,
        timestamp: new Date().toISOString(),
      };

      const detection = this.deps.detector.detect(fileChange);
      architecture.push(...detection.architecture);
      apis.push(...detection.apis);
      components.push(...detection.components);
      database.push(...detection.database);
      pages.push(...detection.pages);

      const context = this.deps.contextBuilder.build(fileChange, detection.feature, projectSnapshot);
      const llmText = await this.maybeCallLlm(provider, context);
      if (llmText) {
        llmNotes.push(llmText);
      }

      timeline.push({
        timestamp: fileChange.timestamp,
        file: relativePath,
        action: "Updated",
        feature: detection.feature.kind,
      });
    }

    if (timeline.length === 0) {
      return;
    }

    const merged = this.deps.markdownGenerator.merge(existingDoc, {
      architecture,
      apis,
      components,
      database,
      pages,
      timeline,
      llmSummary: llmNotes.join("\n"),
    });

    this.deps.docRepository.write(docPath, merged);
  }

  private async maybeCallLlm(provider: LLMProvider, context: ReturnType<ContextBuilder["build"]>): Promise<string> {
    const maxCalls = vscode.workspace.getConfiguration("vibezdocs").get<number>("maxLlmCallsPerHour", 60);
    const now = Date.now();
    if (!this.deps.callLimiter.canCall(maxCalls, now)) {
      return "";
    }

    const text = await provider.generateDocs(context);
    this.deps.callLimiter.recordCall(now);
    return text;
  }

  private isInsideDocs(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, "/");
    return normalized.includes("/docs/");
  }

  private getLanguageId(filePath: string): string {
    const openDoc = vscode.workspace.textDocuments.find((doc) => doc.uri.fsPath === filePath);
    if (openDoc) {
      return openDoc.languageId;
    }

    const ext = path.extname(filePath).toLowerCase();
    if ([".ts", ".tsx"].includes(ext)) {
      return "typescript";
    }
    if ([".js", ".jsx"].includes(ext)) {
      return "javascript";
    }
    if (ext === ".py") {
      return "python";
    }
    return "plaintext";
  }
}
