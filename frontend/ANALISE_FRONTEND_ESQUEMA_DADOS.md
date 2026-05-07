# Análise Completa do Frontend e Esquema de Dados

## Escopo e abordagem

- Escopo analisado: `frontend/`
- Fontes principais: `src/App.tsx`, `src/components/*Screen.tsx`, `src/components/SideMenu.tsx`, `src/types/calendar.ts`
- Objetivo: mapear telas e fluxos, identificar chamadas atuais, e propor esquema de dados + contratos de API para alimentar o sistema em produção.

## Visão geral técnica atual

- A aplicação funciona como SPA com navegação por estado local em `App.tsx` (`activeScreen`), sem roteador.
- Não há integração real com backend no frontend atual.
- O estado é majoritariamente local (`useState`), com parte compartilhada em `App.tsx`:
  - `profileData`
  - `events` (`CalendarEvent[]`)
  - `themeColor`
- Várias telas já representam domínios de negócio maduros (perfil, calendário, notas, chat, assinatura, integrações), mas ainda com dados mock.

## 1) Inventário completo de telas e navegação

## Tela raiz e roteamento interno

- Arquivo: `src/App.tsx`
- Tipo de tela (`Screen`):
  - `home`
  - `chat`
  - `calendar`
  - `notes`
  - `settings`
  - `profile`
  - `edit-profile-field`
  - `edit-profile-photo`
  - `change-password`
  - `notifications`
  - `privacy`
  - `delete-account`
  - `manage-subscription`
  - `integration`

## Responsabilidade por tela

- `home` (`HomeScreen`): visão diária com saudação, próximos compromissos e atalhos.
- `chat` (`ChatScreen`): mensagens texto/voz simuladas, quick actions e call simulada.
- `calendar` (`CalendarScreen`): agenda com visualização dia/semana/mês/ano, CRUD e drag/drop de eventos.
- `notes` (`NotesScreen`): CRUD de notas, busca, tags, fixar, bloqueio.
- `profile` (`ProfileScreen`): dados do usuário e atalhos para segurança/conta.
- `settings`: no estado atual renderiza `ProfileScreen` (não `SettingsScreen`).
- `edit-profile-field` (`EditProfileField`): edição pontual de campo de perfil.
- `edit-profile-photo` (`EditProfilePhoto`): personalização visual (gradiente/avatar).
- `change-password` (`ChangePasswordScreen`): fluxo de mudança de senha com validações.
- `notifications` (`NotificationsScreen`): preferências e estilo de lembretes.
- `privacy` (`PrivacyScreen`): toggles de privacidade e segurança.
- `delete-account` (`DeleteAccountScreen`): fluxo de encerramento/exclusão da conta.
- `manage-subscription` (`ManageSubscriptionScreen`): plano, cobrança e método de pagamento.
- `integration` (`IntegrationScreen`): conexão/desconexão de provedores externos.

## Navegação e transições

- Entrada inicial: `home`.
- Navegação principal lateral via `SideMenu`:
  - `home`, `chat`, `calendar`, `notes`, `settings`.
- Subfluxo de perfil:
  - `profile` -> `edit-profile-field` / `edit-profile-photo`
  - `profile` -> `change-password` / `notifications` / `privacy` / `manage-subscription`
  - `privacy` -> `delete-account` -> `manage-subscription` (quando aplicável)
- Integrações:
  - seleção do tipo de integração define `integrationType` e abre `integration`.

## Observações de arquitetura de navegação

- O fluxo usa `previousScreen` para retornos contextuais.
- `SettingsScreen` existe no código, mas não está conectado no roteamento atual.
- `ScreenTransition` existe, mas não é aplicado no render atual.

## 2) Estruturas de dados e estado por domínio

## 2.1 Perfil e conta

Estado compartilhado em `App.tsx`:

- `profileData`:
  - `name`
  - `email`
  - `phone`
  - `birthdate`
  - `language`
  - `timezone`

Outros dados de conta relacionados:

- senha (fluxo de alteração em `ChangePasswordScreen`)
- preferências de privacidade/notificações (estado local em telas dedicadas)
- assinatura (estado local em `ManageSubscriptionScreen`)

## 2.2 Calendário

