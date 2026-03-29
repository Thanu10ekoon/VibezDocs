import * as path from "path";
import * as vscode from "vscode";
import { ChangeTracker } from "../core/ports";

const NON_CODE_FILES = new Set(["Doc.md", "package-lock.json"]);
const EXCLUDED_PATH_SEGMENTS = ["/docs/", "/out/", "/node_modules/", "/.git/"];

export class DocumentChangeTracker implements ChangeTracker {
  private readonly pending = new Set<string>();
  private readonly pendingMeaningful = new Set<string>();

  public register(context: vscode.ExtensionContext, onQueued?: () => void): void {
    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        const filePath = event.document.uri.fsPath;
        if (!this.shouldTrackFile(event.document.uri, filePath, event.document.languageId)) {
          return;
        }

        if (this.isMeaningfulChange(event.contentChanges)) {
          this.pendingMeaningful.add(filePath);
          this.queueDocument(filePath);
          onQueued?.();
        }
      })
    );

    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        const filePath = document.uri.fsPath;
        if (!this.shouldTrackFile(document.uri, filePath, document.languageId)) {
          return;
        }

        if (this.pendingMeaningful.has(filePath)) {
          this.queueDocument(filePath);
          onQueued?.();
        }
      })
    );
  }

  public queueDocument(filePath: string): void {
    this.pending.add(filePath);
  }

  public async flush(): Promise<void> {
    this.pending.clear();
    this.pendingMeaningful.clear();
    return Promise.resolve();
  }

  public drainPendingDocuments(): string[] {
    const files = [...this.pending];
    this.pending.clear();
    for (const filePath of files) {
      this.pendingMeaningful.delete(filePath);
    }
    return files;
  }

  private shouldTrackFile(uri: vscode.Uri, filePath: string, languageId: string): boolean {
    if (!vscode.workspace.getWorkspaceFolder(uri)) {
      return false;
    }

    if (languageId === "markdown" || languageId === "plaintext") {
      return false;
    }

    const normalizedPath = filePath.replace(/\\/g, "/").toLowerCase();
    if (EXCLUDED_PATH_SEGMENTS.some((segment) => normalizedPath.includes(segment))) {
      return false;
    }

    const fileName = path.basename(filePath);
    if (NON_CODE_FILES.has(fileName)) {
      return false;
    }

    return true;
  }

  private isMeaningfulChange(changes: readonly vscode.TextDocumentContentChangeEvent[]): boolean {
    if (changes.length === 0) {
      return false;
    }

    return changes.some((change) => this.stripWhitespace(change.text).length > 0);
  }

  private stripWhitespace(text: string): string {
    return text.replace(/\s+/g, "");
  }
}
