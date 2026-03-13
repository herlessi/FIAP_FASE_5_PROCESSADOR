# Frontend VideoFlow

Aplicacao frontend para upload e acompanhamento de videos, com fluxo de processamento e atualizacao em tempo real via WebSocket.

## Objetivo do projeto

Este projeto implementa a interface web do VideoFlow, incluindo:

- Tela de login (fluxo visual inicial).
- Tela de videos com upload multiplo.
- Indicacao de progresso de envio e processamento.
- Listagem de videos processados com opcao de download.
- Sincronizacao com backend via API REST e WebSocket.

## Tecnologias utilizadas

### Frontend

- `React 19`
- `TypeScript 5`
- `Vite 7`
- `React Router DOM 7`
- `Axios`

### Qualidade de codigo

- `ESLint 9`
- `typescript-eslint`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`

### Infra e deploy

- `Docker`
- `Docker Compose`
- `Nginx` (servindo build estatico em producao)

## Como a aplicacao funciona

### Rotas

- `/`: tela de login.
- `/videos`: tela principal de upload e acompanhamento dos videos.

### Fluxo de upload

1. Usuario seleciona um ou mais arquivos de video.
2. Frontend solicita ao backend uma URL pre-assinada (`getPreSignedUrl`).
3. Upload do arquivo e feito para armazenamento externo (ex.: S3) via `axios.put`.
4. Frontend atualiza status do video no backend (`uploaded` ou `uploaded_failed`).
5. Lista de videos e atualizada periodicamente e tambem por eventos WebSocket.

### Atualizacao em tempo real

- Ao receber eventos no WebSocket, o frontend refaz consultas da listagem para refletir alteracoes de status.
- Se a conexao cair, ha tentativa de reconexao com backoff exponencial.

## Pre-requisitos

Instale os itens abaixo na maquina:

- `Node.js 20+`
- `npm 10+`
- `Docker` e `Docker Compose` (opcional, para rodar em container)

## Configuracao de ambiente

Este projeto usa variaveis de ambiente do Vite.

Crie um arquivo `.env` na raiz com:

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000/ws
```

Observacoes:

- `VITE_API_URL`: base da API REST usada pelo `axios`.
- `VITE_WS_URL`: endpoint WebSocket para notificacoes de processamento.
- Se `VITE_WS_URL` nao for definido, o frontend tenta derivar automaticamente a URL a partir de `VITE_API_URL`.

## Execucao local (desenvolvimento)

1. Instale dependencias:

```bash
npm install
```

2. Rode o servidor de desenvolvimento:

```bash
npm run dev
```

3. Acesse no navegador:

```text
http://localhost:5173
```

## Build de producao

Gerar build:

```bash
npm run build
```

Visualizar build localmente:

```bash
npm run preview
```

## Executando com Docker

Subir o frontend com Docker Compose:

```bash
docker compose up -d
```

Acesso:

```text
http://localhost:8080
```

### Detalhes do container

- Estagio 1: build com `node:20-alpine`.
- Estagio 2: runtime com `nginx:1.27-alpine`.
- Configuracao de `try_files` no Nginx para suportar rotas SPA do React Router.
- Assets em `/assets` com cache de longa duracao.

## Scripts disponiveis

- `npm run dev`: inicia ambiente de desenvolvimento com Vite.
- `npm run build`: executa `tsc -b` e gera build de producao via Vite.
- `npm run preview`: publica localmente a build gerada.
- `npm run lint`: executa validacoes de lint no projeto.

## Estrutura principal do projeto

```text
src/
	components/
		AppLayout/
	pages/
		Login/
		Videos/
	routes/
	services/
	main.tsx
	App.tsx
```

- `src/pages/Login`: tela de autenticacao (fluxo visual atual).
- `src/pages/Videos`: upload, progresso, paginacao e download.
- `src/services/api.ts`: cliente `axios` com `VITE_API_URL`.
- `src/routes/index.tsx`: definicao das rotas da aplicacao.
- `src/components/AppLayout`: layout base da area logada.

## Pontos de atencao

- O login atual e de navegacao local (sem autenticacao real no backend).
- O `userId` do upload esta fixo no codigo e pode ser externalizado quando houver fluxo de autenticacao completo.
- Recomenda-se criar um `.env.example` para padronizar configuracao entre ambientes.

## Melhorias futuras sugeridas

- Integrar autenticacao real com JWT/sessao.
- Mover `userId` para contexto de usuario autenticado.
- Adicionar testes (unitarios e integracao).
- Configurar pipeline CI para lint e build automaticos.

