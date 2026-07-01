# Kiki.ai

Kiki.ai é uma plataforma full stack de assistente pessoal criada como projeto de portfólio. O objetivo é demonstrar a construção de um produto web completo, com aplicação autenticada, site público, API própria, banco de dados, workers assíncronos e integrações com IA e voz.

A proposta do projeto é oferecer uma assistente chamada Kiki para centralizar rotinas pessoais em um só lugar: conversar com IA, organizar agenda, registrar notas, acompanhar contatos, configurar preferências, receber notificações e usar recursos de voz quando as integrações externas estiverem configuradas.

## Demonstração

O projeto está disponível em:

- Site: https://heykiki.com.br
- Usuário de teste: `visitante@heykiki.com`
- Senha: `Visitante@2026`

A conta visitante existe apenas para avaliação do projeto e pode ter permissões/dados limitados.

## Visão do Produto

O projeto é composto por três frentes principais:

- App privado para usuários autenticados, com dashboard, chat, agenda, notas, contatos, notificações, perfil e configurações.
- Painel administrativo para gestão de usuários, métricas de uso e blog.
- Site público em Next.js, com páginas institucionais, blog, SEO e páginas de entrada.

Além da interface, o projeto possui backend próprio em FastAPI, persistência em PostgreSQL, autenticação com tokens, notificações Web Push, workers para agentes de IA e suporte a voz em tempo real via LiveKit.

## Funcionalidades

- Cadastro, login, refresh token e sessão autenticada.
- Dashboard privado e navegação protegida.
- Chat com IA usando OpenAI e ferramentas internas.
- Agentes de IA executados por worker separado.
- Voz em tempo real com LiveKit, OpenAI, AssemblyAI e Azure Speech.
- Agenda, eventos e recorrências.
- Notas pessoais.
- Contatos e lista de amigos.
- Perfil do usuário, preferências, privacidade e configurações.
- Notificações internas e Web Push com VAPID.
- Administração de usuários e métricas de uso.
- Blog público, métricas de leitura e administração de posts.
- Site público institucional em Next.js.

## Tecnologias Utilizadas

### Frontend

- React 19
- TypeScript
- Vite para a aplicação privada
- Next.js para o site público
- React Router
- Tailwind CSS
- Radix UI
- Material UI
- Framer Motion
- Recharts
- LiveKit Client

### Backend

- Python 3.12
- FastAPI
- Uvicorn
- Psycopg 3
- PostgreSQL com pgvector
- JWT com PyJWT
- Passlib para hash de senhas
- PyWebPush para notificações Web Push

### IA e Voz

- OpenAI API para chat, agentes e modelos multimodais
- LiveKit para comunicação em tempo real
- AssemblyAI para transcrição no modo de voz clássico
- Azure Speech para síntese de voz
- Google GenAI/Gemini como client disponível no backend

### Infraestrutura

- Docker e Docker Compose
- Migrations SQL versionadas
- Worker separado para voz
- Worker separado para agentes de IA
- Separação entre backend, app privado e site público

## Arquitetura

O backend segue uma divisão em camadas:

- `presentation`: routers, schemas e dependências da API.
- `application`: serviços de aplicação, casos de uso, agentes, notificações e regras de negócio.
- `domain`: regras e estruturas de domínio.
- `infrastructure`: persistência, configuração e integrações técnicas.
- `migrations`: scripts SQL versionados para evolução do banco.

No frontend, o mesmo pacote contém duas experiências:

- A aplicação privada em Vite, usada após login.
- O site público em Next.js, usado para páginas institucionais, blog e SEO.

Em Docker, o ambiente sobe API, banco, app privado, site público, worker de voz e worker de agentes. Isso deixa o projeto reproduzível e mostra a aplicação funcionando como sistema, não apenas como telas isoladas.

## Estrutura

```text
.
├── backend/              # API FastAPI, workers, migrations e integrações
├── frontend/             # App privado Vite + site público Next.js
├── docker-compose.yml    # Ambiente local com backend, frontend, workers e banco
└── README.md
```

## Pré-requisitos

Para rodar com Docker:

- Docker
- Docker Compose

Para rodar sem Docker:

- Python 3.12
- Node.js 20+
- npm
- PostgreSQL 17 ou compatível, preferencialmente com pgvector

