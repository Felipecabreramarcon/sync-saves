# 🛠️ Setup Guide

Guia completo para configurar o ambiente de desenvolvimento do Sync Saves.

---

## Pré-requisitos

### Sistema

| Requisito | Versão Mínima | Verificar |
|-----------|---------------|-----------|
| Node.js | 18.0+ | `node --version` |
| pnpm | 8.0+ | `pnpm --version` |
| Rust | 1.70+ | `rustc --version` |
| Cargo | 1.70+ | `cargo --version` |

### Windows (Adicional)

- Microsoft Visual Studio C++ Build Tools
- WebView2 (já instalado no Windows 10/11)

### Linux (Adicional)

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

### macOS (Adicional)

```bash
xcode-select --install
```

---

## Instalação

### 1. Clone o Repositório

```bash
git clone https://github.com/seu-usuario/sync-saves.git
cd sync-saves
```

### 2. Instale as Dependências

```bash
# Instalar dependências do frontend
pnpm install

# Verificar se Tauri CLI está instalado
pnpm tauri --version
```

### 3. Configure o Supabase

#### 3.1 Criar Projeto

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Clique em **"New Project"**
3. Escolha um nome e senha para o banco
4. Aguarde a criação (~2 minutos)

#### 3.2 Configurar Google OAuth

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto ou use existente
3. Vá em **APIs & Services > OAuth consent screen**
   - Escolha "External"
   - Preencha nome do app e email
4. Vá em **APIs & Services > Credentials**
   - Clique **Create Credentials > OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `https://SEU-PROJETO.supabase.co/auth/v1/callback`
5. Copie **Client ID** e **Client Secret**
6. No Supabase, vá em **Authentication > Providers > Google**
   - Habilite e cole as credenciais

#### 3.3 Executar Migrations

1. No Supabase, vá em **SQL Editor**
2. Execute o conteúdo de `docs/DATABASE.md` (seções de CREATE TABLE)
3. Ou use a Supabase CLI:

```bash
# Instalar CLI
npm install -g supabase

# Login
supabase login

# Link com projeto
supabase link --project-ref SEU_PROJECT_REF

# Push migrations
supabase db push
```

#### 3.4 Configurar Storage

1. No Supabase, vá em **Storage**
2. Clique **New bucket**
   - Name: `saves`
   - Public: **OFF**
3. Em **Policies**, adicione as policies do `docs/DATABASE.md`

### 4. Variáveis de Ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```env
# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Opcional: Desenvolvimento
VITE_DEV_MODE=true
```

> ⚠️ **Nunca commite o arquivo `.env.local`!** Ele já está no `.gitignore`.

---

## Desenvolvimento

### Executar em Modo Dev

```bash
# Inicia o frontend + backend Tauri
pnpm tauri dev
```

Isso irá:
1. Iniciar o Vite dev server (frontend) em `http://localhost:5173`
2. Compilar o código Rust
3. Abrir a janela do app

### Hot Reload

- **Frontend**: Alterações em `src/` recarregam automaticamente
- **Backend (Rust)**: Alterações em `src-tauri/` recompilam e reiniciam o app

### Debug

```bash
# Com logs detalhados do Rust
RUST_LOG=debug pnpm tauri dev

# Abrir DevTools automaticamente
# Adicione em src-tauri/tauri.conf.json:
# "build": { "devtools": true }
```

---

## Estrutura do Projeto

```
sync-saves/
├── docs/                    # Documentação
├── src/                     # Frontend (React)
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── lib/
│   ├── stores/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/               # Backend (Rust)
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/
│   │   └── services/
│   ├── Cargo.toml
│   └── tauri.conf.json
├── public/                  # Assets estáticos
├── .env.example
├── .env.local               # Suas credenciais (git ignored)
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Build para Produção

### Compilar Instaladores

```bash
pnpm tauri build
```

Os instaladores serão gerados em:

| OS | Formato | Caminho |
|----|---------|---------|
| Windows | `.msi`, `.exe` | `src-tauri/target/release/bundle/msi/` |
| macOS | `.dmg`, `.app` | `src-tauri/target/release/bundle/dmg/` |
| Linux | `.deb`, `.AppImage` | `src-tauri/target/release/bundle/deb/` |

### Cross-compilation

Para compilar para outros OS, use GitHub Actions ou uma VM.

---

## Troubleshooting

### Erro: "WebView2 not found" (Windows)

Instale o [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

### Erro: "pkg-config not found" (Linux)

```bash
sudo apt install pkg-config libssl-dev
```

### Erro: "Command 'tauri' not found"

```bash
# Reinstalar Tauri CLI
pnpm add -D @tauri-apps/cli
```

### Erro de autenticação Google

Verifique:
1. Redirect URI está correto no Google Console
2. Client ID/Secret estão corretos no Supabase
3. Provider Google está habilitado no Supabase

### Erro "CORS" ao acessar Supabase

Em desenvolvimento, o Tauri não tem problemas com CORS. Se ocorrer:
1. Verifique se a URL do Supabase está correta
2. Verifique se o anon key está correto

---

## Scripts Úteis

```json
{
  "scripts": {
    "dev": "tauri dev",
    "build": "tauri build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

---

## Próximos Passos

Após configurar o ambiente:

1. Leia a [Arquitetura](./ARCHITECTURE.md) para entender o sistema
2. Veja o [Schema do Banco](./DATABASE.md) para entender os dados
3. Confira o [UI Design](./UI_DESIGN.md) para referência visual
4. Entenda a [Lógica de Sync](./SYNC_LOGIC.md) para implementar
