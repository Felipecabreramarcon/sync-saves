# 🏗️ Arquitetura do Sync Saves

Este documento descreve a arquitetura técnica completa do projeto Sync Saves.

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Componentes](#componentes)
- [Fluxos de Dados](#fluxos-de-dados)
- [Decisões Técnicas](#decisões-técnicas)
- [Segurança](#segurança)

---

## Visão Geral

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           ARQUITETURA GERAL                                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   DISPOSITIVO 1 (PC Casa)              DISPOSITIVO 2 (Notebook)            │
│   ┌─────────────────────┐              ┌─────────────────────┐            │
│   │    Tauri App        │              │    Tauri App        │            │
│   │  ┌───────────────┐  │              │  ┌───────────────┐  │            │
│   │  │   React UI    │  │              │  │   React UI    │  │            │
│   │  │  (WebView)    │  │              │  │  (WebView)    │  │            │
│   │  └───────┬───────┘  │              │  └───────┬───────┘  │            │
│   │          │IPC       │              │          │IPC       │            │
│   │  ┌───────┴───────┐  │              │  ┌───────┴───────┐  │            │
│   │  │  Rust Core    │  │              │  │  Rust Core    │  │            │
│   │  │  - File I/O   │  │              │  │  - File I/O   │  │            │
│   │  │  - Zip/Unzip  │  │              │  │  - Zip/Unzip  │  │            │
│   │  │  - Scheduler  │  │              │  │  - Scheduler  │  │            │
│   │  └───────────────┘  │              │  └───────────────┘  │            │
│   │  ┌───────────────┐  │              │  ┌───────────────┐  │            │
│   │  │    SQLite     │  │              │  │    SQLite     │  │            │
│   │  │   (Cache)     │  │              │  │   (Cache)     │  │            │
│   │  └───────────────┘  │              │  └───────────────┘  │            │
│   └──────────┬──────────┘              └──────────┬──────────┘            │
│              │                                    │                        │
│              └──────────────┬─────────────────────┘                        │
│                             │ HTTPS                                        │
│                             ▼                                              │
│              ┌──────────────────────────────────────┐                     │
│              │            SUPABASE                   │                     │
│              │  ┌────────────────────────────────┐  │                     │
│              │  │           Auth                  │  │                     │
│              │  │    (Google OAuth 2.0)          │  │                     │
│              │  └────────────────────────────────┘  │                     │
│              │  ┌────────────────────────────────┐  │                     │
│              │  │        PostgreSQL              │  │                     │
│              │  │  - users, devices, games       │  │                     │
│              │  │  - save_versions, sync_logs    │  │                     │
│              │  └────────────────────────────────┘  │                     │
│              │  ┌────────────────────────────────┐  │                     │
│              │  │         Storage                │  │                     │
│              │  │    (Save files .zip)           │  │                     │
│              │  └────────────────────────────────┘  │                     │
│              └──────────────────────────────────────┘                     │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes

### 1. Frontend (React + TypeScript)

**Localização:** `src/`

Responsável pela interface do usuário e experiência visual.

```
src/
├── components/          # Componentes reutilizáveis
│   ├── layout/         # Componentes de estrutura (Sidebar, PageHeader...)
│   └── features/       # Componentes de funcionalidades (GameCard, StatCard...)
├── pages/              # Páginas da aplicação
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Games.tsx
│   ├── Settings.tsx
│   └── History.tsx
├── stores/             # Gerenciamento de estado (Zustand com persistência)
│   ├── authStore.ts    # Autenticação e estado do usuário
│   ├── gamesStore.ts   # Lista de jogos e atividades
│   └── syncStore.ts    # Status global de sincronização
├── lib/                # Utilitários e integrações
│   ├── supabase.ts     # Cliente Supabase
│   ├── tauri.ts        # Bridge genérica com Tauri
│   ├── tauri-games.ts  # Bridge específica para operações de jogos
│   └── utils.ts        # Utilitários de estilo e helpers
├── types/              # Definições de tipos TypeScript
│   ├── database.ts     # Tipos do Supabase
│   └── index.ts        # Barrel export
└── styles/             # Estilos globais (Tailwind + HeroUI)
    └── globals.css
```

### 2. Backend (Rust/Tauri)

**Localização:** `src-tauri/`

Responsável por operações de sistema, gerenciamento de arquivos e sincronização.

```
src-tauri/
├── src/
│   ├── main.rs              # Entry point
│   ├── lib.rs               # Library exports
│   ├── commands/            # Tauri commands (IPC)
│   │   ├── mod.rs
│   │   ├── auth.rs          # Comandos de autenticação
│   │   ├── games.rs         # CRUD de jogos
│   │   ├── sync.rs          # Operações de sincronização
│   │   └── files.rs         # Operações de arquivo
│   ├── services/            # Business logic
│   │   ├── mod.rs
│   │   ├── sync_service.rs  # Lógica de sincronização
│   │   ├── zip_service.rs   # Compressão/descompressão
│   │   └── scheduler.rs     # Agendador de tarefas
│   ├── db/                  # SQLite local
│   │   ├── mod.rs
│   │   ├── schema.rs
│   │   └── queries.rs
│   └── utils/
│       ├── mod.rs
│       ├── paths.rs         # Manipulação de caminhos
│       └── checksum.rs      # Cálculo de hash
├── Cargo.toml
└── tauri.conf.json
```

### 3. Supabase (Backend as a Service)

**Componentes utilizados:**

| Componente | Função |
|------------|--------|
| **Auth** | Autenticação via Google OAuth |
| **Database** | PostgreSQL para metadados |
| **Storage** | Armazenamento dos arquivos de save |
| **RLS** | Row Level Security para isolamento de dados |

---

## Fluxos de Dados

### Fluxo de Autenticação

```
┌─────────┐     ┌─────────┐     ┌──────────────┐     ┌─────────┐
│  User   │────▶│  React  │────▶│   Supabase   │────▶│  Google │
│         │     │   UI    │     │     Auth     │     │  OAuth  │
└─────────┘     └─────────┘     └──────────────┘     └─────────┘
                     │                  │
                     │                  │
                     ▼                  ▼
              ┌─────────────┐    ┌─────────────┐
              │   Tauri     │    │   Session   │
              │ (save token)│    │   Created   │
              └─────────────┘    └─────────────┘
```

1. Usuário clica em "Login com Google"
2. Supabase abre popup de OAuth do Google
3. Usuário autoriza
4. Token JWT é retornado
5. Token é armazenado localmente (SQLite)
6. Sessão é mantida ativa

### Fluxo de Sincronização (Upload)

```
┌──────────────────────────────────────────────────────────────────┐
│                     FLUXO DE UPLOAD                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. TRIGGER                                                       │
│     ┌──────────────┐                                             │
│     │  Scheduler   │ ─── Timer tick (5 min) ───▶ Start Sync     │
│     └──────────────┘                                             │
│                                                                   │
│  2. CHECK LOCAL CHANGES                                           │
│     ┌──────────────┐    ┌──────────────┐                        │
│     │  Local Save  │───▶│  Calculate   │───▶ checksum           │
│     │    Folder    │    │   Checksum   │                        │
│     └──────────────┘    └──────────────┘                        │
│                                                                   │
│  3. COMPARE WITH CLOUD                                            │
│     ┌──────────────┐    ┌──────────────┐                        │
│     │   Supabase   │───▶│   Compare    │───▶ needs_upload?      │
│     │   Database   │    │   Versions   │                        │
│     └──────────────┘    └──────────────┘                        │
│                                                                   │
│  4. IF NEEDS UPLOAD                                               │
│     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│     │  Zip Folder  │───▶│   Upload to  │───▶│   Update DB  │    │
│     │              │    │   Storage    │    │   Metadata   │    │
│     └──────────────┘    └──────────────┘    └──────────────┘    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Fluxo de Sincronização (Download)

```
┌──────────────────────────────────────────────────────────────────┐
│                     FLUXO DE DOWNLOAD                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. CHECK REMOTE                                                  │
│     ┌──────────────┐    ┌──────────────┐                        │
│     │   Supabase   │───▶│   Compare    │───▶ remote_newer?      │
│     │   Database   │    │   Versions   │                        │
│     └──────────────┘    └──────────────┘                        │
│                                                                   │
│  2. IF REMOTE IS NEWER                                           │
│     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│     │  Download    │───▶│  Backup Old  │───▶│   Extract    │    │
│     │  from Storage│    │   Local      │    │   New Save   │    │
│     └──────────────┘    └──────────────┘    └──────────────┘    │
│                                                                   │
│  3. UPDATE LOCAL STATE                                            │
│     ┌──────────────┐    ┌──────────────┐                        │
│     │  Update      │───▶│   Log Sync   │                        │
│     │  SQLite      │    │   Event      │                        │
│     └──────────────┘    └──────────────┘                        │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Decisões Técnicas

### Por que Tauri?

| Critério | Tauri | Electron |
|----------|-------|----------|
| Tamanho do app | ~10-20 MB | ~150+ MB |
| Memória RAM | ~50-100 MB | ~200-500 MB |
| Performance | Excelente | Boa |
| Segurança | Alta (Rust) | Média |
| Acesso a FS | Nativo | Via Node.js |

### Por que Supabase?

1. **All-in-one**: Auth + DB + Storage em um só lugar
2. **Gratuito para MVP**: Tier gratuito generoso
3. **PostgreSQL**: Banco robusto e conhecido
4. **RLS**: Segurança a nível de linha
5. **SDK JavaScript**: Fácil integração

### Por que SQLite Local?

1. **Offline-first**: App funciona sem internet
2. **Cache**: Reduz requisições ao servidor
3. **Performance**: Leitura/escrita instantânea
4. **Dados sensíveis**: Tokens ficam localmente

### Sincronização Periódica vs Real-time

| Abordagem | Prós | Contras |
|-----------|------|---------|
| Periódica | Simples, previsível, menos recursos | Delay de alguns minutos |
| Real-time | Instantâneo | Complexo, more API calls, battery drain |
| File Watcher | Reage a mudanças | Pode triggerar muitos syncs |

**Decisão**: Periódica (configurável, padrão 5 min) + opção de sync manual

---

## Segurança

### Autenticação

- OAuth 2.0 via Google (gerenciado pelo Supabase)
- Tokens JWT com expiração
- Refresh tokens armazenados de forma segura

### Armazenamento

- Cada usuário só acessa seus próprios dados (RLS)
- Saves organizados por `user_id` no Storage
- Políticas de acesso restrictivas

### Comunicação

- Todas as requisições via HTTPS
- API keys nunca expostas no frontend
- Supabase Anon Key é segura (apenas permite operações autorizadas)

### Local

- Dados sensíveis no SQLite criptografado
- Credenciais gerenciadas pelo sistema operacional (Keychain/Credential Manager)

---

## Status Atual & Próximos Passos

### Concluído ✅
- [x] Estrutura base do projeto (Tauri v2 + React)
- [x] Sistema de design com HeroUI e Glassmorphism
- [x] Todas as páginas da interface (Login, Dashboard, Games, History, Settings)
- [x] Store management com Zustand e persistência
- [x] Backend Rust inicial (Configuração, SQLite, SysInfo)
- [x] Bridge TypeScript-Rust (Commands)

### Em Andamento 🚧
- [/] Implementação da lógica de sincronização (Sync Logic)
- [/] Operações de sistema de arquivos (Rust) para detecção de saves

### Pendente ⏳
- [ ] Monitoramento em tempo real (File Watcher)
- [ ] Lógica de resolução de conflitos (Cloud vs Local)
- [ ] Build final e empacotamento
