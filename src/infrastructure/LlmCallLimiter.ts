export class LlmCallLimiter {
  private readonly calls: number[] = [];

  public canCall(maxCallsPerHour: number, now: number): boolean {
    this.prune(now);
    return this.calls.length < maxCallsPerHour;
  }

  public recordCall(now: number): void {
    this.prune(now);
    this.calls.push(now);
  }

  private prune(now: number): void {
    const oneHourAgo = now - 60 * 60 * 1000;
    while (this.calls.length > 0 && this.calls[0] < oneHourAgo) {
      this.calls.shift();
    }
  }
}
