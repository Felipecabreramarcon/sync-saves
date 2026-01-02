# 🚀 Progresso em Direção ao MVP

Este documento rastreia o progresso real para o lançamento do MVP (Minimum Viable Product), removendo a distorção dos dados mockados e focando em implementações funcionais.

**Última Auditoria:** 02/01/2026

---

## 📊 Estado Real da Implementação (Sem Mocks)

### 🎨 Frontend & Interface (98%)
- [x] Estrutura de Rotas e Navegação (React Router v7)
- [x] Design System (HeroUI v3 + Glassmorphism)
- [x] Páginas Visuais (Dashboard, Games, Settings, Logs)
- [x] Padronização de Componentes (SaveButton, SaveInput, Cards)
- [x] Diálogos Nativos (Folder Picker implementado)
- [x] Integração de Lógica Real (Zustand Stores conectadas ao Tauri/Supabase)
- [x] Sistema de Toast Notifications (feedback visual para ações)
- [x] Dropdown Menu para GameCards (Sync, Restore, Delete, Open Folder)
- [x] Migração completa para HeroUI v3 (novo padrão de componentes)
- [x] Migração para Tailwind CSS v4 (nova sintaxe @import/@theme)
- [x] Atualização para React 19
- [x] Gráfico de atividades no Dashboard (Recharts AreaChart)
- [x] Modal de configurações por jogo (GameSettingsModal)
- [ ] ⚠️ Login por Email não funcional (apenas Google OAuth ativo)

### 🦀 Backend Rust & Tauri (100%)
- [x] Core Setup (Tauri v2)
- [x] SQLite: Inicialização e Schema (3 tabelas: games, app_settings, sync_queue)
- [x] SQLite: Persistência de Jogos (CRUD Real)
- [x] SQLite: Persistência de Settings (Notifications, Auto-sync, Launch on Startup)
- [x] Device ID Único (UUID v4 persistido por dispositivo)
- [x] Serviço de Hashing (SHA256 para integridade)
- [x] Serviço de Compressão (ZIP via crate `zip`)
- [x] Serviço de Extração (Restore de saves)
- [x] Monitoramento em Tempo Real (File Watcher via crate `notify`)
- [x] Comando delete_game para remoção de jogos
- [x] Implementação de Launch on Startup (autostart)
- [x] System Info (OS, hostname, memória, device ID)

### ☁️ Infraestrutura Supabase (90%)
- [x] Schema do PostgreSQL (5 tabelas + RLS)
- [x] Autenticação Real (Google OAuth 2.0 Integration)
- [x] Sincronização de Metadados (Cloud DB via Supabase)
- [x] Gestão de Arquivos (Storage Upload/Download integrados)
- [x] Gestão de Dispositivos (Registro automático, listagem, remoção)
- [x] Políticas de RLS (Row Level Security) refinadas
- [ ] ⚠️ Tabela `sync_logs` nunca é escrita (logs só em Zustand local)
- [ ] ⚠️ Tabela `game_paths` (paths por dispositivo) não utilizada

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

### Passo 5: Gestão de Dispositivos ✅
- [x] Gerar Device ID único (UUID v4) persistido no SQLite.
- [x] Registrar dispositivo automaticamente no Supabase ao iniciar.
- [x] Listar todos os dispositivos do usuário na página Settings.
- [x] Permitir remoção de dispositivos (exceto o atual).

### Passo 6: Configurações Persistentes ✅
- [x] Persistir preferências de sync no SQLite (frequência, notificações, auto-sync).
- [x] Carregar configurações ao iniciar o app.
- [x] Botões Save/Discard funcionais na página Settings.

### Passo 7: Feedback Visual ✅
- [x] Sistema de Toast Notifications para sucesso/erro.
- [x] Feedback visual em operações de sync/restore.
- [x] Dropdown com ações no GameCard (Open Folder, Settings, Remove).

### Passo 8: Migração para HeroUI v3 ✅
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

## ⚠️ Dívida Técnica (Pendente)

### Alta Prioridade
- [ ] **Persistir Logs no Supabase**: Atividades são armazenadas apenas em Zustand (localStorage), não na tabela `sync_logs`.

### Média Prioridade
- [ ] **Tipagem do Supabase**: Muitos `as any` no código. Tipar corretamente o cliente Supabase.
- [ ] **sync_queue não utilizado**: Tabela SQLite para fila offline nunca é populada.
- [ ] **Base64 para arquivos grandes**: Sync usa Base64 que dobra uso de memória. Considerar streaming.

### Baixa Prioridade
- [ ] **Email Login não implementado**: Apenas log no console, sem magic link ou senha.
- [ ] **Sem Error Boundary**: Falta tratamento de erros React para crash recovery.
- [ ] **Sem Testes**: Nenhum teste unitário ou de integração implementado.

---

## 🚀 Próximos Passos (Pós-MVP)

### Passo 9: Refinamento de Configurações 🔧 ✅
- [x] Verificar configuração `desktop_notifications` antes de enviar notificações.
- [x] Implementar modal de configurações por jogo (via botão Settings do GameCard).

### Passo 10: Histórico e Versionamento de Saves 📚
- [ ] Nomear arquivos com timestamp (ex: `game_20260102_143022.zip`).
- [ ] Manter últimas N versões de cada save.
- [ ] UI para visualizar e restaurar versões anteriores.

### Passo 11: Sincronização Avançada 🔄
- [ ] Detecção de conflitos (comparar checksums local vs cloud).
- [ ] Modal de resolução de conflito (Keep Local / Keep Cloud / Keep Both).
- [ ] Implementar fila offline (`sync_queue`) com retry automático.

### Passo 12: Logs Sincronizados ☁️
- [ ] Persistir atividades na tabela `sync_logs` do Supabase.
- [ ] Carregar histórico de atividades de todos os dispositivos.
- [ ] Filtrar logs por dispositivo/jogo na página Logs.

### Passo 13: Qualidade de Código 🧪
- [ ] Adicionar Vitest para testes de frontend.
- [ ] Adicionar testes Rust para comandos Tauri.
- [ ] Implementar React Error Boundary.
- [ ] Refatorar tipos do Supabase (remover `as any`).

### Passo 14: Funcionalidades Extras ✨
- [ ] Suporte a múltiplos perfis de save por jogo.
- [ ] Integração com Steam API para buscar nomes e capas automaticamente.
- [ ] Login por Email (magic link ou senha).
- [ ] Versão Mobile (React Native ou Tauri Mobile).

---

## 📈 Resumo de Status

| Área | Progresso | Notas |
|------|-----------|-------|
| Frontend UI | 98% | Falta apenas Email Login |
| Backend Rust | 100% | Completo e funcional |
| Supabase | 90% | Falta usar sync_logs e game_paths |
| MVP Core | ✅ | Auth, Sync, Restore, Watcher funcionais |
| Refinamentos | ✅ | Notifications e Game Settings completos |