Tipo principal em `src/types/calendar.ts`:

- `CalendarEvent`:
  - `id: number`
  - `title: string`
  - `day: number`
  - `startHour: number`
  - `duration: number`
  - `type: "meeting" | "task" | "personal"`
  - `guests?: string[]`
  - `description?: string`
  - `color?: string`

Operações já implementadas no frontend:

- listar eventos por dia/semana/mês/ano
- criar/editar/excluir evento
- mover evento (drag/drop)
- redimensionar duração do evento
- detectar conflito de horário (local)

## 2.3 Notas

Tipo local em `NotesScreen`:

- `Note`:
  - `id`
  - `title`
  - `content`
  - `createdAt`
  - `updatedAt`
  - `isPinned`
  - `tags: string[]`
  - `isLocked`

Operações já implementadas no frontend:

- CRUD de notas
- busca por título/conteúdo/tag
- agrupamento por ano/mês
- pin/unpin
- lock/unlock (simulado)
- menu de compartilhamento (ações simuladas)

## 2.4 Chat e voz

Tipo local em `ChatScreen`:

- `Message`:
  - `id`
  - `text`
  - `sender: "user" | "kiki"`
  - `timestamp`
  - `isUserAudio?`

Estados relevantes:

- mensagens em memória
- gravação simulada
- call de voz simulada
- transcrição simulada em `VoiceChatOrb`

## 2.5 Notificações e privacidade

`NotificationsScreen`:

- canais: push, e-mail, SMS, som, vibração
- tipos: lembretes, reuniões, tarefas, sugestões, resumo diário, relatório semanal
- estilo de lembrete: amigável/profissional/motivacional

`PrivacyScreen`:

- coleta de dados
- personalização
- compartilhamento analítico
- autenticação de dois fatores

## 2.6 Assinatura e pagamentos

`ManageSubscriptionScreen`:

- plano atual (nome, preço, ciclo, próxima cobrança, status)
- catálogo de planos
- método de pagamento (`pix`, `boleto`, `card`)
- histórico de pagamentos
- dados de cartão (input local)

## 2.7 Integrações

`IntegrationScreen`:

- provedores mapeados: `Google Calendar`, `Gmail`, `Outlook`, `Apple Watch`
- estado de conexão local
- recursos e permissões por provedor (metadados de UI)

## 3) Chamadas externas atuais (estado real)

## Resultado da varredura

- Não foram encontradas chamadas de rede de domínio no frontend:
  - sem `fetch`
  - sem `axios`
  - sem `WebSocket`
  - sem GraphQL client
  - sem serviço de API central
  - sem `import.meta.env` para URL de backend
- Não há persistência local de dados de domínio (`localStorage`, `sessionStorage`, `indexedDB`).

## Conclusão

- O frontend está em modo protótipo funcional com dados locais/mock.
- Há cobertura visual e de interação robusta, mas sem integração com backend.

## 4) Esquema de dados canônico proposto

## 4.1 Entidades principais

### User

- `id` (uuid)
- `name`
- `email`
- `phone`
- `birthdate` (date)
- `language` (enum)
- `timezone` (string IANA)
- `avatarTheme` (string)
- `createdAt`
- `updatedAt`

### CalendarEvent

- `id` (uuid)
- `userId` (fk User)
- `title`
- `startsAt` (datetime)
- `endsAt` (datetime)
- `eventType` (enum: `meeting|task|personal`)
- `color`
- `description` (nullable)
- `status` (enum: `confirmed|cancelled`, opcional)
- `createdAt`
- `updatedAt`

### CalendarEventGuest

- `id` (uuid)
- `eventId` (fk CalendarEvent)
- `name`
- `email` (nullable)
- `createdAt`

### Note

- `id` (uuid)
- `userId` (fk User)
- `title`
- `content`
- `isPinned` (bool)
- `isLocked` (bool)
- `createdAt`
- `updatedAt`

### NoteTag

- `id` (uuid)
- `userId` (fk User)
- `name`
- `createdAt`

### NoteTagMap

- `noteId` (fk Note)
- `tagId` (fk NoteTag)

### Conversation

- `id` (uuid)
- `userId` (fk User)
- `channel` (enum: `text|voice`)
- `createdAt`
- `updatedAt`

