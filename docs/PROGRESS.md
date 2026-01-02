# 🚀 Progresso em Direção ao MVP

Este documento rastreia o progresso real para o lançamento do MVP (Minimum Viable Product), removendo a distorção dos dados mockados e focando em implementações funcionais.

---

## 📊 Estado Real da Implementação (Sem Mocks)

### 🎨 Frontend & Interface (100%)
- [x] Estrutura de Rotas e Navegação
- [x] Design System (HeroUI v3 + Glassmorphism)
- [x] Páginas Visuais (Dashboard, Games, Settings, Logs)
- [x] Padronização de Componentes (SaveButton, SaveInput, Cards)
- [x] Diálogos Nativos (Folder Picker implementado)
- [x] Integração de Lógica Real (Zustand Stores conectadas ao Tauri/Supabase)
- [x] Sistema de Toast Notifications (feedback visual para ações)
- [x] Dropdown Menu para GameCards (opções de ação)
- [x] Migração completa para HeroUI v3 (novo padrão de componentes)
- [x] Migração para Tailwind CSS v4 (nova sintaxe @import/@theme)
- [x] Atualização para React 19

### 🦀 Backend Rust & Tauri (95%)
- [x] Core Setup (Tauri v2)
- [x] SQLite: Inicialização e Schema
- [x] SQLite: Persistência de Jogos (CRUD Real)
- [x] SQLite: Persistência de Settings (Sync Frequency, Notifications, etc.)
- [x] Device ID Único (UUID v4 persistido por dispositivo)
- [x] Serviço de Hashing (SHA256 para integridade)
- [x] Serviço de Compressão (ZIP via Rust)
- [x] Serviço de Extração (Restore de saves)
- [x] Monitoramento em Tempo Real (File Watcher funcional)
- [x] Comando delete_game para remoção de jogos

### ☁️ Infraestrutura Supabase (90%)
- [x] Schema do PostgreSQL
- [x] Autenticação Real (Google OAuth 2.0 Integration)
- [x] Sincronização de Metadados (Cloud DB via Supabase)
- [x] Gestão de Arquivos (Storage Upload/Download integrados)
- [x] Gestão de Dispositivos (Registro automático, listagem, remoção)
- [ ] Políticas de RLS (Row Level Security) refinadas

---

## 🛠️ Roteiro para o Lançamento (MVP)

### Passo 1: Fundação de Identidade (Auth) ✅
- [x] Substituir o mock de login pelo fluxo real do Supabase.
- [x] Vincular o dispositivo ao usuário autenticado no primeiro acesso.

### Passo 2: Persistência Real e Seletor de Pastas ✅
- [x] Implementar o seletor de pastas nativo do Windows/Linux/macOS.
- [x] Garantir que ao "Adicionar Jogo", os dados sejam salvos no SQLite e reflitam no Grid sem mocks.

### Passo 3: Motor de Sincronização (Core) ✅
- [x] Implementar compressão ZIP da pasta de save.
- [x] Implementar upload para o bucket `saves` do Supabase.
- [x] Registrar log de "Sucesso" na timeline real.

### Passo 4: Automação (Watcher) ✅
- [x] Iniciar o watcher em Rust ao abrir o app para detectar mudanças e triggar sync.

### Passo 5: Gestão de Dispositivos ✅ (NOVO)
- [x] Gerar Device ID único (UUID v4) persistido no SQLite.
- [x] Registrar dispositivo automaticamente no Supabase ao iniciar.
- [x] Listar todos os dispositivos do usuário na página Settings.
- [x] Permitir remoção de dispositivos (exceto o atual).

### Passo 6: Configurações Persistentes ✅ (NOVO)
- [x] Persistir preferências de sync no SQLite (frequência, notificações, auto-sync).
- [x] Carregar configurações ao iniciar o app.
- [x] Botões Save/Discard funcionais na página Settings.

### Passo 7: Feedback Visual ✅ (NOVO)
- [x] Sistema de Toast Notifications para sucesso/erro.
- [x] Feedback visual em operações de sync/restore.
- [x] Dropdown com ações no GameCard (Open Folder, Settings, Remove).

### Passo 8: Migração para HeroUI v3 ✅ (NOVO)
- [x] Atualizar padrões de Select (Label, ListBox, Select.Trigger/Value/Popover)
- [x] Atualizar padrões de Modal (Modal.Backdrop, Modal.Container, Modal.Dialog)
- [x] Atualizar padrões de Switch (Switch.Control, Switch.Thumb)
- [x] Atualizar padrões de Tooltip (Tooltip.Trigger, Tooltip.Content)
- [x] Atualizar padrões de Avatar (Avatar.Image, Avatar.Fallback)
- [x] Atualizar padrões de Button (variant="primary/secondary/tertiary/ghost")
- [x] Migrar useDisclosure para useOverlayState
- [x] Remover HeroUIProvider (não necessário na v3)
- [x] Atualizar para Tailwind CSS v4 com @tailwindcss/vite

---

## ⚠️ Dívida Técnica (Placeholders Atuais)
- [ ] Implementar Launch on Startup real (autostart).
- [ ] Validação real de paths de sistema protegidos.
- [ ] Políticas RLS completas no Supabase.
