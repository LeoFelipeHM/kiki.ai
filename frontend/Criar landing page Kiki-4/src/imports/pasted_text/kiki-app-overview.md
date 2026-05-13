# KIKI - Assistente Inteligente de Gerenciamento de Rotina

## Conceito

**Kiki** é um aplicativo mobile-first de gerenciamento de rotina pessoal e produtividade, potencializado por inteligência artificial. O aplicativo funciona como uma assistente pessoal que ajuda usuários a organizar sua vida através de conversação natural, calendário inteligente, notas e insights personalizados.

## Visão Geral

Kiki é projetado para ser mais do que um simples organizador - é uma companhia digital que entende seu contexto, antecipa suas necessidades e oferece suporte proativo para manter você no controle da sua rotina.

### Proposta de Valor

- **Assistente Conversacional**: Interaja naturalmente com Kiki através de chat de texto e voz
- **Gerenciamento Inteligente**: Calendário, tarefas e notas integrados com sugestões de IA
- **Experiência Personalizada**: Interface adaptável com temas personalizáveis e insights contextuais
- **Foco em Bem-estar**: Não apenas produtividade, mas equilíbrio entre trabalho, pessoal e saúde

## Funcionalidades Principais

### 1. **Tela Inicial (Home)**
- Saudação contextual baseada no horário do dia
- Resumo diário inteligente com progresso de tarefas e compromissos
- Alertas de eventos próximos (com contagem regressiva quando faltam menos de 60 minutos)
- Acesso rápido para conversar com Kiki
- Visualização de tarefas do dia com indicador de progresso

### 2. **Chat com Kiki**
- Interface de conversação natural
- Suporte para chat de texto e voz (Voice Chat Orb)
- Kiki pode responder perguntas, dar sugestões e ajudar com organização
- Histórico de conversas persistente
- Respostas contextualizadas baseadas nos dados do usuário

### 3. **Calendário Inteligente**
- Múltiplas visualizações: Dia, Semana, Mês, Ano
- Tipos de eventos categorizados:
  - **Reuniões** (meetings): Azul - com convidados e descrições
  - **Tarefas** (tasks): Roxo - blocos de tempo para trabalho focado
  - **Pessoal** (personal): Rosa - compromissos pessoais
- Criação e edição de eventos com detalhes completos
- Navegação intuitiva entre períodos
- Sugestões de IA para otimização de agenda (em desenvolvimento)