### Message

- `id` (uuid)
- `conversationId` (fk Conversation)
- `sender` (enum: `user|assistant|system`)
- `content`
- `messageType` (enum: `text|audio|event_suggestion|task_suggestion`)
- `audioUrl` (nullable)
- `createdAt`

### NotificationPreference

- `userId` (pk/fk User)
- `pushEnabled`
- `emailEnabled`
- `smsEnabled`
- `soundEnabled`
- `vibrationEnabled`
- `remindersEnabled`
- `meetingsEnabled`
- `tasksEnabled`
- `kikiSuggestionsEnabled`
- `dailySummaryEnabled`
- `weeklyReportEnabled`
- `reminderStyle` (enum: `friendly|professional|motivational`)
- `updatedAt`

### PrivacyPreference

- `userId` (pk/fk User)
- `dataCollectionEnabled`
- `personalizationEnabled`
- `shareAnalyticsEnabled`
- `twoFactorEnabled`
- `updatedAt`

### IntegrationConnection

- `id` (uuid)
- `userId` (fk User)
- `provider` (enum: `google_calendar|gmail|outlook|apple_watch`)
- `status` (enum: `connected|disconnected|error`)
- `externalAccountId` (nullable)
- `lastSyncAt` (nullable)
- `createdAt`
- `updatedAt`

### Subscription

- `id` (uuid)
- `userId` (fk User)
- `planCode` (enum: `free|premium_monthly|premium_yearly`)
- `status` (enum: `active|past_due|cancelled|trialing`)
- `amount`
- `currency`
- `billingCycle` (enum: `monthly|yearly`)
- `nextBillingAt` (nullable)
- `cancelAtPeriodEnd` (bool)
- `createdAt`
- `updatedAt`

### PaymentMethod

- `id` (uuid)
- `userId` (fk User)
- `methodType` (enum: `card|pix|boleto`)
- `brand` (nullable)
- `last4` (nullable)
- `holderName` (nullable)
- `expiresAt` (nullable)
- `isDefault`
- `createdAt`

### Payment

- `id` (uuid)
- `subscriptionId` (fk Subscription)
- `amount`
- `currency`
- `status` (enum: `paid|pending|failed|refunded`)
- `methodType` (enum: `card|pix|boleto`)
- `paidAt` (nullable)
- `createdAt`

## 4.2 Relacionamentos

- `User 1:N CalendarEvent`
- `CalendarEvent 1:N CalendarEventGuest`
- `User 1:N Note`
- `Note N:M NoteTag` (via `NoteTagMap`)
- `User 1:N Conversation`
- `Conversation 1:N Message`
- `User 1:1 NotificationPreference`
- `User 1:1 PrivacyPreference`
- `User 1:N IntegrationConnection`
- `User 1:1 Subscription`
- `User 1:N PaymentMethod`
- `Subscription 1:N Payment`

## 5) Contratos de API sugeridos para alimentar todas as telas

## 5.1 Conta e perfil

- `GET /v1/me`
- `PATCH /v1/me`
- `PATCH /v1/me/avatar-theme`
- `POST /v1/account/change-password`
- `POST /v1/account/logout`
- `DELETE /v1/account`

Payload exemplo (`PATCH /v1/me`):

```json
{
  "name": "Maria Silva",
  "phone": "+55 (11) 98765-4321",
  "birthdate": "1995-03-15",
  "language": "pt-BR",
  "timezone": "America/Sao_Paulo"
}
```

## 5.2 Calendário

- `GET /v1/calendar/events?from=...&to=...`
- `POST /v1/calendar/events`
- `PATCH /v1/calendar/events/:id`
- `DELETE /v1/calendar/events/:id`

Payload exemplo (`POST /v1/calendar/events`):

```json
{
  "title": "Reunião com equipe",
  "startsAt": "2026-05-05T10:00:00-03:00",
  "endsAt": "2026-05-05T11:00:00-03:00",
  "eventType": "meeting",
  "description": "Discutir roadmap",
  "color": "purple",
  "guests": [
    { "name": "João" },
    { "name": "Maria" }
  ]
}
```

## 5.3 Notas

