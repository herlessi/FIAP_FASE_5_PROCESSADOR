# Kubernetes - processadorvideo

Este diretório contém os manifests para executar o worker `processadorvideo` no Kubernetes.

## Arquivos

- `namespace.yaml`: namespace `worker`
- `configmap.yaml`: variáveis não sensíveis
- `secret.yaml`: credenciais AWS (substituir antes de aplicar)
- `pvc.yaml`: volume persistente para `/data/videos`
- `deployment.yaml`: deployment do worker
- `service.yaml`: service interno (somente métricas)
- `kustomization.yaml`: aplicação em lote

## 1) Build da imagem

Use uma imagem acessível pelo cluster. Exemplo com Docker local (kind/minikube):

```bash
docker build -t processadorvideo:latest .
```

Se o cluster não enxerga imagem local, envie para um registry:

```bash
docker tag processadorvideo:latest <seu-registry>/processadorvideo:latest
docker push <seu-registry>/processadorvideo:latest
```

Depois ajuste `image` em `deployment.yaml`.

## 2) Ajustar secrets

Edite `secret.yaml` e troque:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## 3) Aplicar manifests

```bash
kubectl apply -k k8s
```

## 4) Verificar deployment

```bash
kubectl get pods -n worker
kubectl logs -f deploy/processadorvideo -n worker
```

## 5) Verificar métricas

Port-forward para testar endpoint de métricas:

```bash
kubectl port-forward svc/processadorvideo 9464:9464 -n worker
```

Acesse: `http://localhost:9464/metrics`

## Observações

- A comunicação de negócio com o backend principal ocorre somente via RabbitMQ.
- O worker roda no namespace `worker`, mas o `RABBIT_MQ_URL` aponta para `amqp://guest:guest@rabbitmq.processamentovideo.svc.cluster.local:5672`, permitindo comunicação com RabbitMQ no namespace `processamentovideo`.
- O PVC depende de um `StorageClass` padrão no cluster.
- Probes usam `GET /health` na porta `9464`.