## Configuração de Ambiente

Crie o arquivo de ambiente do backend:

```bash
cp backend/.env.example backend/.env
```

O backend lê `backend/.env`. Para rodar com Docker Compose, configure a conexão do banco apontando para o serviço `db`:

```env
DATABASE_URL=postgresql://postgres:newdays@db:5432/defaultdb
```

Para rodar o backend diretamente na máquina usando o banco do Docker, use a porta exposta no host:

```env
DATABASE_URL=postgresql://postgres:newdays@127.0.0.1:5435/defaultdb
```

Para a aplicação privada, o Vite lê variáveis a partir de `frontend/src` porque o projeto usa `envDir` apontando para esse diretório. Crie o arquivo:

```bash
cp frontend/.env.example frontend/src/.env
```

No mínimo, configure a URL da API para desenvolvimento local:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Para usar chat, agentes, voz e notificações push, também é necessário configurar as chaves externas correspondentes no backend, como `OPENAI_API_KEY`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `ASSEMBLYAI_API_KEY`, `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`.

## Rodando com Docker

Este é o caminho mais simples para subir o projeto completo.

1. Crie o `.env` do backend:

   ```bash
   cp backend/.env.example backend/.env
   ```

2. No arquivo `backend/.env`, configure a `DATABASE_URL` para o banco do Compose:

   ```env
   DATABASE_URL=postgresql://postgres:newdays@db:5432/defaultdb
   ```

3. Suba os serviços:

   ```bash
   docker compose up --build
   ```

4. Acesse:
   - App privado: http://localhost:5173
   - Site público: http://localhost:3000
   - API: http://localhost:8000
   - Health check: http://localhost:8000/health
   - PostgreSQL no host: `localhost:5435`

O `docker-compose.yml` sobe:

- `db`: PostgreSQL com pgvector.
- `backend`: API FastAPI.
- `worker`: worker de voz/LiveKit.
- `agent-worker`: worker dos agentes de IA.
- `frontend`: app privado Vite.
- `frontend-public`: site público Next.js.

Para parar:

```bash
docker compose down
```

Para remover também os volumes locais:

```bash
docker compose down -v
```

Use `down -v` com cuidado, porque ele remove os dados persistidos localmente.

## Rodando sem Docker

### 1. Subir apenas o banco

```bash
docker compose up -d db
```

Com esse fluxo, use no backend:

```env
DATABASE_URL=postgresql://postgres:newdays@127.0.0.1:5435/defaultdb
```

### 2. Rodar o backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python scripts/bootstrap_db.py
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Rodar o app privado

Em outro terminal:

```bash
cd frontend
npm install
cp .env.example src/.env
npm run dev
```

Acesse http://localhost:5173.

### 4. Rodar o site público

Em outro terminal:

```bash
cd frontend
npm run dev:public
```

Acesse http://localhost:3000.

## Workers

Para rodar o worker de agentes fora do Docker:

```bash
cd backend
source .venv/bin/activate
python -m application.agent_worker
```

Para rodar o worker de voz fora do Docker:

```bash
cd backend
source .venv/bin/activate
python livekit_service.py start
```

Esses fluxos dependem das variáveis externas de IA e voz configuradas corretamente.

## Usuário Inicial

O script `backend/scripts/bootstrap_db.py` cria ou atualiza um usuário administrador local:

```text
E-mail: leo@gmail.com
Senha: 123
```

Use esse acesso apenas em desenvolvimento.

## Comandos Úteis

Backend:

```bash
cd backend
python scripts/bootstrap_db.py
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pytest
```

Frontend:

```bash
cd frontend
npm run dev
npm run dev:public
npm run build
npm run build:public
npm run lint
```

Docker:

```bash
docker compose up --build
docker compose up -d db
docker compose logs -f backend
docker compose logs -f agent-worker
docker compose down
```

## Observações

Antes de usar fora do ambiente local, é importante revisar:

- Segredos JWT.
- Senha do PostgreSQL.
- Origens permitidas em `CORS_ORIGINS`.
- Chaves VAPID para Web Push.
- Chaves de OpenAI, LiveKit, AssemblyAI e Azure Speech.
- Credenciais seed usadas apenas para desenvolvimento.
