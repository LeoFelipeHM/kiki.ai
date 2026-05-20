# Migração SEO-first das páginas públicas

## Separação criada

- `src/app`: frontend público em Next.js App Router.
- `src/app/public-site`: componentes e dados reutilizáveis do site institucional.
- `src/private-pages`: páginas da aplicação autenticada usadas pelo React Router/Vite.
- `src/components`, `src/context`, `src/hooks`, `src/services`: permanecem no dashboard SPA atual.

## Rotas públicas migradas para Next.js

- `/`
- `/recursos`
- `/como-funciona`
- `/precos`
- `/cadastro`
- `/robots.txt`
- `/sitemap.xml`

Essas rotas usam SSG porque o conteúdo é institucional e muda pouco. Isso gera HTML estático, melhora indexação e reduz hidratação.

## Rotas privadas preservadas na SPA

- `/login`
- `/home`
- `/chat`
- `/calendar`
- `/notes`
- `/contacts`
- `/settings`
- `/profile/*`
- `/integracao/*`
- `/admin/*`

Nenhuma lógica de autenticação, provider, store, websocket ou serviço interno foi migrado para Next.js.

## Decisões arquiteturais

- Next.js fica responsável apenas pelo site público SEO-first.
- A SPA atual continua com Vite e React Router.
- `src/pages` foi renomeado para `src/private-pages` para evitar conflito com o Pages Router do Next.
- As páginas públicas são Server Components por padrão.
- O menu mobile usa HTML nativo com `details`, evitando client component.
- Imagens públicas usam `next/image`.
- Metadata nativa foi adicionada em `layout.tsx` e refinada por página.
- `robots.ts` bloqueia indexação das rotas privadas.
- `sitemap.ts` lista apenas rotas públicas.

## Scripts úteis

- `npm run dev:public`: roda o site público Next em `http://localhost:3000`.
- `npm run build:public`: build do site público Next.
- `npm run dev:spa`: roda o dashboard SPA em `http://localhost:5173`.
- `npm run build:spa`: build do dashboard SPA.

## Docker

- `frontend`: mantém a SPA atual na porta `5173`.
- `public-frontend`: novo serviço Next.js na porta `3000`.

Em produção, o proxy deve enviar as rotas públicas para o `public-frontend` e as rotas privadas para o `frontend`.
