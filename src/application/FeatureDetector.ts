import * as path from "path";
import { DetectionResult, FeatureDetection, FileChange, FeatureKind } from "../core/types";

export class FeatureDetector {
  public detect(change: FileChange): DetectionResult {
    const text = change.chunks.map((chunk) => chunk.text).join("\n");
    const file = change.relativePath.toLowerCase();

    const apiMatches = this.matchAny(text, [
      /express\.Router\(/,
      /app\.(get|post|put|delete|patch|options|head)\s*\(/,
      /router\.(get|post|put|delete|patch|options|head)\s*\(/,
      /fastify\.(get|post|put|delete|patch|options|head)\s*\(/,
      /server\.(get|post|put|delete|patch|options|head)\s*\(/,
      /@Controller\(/,
      /@(Get|Post|Put|Delete|Patch|Options|Head)\(/,
      /@app\.(get|post|put|delete|patch)\(/,
    ]) || this.matchAny(file, [/\bapi\b/, /\broutes?\b/, /\bcontrollers?\b/, /server\.(ts|js)$/]);

    const componentMatches = this.matchAny(text, [
      /function\s+[A-Z][A-Za-z0-9_]*\s*\([^)]*\)\s*{[\s\S]*return\s*\(/,
      /const\s+[A-Z][A-Za-z0-9_]*\s*=\s*\([^)]*\)\s*=>\s*</,
      /<([A-Z][A-Za-z0-9]*)[\s>]/,
    ]);

    const dbMatches = this.matchAny(text, [
      /new\s+Schema\(/,
      /sequelize\.define\(/,
      /prisma\.[a-zA-Z]+\./,
      /new\s+PrismaClient\(/,
      /typeorm|@Entity\(/,
      /new\s+DataSource\(/,
      /mongoose\.connect\(/,
      /createPool\(/,
      /mysql2?\.createPool\(/,
      /new\s+Pool\(/,
      /knex\(/,
      /drizzle\(/,
      /CREATE\s+TABLE/i,
      /ALTER\s+TABLE/i,
      /model\("[A-Za-z0-9_]+"/,
    ]) || this.matchAny(file, [/\bschema\b/, /\bmigrations?\b/, /\bmodels?\b/, /\bdb\b/, /database/, /\.sql$/]);

    const pageMatches = file.includes("pages/") || file.includes("routes/") || this.matchAny(text, [
      /createBrowserRouter\(/,
      /Route\s+path=/,
      /next\/navigation/,
    ]);

    const feature = this.decideFeature(change.relativePath, {
      api: apiMatches,
      component: componentMatches,
      model: dbMatches,
      page: pageMatches,
    });

    return {
      feature,
      architecture: [this.architectureHint(change, feature.kind)],
      apis: apiMatches
        ? this.extractApiLines(text, change.relativePath).map((line) => `- ${line}`)
        : [],
      components: componentMatches ? [this.shortLine(`Component update in ${change.relativePath}`, text)] : [],
      database: dbMatches
        ? this.extractDatabaseLines(text, change.relativePath).map((line) => `- ${line}`)
        : [],
      pages: pageMatches ? [this.shortLine(`Page/routing change in ${change.relativePath}`, text)] : [],
    };
  }

  private decideFeature(
    filePath: string,
    scores: Record<Exclude<FeatureKind, "unknown">, boolean>
  ): FeatureDetection {
    if (scores.api) {
      return { kind: "api", name: this.basename(filePath), confidence: 0.9 };
    }
    if (scores.component) {
      return { kind: "component", name: this.basename(filePath), confidence: 0.85 };
    }
    if (scores.model) {
      return { kind: "model", name: this.basename(filePath), confidence: 0.85 };
    }
    if (scores.page) {
      return { kind: "page", name: this.basename(filePath), confidence: 0.8 };
    }

    return { kind: "unknown", name: this.basename(filePath), confidence: 0.5 };
  }

  private matchAny(input: string, regexes: RegExp[]): boolean {
    return regexes.some((regex) => regex.test(input));
  }

  private basename(filePath: string): string {
    return path.basename(filePath);
  }

  private architectureHint(change: FileChange, kind: FeatureKind): string {
    const ext = path.extname(change.relativePath);
    const axis = [".tsx", ".jsx", ".vue"].includes(ext) ? "frontend" : "backend";
    return `${axis} ${kind} activity detected in ${change.relativePath}`;
  }

  private shortLine(prefix: string, text: string): string {
    const firstCodeLine = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);

    if (!firstCodeLine) {
      return `- ${prefix}`;
    }

    return `- ${prefix}: ${firstCodeLine.slice(0, 120)}`;
  }

  private extractApiLines(text: string, relativePath: string): string[] {
    const endpointRegex = /(app|router|fastify|server)\.(get|post|put|delete|patch|options|head)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
    const endpoints: string[] = [];
    let match: RegExpExecArray | null = endpointRegex.exec(text);

    while (match) {
      const method = match[2].toUpperCase();
      const route = match[3];
      endpoints.push(`${method} ${route} in ${relativePath}`);
      match = endpointRegex.exec(text);
    }

    if (endpoints.length > 0) {
      return this.limitUnique(endpoints, 4);
    }

    return [this.shortLine(`API change in ${relativePath}`, text).replace(/^-\s*/, "")];
  }

  private extractDatabaseLines(text: string, relativePath: string): string[] {
    const insights: string[] = [];
    const createTableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?[`"']?([a-zA-Z0-9_]+)[`"']?/gi;
    let tableMatch: RegExpExecArray | null = createTableRegex.exec(text);

    while (tableMatch) {
      insights.push(`Table ${tableMatch[1]} defined in ${relativePath}`);
      tableMatch = createTableRegex.exec(text);
    }

    if (/createPool\s*\(/i.test(text) || /mysql2?\.createPool\s*\(/i.test(text)) {
      insights.push(`Database connection pool configured in ${relativePath}`);
    }

    if (/mongoose\.connect\s*\(/i.test(text) || /new\s+PrismaClient\s*\(/i.test(text) || /new\s+DataSource\s*\(/i.test(text)) {
      insights.push(`Database client wiring updated in ${relativePath}`);
    }

    if (insights.length > 0) {
      return this.limitUnique(insights, 4);
    }

    return [this.shortLine(`Database model change in ${relativePath}`, text).replace(/^-\s*/, "")];
  }

  private limitUnique(lines: string[], maxCount: number): string[] {
    const unique: string[] = [];
    const seen = new Set<string>();

    for (const line of lines) {
      if (seen.has(line)) {
        continue;
      }

      seen.add(line);
      unique.push(line);
      if (unique.length >= maxCount) {
        break;
      }
    }

    return unique;
  }
}