- `GET /v1/notes?search=...&tag=...&pinned=...`
- `POST /v1/notes`
- `PATCH /v1/notes/:id`
- `DELETE /v1/notes/:id`
- `POST /v1/notes/:id/tags`
- `DELETE /v1/notes/:id/tags/:tagId`

## 5.4 Chat e voz

- `GET /v1/chat/conversations`
- `POST /v1/chat/conversations`
- `GET /v1/chat/conversations/:id/messages`
- `POST /v1/chat/conversations/:id/messages`
- `POST /v1/chat/voice/transcriptions`
- `POST /v1/chat/voice/responses`
- opcional tempo real: `GET /v1/chat/stream` (SSE/WebSocket)

Payload exemplo (`POST /v1/chat/conversations/:id/messages`):

```json
{
  "sender": "user",
  "content": "Organize meu dia de hoje",
  "messageType": "text"
}
```

## 5.5 Preferências

- `GET /v1/preferences/notifications`
- `PATCH /v1/preferences/notifications`
- `GET /v1/preferences/privacy`
- `PATCH /v1/preferences/privacy`

## 5.6 Assinatura e cobrança

- `GET /v1/subscription`
- `PATCH /v1/subscription` (troca de plano/cancelamento)
- `GET /v1/billing/payment-methods`
- `POST /v1/billing/payment-methods`
- `PATCH /v1/billing/payment-methods/:id/default`
- `GET /v1/billing/history`

## 5.7 Integrações

- `GET /v1/integrations`
- `POST /v1/integrations/:provider/connect`
- `POST /v1/integrations/:provider/disconnect`
- `POST /v1/integrations/:provider/sync`

## 6) Matriz Tela -> Dados -> Endpoints

- Home:
  - dados: usuário resumido + próximos eventos + tarefas/resumo
  - endpoints: `GET /v1/me`, `GET /v1/calendar/events`
- Chat:
  - dados: conversas, mensagens, estado de call/transcrição
  - endpoints: `/v1/chat/*`
- Calendar:
  - dados: eventos e convidados
  - endpoints: `/v1/calendar/events*`
- Notes:
  - dados: notas e tags
  - endpoints: `/v1/notes*`
- Profile/Edit:
  - dados: perfil do usuário
  - endpoints: `/v1/me*`
- Change Password:
  - dados: credenciais transitórias
  - endpoint: `POST /v1/account/change-password`
- Notifications:
  - dados: `NotificationPreference`
  - endpoints: `/v1/preferences/notifications*`
- Privacy/Delete:
  - dados: `PrivacyPreference`, estado de assinatura
  - endpoints: `/v1/preferences/privacy*`, `/v1/subscription`, `DELETE /v1/account`
- Manage Subscription:
  - dados: assinatura, método de pagamento, histórico
  - endpoints: `/v1/subscription`, `/v1/billing/*`
- Integration:
  - dados: conexões por provedor
  - endpoints: `/v1/integrations*`

## 7) Gaps atuais e ordem recomendada de implantação

## Gaps principais

- ausência total de client de API e camada de serviços.
- ausência de autenticação/sessão real no frontend.
- ausência de persistência local (cache/offline) e sincronização.
- domínios tipados de forma fragmentada (vários tipos locais por tela).

## Ordem recomendada

1. Base técnica:
   - cliente HTTP central
   - autenticação e tratamento global de erro
   - camada `src/domain` + `src/services`
2. Perfil e preferências:
   - `me`, notificações e privacidade
3. Calendário:
   - CRUD completo + conflitos no backend
4. Notas:
   - CRUD + busca + tags
5. Chat/voz:
   - mensagens persistidas + pipeline de transcrição/resposta
6. Assinatura/cobrança:
   - plano, método e histórico
7. Integrações:
   - OAuth/conexão e status de sincronização por provedor

## 8) Critérios de pronto (backend alimentando frontend)

- Todas as telas carregam dados reais via API.
- Todas as ações de escrita persistem e refletem no UI (otimista ou pós-confirmação).
- Tipos compartilhados frontend/backend alinhados para entidades centrais.
- Erros de rede e de validação com feedback consistente por tela.
- Logs e telemetria mínimos por endpoint crítico.
