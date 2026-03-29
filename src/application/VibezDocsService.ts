import { VibezDocsCoordinator } from "./VibezDocsCoordinator";

export class VibezDocsService {
  constructor(private readonly coordinator: VibezDocsCoordinator) {}

  public async generateNow(): Promise<void> {
    await this.coordinator.processPending();
  }
}
