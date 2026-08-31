# Lumiar — espaço terapeutico

Monorepo do sistema de gestão de salas: **backend** (NestJS) e **frontend** (React + Vite) no mesmo Git.

```
.
├── backend/                 API NestJS + Prisma + worker
├── frontend/                SPA React
├── nginx/                   Gateway de produção
├── docker-compose.yml       Postgres, Redis, API e Vite (padrão)
└── docker-compose.prod.yml  Stack completa atrás do NGINX
```

Um único `git` na raiz: commits de backend e frontend saem da mesma pasta.

## Desenvolvimento com Docker

```bash
docker compose up -d --build
```

| Serviço   | URL                     |
|-----------|-------------------------|
| Frontend  | http://localhost:5173   |
| API       | http://localhost:3001   |
| Swagger   | http://localhost:3001/api/docs |
| Postgres  | localhost:5433          |
| Redis     | localhost:6379          |

Na primeira vez, rode as migrations no container da API:

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run prisma:seed
```

## Desenvolvimento sem Docker (API/front no host)

```bash
docker compose up postgres redis -d
cd backend && npm install && npm run prisma:migrate && npm run start:dev
cd frontend && npm install && npm run dev
```

O frontend encaminha `/api`, `/uploads` e `/health` para a API (`VITE_API_PROXY` ou `http://localhost:3001`).

## Produção

```bash
cp .env.example .env.production
# ajuste senhas e JWT_ACCESS_SECRET

docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d
```

O NGINX na porta 80 entrega o frontend e encaminha `/api`, `/uploads` e `/health` para o backend.

## Git

Repositório único na raiz do workspace. Para publicar:

```bash
git remote add origin https://github.com/lucasfc26/Lumiar.git
git add .
git commit -m "Unifica backend e frontend no mesmo repositório"
```
