import { ContextPayload, FileChange } from "./types";

export interface LLMProvider {
  generateDocs(context: ContextPayload): Promise<string>;
}

export interface SnapshotStore {
  getSnapshot(filePath: string): string | undefined;
  setSnapshot(filePath: string, content: string): void;
}

export interface ChangeTracker {
  queueDocument(filePath: string): void;
  flush(): Promise<void>;
  drainPendingDocuments(): string[];
}

export interface DiffEngine {
  diff(oldContent: string, newContent: string): ReadonlyArray<FileChange["chunks"][number]>;
}
