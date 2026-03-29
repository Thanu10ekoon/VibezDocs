import * as path from "path";
import * as vscode from "vscode";

const EXCLUDE = "**/{node_modules,.git,out,dist,build,.next,coverage}/**";
const LIMIT = 300;

export class ProjectSnapshotService {
  public async collect(workspaceRoot: string): Promise<string[]> {
    const files = await vscode.workspace.findFiles("**/*", EXCLUDE, LIMIT);
    const rootName = path.basename(workspaceRoot);
    return files
      .map((file) => path.relative(workspaceRoot, file.fsPath).replace(/\\/g, "/"))
      .sort((left, right) => left.localeCompare(right))
      .map((entry) => `${rootName}/${entry}`);
  }
}
