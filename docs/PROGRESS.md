# 🚀 Progresso em Direção ao MVP

Este documento rastreia o progresso real para o lançamento do MVP (Minimum Viable Product), removendo a distorção dos dados mockados e focando em implementações funcionais.

---

## 📊 Estado Real da Implementação (Sem Mocks)

### 🎨 Frontend & Interface (90%)
- [x] Estrutura de Rotas e Navegação
- [x] Design System (HeroUI + Glassmorphism)
- [x] Páginas Visuais (Dashboard, Games, Settings, Logs)
- [x] Padronização de Componentes (SaveButton, SaveInput, Cards)
- [x] Diálogos Nativos (Folder Picker implementado)
- [x] Integração de Lógica Real (Zustand Stores conectadas ao Tauri/Supabase)
- [ ] Refinamento de UX (Animações HeroUI e feedbacks visuais)

### 🦀 Backend Rust & Tauri (85%)
- [x] Core Setup (Tauri v2)
- [x] SQLite: Inicialização e Schema
- [x] SQLite: Persistência de Jogos (CRUD Real)
- [x] Serviço de Hashing (SHA256 para integridade)
- [x] Serviço de Compressão (ZIP via Rust)
- [x] Serviço de Extração (Restore de saves)
- [x] Monitoramento em Tempo Real (File Watcher funcional)

### ☁️ Infraestrutura Supabase (75%)
- [x] Schema do PostgreSQL
- [x] Autenticação Real (Google OAuth 2.0 Integration)
- [x] Sincronização de Metadados (Cloud DB via Supabase)
- [x] Gestão de Arquivos (Storage Upload/Download integrados)
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

---

## ⚠️ Dívida Técnica (Placeholders Atuais)
- [ ] Polish final nas animações de transição.
- [ ] Tratamento de erros de rede mais robusto.
- [ ] Validação real de paths de sistema protegidos.
