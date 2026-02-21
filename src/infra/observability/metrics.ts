import http from "node:http";
import client from "prom-client";

export const metricsRegistry = new client.Registry();

client.collectDefaultMetrics({ register: metricsRegistry });

export const videoMessagesReceivedTotal = new client.Counter({
    name: "processador_video_messages_received_total",
    help: "Total de mensagens recebidas para processamento de vídeo",
    labelNames: ["queue"] as const,
    registers: [metricsRegistry],
});

export const videoProcessSuccessTotal = new client.Counter({
    name: "processador_video_process_success_total",
    help: "Total de processamentos de vídeo finalizados com sucesso",
    registers: [metricsRegistry],
});

export const videoProcessFailureTotal = new client.Counter({
    name: "processador_video_process_failure_total",
    help: "Total de processamentos de vídeo que falharam",
    labelNames: ["stage"] as const,
    registers: [metricsRegistry],
});

export const videoProcessDurationSeconds = new client.Histogram({
    name: "processador_video_process_duration_seconds",
    help: "Duração do processamento de vídeo em segundos",
    buckets: [1, 3, 5, 10, 30, 60, 120, 300],
    registers: [metricsRegistry],
});

export const httpRequestsTotal = new client.Counter({
    name: "http_requests_total",
    help: "Total de requisições HTTP",
    labelNames: ["method", "route", "status_code"] as const,
    registers: [metricsRegistry],
});

export const httpRequestDurationSeconds = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Duração das requisições HTTP em segundos",
    labelNames: ["method", "route", "status_code"] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
    registers: [metricsRegistry],
});

export const httpRequestSizeBytes = new client.Histogram({
    name: "http_request_size_bytes",
    help: "Tamanho das requisições HTTP em bytes",
    labelNames: ["method", "route"] as const,
    buckets: [128, 512, 1024, 5_120, 10_240, 51_200, 102_400, 512_000, 1_048_576],
    registers: [metricsRegistry],
});

export const httpResponseSizeBytes = new client.Histogram({
    name: "http_response_size_bytes",
    help: "Tamanho das respostas HTTP em bytes",
    labelNames: ["method", "route", "status_code"] as const,
    buckets: [128, 512, 1024, 5_120, 10_240, 51_200, 102_400, 512_000, 1_048_576],
    registers: [metricsRegistry],
});

export const httpRequestsInFlight = new client.Gauge({
    name: "http_requests_in_flight",
    help: "Quantidade de requisições HTTP em andamento",
    labelNames: ["method", "route"] as const,
    registers: [metricsRegistry],
});

function normalizeRoute(url?: string): string {
    if (!url) return "unknown";
    const pathname = url.split("?")[0];
    if (pathname === "/metrics") return "/metrics";
    if (pathname === "/health") return "/health";
    return "unknown";
}

export function startMetricsServer(port = Number(process.env.METRICS_PORT ?? 9464)): http.Server {
    const server = http.createServer(async (req, res) => {
        const method = req.method ?? "UNKNOWN";
        const route = normalizeRoute(req.url);
        const startedAt = process.hrtime.bigint();

        httpRequestsInFlight.inc({ method, route });

        const requestSize = Number(req.headers["content-length"] ?? 0);
        if (!Number.isNaN(requestSize) && requestSize >= 0) {
            httpRequestSizeBytes.observe({ method, route }, requestSize);
        }

        let finalized = false;
        const finish = () => {
            if (finalized) return;
            finalized = true;
            const statusCode = String(res.statusCode);
            const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
            const responseSizeHeader = Number(res.getHeader("content-length") ?? 0);
            const responseSize = Number.isNaN(responseSizeHeader) ? 0 : responseSizeHeader;

            httpRequestsTotal.inc({ method, route, status_code: statusCode });
            httpRequestDurationSeconds.observe({ method, route, status_code: statusCode }, durationSeconds);
            httpResponseSizeBytes.observe({ method, route, status_code: statusCode }, responseSize);
            httpRequestsInFlight.dec({ method, route });
        };

        res.once("finish", finish);
        res.once("close", finish);

        if (req.url?.startsWith("/metrics")) {
            res.statusCode = 200;
            res.setHeader("Content-Type", metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
            return;
        }

        if (req.url?.startsWith("/health")) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ status: "ok" }));
            return;
        }

        res.statusCode = 404;
        res.end("Not found");
    });

    server.listen(port, () => {
        console.log(`Metrics server rodando na porta ${port}`);
    });

    return server;
}
