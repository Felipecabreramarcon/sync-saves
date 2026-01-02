# 🚀 Progresso em Direção ao MVP

Este documento rastreia o progresso real para o lançamento do MVP (Minimum Viable Product), removendo a distorção dos dados mockados e focando em implementações funcionais.

---

## 📊 Estado Real da Implementação (Sem Mocks)

### 🎨 Frontend & Interface (60%)
- [x] Estrutura de Rotas e Navegação
- [x] Design System (HeroUI + Glassmorphism)
- [x] Páginas Visuais (Dashboard, Games, Settings, Logs)
- [ ] Integração de Lógica Real (Substituição de `mockData` por dados de API/DB)
- [ ] Diálogos Nativos (Folder Picker do SO em vez de input de texto)

### 🦀 Backend Rust & Tauri (30%)
- [x] Core Setup (Tauri v2)
- [x] SQLite: Inicialização e Schema
- [ ] SQLite: Persistência de Jogos (CRUD Real)
- [ ] Serviço de Hashing (SHA256)
- [ ] Serviço de Compressão (ZIP)
- [ ] Monitoramento em Tempo Real (File Watcher)

### ☁️ Infraestrutura Supabase (20%)
- [x] Schema do PostgreSQL
- [ ] Autenticação Real (Google OAuth 2.0 Integration)
- [ ] Sincronização de Metadados (Cloud DB)
- [ ] Gestão de Arquivos (Storage Upload/Download)

---

## 🛠️ Roteiro para o Lançamento (MVP)

### Passo 1: Fundação de Identidade (Auth)
- Substituir o mock de login pelo fluxo real do Supabase.
- Vincular o dispositivo ao usuário autenticado no primeiro acesso.

### Passo 2: Persistência Real e Seletor de Pastas
- Implementar o seletor de pastas nativo do Windows/Linux/macOS.
- Garantir que ao "Adicionar Jogo", os dados sejam salvos no SQLite e reflitam no Grid sem mocks.

### Passo 3: Motor de Sincronização (Core)
- Implementar compressão ZIP da pasta de save.
- Implementar upload para o bucket `saves` do Supabase.
- Registrar log de "Sucesso" na timeline real.

### Passo 4: Automação (Watcher)
- Iniciar o watcher em Rust ao abrir o app para detectar mudanças e triggar sync.

---

## ⚠️ Dívida Técnica (Placeholders Atuais)
- `mockActivities` no Dashboard.
- `mockGames` na página de Games.
- `mockHistory` na página de Logs.
- `mockDevices` nas configurações.
- Login "fake" na página de entrada.
