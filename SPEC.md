# RioCred — Especificação de Implementação (Appwrite + Expo)

> **Base:** starter [Appwrite React Native](https://github.com/appwrite/starter-for-react-native) + requisitos de `FUNCIONALIDADES.md`  
> **Backend alvo:** Appwrite Cloud (`nyc.cloud.appwrite.io`, project `6a3222d2000513ac5182`)  
> **Plataforma:** Expo — **web** (PWA) + **Android** (build nativo); iOS opcional

---

## 1. Objetivo

Reconstruir o **RioCred** — sistema de gestão de crédito comunitário para operação em campo — sobre a stack Expo + Appwrite, preservando as funcionalidades documentadas no app original (Supabase).

**Entregável final:** app web responsivo + APK/AAB Android com gestão de clientes, empréstimos, cobrança, score, relatórios PDF, hierarquia admin/manager e sync offline.

---

## 2. Stack proposta

| Camada | Original | Nova implementação |
|--------|----------|-------------------|
| Frontend | Expo + React Native Web | **Manter** — Expo Router, RN components |
| Navegação | React Navigation (tabs + stack) | **Expo Router** — `(tabs)` + `(stack)` |
| Estado servidor | TanStack React Query | **Manter** — queries/mutations por entidade |
| Auth | Supabase Auth | **Appwrite Account** (email/senha, sessão) |
| Banco | Supabase Postgres | **Appwrite Databases** (collections + attributes) |
| Storage | Supabase Storage | **Appwrite Storage** (fotos, documentos) |
| Realtime | Supabase Realtime | **Appwrite Realtime** (subscriptions por collection) |
| Server logic | Supabase Edge Functions / RPC | **Appwrite Functions** (Node.js) |
| Offline | SQLite (`offline_records`) | **expo-sqlite** + fila de sync (mesmo padrão) |
| PDF | jsPDF + autoTable | **Manter** |
| CEP | ViaCEP | **Manter** (HTTP client-side) |
| WhatsApp | Evolution API + `wa.me` | **Functions** (Evolution) + links manuais |
| Push | Expo Push | **Manter** (registro em collection `push_devices`) |

---

## 3. Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│  Expo App (web / iOS / Android)                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Expo Router │  │ React Query  │  │ SQLite local  │  │
│  │ screens     │  │ cache layer  │  │ offline queue │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         └────────────────┼──────────────────┘          │
│                          │ lib/appwrite.ts              │
└──────────────────────────┼──────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   Appwrite Auth    Appwrite Databases   Appwrite Storage
         │                 │                 │
         └──────── Appwrite Functions ───────┘
                    (admin, Evolution, push)
```

### Estrutura de pastas alvo

```
app/
  (auth)/login.tsx
  (tabs)/
    index.tsx          # Dashboard
    customers.tsx
    loans.tsx
    calendar.tsx
    more.tsx
  (stack)/
    customer-scores.tsx
    loans-report.tsx
    loan-simulator.tsx
    payables.tsx
    settings.tsx
    sync-status.tsx
    admin/approvals.tsx
    admin/notifications.tsx
    admin/routes.tsx
components/            # UI reutilizável
features/              # por domínio (customers, loans, auth…)
hooks/
lib/
  appwrite.ts          # client singleton ✓
  query-client.ts
services/              # API Appwrite + offline
offline/               # SQLite, sync engine
utils/                 # simulateLoan, score, masks
types/
```

---

## 4. Modelo de dados (Appwrite Database)

**Database ID sugerido:** `riocred`

### 4.1 Collections

| Collection | Document ID | Campos principais | Permissões |
|------------|-------------|-------------------|------------|
| `profiles` | userId (Account `$id`) | `fullName`, `email`, `role` (`admin`/`manager`), `isApproved`, `createdAt` | read: user+admin; update: owner+admin |
| `user_settings` | userId | `whatsapp`, `companyName`, `pixKey`, `whatsappEnabled`, templates (3 strings) | owner |
| `routes` | auto | `name`, `metadata`, `createdBy`, `createdAt` | read: authenticated; CRUD: admin |
| `manager_route_access` | auto | `managerId`, `routeId` | admin write; manager read own |
| `customers` | auto / `local:*` | `ownerId`, `fullName`, `cpf`, `phone`, `clientType`, `billingType`, `referrerName`, `referrerPhone`, `routeId`, `active`, endereço completo, `photoFileId`, `clientRequestId`, `createdAt` | owner + admin |
| `customer_documents` | auto | `customerId`, `type` (RG/CPF/…), `fileId`, `fileName` | owner |
| `loans` | auto / `local:*` | `ownerId`, `customerId`, `principal`, `interestRate`, `interestMode`, `frequency`, `installmentCount`, `startDate`, `firstDueDate`, `skipWeekends`, `lateFeeMode`, `lateFeeValue`, `status`, `clientRequestId` | owner |
| `loan_installments` | auto | `loanId`, `number`, `dueDate`, `scheduledAmount`, `paidAmount`, `status` | owner |
| `loan_payments` | auto | `loanId`, `installmentId`, `amount`, `interestAmount`, `principalAmount`, `discountAmount`, `paymentMethod`, `notes`, `paidAt`, `type` | owner |
| `payable_accounts` | auto | `ownerId`, `name`, `amount`, `dueDate`, `category`, `notes`, `status` | owner |
| `push_devices` | auto | `userId`, `expoPushToken`, `platform`, `updatedAt` | owner |
| `app_settings` | singleton | Evolution credentials (encrypted), global WhatsApp templates | admin only |

### 4.2 Storage buckets

| Bucket | Uso | Tamanho máx. |
|--------|-----|--------------|
| `customer-photos` | Fotos de perfil | 5 MB |
| `customer-documents` | RG, CPF, comprovantes | 10 MB |

### 4.3 Índices recomendados

- `customers`: `ownerId`, `routeId`, `fullName` (fulltext se disponível)
- `loans`: `ownerId`, `customerId`, `status`
- `loan_installments`: `loanId`, `dueDate`, `status`
- `loan_payments`: `loanId`, `paidAt`
- `manager_route_access`: `managerId`, `routeId` (unique composto)

### 4.4 Mapeamento Supabase → Appwrite

| Supabase | Appwrite |
|----------|----------|
| RPC `set_manager_access` | Function `set-manager-access` |
| RPC `update_current_profile_full_name` | PATCH document `profiles/{userId}` |
| Realtime channel | `client.subscribe()` nos documentos/collections |
| RLS policies | **Permissions** por document + **Team/Role** se necessário |
| Edge Functions admin | Appwrite Functions com API key interna |

---

## 5. Autenticação e papéis

### Fluxo (`AuthScreen`)

1. Sign up: `Account.create()` → criar doc em `profiles` (role default `manager`, `isApproved: false`)
2. Sign in: `Account.createEmailPasswordSession()`
3. Recuperar senha: `Account.createRecovery()` + deep link
4. Bootstrap pós-login: carregar `profiles`, `user_settings`, snapshot offline

### Regras de acesso

| Papel | Condição | Bloqueio |
|-------|----------|----------|
| `admin` | `role === admin` | — |
| `manager` | `isApproved === true` + rotas em `manager_route_access` | Tela de aguardando aprovação |
| Outros | signup | Admin define role |

**Guard de rotas:** layout `(tabs)` verifica sessão + aprovação antes de renderizar.

---

## 6. Módulos funcionais (por tela)

### Fase 1 — Fundação (MVP web)

| # | Módulo | Telas | Critérios de aceite |
|---|--------|-------|---------------------|
| 1.1 | Auth | login, signup, forgot | Sessão persiste; logout limpa cache |
| 1.2 | Layout | tabs + stack + guards | 5 abas conforme doc; deep links funcionam |
| 1.3 | Dashboard | `(tabs)/index` | Métricas da carteira do usuário logado |
| 1.4 | Clientes CRUD | list + wizard 3 passos | ViaCEP, upload foto/doc, busca |
| 1.5 | Empréstimos CRUD | list + form + pagamento | `simulateLoan`, parcelas geradas, status derivado |

### Fase 2 — Operação

| # | Módulo | Telas | Critérios de aceite |
|---|--------|-------|---------------------|
| 2.1 | Agenda | calendar | Parcelas por dia/mês, cores por status |
| 2.2 | Score | customer-scores | Algoritmo 5 fatores (pesos da doc) |
| 2.3 | Simulador | loan-simulator | What-if → converter em contrato |
| 2.4 | Relatórios | loans-report | Filtros período/rota/status + PDF |
| 2.5 | Contas a pagar | payables | CRUD online-only |
| 2.6 | Configurações | settings | Perfil, PIX, templates WhatsApp |

### Fase 3 — Admin e integrações

| # | Módulo | Telas / backend | Critérios de aceite |
|---|--------|---------------|---------------------|
| 3.1 | Aprovações | admin/approvals + Function | Aprovar manager, atribuir rotas |
| 3.2 | Rotas | admin/routes | CRUD central |
| 3.3 | Notificações admin | admin/notifications + Function | Templates globais, Evolution API |
| 3.4 | Push | settings + Function | Registro token; test push (nativo only) |
| 3.5 | WhatsApp pós-contrato | LoanCreatedModal | Link `wa.me` com template |

### Fase 4 — Offline e nativo

| # | Módulo | Critérios de aceite |
|---|--------|---------------------|
| 4.1 | SQLite snapshot | App abre offline com último estado |
| 4.2 | Fila de sync | Escritas offline enfileiradas; retry com `clientRequestId` |
| 4.3 | Realtime | Invalidação React Query ao receber eventos |
| 4.4 | SyncStatus | Badge online/offline, pendências, sync manual |
| 4.5 | Build nativo | Android/iOS com câmera, SQLite completo, push |

---

## 7. Lógica de negócio (serviços)

### 7.1 `simulateLoan(params)`

Entrada igual ao `LoanFormModal` da doc. Saída:

- `totalInterest`, `installmentAmount`, `totalReceivable`, `effectiveRate`
- Array de parcelas: `{ number, dueDate, scheduledAmount }`
- Respeitar: frequência, skip sábado/domingo, modos de juros (parcela vs contrato), mora (3 modos)

**Localização:** `utils/loan-simulator.ts` — puro, testável, usado em form + simulador.

### 7.2 `buildLoanSummary(loan, installments, payments)`

Saldo restante, juros realizados vs esperados, próxima parcela, valor sugerido de cobrança (com mora).

### 7.3 `calculateCustomerScore(customerId, history)`

| Fator | Peso | Implementação |
|-------|------|---------------|
| Pagamentos em dia | 40% | parcelas pagas até `dueDate` |
| Atrasos | 25% | count overdue + dias |
| Recuperação | 15% | `received / contracted` |
| Relacionamento | 10% | meses cadastro + contratos quitados |
| Exposição | 10% | saldo aberto / total contratado |

Faixas: Excelente ≥85, Bom 70–84, Atenção 55–69, Alto Risco <55.

### 7.4 Status derivado de empréstimo

`Em dia` | `Próximo do vencimento` | `Em atraso` | `Quitado` — calculado a partir de parcelas, não armazenado.

---

## 8. Offline-first

### Princípios (igual doc original)

1. Leitura sempre do SQLite local (`listEntityData`)
2. Escrita online direta OU fila com `sync_status: pending|error|synced`
3. IDs locais: `local:{entity}:{uuid}` até confirmação do servidor
4. Idempotência: campo `clientRequestId` em customers e loans

### Tabelas SQLite

- `offline_user_state` — lastSync, errors
- `offline_records` — `entity_type`, `payload` JSON, `sync_status`

### Sync engine (`services/sync.ts`)

```
onReconnect / onManualSync / onRealtimeEvent
  → push pending queue (ordered)
  → pull delta since lastSync
  → resolve local IDs → server IDs
  → invalidate React Query keys
```

---

## 9. Integrações externas

| Integração | Onde roda | Notas |
|------------|-----------|-------|
| ViaCEP | Client | `GET https://viacep.com.br/ws/{cep}/json/` |
| WhatsApp manual | Client | `Linking.openURL(wa.me/...)` |
| Evolution API | Appwrite Function | Secrets em `app_settings`; nunca no client |
| Expo Push | Function + client | Token em `push_devices`; web mostra aviso |

---

## 10. Appwrite Functions (server)

| Function | Trigger | Responsabilidade |
|----------|---------|------------------|
| `set-manager-access` | HTTP (admin) | Aprovar manager, sync rotas |
| `send-evolution-message` | Event / HTTP | Disparo WhatsApp global |
| `send-test-push` | HTTP (admin) | Diagnóstico Expo push |
| `on-loan-created` | Database event | Template "empréstimo criado" (opcional) |

Todas validam JWT do caller + role admin quando aplicável.

---

## 11. Variáveis de ambiente

```env
# Appwrite (client)
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=6a3222d2000513ac5182
EXPO_PUBLIC_APPWRITE_PROJECT_NAME=riocred

# Appwrite (server — Functions only, NÃO no client)
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=riocred

# Evolution (Functions only)
EVOLUTION_BASE_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=riocred-global
```

---

## 12. Limitações web (herdadas)

| Recurso | Web | Nativo |
|---------|-----|--------|
| Push | Indisponível | Sim |
| Câmera | Limitada | Completa |
| SQLite | AsyncStorage / IndexedDB simplificado | expo-sqlite full |
| Share | Web Share API | Share nativo |

**Estratégia:** desenvolver e validar fluxos core na web; offline robusto e push na Fase 4 nativa.

---

## 13. Ordem de implementação sugerida

```
Semana 1–2   Fase 1.1–1.3  Auth + layout + dashboard
Semana 3–4   Fase 1.4–1.5  Clientes + empréstimos (core financeiro)
Semana 5     Fase 2.1–2.3  Agenda + score + simulador
Semana 6     Fase 2.4–2.6  Relatórios PDF + payables + settings
Semana 7     Fase 3        Admin + WhatsApp + push
Semana 8+    Fase 4        Offline completo + builds nativos
```

Cada entrega deve incluir: types, service Appwrite, hooks React Query, tela(s), testes manuais documentados.

---

## 14. Definition of Done (por feature)

- [ ] Types TypeScript alinhados ao schema Appwrite
- [ ] Collection/bucket criados no console (ou script de setup)
- [ ] Permissões testadas (owner não vê dados de outro manager)
- [ ] UI responsiva (coluna única < 1024px, conforme doc)
- [ ] Loading / error / empty states
- [ ] Manager não aprovado bloqueado
- [ ] Admin-only routes protegidas
- [ ] Funciona em `npm run web` antes de testar nativo

---

## 15. Referências

- `FUNCIONALIDADES.md` — requisitos funcionais detalhados (fonte da verdade de UX)
- `lib/appwrite.ts` — client SDK configurado
- [Appwrite Docs](https://appwrite.io/docs)
- [Expo Router](https://docs.expo.dev/router/introduction/)

---

*Spec v1.0 — gerado para rebuild RioCred sobre Appwrite. Atualizar conforme decisões de schema e priorização.*
