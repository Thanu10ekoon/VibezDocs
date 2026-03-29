import { ChangeChunk } from "../core/types";

export class NoiseFilter {
  public filter(chunks: readonly ChangeChunk[]): ChangeChunk[] {
    return chunks.filter((chunk) => this.isMeaningful(chunk.text));
  }

  private isMeaningful(text: string): boolean {
    const withoutWhitespace = text.replace(/\s+/g, "");
    if (withoutWhitespace.length === 0) {
      return false;
    }

    const nonCommentLines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => !line.startsWith("//"))
      .filter((line) => !line.startsWith("#"))
      .filter((line) => !line.startsWith("/*"))
      .filter((line) => !line.startsWith("*"))
      .filter((line) => !line.endsWith("*/"));

    return nonCommentLines.length > 0;
  }
}
