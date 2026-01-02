# 🎮 Sync Saves

> Sistema multiplataforma para sincronização automática de saves de jogos na nuvem

[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://reactjs.org/)
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
| 🔐 **Login com Google** | Autenticação segura via Google OAuth |
| 📁 **Configurar Jogos** | Adicione qualquer jogo definindo a pasta de saves |
| 💾 **Sync Automático** | Sincronização periódica em segundo plano |
| 📱 **Multi-dispositivo** | Cada dispositivo pode ter caminho diferente |
| 📜 **Histórico** | Mantém versões dos últimos 10 dias |
| ⚡ **Sync Inteligente** | Sempre usa o save mais recente |
| 🖥️ **Multiplataforma** | Windows, Linux e macOS |

### Futuro

- [ ] Catálogo de jogos com caminhos pré-configurados
- [ ] Detecção automática de jogos instalados
- [ ] Sincronização ao detectar mudança (file watcher)
- [ ] Resolução manual de conflitos
- [ ] Compressão e criptografia de saves

---

## 📸 Screenshots

> *Screenshots serão adicionadas após a implementação da UI*

---

## 🛠️ Tecnologias

### Desktop App

| Tecnologia | Uso |
|------------|-----|
| [Tauri 2.0](https://tauri.app/) | Framework desktop (Rust) |
| [React 18](https://reactjs.org/) | UI Library |
| [TypeScript](https://www.typescriptlang.org/) | Tipagem estática |
| [Tailwind CSS](https://tailwindcss.com/) | Estilização |
| [SQLite](https://sqlite.org/) | Cache local |

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

# Instale as dependências
pnpm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais do Supabase

# Execute em modo desenvolvimento
pnpm tauri dev
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
4. O jogo será sincronizado automaticamente

### Sincronização

- O app sincroniza automaticamente a cada intervalo configurado (padrão: 5 minutos)
- O ícone na bandeja do sistema indica o status
- Você pode forçar uma sincronização manual a qualquer momento

---

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitetura técnica do projeto |
| [DATABASE.md](docs/DATABASE.md) | Schema do banco de dados |
| [API.md](docs/API.md) | Integração com Supabase |
| [UI_DESIGN.md](docs/UI_DESIGN.md) | Design da interface |
| [SETUP.md](docs/SETUP.md) | Guia de configuração |
| [SYNC_LOGIC.md](docs/SYNC_LOGIC.md) | Lógica de sincronização |

---

## 🗺️ Roadmap

### Fase 1 - MVP ✅
- [x] Definição da arquitetura
- [x] Documentação do projeto
- [ ] Setup do projeto Tauri + React
- [ ] Integração com Supabase
- [ ] UI básica
- [ ] Lógica de sincronização
- [ ] Testes

### Fase 2 - Catálogo
- [ ] Base de dados de jogos conhecidos
- [ ] Detecção automática de jogos
- [ ] Contribuição da comunidade

### Fase 3 - Avançado
- [ ] Resolução manual de conflitos
- [ ] Criptografia end-to-end
- [ ] Suporte a profiles de jogos

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
