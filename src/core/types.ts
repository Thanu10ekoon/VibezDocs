export type FeatureKind = "api" | "component" | "model" | "page" | "unknown";

export interface ChangeChunk {
  readonly type: "added" | "removed";
  readonly text: string;
  readonly startLine: number;
  readonly endLine: number;
}

export interface FileChange {
  readonly relativePath: string;
  readonly languageId: string;
  readonly chunks: readonly ChangeChunk[];
  readonly timestamp: string;
}

export interface FeatureDetection {
  readonly kind: FeatureKind;
  readonly name: string;
  readonly confidence: number;
}

export interface DetectionResult {
  readonly feature: FeatureDetection;
  readonly architecture: string[];
  readonly apis: string[];
  readonly components: string[];
  readonly database: string[];
  readonly pages: string[];
}

export interface ContextPayload {
  readonly changedFile: string;
  readonly languageId: string;
  readonly feature: FeatureDetection;
  readonly projectSnapshot: string[];
  readonly snippet: string;
  readonly summary: string;
}

export interface TimelineEntry {
  readonly timestamp: string;
  readonly file: string;
  readonly action: string;
  readonly feature: string;
}
