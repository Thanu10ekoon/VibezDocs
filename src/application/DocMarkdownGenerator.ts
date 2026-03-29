import { TimelineEntry } from "../core/types";

export interface DocUpdateInput {
  readonly architecture: string[];
  readonly apis: string[];
  readonly components: string[];
  readonly database: string[];
  readonly pages: string[];
  readonly timeline: TimelineEntry[];
  readonly llmSummary: string;
}

interface DocSections {
  architecture: string[];
  apis: string[];
  components: string[];
  database: string[];
  pages: string[];
  timeline: string[];
}

export class DocMarkdownGenerator {
  public merge(existing: string, update: DocUpdateInput): string {
    const current = this.parse(existing);
    const llmArchitectureLines = this.extractConciseLlmArchitecture(update.llmSummary);
    const next: DocSections = {
      architecture: this.mergeUnique(current.architecture, [...update.architecture, ...llmArchitectureLines]),
      apis: this.mergeUnique(current.apis, update.apis),
      components: this.mergeUnique(current.components, update.components),
      database: this.mergeUnique(current.database, update.database),
      pages: this.mergeUnique(current.pages, update.pages),
      timeline: this.mergeUnique(current.timeline, this.timelineToLines(update.timeline)),
    };

    const mermaid = this.buildMermaid(next);
    return this.render(next, mermaid);
  }

  public initial(): string {
    return this.render(
      {
        architecture: [],
        apis: [],
        components: [],
        database: [],
        pages: [],
        timeline: [],
      },
      this.buildMermaid({
        architecture: [],
        apis: [],
        components: [],
        database: [],
        pages: [],
        timeline: [],
      })
    );
  }

  private parse(doc: string): DocSections {
    return {
      architecture: this.readSection(doc, "Architecture"),
      apis: this.readSection(doc, "APIs"),
      components: this.readSection(doc, "Components"),
      database: this.readSection(doc, "Database"),
      pages: this.readSection(doc, "Pages"),
      timeline: this.readSection(doc, "Development Timeline"),
    };
  }

  private readSection(doc: string, title: string): string[] {
    const regex = new RegExp(`## ${title}\\n([\\s\\S]*?)(\\n## |$)`, "m");
    const match = doc.match(regex);
    if (!match?.[1]) {
      return [];
    }

    return match[1]
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("- "));
  }

  private mergeUnique(existing: string[], incoming: string[]): string[] {
    const sanitizedExisting = existing.filter((line) => !this.isPlaceholder(line));
    const seen = new Set(sanitizedExisting);
    const merged = [...sanitizedExisting];
    for (const line of incoming) {
      const normalized = line.trim();
      if (!normalized || this.isPlaceholder(normalized) || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      merged.push(normalized.startsWith("- ") ? normalized : `- ${normalized}`);
    }
    return merged;
  }

  private timelineToLines(entries: TimelineEntry[]): string[] {
    return entries.map((entry) =>
      `- ${entry.timestamp}: ${entry.action} in ${entry.file} (${entry.feature})`
    );
  }

  private render(sections: DocSections, mermaid: string): string {
    return [
      "# VibezDocs",
      "",
      "## Architecture",
      ...this.renderSection(sections.architecture),
      "",
      "## APIs",
      ...this.renderSection(sections.apis),
      "",
      "## Components",
      ...this.renderSection(sections.components),
      "",
      "## Database",
      ...this.renderSection(sections.database),
      "",
      "## Pages",
      ...this.renderSection(sections.pages),
      "",
      "## Development Timeline",
      ...this.renderSection(sections.timeline),
      "",
      "## C4 Diagram (Mermaid format)",
      "```mermaid",
      mermaid,
      "```",
      "",
    ].join("\n");
  }

  private renderSection(lines: string[]): string[] {
    if (lines.length === 0) {
      return ["- (none yet)"];
    }
    return lines;
  }

  private extractConciseLlmArchitecture(llmSummary: string): string[] {
    if (!llmSummary.trim()) {
      return [];
    }

    const candidates = llmSummary
      .split(/\r?\n/)
      .map((line) => line.trim())
      .map((line) => line.replace(/^[-*]\s+/, ""))
      .map((line) => line.replace(/^\d+\.\s+/, ""))
      .map((line) => line.replace(/`+/g, ""))
      .map((line) => line.replace(/^\*\*(.+)\*\*:\s*/g, "$1: "))
      .map((line) => line.replace(/^\*\*(.+)\*\*$/g, "$1"))
      .filter((line) => line.length > 0)
      .filter((line) => !/^here are \d+ concise bullets/i.test(line))
      .filter((line) => !/^summary\s*:/i.test(line));

    const concise: string[] = [];
    for (const line of candidates) {
      const cleaned = line.replace(/\s+/g, " ").trim();
      if (cleaned.length < 12) {
        continue;
      }

      const shortened = cleaned.length > 130 ? `${cleaned.slice(0, 127).trimEnd()}...` : cleaned;
      concise.push(`- ${shortened}`);
      if (concise.length >= 3) {
        break;
      }
    }

    return concise;
  }

  private isPlaceholder(line: string): boolean {
    return line.trim() === "- (none yet)";
  }

  private buildMermaid(sections: DocSections): string {
    const hasApi = sections.apis.length > 0;
    const hasUi = sections.pages.length > 0 || sections.components.length > 0;
    const hasDb = sections.database.length > 0;

    const graph = ["flowchart LR", "  Dev[Developer] --> VSCode[VS Code + VibezDocs]"];
    if (hasUi) {
      graph.push("  VSCode --> UI[Frontend UI / Pages]");
    }
    if (hasApi) {
      graph.push("  VSCode --> API[Backend APIs]");
    }
    if (hasDb) {
      graph.push("  API --> DB[(Database)]");
    }
    graph.push("  VSCode --> DOC[docs/Doc.md]");
    return graph.join("\n");
  }
}
