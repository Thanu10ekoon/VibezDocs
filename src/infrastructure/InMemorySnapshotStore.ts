import { SnapshotStore } from "../core/ports";

export class InMemorySnapshotStore implements SnapshotStore {
  private readonly snapshots = new Map<string, string>();

  public getSnapshot(filePath: string): string | undefined {
    return this.snapshots.get(filePath);
  }

  public setSnapshot(filePath: string, content: string): void {
    this.snapshots.set(filePath, content);
  }
}
