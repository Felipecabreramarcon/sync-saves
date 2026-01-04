# 📋 Especificação de Requisitos do Sistema (SRS) - Sync Saves

**Versão:** 1.1.0
**Data:** 03/01/2026

---

## 1. Visão Geral do Sistema

O **Sync Saves** é uma aplicação desktop multiplataforma (Windows, Linux, macOS) projetada para sincronizar automaticamente arquivos de save de jogos entre múltiplos dispositivos através da nuvem. O sistema utiliza uma arquitetura híbrida com um backend local robusto em Rust (Tauri) para operações de sistema e um frontend moderno em React para interface, conectado a uma infraestrutura Serverless (Supabase) para autenticação, banco de dados e armazenamento.

### 1.1 Objetivo
Resolver o problema de fragmentação de progresso em jogos piratas e jogos que não possuem suporte nativo à nuvem (ou suporte limitado), permitindo que jogadores transitem entre dispositivos (ex: DesktopGaming e Handheld/Laptop) sem perda de dados.

---

## 2. Tecnologias e Stack

### 2.1 Backend Local (Desktop)
- **Framework**: [Tauri v2.0](https://tauri.app/) (Rust)
- **Linguagem**: Rust 1.70+
- **Bibliotecas Principais (Crates)**:
    - `rusqlite`: Persistência local (SQLite).
    - `notify`: Monitoramento de sistema de arquivos em tempo real.
    - `zip`: Compressão e descompressão de arquivos.
    - `sha2`: Cálculo de hash SHA-256 para integridade.
    - `tokio`: Runtime assíncrono.
    - `reqwest`: Cliente HTTP para requisições externas (PCGamingWiki).
    - `serde`: Serialização/Deserialização de dados.
    - `tauri-plugin-deep-link`: Gerenciamento de protocolo customizado (`sync-saves://`).
    - `tauri-plugin-autostart`: Inicialização com o sistema.

### 2.2 Frontend (Interface)
- **Framework**: [React 19](https://react.dev/)
- **Linguagem**: TypeScript 5.x
- **Build Tool**: Vite
- **Estilização**:
    - [Tailwind CSS v4](https://tailwindcss.com/)
    - [HeroUI v3](https://heroui.com/) (Component Library)
    - **Design System**: Glassmorphism, Dark Mode, Micro-animations.
- **Gerenciamento de Estado**:
    - `zustand`: Store global com middleware de persistência (`persist`).
- **Roteamento**: React Router v7
- **Utilitários**:
    - `framer-motion`: Animações de interface.
    - `lucide-react`: Ícones vetoriais.

### 2.3 Infraestrutura de Nuvem (Serverless)
- **Provedor**: [Supabase](https://supabase.com/)
- **Banco de Dados**: PostgreSQL 15+
- **Autenticação**: Supabase Auth (Google OAuth 2.0 Provider).
- **Armazenamento**: Supabase Storage (S3-compatible Object Storage).
- **Segurança**: Row Level Security (RLS) policies.

---

## 3. Arquitetura do Sistema

### 3.1 Backend Local (Rust)
- **Responsabilidades**:
  - Interação direta com o Sistema de Arquivos (File System).
  - Monitoramento de alterações em arquivos (File Watcher).
  - Compressão e descompressão de arquivos (ZIP).
  - Cálculo de integridade (SHA-256 Hashing).
  - Persistência e cache local (SQLite).
  - Execução de comandos do sistema (Deep Links, Autostart).
- **Banco de Dados Local**: SQLite (`games_cache`, `device_config`, `sync_queue`).

### 3.2 Frontend (React)
- **Responsabilidades**:
  - Orquestração da lógica de sincronização (Coordena Backend Local <-> Nunvem).
  - Interface com usuário (Configuração, Logs, Dashboards).
  - Feedback visual (Notificações, Toasts, Progress Bars).

---

## 4. Requisitos Funcionais

### 4.1 Autenticação e Gestão de Sessão
- **RF001 - Login Social**: O sistema deve permitir autenticação via Google OAuth.
- **RF002 - Persistência de Sessão**: O token de sessão deve ser persistido localmente para manter o usuário logado entre reinicializações.
- **RF003 - Logout**: O sistema deve permitir o encerramento da sessão, limpando dados sensíveis da memória.
- **RF004 - Deep Linking**: O sistema deve capturar o retorno da autenticação via protocolo customizado (`sync-saves://`) para finalizar o login no app desktop.

### 4.2 Gerenciamento de Dispositivos
- **RF005 - Identificação Única**: Cada instalação deve gerar e persistir um ID de dispositivo único (UUID v4).
- **RF006 - Registro Automático**: Ao logar, o dispositivo atual deve se registrar automaticamente na nuvem se ainda não existir.
- **RF007 - Listagem de Dispositivos**: O usuário deve poder visualizar todos os dispositivos vinculados à sua conta.
- **RF008 - Remoção de Dispositivos**: O usuário deve poder revogar acesso de dispositivos antigos (exceto o atual).

### 4.3 Gerenciamento de Jogos
- **RF009 - Adicionar Jogo**: O usuário deve poder adicionar um jogo especificando:
  - Nome do Jogo.
  - Caminho local da pasta de saves (via Seleção Nativa de Diretório).
- **RF010 - Sugestão de Caminhos (PCGamingWiki)**: O sistema deve consultar a API do PCGamingWiki para sugerir caminhos de instalação padrão para o jogo digitado.
- **RF011 - Edição de Jogo**: O usuário deve poder alterar o caminho local de um jogo já cadastrado.
- **RF012 - Remoção de Jogo**: O usuário deve poder remover um jogo do monitoramento, optando por excluir ou manter os dados na nuvem.
- **RF013 - Configuração Individual**: Cada jogo deve ter configurações sobrescrevíveis de:
  - Habilitar/Desabilitar Sync Automático.
  - Ignorar arquivos específicos (futuro).

### 4.4 Sincronização (Core)
- **RF014 - Monitoramento em Tempo Real**: O sistema deve monitorar as pastas configuradas e detectar eventos de criação ou modificação de arquivos.
- **RF015 - Debounce de Eventos**: O sistema deve aguardar um período de inatividade (ex: 5s) após uma detecção de mudança antes de iniciar o sync, para evitar uploads parciais.
- **RF016 - Upload (Backup)**:
  1. Comprimir a pasta alvo em formato `.zip`.
  2. Gerar hash SHA-256 do arquivo comprimido.
  3. Enviar para o Supabase Storage.
  4. Registrar metadados da versão no PostgreSQL.
- **RF017 - Download (Restore)**:
  1. Baixar a versão mais recente (ou selecionada) da nuvem.
  2. Backup de segurança da pasta local atual.
  3. Descomprimir e substituir os arquivos locais.
- **RF018 - Detecção de Alterações**: O sistema não deve fazer upload se o hash local for idêntico à última versão sincronizada.
- **RF019 - Feedback de Progresso**: O sistema deve exibir o estado atual (Compressing, Uploading, Synced, Error) na UI.

### 4.5 Logs e Histórico
- **RF020 - Timeline de Atividades**: O sistema deve exibir um histórico cronológico de todas as operações de sync (Uploads e Downloads) de todos os dispositivos.
- **RF021 - Detalhes do Log**: Cada registro deve conter: Jogo, Dispositivo, Ação, Status, Tamanho, Duração e Timestamp.

### 4.6 Configurações do Sistema
- **RF022 - Notificações Desktop**: O usuário deve poder habilitar/desabilitar notificações nativas do SO para eventos de sync.
- **RF023 - Iniciar com o Sistema**: O usuário deve poder configurar o app para iniciar minimizado junto com o SO.
- **RF024 - Responsividade e Layout**:
  - Todos os textos gerados pelo usuário (caminhos, nomes de jogos, mensagens de erro) devem ser truncados ou quebrados (`word-wrap`) para nunca estourar o container visual.
  - O layout deve se adaptar a redimensionamentos da janela sem sobreposição de elementos (MinWidth ~800px).

---

## 5. Requisitos Não-Funcionais

- **RNF001 - Integridade**: O sistema deve garantir que arquivos corrompidos não sobrescrevam backups válidos (validação via hash).
- **RNF002 - Desempenho**: A compressão e hash não devem bloquear a thread principal da UI (execução em Rust assíncrono).
- **RNF003 - Segurança**: Arquivos de save devem ser acessíveis apenas pelo proprietário (RLS no Banco e Storage).
- **RNF004 - Offline-First**: O app deve ser funcional para visualização e edição de configurações mesmo sem internet (dados cacheados no SQLite).
- **RNF005 - Escalabilidade**: O armazenamento deve suportar arquivos de save de tamanho arbitrário (limitado apenas pela cota do usuário/plano).

---

## 6. Fluxos de Processo Detalhados

### 6.1 Fluxo de Autossincronização (Upload)
1. **Gatilho**: O `watcher.rs` (Rust) detecta alteração em `C:/Games/SaveDir`.
2. **Notificação**: Rust emite evento `sync-required` com o ID do jogo para o Frontend.
3. **Frontend**:
    - Ouve o evento em `App.tsx`.
    - Verifica cooldown (evita spam).
    - Invoca comando Rust `sync_game` -> Retorna Base64 do ZIP + Hash.
    - Converte Base64 para Blob.
    - Faz Upload para Supabase Storage.
    - Insere registro em `save_versions` e `sync_logs` no Supabase.
    - Notifica o usuário (Toast + Notificação Desktop se habilitada).

### 6.2 Fluxo de Restauração (Download)
1. **Gatilho**: Usuário clica em "Restore" na UI.
2. **Frontend**:
    - Identifica a versão `is_latest` no Supabase.
    - Baixa o arquivo `.zip` do Storage.
    - Converte para string Base64.
    - Invoca comando Rust `restore_game` com o payload.
3. **Backend (Rust)**:
    - Cria backup da pasta atual (ex: `SaveDir_bkp_TIMESTAMP`).
    - Limpa pasta atual.
    - Extrai o conteúdo do ZIP.
    - Retorna sucesso/erro.
4. **Finalização**: Frontend registra log de "Download" no Supabase e atualiza UI.

---

## 7. Limitações e Dívida Técnica (Current State)

1. **Dependência do Frontend**: O processo de upload depende da janela do app estar aberta (mesmo que minimizada). Se o app for encerrado imediatamente após fechar o jogo, o upload pode não iniciar.
2. **Conflitos**: A lógica atual é "Last Write Wins". Se dois dispositivos jogarem offline e depois conectarem, o último a sincronizar sobrescreverá o estado "latest".
3. **Sync Queue Incompleto**: A tabela `sync_queue` existe mas a lógica de processamento offline/retry automático ainda não está ativa.
4. **Parâmetros Fixos (Magic Numbers)**:
    - Intervalo de verificação de novos jogos no Watcher: **10s** (Rust).
    - Sync Debounce: **5s** (Frontend).
    - Sync Cooldown: **30s** (Frontend).