# 🚀 Status Real do Projeto (Sync Saves)

**Data da Auditoria:** 07/01/2026

---

## 🚦 Visão Geral

O projeto atingiu o status de **MVP Funcional**, mas com pontos de atenção na robustez arquitetural. As funcionalidades principais (Login, Adicionar Jogo, Monitoramento, Backup e Restore) estão operacionais e integradas à nuvem, mas devem ser revisados e reestruturados para evitar bugs e erros de continuedade no codigo, como alucinacoes de agentes e erros de sintaxe, as funcionalidades devem ser refinadas e funcionar de forma correta, com tratativas e validacoes que fazem sentido.

| Módulo | Status | Observação |
|:-------|:-------|:-----------|
| **Frontend** | ✅ Estável | UI moderna (HeroUI v3), Estado reativo (Zustand). |
| **Backend (Rust)** | ✅ Estável | Operações de arquivo, Watcher e SQLite funcionais. |
| **Nuvem (Supabase)** | ✅ Estável | Auth, DB e Storage integrados e seguros (RLS). |
| **Arquitetura Sync** | ⚠️ Atenção | Dependência do Frontend para execução (risco de interrupção). |
| **Offline First** | 🚧 Parcial | Cache local funciona, mas fila de sync (`sync_queue`) está inativa. |

---

## ⚠️ Dívida Técnica e Pontos de Atenção

### 1. Robustez da Sincronização (Risco Alto)
*   **Problema**: A orquestração do sync é feita no Frontend (`syncStore.ts`).
*   **Risco**: Se o usuário fechar o jogo e imediatamente fechar o app Sync Saves (antes do debounce de 5s), **o backup não será feito**.
*   **Ideal**: O Backend (Rust) deveria gerenciar a fila de upload e garantir o envio em background, independente da UI estar renderizada.

### 2. Parâmetros "Hardcoded" (Magic Numbers)
Existem intervalos fixos no código que podem afetar a experiência do usuário:
*   **Watcher Lag (10s)**: O sistema leva até 10 segundos para começar a monitorar um jogo recém-adicionado (`watcher.rs`).
*   **Sync Debounce (5s)**: O sistema espera 5 segundos de inatividade no arquivo antes de iniciar o upload.
*   **Cooldown (30s)**: Bloqueia novos syncs automáticos por 30 segundos após um sucesso.

### 3. Fila Desconectada (Sync Queue)
*   A tabela `sync_queue` existe no SQLite local, mas **não há lógica implementada** para popular ou processar essa fila.
*   Se a internet cair, o sync falha e não é retentado automaticamente quando a conexão voltar.

### 4. Deep Link em Desenvolvimento
*   O redirecionamento pós-login (`sync-saves://`) funciona em produção, mas falha no ambiente de desenvolvimento Windows (`npm run tauri:dev`) devido à ausência de registro no Windows Registry sem o instalador.

---

## ✅ Funcionalidades Entregues

### Core
- [x] **Autenticação Google**: Login via navegador e captura de sessão.
- [x] **Gestão de Dispositivos**: Registro automático de hardware e identificação única (UUID).
- [x] **File Watcher**: Monitoramento recursivo de pastas de save.
- [x] **Compressão**: ZIP de pastas inteiras antes do envio.

### Interface (UI/UX)
- [x] **Glassmorphism**: Design premium com HeroUI v3.
- [x] **Feedback Visual**: Toasts para sucesso/erro e timeline de atividades (Logs).
- [x] **Settings**: Configuração de auto-sync e notificações por jogo.
- [x] **Estabilização UI**: Correção de layout overflows em Cards, Timeline e Dashboard.
- [x] **Redesign Version History**: Header compacto e fixo, scroll interno e alinhamento cronológico.
- [x] **Compatibilidade HeroUI v3**: Implementação de `selectedKey`/`onSelectionChange` em componentes de seleção.
- [x] **Hotfix Timeline**: Correção de erro de compilação `statusColor` e duplicação de componente.
- [x] **Deleção Completa**: Remoção segura de jogos limpando cache, sync queue e metadados de análise.
- [x] **Recent Activity Refactor**: Implementação de Accordion com HeroUI e animações Framer Motion.
- [x] **Tooltip Refined**: Melhoria na mensagem de erro do tooltip para "Sync failed, click to view logs".
- [x] **Steam Search**: Integração com Steam Store API para busca de jogos com capas oficiais e preços.
- [x] **Auto-Discovery**: Preenchimento automático de metadados e busca de caminhos na PCGamingWiki ao selecionar um jogo na Steam.
- [x] **Add Game UI Overhaul**: Redesign completo do modal de adição com layout responsivo, breadcrumbs visuais e grid de caminhos.

### Dados
- [x] **Integridade**: Validação de arquivos via SHA-256 Hash.
- [x] **Segurança**: Dados isolados por usuário via RLS (PostgreSQL).

---

## 📅 Próximos Passos Recomendados

1.  **Mover Lógica de Sync para Rust**: Migrar a lógica de `sha256 -> zip -> upload` para o backend Rust para desacoplar da UI.
2.  **Ativar Sync Queue**: Implementar retry automático para falhas de rede.
3.  **Configuração Dinâmica**: Permitir que o usuário configure os tempos de debounce e cooldown nas configurações globais.
4.  **Refinamento de Performance**: Otimizar o carregamento de imagens grandes da Steam (caching local).
