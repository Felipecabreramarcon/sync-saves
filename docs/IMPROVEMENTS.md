# 📋 Melhorias e Recomendações - Sync Saves

**Data:** 04/01/2026  
**Versão da Documentação:** 1.2.0

---

## 🎯 Objetivo

Este documento lista melhorias sugeridas para o projeto Sync Saves, baseadas na análise completa da codebase e documentação existente.

---

## 🔴 Prioridade Alta

### 1. Migrar Lógica de Sync para Backend Rust

**Problema:** Atualmente, a orquestração do sync (coordenação entre compressão, upload e registro no banco) acontece no Frontend (TypeScript). Se o usuário fechar o app imediatamente após fechar um jogo, o backup pode não ser realizado.

**Impacto:** Alto - perda potencial de dados do usuário.

**Solução Proposta:**
- Mover toda a lógica de `performSync` para Rust
- Criar um sistema de fila persistente em background
- Frontend apenas monitora o progresso via eventos Tauri

**Benefícios:**
- Sync garantido mesmo com app minimizado ou fechado inesperadamente
- Melhor performance (processamento nativo)
- Redução de complexidade no Frontend

---

### 2. Implementar Arquitetura Event-Driven no File Watcher

**Problema:** O watcher atualmente faz polling do SQLite a cada 10 segundos para verificar novos jogos.

**Impacto:** 
- Delay de até 10s para começar a monitorar jogos recém-adicionados
- Uso desnecessário de CPU/Disco

**Solução Proposta:**
- Usar Tauri Events ou Rust Channels para notificar o watcher imediatamente
- Implementar comando `notify_watcher_game_added(game_id)` no Rust
- Frontend chama esse comando após adicionar jogo ao banco

**Benefícios:**
- Monitoramento instantâneo de novos jogos
- Menor uso de recursos
- Arquitetura mais limpa e reativa

---

### 3. Ativar ou Remover `sync_queue`

**Problema:** A tabela `sync_queue` existe no SQLite mas não é utilizada.

**Impacto:** Código morto que gera confusão e aumenta complexidade.

**Solução Proposta:**

**Opção A - Implementar (Recomendado):**
- Adicionar operações de sync pendentes à fila quando offline
- Processar fila automaticamente ao reconectar
- Implementar retry automático para falhas de rede

**Opção B - Remover:**
- Deletar tabela e código relacionado
- Simplificar arquitetura

**Benefícios (Opção A):**
- Suporte robusto a offline
- Garantia de sync eventual
- Melhor experiência do usuário

---

## 🟡 Prioridade Média

### 4. Parâmetros Configuráveis

**Problema:** Valores hardcoded no código:
- Watcher check interval: 10s
- Sync debounce: 5s  
- Sync cooldown: 30s

**Impacto:** Usuários avançados não podem otimizar para seu uso específico.

**Solução Proposta:**
- Adicionar seção "Advanced Settings" na UI
- Permitir configuração via `app_settings` no SQLite
- Validar valores mínimos/máximos para evitar problemas

**Benefícios:**
- Flexibilidade para diferentes casos de uso
- Usuários podem ajustar trade-off entre reatividade e recursos

---

### 5. Resolução Visual de Conflitos

**Problema:** Lógica atual é "Last Write Wins". Conflitos entre dispositivos offline são resolvidos silenciosamente.

**Impacto:** Usuário pode perder progresso sem perceber.

**Solução Proposta:**
- Detectar conflitos ao comparar timestamps e checksums
- Exibir modal permitindo escolha manual:
  - Manter versão local
  - Baixar versão remota
  - Ver diff (se possível)
- Salvar ambas versões por segurança

**Benefícios:**
- Usuário tem controle total
- Transparência sobre estado do sync
- Menor risco de perda de dados

---

### 6. Versioning com ACID Garantido

**Problema:** Lógica de versionamento no Frontend pode ter race conditions.

**Impacto:** Risco de corrupção de metadados em cenários de alta concorrência.

**Solução Proposta:**
- Criar Postgres Functions (RPC) para operações críticas:
  - `create_new_version(game_id, checksum, ...)`
  - `set_latest_version(version_id)`
- Garantir atomicidade com transactions

**Benefícios:**
- Garantias transacionais do PostgreSQL
- Redução de bugs relacionados a concorrência
- Código mais simples e confiável

---

## 🟢 Prioridade Baixa / Futuras

### 7. Histórico Visual de Versões

**Status:** Parcialmente implementado (Timeline de logs existe)

**Melhoria:**
- UI dedicada para navegar histórico de versões
- Comparação lado-a-lado de análises
- Restauração de versões antigas com um clique

---

### 8. Criptografia End-to-End

**Motivo:** Saves podem conter dados sensíveis

**Proposta:**
- Criptografar ZIPs antes de upload usando chave do usuário
- Armazenar chave derivada de senha local
- Documentar trade-off: perda de senha = perda de acesso

---

### 9. Detecção Automática de Jogos

**Proposta:**
- Escanear caminhos comuns (Steam, Epic, etc)
- Integrar com [PCGamingWiki API](https://www.pcgamingwiki.com/wiki/API) (já parcialmente implementado)
- Sugerir jogos encontrados para adicionar

---

### 10. Suporte a Múltiplos Perfis

**Caso de Uso:** Jogos com slots de save separados

**Proposta:**
- Permitir configurar "profiles" por jogo
- Cada profile tem seu próprio sync independente
- Útil para jogos compartilhados em família

---

## 📊 Resumo por Área

| Área | Melhorias | Prioridade |
|------|-----------|------------|
| **Arquitetura** | Sync em Rust, Event-driven watcher | 🔴 Alta |
| **Robustez** | Sync queue ativa, Resolução de conflitos | 🔴 Alta / 🟡 Média |
| **UX** | Parâmetros configuráveis, Histórico visual | 🟡 Média / 🟢 Baixa |
| **Segurança** | Criptografia E2E | 🟢 Baixa |
| **Features** | Auto-detecção, Múltiplos perfis | 🟢 Baixa |

---

## 🚀 Roadmap Sugerido

### Fase 1 - Estabilização (1-2 semanas)
1. ✅ Corrigir documentação (concluído)
2. Implementar sync queue ativa
3. Migrar sync para Rust backend

### Fase 2 - Otimização (1 semana)
4. Event-driven watcher
5. Parâmetros configuráveis
6. Testes de integração

### Fase 3 - UX Avançado (2-3 semanas)
7. UI de resolução de conflitos
8. Histórico visual de versões
9. Melhorias no dashboard

### Fase 4 - Features Futuras (indefinido)
10. Criptografia E2E
11. Auto-detecção de jogos
12. Múltiplos perfis

---

## 💡 Observações Finais

1. **Qualidade do Código Atual:** O projeto está bem estruturado e organizado. As melhorias sugeridas são sobre **robustez** e **experiência do usuário**, não sobre qualidade básica do código.

2. **Priorização:** Focar primeiro em melhorias de **Prioridade Alta** que impactam diretamente a confiabilidade do sync antes de adicionar features novas.

3. **Manutenibilidade:** Remover código morto (`sync_queue` não utilizado) ajuda a manter a codebase limpa e reduz confusão para novos desenvolvedores.

4. **Documentação:** A documentação agora está atualizada e reflete o estado real da implementação (versão 1.2.0).