### 4. **Notas**
- Sistema completo de anotações com recursos avançados:
  - **Fixação**: Mantenha notas importantes sempre no topo
  - **Tags**: Organize notas com múltiplas tags (#trabalho, #pessoal, #projeto)
  - **Proteção**: Bloqueie notas sensíveis com senha
  - **Busca**: Pesquise por título, conteúdo ou tags
  - **Busca dentro da nota**: Destaque termos específicos durante edição
  - **Organização por data**: Agrupamento automático por ano e mês
- Editor modal com animações suaves
- Compartilhamento (copiar link, email, PDF)
- Interface limpa e minimalista

### 5. **Perfil e Configurações**
- Gerenciamento de dados pessoais:
  - Nome completo, email, telefone
  - Data de nascimento, idioma, fuso horário
- Personalização de tema com gradientes coloridos
- Segurança:
  - Alteração de senha
  - Configurações de privacidade
  - Gerenciamento de notificações
  - Opção de exclusão de conta
- Integrações com serviços externos (calendários, tarefas, etc.)
- Gerenciamento de assinatura

### 6. **Menu Lateral**
- Navegação rápida entre todas as seções
- Perfil do usuário visível
- Ícones intuitivos com descrições
- Destaque visual da seção ativa
- Logo e informações do app

## Stack Tecnológico

### Frontend
- **React 18** - Framework principal
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Sistema de estilização
- **Lucide React** - Biblioteca de ícones

### Arquitetura
- **Componentes funcionais** com Hooks (useState, useEffect, useRef)
- **Props drilling** para gerenciamento de estado (simples e direto)
- **Context API** para tema global (ThemeProvider)
- **Navegação por estado** sem biblioteca de roteamento

### Design System

#### Tokens CSS Personalizados
Todos os tokens estão definidos em `/src/styles/theme.css` usando CSS custom properties.

#### Hierarquia Visual em 3 Camadas

**1. Camada IA (Vibrant, Prominent)**
- **Propósito**: Ações principais, botões de IA, elementos interativos importantes
- **Cores**: Gradientes vibrantes personalizáveis
- **Exemplos**:
  - Botão "Conversar com Kiki": `from-purple-500 to-pink-500` → `#A855F7` → `#EC4899`
  - Avatar do usuário: Gradiente temático atual
  - Botões de ação primária: Com sombras coloridas `rgba(168, 85, 247, 0.15)`
  - Voice Chat Orb: Gradiente com glow `rgba(168, 85, 247, 0.4)`

**2. Camada Content (Pastel, Neutral)**
- **Propósito**: Cartões de conteúdo, eventos, notas
- **Cores**: Tons pastéis e neutros
- **Exemplos**:
  - Cards de eventos: `#FFFFFF` com borda `rgba(0, 0, 0, 0.1)`
  - Background de inputs: `#F3F3F5`
  - Tags: `#ECECF0` com texto `#717182`
  - Notas: Fundo branco `#FFFFFF` com sombras suaves

**3. Camada Interface (Discrete)**
- **Propósito**: Elementos de UI discretos, bordas, ícones secundários
- **Cores**: Cinzas e transparências
- **Exemplos**:
  - Bordas: `rgba(0, 0, 0, 0.1)`
  - Ícones secundários: `#717182`
  - Texto muted: `#717182`
  - Divisores: `rgba(0, 0, 0, 0.1)`

#### Componentes Apple-Inspired

**Animações e Transições**
- Easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` - Spring physics
- Duração: 300-400ms para transições normais
- Hover: Elevação com `translateY(-2px)` e sombras expandidas
- Active: Escala para `0.97` com feedback tátil

**Classes Especiais**
- `.btn-apple`: Botões com shimmer effect e sombras suaves
- `.btn-apple-gradient`: Gradientes com glow e animações
- `.card-apple`: Cards com sweep effect no hover
- `.input-apple`: Inputs com focus glow roxo

#### Responsividade
- **Mobile-first**: Design otimizado para telas pequenas
- **Max-width**: 448px (`max-w-md`) - Simulação de app mobile
- **Breakpoints**: Uso mínimo, foco em experiência mobile
- **Touch-friendly**: Botões com min 44x44px de área de toque

## Estrutura do Projeto

```
/workspaces/default/code/
├── src/
│   ├── app/
│   │   ├── App.tsx                      # Componente principal com roteamento
│   │   └── components/
│   │       ├── HomeScreen.tsx           # Tela inicial
│   │       ├── ChatScreen.tsx           # Chat com Kiki
│   │       ├── CalendarScreen.tsx       # Calendário
│   │       ├── NotesScreen.tsx          # Notas
│   │       ├── ProfileScreen.tsx        # Perfil/Configurações
│   │       ├── SideMenu.tsx             # Menu lateral
│   │       ├── VoiceChatOrb.tsx         # Botão de voz flutuante
│   │       ├── ThemeProvider.tsx        # Provider de tema
│   │       ├── EditProfileField.tsx     # Edição de campos
│   │       ├── EditProfilePhoto.tsx     # Edição de avatar/tema
│   │       ├── ChangePasswordScreen.tsx # Alterar senha
│   │       ├── NotificationsScreen.tsx  # Notificações
│   │       ├── PrivacyScreen.tsx        # Privacidade
│   │       ├── DeleteAccountScreen.tsx  # Exclusão de conta
│   │       ├── ManageSubscriptionScreen.tsx # Assinatura
│   │       └── IntegrationScreen.tsx    # Integrações
│   └── styles/
│       ├── theme.css                    # Design tokens e animações
│       └── fonts.css                    # Importações de fontes
└── package.json
```

## Experiência do Usuário

### Princípios de Design
1. **Simplicidade**: Interface limpa, sem distrações
2. **Contextualidade**: Informações relevantes no momento certo
3. **Personalização**: Temas customizáveis e conteúdo adaptado
4. **Fluidez**: Animações suaves e transições naturais
5. **Acessibilidade**: Textos legíveis, contrastes adequados

### Interações Chave
- **Modal-based**: Edições acontecem em modais overlay (não navegação completa)
- **Gesture-friendly**: Botões grandes, áreas de toque generosas
- **Feedback visual**: Estados hover, active, loading claramente indicados
- **Keyboard support**: ESC para fechar modais, Enter para submeter

### Animações e Efeitos

#### Voice Chat Orb
- **Breathing**: Pulsação suave com shadow `rgba(168, 85, 247, 0.4)` → `rgba(168, 85, 247, 0.6)`
- **Wave**: Ondas internas com opacidade 0.6 → 1.0
- **Border Wave**: Ondas concêntricas `rgba(168, 85, 247, 0.7)` e `rgba(236, 72, 153, 0.7)`

#### Botões e Cards
- **Shimmer**: Sweep de luz `rgba(255, 255, 255, 0.1)` em 45 graus
- **Soft Glow**: Pulsação de sombra roxa `rgba(168, 85, 247, 0.08)` → `rgba(168, 85, 247, 0.12)`
- **Spring In**: Escala 0.96 → 1.01 → 1.0 com bounce
- **Hover Elevation**: Sombras expandem e elemento sobe 2px

#### Modais
- **Fade In**: Backdrop de `opacity: 0` → `opacity: 1` em 200ms
- **Scale In**: Modal de `scale(0.95)` → `scale(1)` em 200ms
- **Backdrop**: Blur + overlay `rgba(0, 0, 0, 0.5)`

### Paleta de Cores

#### Cores Principais (Theme Tokens)
- **Background**: `#FFFFFF` - Fundo principal
- **Foreground**: `#030213` - Texto principal
- **Muted**: `#ECECF0` - Fundo secundário/inputs
- **Muted Foreground**: `#717182` - Texto secundário
- **Border**: `rgba(0, 0, 0, 0.1)` - Bordas discretas
- **Destructive**: `#D4183D` - Vermelho para ações destrutivas

#### Gradientes Temáticos (Personalizáveis)
- **Roxo → Rosa** (Padrão): `from-purple-500 to-pink-500`
  - Purple 500: `#A855F7` (#A855F7)
  - Pink 500: `#EC4899` (#EC4899)
- **Azul → Cyan**: `from-blue-500 to-cyan-500`
  - Blue 500: `#3B82F6` (#3B82F6)
  - Cyan 500: `#06B6D4` (#06B6D4)
- **Verde → Esmeralda**: `from-green-500 to-emerald-500`
  - Green 500: `#22C55E` (#22C55E)
  - Emerald 500: `#10B981` (#10B981)
- **Laranja → Amarelo**: `from-orange-500 to-yellow-500`
  - Orange 500: `#F97316` (#F97316)
  - Yellow 500: `#EAB308` (#EAB308)
- **Rosa → Roxo**: `from-pink-500 to-purple-500`
  - Pink 500: `#EC4899` (#EC4899)
  - Purple 500: `#A855F7` (#A855F7)

#### Cores Semânticas (Eventos e Estados)
- **Reuniões/Meetings**: `#3B82F6` (Azul 500)
- **Tarefas/Focus**: `#A855F7` (Roxo 500)
- **Pessoal/Personal**: `#EC4899` (Rosa 500)
- **Urgente/Alerts**: `#F97316` (Laranja 500)
- **Sucesso**: `#22C55E` (Verde 500)
- **Aviso**: `#EAB308` (Amarelo 500)
- **Erro/Destrutivo**: `#D4183D` (Vermelho custom)

#### Cores de Apoio (UI Elements)
- **Highlight**: `#FEFCE8` (Amarelo 50 - para busca)
- **Card Background**: `#FFFFFF` (Branco puro)
- **Input Background**: `#F3F3F5` (Cinza muito claro)
- **Switch Background**: `#CBCED4` (Cinza médio)

#### Opacidades e Overlays
- **Backdrop**: `rgba(0, 0, 0, 0.5)` - Sobreposição de modais
- **Shadow Purple**: `rgba(168, 85, 247, 0.15)` - Sombra roxa
- **Shadow Pink**: `rgba(236, 72, 153, 0.15)` - Sombra rosa

**Nota**: Modo escuro planejado para implementação futura.

#### Referência Rápida de Cores HEX

| Nome | Código HEX | Uso |
|------|-----------|-----|
| Purple 500 | `#A855F7` | Gradiente principal, tarefas, IA |
| Pink 500 | `#EC4899` | Gradiente principal, eventos pessoais |
| Blue 500 | `#3B82F6` | Reuniões, alternativa de tema |
| Green 500 | `#22C55E` | Sucesso, confirmações |
| Orange 500 | `#F97316` | Alertas, urgências |
| Yellow 500 | `#EAB308` | Avisos |
| Cyan 500 | `#06B6D4` | Tema alternativo |
| Emerald 500 | `#10B981` | Tema alternativo |
| Red Custom | `#D4183D` | Ações destrutivas |
| White | `#FFFFFF` | Backgrounds, cards |
| Near Black | `#030213` | Texto principal |
| Muted Gray | `#ECECF0` | Backgrounds secundários |
| Text Gray | `#717182` | Texto secundário |
| Input Gray | `#F3F3F5` | Fundo de inputs |
| Switch Gray | `#CBCED4` | Toggles, switches |
| Highlight Yellow | `#FEFCE8` | Busca, destaque |

#### Aplicações de Gradientes por Contexto

**Hero Cards e CTAs Principais**
```css
background: linear-gradient(to bottom right, #A855F7, #EC4899);
box-shadow: 0 2px 8px rgba(168, 85, 247, 0.15);
```

**Voice Chat Orb (Ativo)**
```css
background: linear-gradient(to bottom right, #A855F7, #EC4899);
box-shadow: 0 10px 40px rgba(168, 85, 247, 0.4);
animation: breathing 3s ease-in-out infinite;
```

**Avatars e Ícones de Perfil**
```css
background: linear-gradient(to bottom right, [themeColor]);
/* Onde themeColor pode ser qualquer combinação escolhida pelo usuário */
```

**Tags Ativas em Notas**
```css
background: linear-gradient(to bottom right, #A855F7, #EC4899);
color: #FFFFFF;
```

**Botões Hover com Glow**
```css
box-shadow: 
  0 4px 12px rgba(168, 85, 247, 0.2),
  0 8px 24px rgba(168, 85, 247, 0.15),
  0 12px 32px rgba(168, 85, 247, 0.1);
```

## Personas e Casos de Uso

### Persona Principal: Profissional Ocupado
**Maria Silva, 31 anos, Gerente de Projetos**
- Precisa equilibrar múltiplas reuniões, tarefas e vida pessoal
- Quer insights sobre como está usando seu tempo
- Busca produtividade sem perder o bem-estar
- Valoriza interfaces bonitas e funcionais

### Casos de Uso
1. **Manhã**: Maria abre o app, vê "Bom dia", confere resumo do dia e eventos próximos
2. **Durante o dia**: Recebe alerta de reunião em 15 minutos, clica e vê detalhes
3. **Planejamento**: Conversa com Kiki "qual o melhor horário para focar hoje?"
4. **Ideias rápidas**: Cria nota rápida com tag #projeto, fixa para revisar depois
5. **Revisão semanal**: Visualiza calendário mensal, vê padrões de a

## Roadmap Futuro

### Próximas Funcionalidades
- [ ] **Backend real com Supabase** - Persistência de dados na nuvem
- [ ] **Sincronização multi-dispositivo** - Web + Mobile
- [ ] **IA generativa real** - Integração com Claude API para Kiki
- [ ] **Análises de produtividade** - Gráficos e insights baseados em dados
- [ ] **Modo escuro** - Tema dark com paleta adaptada
- [ ] **Notificações push** - Lembretes e alertas nativos
- [ ] **Integrações reais** - Google Calendar, Outlook, Notion, etc.
- [ ] **Widgets de voz** - Voice commands completos
- [ ] **Compartilhamento colaborativo** - Calendários e notas compartilhadas
- [ ] **Objetivos e hábitos** - Tracking de metas de longo prazo

### Melhorias Planejadas
- [ ] Animações mais elaboradas (spring physics)
- [ ] Gestos de swipe para ações rápidas
- [ ] Atalhos de teclado avançados
- [ ] Exportação de dados (JSON, PDF)
- [ ] Templates de notas e eventos
- [ ] Busca global (cross-feature search)
- [ ] Mais opções de gradientes temáticos (12+ combinações)
- [ ] Cores customizáveis por categoria de evento
- [ ] Modo de alto contraste para acessibilidade

## Diferenciais

### vs. Google Calendar
- ✅ Interface mais humanizada e conversacional
- ✅ Sugestões proativas de IA
- ✅ Integração nativa de notas e chat

### vs. Notion
- ✅ Foco em rotina diária, não documentação
- ✅ Interação por voz
- ✅ Experiência mobile-first superior

### vs. Assistentes de voz (Siri, Google Assistant)
- ✅ Interface visual rica
- ✅ Contexto persistente
- ✅ Personalização profunda

## Filosofia do Produto

**"Seu copiloto para a vida diária"**

Kiki não é apenas um app de produtividade - é uma parceira digital que:
- 🧠 **Entende** seu contexto e necessidades
- 💡 **Sugere** ações no momento certo
- 🎯 **Ajuda** você a manter foco sem burnout
- 🌈 **Celebra** suas conquistas e progresso
- 🤝 **Adapta-se** ao seu estilo único

---

**Versão**: 1.0.0  
**Status**: Protótipo funcional  
**Licença**: Proprietário  
**Contato**: maria.silva@email.com (usuário exemplo)
