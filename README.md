# Micro Serviço Processador de Vídeo

Serviço assíncrono responsável por baixar vídeos enviados para um bucket S3, extrair frames com FFmpeg e disponibilizar um pacote compactado em outro bucket. O fluxo é orquestrado por RabbitMQ e instrumentado com Prometheus.

## Tecnologias Utilizadas
- Node.js 20+ com TypeScript
- RabbitMQ (amqplib) para mensageria
- AWS S3 SDK v3 para armazenamento de objetos
- FFmpeg para extração de frames
- Archiver para compressão dos frames em `.zip`
- Prometheus `prom-client` + endpoint HTTP para métricas
- Jest + ts-jest para testes unitários
- Docker e manifestos Kubernetes para implantação

## Arquitetura Resumida
1. **Fila `video_to_process_queue`** recebe mensagens com o `id` do vídeo.
2. **`ProcessadorControllerAux`** consome a fila e dispara dois casos de uso:
   - `DownloadVideosUseCase` baixa o arquivo de `uploads/{id}` em S3 para `VIDEO_DOWNLOAD_PATH/<id>/<id>.mp4`.
   - `CreateFramesUseCase` chama FFmpeg, gera frames em `VIDEO_FRAMES_PATH/<id>`, compacta (`.zip`) e envia para `frames_to_download/{id}.zip` no mesmo bucket.
3. O serviço publica na fila `frames_ready_to_download_queue` um JSON com `{ id, urlToDownload }`.
4. Métricas de fila, duração e sucesso/erro são expostas via `startMetricsServer()` em `/metrics` (Prometheus) e `/health`.

```
RabbitMQ -> Processador (Node/FFmpeg) -> AWS S3
     ^                 |                 |
     |                 v                 v
 frames_ready   Metrics (/metrics)   Arquivos compactados
```

## Pré-requisitos
- Node.js 20 ou superior
- pnpm 9+ (ou npm/yarn, ajustando comandos)
- FFmpeg instalado e disponível no `PATH`
- Acesso a um broker RabbitMQ e a um bucket S3
- Variáveis de ambiente configuradas (ver abaixo)

## Variáveis de Ambiente
| Nome | Descrição |
| --- | --- |
| `AWS_REGION` | Região do bucket S3 |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Credenciais com permissão de leitura/gravação |
| `AWS_BUCKET` | Nome do bucket usado para vídeos e zips |
| `VIDEO_DOWNLOAD_PATH` | Caminho local para salvar o `.mp4` baixado (ex.: `/tmp/videos`) |
| `VIDEO_FRAMES_PATH` | Diretório local onde os frames temporários serão criados |
| `FRAME_RATE` | Expressão FFmpeg (default `1/5`) |
| `RABBIT_MQ_URL` | URL de conexão (ex.: `amqp://user:pass@host:5672`) |
| `METRICS_PORT` | Porta HTTP para `/metrics` (default `9464`) |

> **Importante**: Os diretórios apontados por `VIDEO_DOWNLOAD_PATH` e `VIDEO_FRAMES_PATH` precisam ter espaço suficiente. Considere usar volumes persistentes (PVC/bind mount) e limpeza periódica dos arquivos `.mp4` e `.zip` após o upload.

## Instalação e Execução
```bash
pnpm install          # instala dependências
dev: pnpm dev         # watch com tsx + dotenv
build: pnpm build     # compila para dist/
start: pnpm start     # executa dist/index.js
```

Durante o desenvolvimento o serviço já inicia o consumidor da fila e o servidor de métricas.

## Testes
```bash
pnpm test            # executa Jest
pnpm run test:coverage
```
Os testes cobrem os casos de uso principais (`download-videos-use-case`, `create-frames-use-case`, gateways RabbitMQ/S3 e métricas).

## Observabilidade
- `/metrics`: expõe os contadores e histogramas registrados em `prom-client`.
- `/health`: resposta JSON simples para checagens de liveness.
- Métricas principais: `processador_video_messages_received_total`, `processador_video_process_success_total`, `processador_video_process_failure_total{stage="download_video|create_frames"}`, `processador_video_process_duration_seconds`.

## Containerização e Deploy
- `Dockerfile` e `docker-compose.yaml` permitem subir o serviço localmente junto com dependências.
- Pasta `k8s/` contém manifestos para namespace, configMap, secret, Deployment, Service, HPA, PVC e Kustomize. Ajuste as variáveis e volumes para apontarem para seus recursos reais.

## Fluxo de Trabalho Sugerido
1. Enviar mensagem para `video_to_process_queue` com o ID do vídeo previamente carregado em `uploads/{id}` dentro do bucket.
2. Aguardar o log de sucesso ou acompanhar métricas.
3. Consumir `frames_ready_to_download_queue` para obter a URL assinada do ZIP de frames.

## Próximos Passos
- Implementar limpeza automática dos `.mp4` e `.zip` após o upload para evitar erros `ENOSPC`.
- Completar `ProcessadorRepo` com operações reais usando Prisma/Postgres.
- Expandir testes cobrindo integração com RabbitMQ e S3 usando mocks.
