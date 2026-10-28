# RioCred — Documentação de Funcionalidades

> **Sobre este repositório:** o diretório `riocred.online` contém o **build web estático** publicado do aplicativo **RioCred** (Expo / React Native Web). O código-fonte original não está neste workspace; esta documentação foi elaborada a partir da análise do bundle compilado, metadados e estrutura do deploy.

---

## Índice

1. [Visão geral](#visão-geral)
2. [Stack tecnológica](#stack-tecnológica)
3. [Perfis de usuário](#perfis-de-usuário)
4. [Navegação do aplicativo](#navegação-do-aplicativo)
5. [Autenticação e conta](#autenticação-e-conta)
6. [Dashboard (Início)](#dashboard-início)
7. [Clientes](#clientes)
8. [Empréstimos](#empréstimos)
9. [Agenda (calendário)](#agenda-calendário)
10. [Score de clientes](#score-de-clientes)
11. [Simulador de empréstimos](#simulador-de-empréstimos)
12. [Relatórios operacionais](#relatórios-operacionais)
13. [Contas a pagar](#contas-a-pagar)
14. [Configurações](#configurações)
15. [Sincronização offline](#sincronização-offline)
16. [Funcionalidades administrativas](#funcionalidades-administrativas)
17. [Notificações (push e WhatsApp)](#notificações-push-e-whatsapp)
18. [Modelo de dados (backend)](#modelo-de-dados-backend)
19. [Limitações da versão web](#limitações-da-versão-web)

---

## Visão geral

O **RioCred** é um sistema de gestão de crédito comunitário voltado a operações de empréstimo em campo. Ele permite:

- Cadastrar e acompanhar **clientes** com documentos, foto e endereço
- Criar e gerenciar **contratos de empréstimo** com parcelas flexíveis
- Registrar **pagamentos**, juros, descontos e reagendamentos
- Visualizar **agenda de vencimentos** e **indicadores** da carteira
- Calcular **score comportamental** dos clientes
- Operar **offline** com sincronização automática quando a internet voltar
- Administrar **rotas**, **managers** e **notificações globais** (perfil admin)

O produto é multiplataforma (Expo), e esta instância roda como **PWA/web** em `riocred.online`.

---

## Stack tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | React Native + **Expo** (compilado para web via Metro) |
| Navegação | React Navigation (abas inferiores + stack) |
| Estado servidor | **TanStack React Query** (cache, refetch, invalidação) |
| Backend | **Supabase** (Auth, Postgres, Realtime, Storage, Edge Functions) |
| Offline | SQLite local (`offline_records`, fila de sync) |
| PDF | jsPDF + autoTable |
| Integrações | Evolution API (WhatsApp), ViaCEP, Expo Push Notifications |

---

## Perfis de usuário

O sistema trabalha com papéis distintos:

| Papel | Descrição |
|-------|-----------|
| **admin** | Acesso total: aprova managers, gerencia rotas globais, configura notificações da operação e vê contagem de usuários no dashboard |
| **manager** | Operador de campo: clientes, empréstimos, agenda, relatórios etc. Precisa ser **aprovado** pelo admin e ter **rotas atribuídas** |
| *(outros)* | Cadastro via signup; o papel efetivo é definido no perfil Supabase |

Managers não aprovados ficam bloqueados até o admin liberar acesso e associar rotas de trabalho.

---

## Navegação do aplicativo

### Abas principais (bottom tabs)

| Aba | Tela | Função |
|-----|------|--------|
| **Início** | `DashboardScreen` | Painel com métricas e resumo da carteira |
| **Clientes** | `CustomersScreen` | CRUD de clientes |
| **Empréstimos** | `LoansScreen` | Contratos, parcelas e pagamentos |
| **Agenda** | `LoansCalendarScreen` | Calendário de vencimentos |
| **Mais** | `MoreScreen` | Atalhos para ferramentas complementares |

### Telas secundárias (stack)

Acessadas pelo menu **Mais** ou por navegação interna:

| Rota | Título | Descrição |
|------|--------|-----------|
| `CustomerScores` | Score de Clientes | Ranking comportamental |
| `LoansReport` | Relatórios | Resumo operacional + exportação PDF |
| `LoanSimulator` | Simulador | Cenários antes de criar contrato |
| `Payables` | Contas a pagar | Despesas pessoais/empresa |
| `Settings` | Configurações | Perfil, empresa, WhatsApp, templates |
| `SyncStatus` | Sincronização | Status offline e fila pendente |
| `AdminApprovals` | Aprovações | *(admin)* Managers e rotas |
| `AdminNotifications` | Notificações | *(admin)* Push e WhatsApp global |
| `Routes` | Rotas | *(admin)* Catálogo central de rotas |

---

## Autenticação e conta

### Tela de login / cadastro (`AuthScreen`)

- **Entrar:** e-mail + senha
- **Criar conta:** nome completo, e-mail e senha
- **Recuperar senha:** fluxo “Esqueceu a senha?”
- Alternância entre modos signin/signup na mesma tela
- Autenticação via **Supabase Auth** (sessão persistida)

### Sessão

- Após login, o app carrega perfil (`profiles`) e configurações (`user_settings`)
- Bootstrap do **snapshot offline** na primeira conexão
- Logout disponível no Dashboard e no menu Mais

---

## Dashboard (Início)

O painel inicial exibe indicadores consolidados da carteira do usuário logado:

### Métricas principais

| Indicador | Significado |
|-----------|-------------|
| Total de clientes | Quantidade de clientes cadastrados |
| Empréstimos ativos | Contratos em andamento |
| Parcelas pagas | Parcelas com status `paid` |
| Parcelas em aberto | Parcelas ainda não quitadas |
| Parcelas vencidas | Parcelas com status `overdue` |
| Valor da carteira | Soma dos valores principais dos empréstimos |
| Total a receber | Soma de `total_receivable` |
| Total recebido | Soma dos pagamentos registrados |
| Saldo em aberto | Parcelas pending/partial/overdue (valor residual) |
| Total de usuários | *(somente admin)* contagem de perfis |

### Visualização

- Gráfico de barras com parcelas **Em aberto**, **Pagas** e **Vencidas**
- Cartão de boas-vindas com identidade RioCred
- Acesso rápido à conta e opção de sair

---

## Clientes

### Listagem (`CustomersScreen`)

- Lista todos os clientes do usuário, ordenados por data de criação
- Busca por nome, telefone e outros campos
- Indicadores de sincronização offline (pendentes/erros)
- Exibe **score** e faixa de risco na listagem (integração com `customer-scores`)
- Ações: criar, editar e visualizar detalhes

### Cadastro em etapas (`CustomerFormModal`)

Formulário wizard com 3 passos:

#### 1. Dados pessoais
- Foto do cliente (galeria ou câmera no app nativo)
- Nome completo *(obrigatório)*
- CPF (máscara automática)
- Telefone / WhatsApp
- Tipo de cliente
- Tipo de cobrança: **Empréstimo**, **Mensalidade** ou **Ambos**
- Indicação (referência): nome e telefone do indicador
- Rota associada (lista de rotas disponíveis)
- Status ativo/inativo

#### 2. Endereço
- CEP com **busca automática via ViaCEP** (preenche rua, bairro, cidade, UF)
- Rua, número, complemento, bairro, cidade, estado
- Ponto de referência

#### 3. Documentos
- Upload de documentos com tipos: **RG**, **CPF**, **Comprovante**, **Contrato**, **Outro**
- Documentos e foto são enviados ao **Supabase Storage** após salvar
- Suporte a rascunhos locais para sincronização posterior

### Armazenamento

- Tabela `customers`
- Tabela `customer_documents` (metadados + storage path)
- Foto em storage com `photo_storage_path` e `photo_updated_at`

---

## Empréstimos

### Listagem e gestão (`LoansScreen`)

- Lista contratos com resumo financeiro por empréstimo
- Filtros e busca por cliente
- Status derivado: **Em dia**, **Próximo do vencimento**, **Em atraso**, **Quitado**
- Criar, editar e acompanhar contratos
- Registrar pagamentos e ver histórico
- Integração com WhatsApp após criação do contrato (`LoanCreatedModal`)
- Indicadores de sync offline

### Criação / edição (`LoanFormModal`)

Parâmetros do contrato:

| Campo | Opções / detalhes |
|-------|-------------------|
| Cliente | Seleção na base de clientes |
| Valor do empréstimo | Decimal em R$ |
| Taxa de juros (%) | Percentual |
| Aplicação dos juros | **Por Parcela** ou **No Contrato** |
| Frequência | Parcelado (Mensal), Quinzenal, Semanal, Parcela Diária |
| Nº de parcelas | 1 a 36 |
| Data de início | Data do contrato |
| Primeiro vencimento | Base para cálculo das demais parcelas |
| Pular sábado / domingo | Ajuste de datas de vencimento |
| Juros adicional por atraso | Opcional, com modos abaixo |

#### Modos de juros por atraso

| Modo | Cálculo |
|------|---------|
| % da parcela por dia | Percentual sobre o valor da parcela, por dia |
| % do valor total / 30 dias | Percentual sobre o total do contrato, rateado por dia |
| Valor fixo (R$) | Valor diário fixo em reais |

O motor `simulateLoan` calcula em tempo real:
- Valor total de juros
- Valor da parcela
- Total a receber
- Taxa efetiva
- Cronograma completo de parcelas com datas

### Parcelas (`loan_installments`)

Status possíveis:
- `pending` — em aberto
- `partial` — pagamento parcial
- `paid` — quitada
- `overdue` — vencida

Campos: `scheduled_amount`, `paid_amount`, `due_date`, `installment_number`

### Pagamentos (`LoanPaymentModal`)

Fluxo em **2 etapas**:

#### Etapa 1 — Registrar pagamento
- Tipo: parcela, quitação total ou **somente juros**
- Valor, desconto, método de pagamento (padrão **PIX**)
- Data do pagamento
- Observações
- Decomposição: saldo base, juros contratuais, juros por atraso

#### Etapa 2 — Reagendar vencimentos
- Após pagamento de somente juros, ajusta parcela atual e futuras não quitadas
- Nova data de vencimento sugerida automaticamente

Pagamentos gravados em `loan_payments` com:
- `amount`, `interest_amount`, `principal_amount`, `discount_amount`
- `payment_method`, `notes`, `paid_at`

### Resumo financeiro (`buildLoanSummary`)

Para cada contrato o sistema calcula:
- Saldo restante (principal e total)
- Juros realizados vs. esperados
- Próxima parcela em aberto
- Valor sugerido para cobrança (incluindo juros de mora)

### WhatsApp pós-contrato

Após criar empréstimo, modal permite enviar mensagem ao cliente com:
- Resumo **completo** ou **resumido** do contrato
- Link direto para WhatsApp do telefone cadastrado

---

## Agenda (calendário)

### `LoansCalendarScreen`

- Calendário mensal com parcelas agrupadas por data de vencimento
- Navegação entre meses
- Seleção de dia para ver detalhes das parcelas daquela data
- Cores/indicadores por status (aberto, vencido, pago)
- Layout responsivo (coluna única em telas estreitas)
- Dados de `loans` + `loan_installments`

---

## Score de clientes

### `CustomerScoresScreen`

Ranking comportamental calculado localmente a partir do histórico de cada cliente.

### Faixas de score

| Faixa | Pontuação |
|-------|-----------|
| **Excelente** | ≥ 85 |
| **Bom** | 70 – 84 |
| **Atenção** | 55 – 69 |
| **Alto Risco** | < 55 |

### Composição do score (0–100)

| Fator | Peso | Lógica |
|-------|------|--------|
| Pagamentos em dia | 40% | % de parcelas pagas até o vencimento |
| Atrasos | 25% | Penalidade por parcelas vencidas e dias em atraso |
| Recuperação | 15% | % do total contratado já recebido |
| Relacionamento | 10% | Tempo de cadastro (meses) + contratos quitados |
| Exposição | 10% | Penalidade por saldo em aberto vs. total contratado |

### Métricas exibidas por cliente

- Contratos totais e quitados
- Parcelas pagas, vencidas e pendentes
- Saldo em aberto, dias máximos de atraso
- Tipo de cliente e telefone
- Busca e filtros por faixa

---

## Simulador de empréstimos

### `LoanSimulatorScreen`

Ferramenta de **what-if** antes de formalizar contrato:

- Mesmos parâmetros do formulário de empréstimo
- Simulação em tempo real com `simulateLoan`
- Visualização do cronograma de parcelas
- Seletores de data (início e primeiro vencimento)
- Opção de converter simulação em contrato real
- Não persiste dados até o usuário confirmar criação

---

## Relatórios operacionais

### `LoansReportScreen`

Relatório retrospectivo por **vencimentos e recebimentos reais**.

#### Filtros

| Filtro | Opções |
|--------|--------|
| Período | 7, 30, 90 dias ou personalizado |
| Rota | Todas ou rota específica |
| Status | Todos, em dia, em atraso, quitado etc. |

#### Resumo (summary)

- Total de contratos no período
- Quantidade e valor de vencimentos
- Valor recebido
- Saldo em aberto
- Parcelas atrasadas

#### Detalhamento (rows)

Por contrato/cliente:
- Nome, rota, status
- Valor recebido no período
- Saldo restante
- Próximo vencimento

#### Exportação PDF

- Geração via **jsPDF** com tabelas formatadas
- Cabeçalho com período e data/hora de geração
- Download automático (`relatorio-emprestimos-{periodo}.pdf`)

---

## Contas a pagar

### `PayablesScreen`

Controle de compromissos financeiros (pessoais ou da empresa):

- Listagem ordenada por data de vencimento
- Criar, editar e excluir contas
- Campos: nome, valor, data de vencimento, categoria, observações, status
- Tabela backend: `payable_accounts`
- Requer conexão online para gravação

---

## Configurações

### `SettingsScreen`

Configurações do perfil operacional (`user_settings` + `profiles`):

| Campo | Uso |
|-------|-----|
| Nome completo | Identificação do operador |
| WhatsApp | Número para cobranças |
| Nome da empresa | Aparece em mensagens/documentos |
| Chave PIX | Para instruções de pagamento |
| WhatsApp habilitado | Liga/desliga envio automático |
| Template cobrança padrão | Mensagem para parcelas normais |
| Template vence hoje | Mensagem para vencimento no dia |
| Template em atraso | Mensagem para parcelas vencidas |

- Leitura offline a partir do snapshot local
- Gravação exige conexão (`assertOnline`)
- RPC `update_current_profile_full_name` para nome

---

## Sincronização offline

Arquitetura **offline-first** para operação em campo sem internet estável.

### Princípios

1. O app **abre pelo banco local** (snapshot SQLite)
2. Leituras usam dados locais via `listEntityData`
3. Escritas críticas exigem online ou entram na **fila de sync**
4. Ao reconectar, sincronização automática envia pendências

### Banco local (SQLite)

Tabelas principais:
- `offline_user_state` — estado do usuário, última sync, erros
- `offline_records` — entidades espelhadas em JSON
- Fila de sincronização com `entity_type`, `sync_status`, `sync_error`

### Entidades sincronizadas

- `customers`, `customer_documents`
- `loans`, `loan_installments`, `loan_payments`
- `routes`, `profiles`, `manager_route_access`
- `payable_accounts`, `user_settings`

### `SyncStatusScreen`

- Badge Online/Offline
- Contagem de pendências e erros
- Data/hora da última sincronização
- Botão **Sincronizar agora**
- Lista da fila com preview (cliente/empréstimo pendente)
- Navegação direta para a aba relacionada

### Realtime (`RealtimeProvider`)

Canal Supabase `riocred-realtime-{userId}` escuta mudanças em:
- `customers`, `customer_documents`
- `routes`, `manager_route_access`
- `loans`, `loan_installments`, `loan_payments`

Ao receber evento, invalida queries React Query e dispara `syncAfterRealtime`.

### Idempotência

- `client_request_id` em customers e loans evita duplicatas no upsert
- IDs locais provisórios: `local:{entity}:{uuid}`

---

## Funcionalidades administrativas

> Disponíveis apenas para usuários com `role === "admin"`.

### Aprovações de managers (`AdminManagersScreen`)

- Lista todos os perfis com papel `manager`
- Separa **aprovados** e **pendentes**
- Para cada manager:
  - Aprovar ou revogar acesso (`is_approved`)
  - Atribuir **rotas de trabalho** (multi-seleção)
- RPC Supabase: `set_manager_access(p_manager_id, p_is_approved, p_route_ids)`
- Após salvar: sync completo do snapshot local

### Rotas (`RoutesScreen`)

Catálogo central de rotas geográficas/operacionais:

- Criar, editar e excluir rotas
- Nome e metadados da rota
- Rotas vinculam clientes e definem escopo dos managers
- Tabela: `routes`
- Relacionamento: `manager_route_access`

### Notificações globais (`AdminNotificationsScreen`)

Configuração da operação como um todo (ver seção seguinte).

---

## Notificações (push e WhatsApp)

### Push notifications (app nativo)

- Registro de dispositivo em `push_devices`
- Token Expo Push por aparelho
- Admin pode enviar **push de teste** com diagnóstico completo:
  - Status do registro
  - Ticket e receipt do Expo
  - Preview do token
- **Não funciona no navegador web** — mensagem explícita: push remoto nativo indisponível no browser
- No Expo Go, push real requer development build

### WhatsApp — operador (`SettingsScreen`)

- Templates personalizáveis por manager
- Envio manual via link `wa.me` com mensagem montada
- Integração com número e chave PIX do operador

### WhatsApp — global (admin + Evolution API)

Configurações em `AdminNotificationsScreen`:

| Template | Gatilho |
|----------|---------|
| Empréstimo criado | Novo contrato |
| Vence em breve | Parcela próxima do vencimento |
| Vence hoje | Parcela com vencimento no dia |
| Em atraso | Parcela vencida |

Credenciais Evolution (armazenadas com segurança no backend):
- `evolutionBaseUrl`
- `evolutionApiKey`
- `evolutionInstanceName` (padrão: `riocred-global`)

Funções admin protegidas com tratamento de erros específicos:
- `AdminFunctionAuthError`
- `AdminFunctionPermissionError`
- `AdminFunctionNetworkError`
- `AdminFunctionHttpError`

---

## Modelo de dados (backend)

### Tabelas Supabase (Postgres)

| Tabela | Finalidade |
|--------|------------|
| `profiles` | Usuários: nome, e-mail, `role`, `is_approved` |
| `user_settings` | Configurações operacionais e templates WhatsApp |
| `routes` | Rotas de trabalho |
| `manager_route_access` | Vínculo manager ↔ rota |
| `customers` | Cadastro de clientes |
| `customer_documents` | Metadados de documentos |
| `loans` | Contratos de empréstimo |
| `loan_installments` | Parcelas |
| `loan_payments` | Pagamentos/baixas |
| `payable_accounts` | Contas a pagar |
| `push_devices` | Dispositivos para notificação push |

### RPCs e funções

| Nome | Uso |
|------|-----|
| `set_manager_access` | Aprovar manager e atribuir rotas |
| `update_current_profile_full_name` | Atualizar nome do perfil logado |
| Funções admin de notificação | Salvar settings, secrets Evolution, test push |

### Storage

- Fotos de clientes
- Documentos anexados (RG, CPF, comprovantes etc.)

---

## Limitações da versão web

Esta instância em `riocred.online` é o build **web** do Expo. Algumas capacidades do app mobile têm restrições:

| Recurso | Web | App nativo |
|---------|-----|------------|
| Push notifications | Indisponível | Suportado (development build) |
| Câmera / galeria | Limitado pelo browser | Acesso completo |
| SQLite offline | Implementação web simplificada | SQLite nativo completo |
| Compartilhamento | Web Share API quando disponível | Share nativo |

Para uso offline robusto e push, recomenda-se o **app instalado** (Android/iOS) via Expo.

---

## Estrutura de arquivos deste deploy

```
riocred.online/
├── index.html              # Página principal (SPA)
├── metadata.json           # Metadados do bundle Expo
├── favicon.ico
├── .user.ini               # Config PHP do servidor
└── _expo/
    └── static/
        ├── css/            # Estilos compilados
        └── js/web/         # Bundle JavaScript (Metro)
            ├── index-*.js  # App principal
            ├── jspdf.*.js  # Geração de PDF
            ├── html2canvas.*.js
            └── ...
```

---

## Resumo executivo

O **RioCred** é uma plataforma completa para **microcrédito e cobrança em campo**, com:

- Gestão de carteira (clientes + contratos + parcelas)
- Motor financeiro com juros simples, frequências variadas e mora configurável
- Score de crédito comportamental
- Relatórios e exportação PDF
- Operação offline com sync
- Hierarquia admin → manager → rotas
- Integração WhatsApp (manual e automatizada via Evolution)
- Notificações push no app nativo