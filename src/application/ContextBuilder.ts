import * as path from "path";
import { ContextPayload, FeatureDetection, FileChange } from "../core/types";

const MAX_SNIPPET_LINES = 40;

export class ContextBuilder {
  public build(fileChange: FileChange, feature: FeatureDetection, projectSnapshot: string[]): ContextPayload {
    return {
      changedFile: fileChange.relativePath,
      languageId: fileChange.languageId,
      feature,
      projectSnapshot,
      snippet: this.buildSnippet(fileChange),
      summary: this.buildSummary(fileChange, feature),
    };
  }

  private buildSnippet(fileChange: FileChange): string {
    const merged = fileChange.chunks.map((chunk) => chunk.text).join("\n");
    const lines = merged.split(/\r?\n/).slice(0, MAX_SNIPPET_LINES);
    return lines.join("\n");
  }

  private buildSummary(fileChange: FileChange, feature: FeatureDetection): string {
    const added = fileChange.chunks.filter((chunk) => chunk.type === "added").length;
    const removed = fileChange.chunks.filter((chunk) => chunk.type === "removed").length;
    return `Updated ${path.basename(fileChange.relativePath)} in ${path.dirname(fileChange.relativePath)}: +${added} changes, -${removed} changes, inferred ${feature.kind}:${feature.name}.`;
  }
}
