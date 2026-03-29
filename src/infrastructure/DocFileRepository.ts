import * as fs from "fs";
import * as path from "path";

export class DocFileRepository {
  public read(docPath: string): string {
    if (!fs.existsSync(docPath)) {
      return "";
    }

    return fs.readFileSync(docPath, "utf8");
  }

  public write(docPath: string, content: string): void {
    const dir = path.dirname(docPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(docPath, content, "utf8");
  }
}
