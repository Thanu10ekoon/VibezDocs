import { DiffEngine } from "../core/ports";
import { ChangeChunk } from "../core/types";

interface LineToken {
  readonly raw: string;
  readonly normalized: string;
  readonly lineNo: number;
}

export class LineDiffEngine implements DiffEngine {
  public diff(oldContent: string, newContent: string): ChangeChunk[] {
    const oldLines = this.tokenize(oldContent);
    const newLines = this.tokenize(newContent);

    const matrix = this.buildLcsMatrix(oldLines, newLines);
    return this.walkDiff(oldLines, newLines, matrix);
  }

  private tokenize(content: string): LineToken[] {
    const lines = content.split(/\r?\n/);
    return lines.map((raw, index) => ({
      raw,
      normalized: raw.trim(),
      lineNo: index + 1,
    }));
  }

  private buildLcsMatrix(a: LineToken[], b: LineToken[]): number[][] {
    const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
      Array<number>(b.length + 1).fill(0)
    );

    for (let i = a.length - 1; i >= 0; i -= 1) {
      for (let j = b.length - 1; j >= 0; j -= 1) {
        if (a[i].normalized === b[j].normalized) {
          matrix[i][j] = matrix[i + 1][j + 1] + 1;
        } else {
          matrix[i][j] = Math.max(matrix[i + 1][j], matrix[i][j + 1]);
        }
      }
    }

    return matrix;
  }

  private walkDiff(a: LineToken[], b: LineToken[], matrix: number[][]): ChangeChunk[] {
    const chunks: ChangeChunk[] = [];
    let i = 0;
    let j = 0;

    while (i < a.length && j < b.length) {
      if (a[i].normalized === b[j].normalized) {
        i += 1;
        j += 1;
        continue;
      }

      if (matrix[i + 1][j] >= matrix[i][j + 1]) {
        this.pushChunk(chunks, "removed", a[i]);
        i += 1;
      } else {
        this.pushChunk(chunks, "added", b[j]);
        j += 1;
      }
    }

    while (i < a.length) {
      this.pushChunk(chunks, "removed", a[i]);
      i += 1;
    }

    while (j < b.length) {
      this.pushChunk(chunks, "added", b[j]);
      j += 1;
    }

    return this.mergeAdjacent(chunks);
  }

  private pushChunk(chunks: ChangeChunk[], type: "added" | "removed", line: LineToken): void {
    chunks.push({
      type,
      text: line.raw,
      startLine: line.lineNo,
      endLine: line.lineNo,
    });
  }

  private mergeAdjacent(chunks: ChangeChunk[]): ChangeChunk[] {
    if (chunks.length < 2) {
      return chunks;
    }

    const merged: ChangeChunk[] = [chunks[0]];

    for (let index = 1; index < chunks.length; index += 1) {
      const previous = merged[merged.length - 1];
      const current = chunks[index];

      if (previous.type === current.type && previous.endLine + 1 === current.startLine) {
        merged[merged.length - 1] = {
          type: previous.type,
          text: `${previous.text}\n${current.text}`,
          startLine: previous.startLine,
          endLine: current.endLine,
        };
      } else {
        merged.push(current);
      }
    }

    return merged;
  }
}
