# 🎮 Sync Saves

> Sistema multiplataforma para sincronização automática de saves de jogos na nuvem

[![Tauri](https://img.shields.io/badge/Tauri-2.5-blue?logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green?logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Screenshots](#-screenshots)
- [Tecnologias](#-tecnologias)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Uso](#-uso)
- [Documentação](#-documentação)
- [Roadmap](#-roadmap)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

---

## 🎯 Sobre o Projeto

**Sync Saves** é uma aplicação desktop que permite sincronizar automaticamente os saves dos seus jogos entre múltiplos dispositivos usando armazenamento em nuvem.

### O Problema

- Você joga em mais de um computador (desktop em casa, notebook para viagens)
- Quer continuar seu progresso de onde parou, independente do dispositivo
- Nem todos os jogos têm suporte a salvamento em nuvem

### A Solução

O Sync Saves monitora as pastas de saves dos seus jogos e sincroniza automaticamente com a nuvem, permitindo que você continue jogando de qualquer dispositivo com seu progresso atualizado.

---

## ✨ Funcionalidades

### MVP (Versão Atual)

| Funcionalidade | Descrição |
|----------------|-----------|
| 🔐 **Login com Google** | Autenticação segura via Google OAuth + Deep Linking (`sync-saves://`) |
| 📁 **Configurar Jogos** | Adicione jogos definindo nome, pasta e plataforma |
| 🎮 **PCGamingWiki** | Sugestões automáticas de caminhos de save via API |
| ⚙️ **Settings por Jogo** | Configure cada jogo individualmente (sync, notificações) |
| 💾 **Sync Automático** | File Watcher em tempo real com debounce (5s) e cooldown (30s) |
| 📊 **Análise de Progresso** | Sistema flexível de análise com configuração customizável |
| 📱 **Multi-dispositivo** | Registro automático com identificação única (UUID) |
| ☁️ **Restore** | Baixe saves da nuvem para qualquer dispositivo |
| 🔔 **Notificações** | Alertas desktop nativos configuráveis |
| 🚀 **Autostart** | Iniciar automaticamente com o sistema operacional |
| 🖥️ **Multiplataforma** | Windows, Linux e macOS |

### Futuro

- [ ] Catálogo comunitário de jogos
- [ ] Detecção automática de jogos instalados (Steam, Epic, etc)
- [ ] Histórico visual de versões com comparação
- [ ] Resolução manual de conflitos
- [ ] Criptografia end-to-end

---

## 📸 Screenshots

> *Screenshots serão adicionadas após a implementação da UI*

---

## 🛠️ Tecnologias

### Desktop App

| Tecnologia | Uso |
|------------|-----|
| [Tauri 2.5](https://tauri.app/) | Framework desktop (Rust) |
| [React 19](https://reactjs.org/) | UI Library |
| [TypeScript 5.7](https://www.typescriptlang.org/) | Tipagem estática |
| [HeroUI v3 Beta](https://heroui.com/) | Componentes UI |
| [Tailwind CSS v4](https://tailwindcss.com/) | Estilização via @tailwindcss/vite |
| [React Router v7](https://reactrouter.com/) | Roteamento |
| [Zustand](https://zustand-demo.pmnd.rs/) | Gerenciamento de estado |
| [Framer Motion](https://www.framer.com/motion/) | Animações |
| [Recharts](https://recharts.org/) | Visualização de dados |
| [SQLite](https://sqlite.org/) | Cache local |

**Tauri Plugins:**
- `tauri-plugin-deep-link` - Protocolo customizado `sync-saves://`
- `tauri-plugin-autostart` - Inicialização com o sistema
- `tauri-plugin-notification` - Notificações nativas
- `tauri-plugin-dialog` - Seleção de arquivos/pastas
- `tauri-plugin-fs` - Operações de sistema de arquivos
- `tauri-plugin-single-instance` - Garantir única instância

**Rust Crates:**
- `notify` - File watcher em tempo real
- `zip` - Compressão/descompressão
- `sha2` - Hashing para integridade
- `rusqlite` - Interface SQLite
- `reqwest` - Cliente HTTP (PCGamingWiki API)
- `tokio` - Runtime assíncrono

### Backend

| Tecnologia | Uso |
|------------|-----|
| [Supabase Auth](https://supabase.com/docs/guides/auth) | Autenticação (Google OAuth) |
| [Supabase Database](https://supabase.com/docs/guides/database) | PostgreSQL |
| [Supabase Storage](https://supabase.com/docs/guides/storage) | Armazenamento de arquivos |

---

## 📥 Instalação

### Pré-requisitos

- Node.js 18+
- Rust 1.70+
- pnpm (recomendado) ou npm

### Desenvolvimento

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/sync-saves.git
cd sync-saves

# Instale as dependências (pnpm recomendado)
pnpm install
# ou use npm
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais do Supabase

# Execute em modo desenvolvimento
pnpm tauri dev
# Nota: Deep linking (sync-saves://) só funciona em builds de produção
```

### Build para Produção

```bash
# Gera o instalador para seu sistema operacional
pnpm tauri build
```

Os instaladores serão gerados em `src-tauri/target/release/bundle/`

---

## ⚙️ Configuração

### 1. Supabase

1. Crie uma conta no [Supabase](https://supabase.com/)
2. Crie um novo projeto
3. Execute o schema SQL (ver `docs/DATABASE.md`)
4. Configure o Storage bucket
5. Habilite Google OAuth nas configurações de Auth

### 2. Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

Consulte `docs/SETUP.md` para instruções detalhadas.

---

## 🎮 Uso

### Primeiro Acesso

1. Abra o aplicativo
2. Faça login com sua conta Google
3. Dê um nome para este dispositivo (ex: "PC Casa", "Notebook")

### Adicionando um Jogo

1. Clique em **"+ Adicionar Jogo"**
2. Digite o nome do jogo
3. Selecione a pasta onde ficam os saves
	- Opcional (desktop/Tauri): use **Suggestions (PCGamingWiki)** para buscar pelo nome e escolher um caminho sugerido
4. O jogo será sincronizado automaticamente

### Sincronização

- O app monitora as pastas de save em tempo real (File Watcher)
- Quando detecta mudanças, sincroniza automaticamente
- Notificações desktop informam sobre backups (se habilitadas)
- Você pode forçar uma sincronização manual a qualquer momento
- Use o botão Restore para baixar saves da nuvem

---

## 🧰 hollow.py (Silksong save decode)

Se você quiser usar o `hollow.py` para decodificar um save (formato com header + base64 + AES) para JSON:

```bash
pip install -r requirements.txt
python hollow.py "C:\\Path\\To\\SaveFile"
```

Ele vai gerar um arquivo `*.json` ao lado do original (ex: `Save.dat.json`) e imprimir um resumo best-effort de “progresso” se encontrar campos óbvios no JSON.

Quando você adiciona o Silksong como jogo no Sync Saves, o card do jogo pode exibir algumas estatísticas locais (ex: total de arquivos/tamanho, slots, restore points e playtime/scene) **se** existir um `*.dat.json` correspondente no diretório de saves.

---

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [requirements.md](docs/requirements.md) | Especificação completa de requisitos (SRS) |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitetura técnica do projeto |
| [DATABASE.md](docs/DATABASE.md) | Schema do banco de dados (PostgreSQL + SQLite) |
| [API.md](docs/API.md) | Integração com Supabase |
| [SYNC_LOGIC.md](docs/SYNC_LOGIC.md) | Lógica de sincronização |
| [PROGRESS.md](docs/PROGRESS.md) | Status atual e dívida técnica |
| [IMPROVEMENTS.md](docs/IMPROVEMENTS.md) | Melhorias sugeridas e roadmap futuro |

---

## 🗺️ Roadmap

### Fase 1 - MVP ✅
- [x] Definição da arquitetura
- [x] Documentação do projeto
- [x] Setup do projeto Tauri 2.5 + React 19
- [x] Integração com Supabase (Auth, DB, Storage)
- [x] UI Fluida e Moderna (HeroUI v3 + Glassmorphism)
- [x] Lógica de sincronização e File Watcher em tempo real
- [x] Persistência SQLite local (4 tabelas)
- [x] Gestão de dispositivos com UUID único
- [x] Notificações desktop configuráveis
- [x] Modal de configurações por jogo
- [x] Deep linking para autenticação (`sync-saves://`)
- [x] PCGamingWiki API integration (sugestões de paths)
- [x] Sistema de análise de progresso flexível
- [x] Autostart com o sistema operacional
- [x] Timeline de atividades (Logs)

### Fase 2 - Estabilização 🚧
- [ ] Migrar lógica de sync para backend Rust
- [ ] Ativar sync queue para retry automático
- [ ] Event-driven file watcher (eliminar polling)
- [ ] Parâmetros configuráveis (debounce, cooldown)
- [ ] Testes de integração

### Fase 3 - UX Avançado
- [ ] Resolução visual de conflitos
- [ ] Histórico visual de versões com comparação
- [ ] Detecção automática de jogos instalados
- [ ] Catálogo comunitário de jogos

### Fase 4 - Futuro
- [ ] Criptografia end-to-end
- [ ] Suporte a múltiplos perfis por jogo
- [ ] Compressão incremental (delta sync)

---

## ⚠️ Limitações Conhecidas

### Arquitetura Atual

- **Sync Frontend-Dependent**: A orquestração do sync acontece no frontend. Se o app for fechado imediatamente após fechar o jogo, o backup pode não ser realizado. ([PROGRESS.md](docs/PROGRESS.md) detalha isso)
- **File Watcher Polling**: O sistema leva até 10 segundos para começar a monitorar jogos recém-adicionados
- **Conflitos**: Lógica atual é "Last Write Wins". Dispositivos offline podem sobrescrever progresso sem aviso
- **Deep Linking Dev Mode**: O protocolo `sync-saves://` requer build de produção no Windows (não funciona em `tauri dev`)

### Melhorias Planejadas

Consulte [IMPROVEMENTS.md](docs/IMPROVEMENTS.md) para lista completa de melhorias sugeridas com priorização.

---

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor, leia o guia de contribuição antes de enviar PRs.

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 Autor

Desenvolvido com ❤️ para a comunidade gamer.
