import * as https from "https";

export interface HttpRequest {
  readonly url: string;
  readonly method: "POST" | "GET";
  readonly headers?: Record<string, string>;
  readonly body?: string;
}

export class HttpClient {
  public async request(request: HttpRequest): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const req = https.request(request.url, {
        method: request.method,
        headers: request.headers,
      }, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const code = res.statusCode ?? 500;
          if (code >= 200 && code < 300) {
            resolve(text);
            return;
          }

          reject(new Error(`HTTP ${code}: ${text}`));
        });
      });

      req.on("error", reject);
      if (request.body) {
        req.write(request.body);
      }
      req.end();
    });
  }
}
