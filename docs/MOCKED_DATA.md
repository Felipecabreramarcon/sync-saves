# 🧪 Auditoria de Dados Mockados e Pendências

Este documento lista todos os elementos do projeto que atualmente utilizam dados fictícios (mocks) ou possuem implementações pendentes, fornecendo contexto e diretrizes para a finalização.

---

## 🖥️ Frontend (UI & Components)

### 1. Dashboard (`src/pages/Dashboard.tsx`)
- **O que está mockado**: Lista de `mockActivities`.
- **Contexto**: Exibe as últimas sincronizações. Atualmente hardcoded para Elden Ring, Cyberpunk, etc.
- **Dica de Implementação**: Deve consumir do `gamesStore.activities`, que será populado pelo comando `get_recent_logs` (Supabase/SQLite).

### 2. Games Grid (`src/pages/Games.tsx`)
- **O que está mockado**: Lista de `mockGames`.
- **Contexto**: Exclui os jogos se o store estiver vazio.
- **Dica de Implementação**: Já existe integração parcial com o backend. Remova o `mockGames` assim que o fluxo de "Adicionar Jogo" estiver persistindo corretamente no SQLite via Rust.

### 3. History Timeline (`src/pages/History.tsx`)
- **O que está mockado**: Objeto `mockHistory` agrupado por data.
- **Contexto**: Visualização detalhada de eventos passados.
- **Dica de Implementação**: Criar um helper no store para agrupar as atividades brutas por data antes de renderizar.

### 4. Settings (`src/pages/Settings.tsx`)
- **O que está mockado**: Lista de `mockDevices`.
- **Contexto**: Exibe dispositivos vinculados à conta.
- **Dica de Implementação**: Requer chamada ao Supabase (`from('devices')`). O dispositivo atual deve ser identificado pelo `machine_id` gerado no backend Rust.

### 5. Folder Picker (`src/components/features/AddGameModal.tsx`)
- **Pendente**: Botão de "Selecionar Pasta" não abre o diálogo nativo.
- **Contexto**: Usuário precisa navegar no Windows Explorer para achar o save.
- **Dica de Implementação**: Utilizar o plugin `@tauri-apps/plugin-dialog` para abrir o seletor de pastas nativo.

---

## 📦 State Management (Stores)

### 1. Auth Store (`src/stores/authStore.ts`)
- **Status**: Skeleton.
- **Pendente**: Integração Real com Supabase Auth.
- **Contexto**: Atualmente apenas guarda um objeto de usuário na memória/localStorage.
- **Dica**: Integrar o `supabase.auth.onAuthStateChange` para atualizar o store automaticamente e gerenciar tokens JWT.

### 2. Games Store (`src/stores/gamesStore.ts`)
- **Status**: Funcionalidade parcial.
- **Pendente**: Total de Saves e Dispositivos Ativos (Stats).
- **Contexto**: Os números no topo do Dashboard são estáticos ou baseados em cálculos locais simples.
- **Dica**: Criar comandos no Rust ou queries no Supabase para agregar esses valores (COUNT).

---

## 🦀 Backend (Rust/Tauri)

### 1. System Info (`src/lib/tauri.ts` - Bridge)
- **Status**: Mockado para ambiente Web.
- **Dica**: Quando rodando no Tauri, o comando `get_system_info` já retorna dados reais via crate `sysinfo`.

### 2. Sync Logic (`src-tauri/src/services/sync_service.rs`)
- **Status**: Não implementado.
- **O que falta**: Compressão ZIP, cálculo de SHA256 e upload/download para Supabase Storage.
- **Contexto**: Este é o "coração" do projeto.
- **Dica**: Comece pela crate `zip` para empacotamento e `sha2` para hashing.

### 3. File Watcher (`src-tauri/src/services/watcher.rs`)
- **Status**: Planejado.
- **Contexto**: Monitorar pastas de save para disparar sync automático.
- **Dica**: Usar a crate `notify` para monitoramento eficiente de eventos do sistema de arquivos.

---

## 🏁 Resumo de Prioridades

1. **Autenticação Real**: Substituir o mock do Login pelo fluxo Supabase/Google.
2. **Diálogo de Pasta**: Permitir que o usuário selecione caminhos reais.
3. **Persistência SQLite**: Garantir que jogos adicionados apareçam após reiniciar o app sem depender de mocks.
4. **Lógica de Hash**: Começar a calcular a "assinatura" dos arquivos de save.
