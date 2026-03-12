import http from "http";
import { AddressInfo } from "net";
import { startMetricsServer } from "./metrics";

function request(server: http.Server, path: string): Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const address = server.address() as AddressInfo;

    const req = http.request(
      {
        host: "127.0.0.1",
        port: address.port,
        path,
        method: "GET",
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, body, headers: res.headers });
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}

describe("metrics server", () => {
  let server: http.Server;

  beforeEach(() => {
    server = startMetricsServer(0);
  });

  afterEach((done) => {
    server.close(done);
  });

  it("deve responder healthcheck", async () => {
    const res = await request(server, "/health");

    expect(res.status).toBe(200);
    expect(res.body).toBe(JSON.stringify({ status: "ok" }));
  });

  it("deve responder metricas do Prometheus", async () => {
    const res = await request(server, "/metrics");

    expect(res.status).toBe(200);
    expect((res.headers["content-type"] ?? "").toString()).toContain("text/plain");
    expect(res.body).toContain("processador_video_messages_received_total");
  });

  it("deve responder 404 para rota desconhecida", async () => {
    const res = await request(server, "/rota-inexistente");

    expect(res.status).toBe(404);
    expect(res.body).toBe("Not found");
  });
});
