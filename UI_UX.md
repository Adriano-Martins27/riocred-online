# RioCred — Guia de UI/UX

> Documento gerado a partir da auditoria do app Expo + Appwrite (web/Android).  
> Referência funcional: `FUNCIONALIDADES.md` | Implementação: `SPEC.md`

---

## 1. Visão geral

O **RioCred** é um app de **crédito comunitário em campo** — operadores (managers) cadastram clientes, formalizam empréstimos e cobram parcelas, muitas vezes offline. Admins supervisionam rotas, aprovam managers e configuram notificações.

**Estado atual da UI:** scaffold funcional com auth, 5 abas e CRUD de clientes parcial. Empréstimos, agenda e ferramentas secundárias ainda são placeholders.

**Plataformas:** web responsiva (PWA) + Android nativo. Mesma codebase React Native / Expo.

---

## 2. Direção de design

### Personalidade da marca

| Atributo | Direção |
|----------|---------|
| Tom | **Confiável, operacional, humano** — não “fintech neon”, não “banco corporativo frio” |
| Metáfora | Carteira comunitária, proximidade, clareza financeira |
| Diferencial | Legibilidade em sol, números grandes, fluxos curtos para quem está na rua |

### Direção visual proposta: **Verde comunitário refinado**

- **Primária:** `#0D7C66` (já em uso) — crescimento, confiança, crédito responsável
- **Superfícies:** fundo `#FAFAFB`, cards brancos, bordas `#EDEDF0`
- **Semântica:** verde = ok/pago, âmbar = vence hoje, vermelho = atraso
- **Evitar:** roxo genérico, gradientes “AI slop”, accent `#FD366E` do starter Appwrite (legado)

### Tipografia

| Uso | Fonte atual | Recomendação |
|-----|-------------|--------------|
| Títulos | Poppins 300 | Manter Poppins para hero; considerar peso 500–600 em títulos de seção |
| Corpo | Inter 400/600 | Manter; adicionar estilo **tabular nums** para valores em R$ |
| Valores | — | `fontVariant: ['tabular-nums']` + tamanho 20–24px em métricas |

---

## 3. Arquitetura de informação

```
Login / Cadastro
    │
    ▼
┌─────────────────────────────────────────┐
│  Abas (bottom tabs)                     │
│  Início │ Clientes │ Empréstimos │      │
│         Agenda   │ Mais                │
└─────────────────────────────────────────┘
    │
    ├── Stack (via Mais ou deep link)
    │     Score · Relatórios · Simulador
    │     Contas a pagar · Configurações
    │     Sincronização
    │     Admin: Aprovações · Rotas · Notificações
    │
    └── Modais
          Cliente (wizard 3 passos)
          Empréstimo · Pagamento · WhatsApp pós-contrato
```

### Regras de acesso na UI

| Papel | Comportamento |
|-------|---------------|
| **admin** | Vê itens admin no Mais; contagem de usuários no dashboard |
| **manager aprovado** | Fluxo operacional completo |
| **manager pendente** | Tela bloqueante “Aguardando aprovação” (não só badge) |
| **Não autenticado** | Apenas login/cadastro |

---

## 4. Estado das telas

| Tela | Status | Prioridade |
|------|--------|------------|
| Login / Cadastro | Funcional | P0: recuperar senha |
| Dashboard | Parcial (1 métrica real) | P1: gráfico + dados reais |
| Clientes | Mais completa | P0: wizard 3 passos, campos faltantes |
| Empréstimos | Placeholder | **P0 — core do produto** |
| Agenda | Placeholder | P1 |
| Mais | Menu + debug Appwrite | P0: navegação real; esconder debug |

---

## 5. Fluxos UX críticos

### 5.1 Autenticação

```
Abrir app → loading → sessão?
  Não → Login (badge Appwrite: conectado ✓)
  Sim → Tabs
```

**Melhorias:**
- “Esqueceu a senha?” (Appwrite recovery)
- Remover badge de ping em produção (só `__DEV__`)
- Mensagem clara se database não configurado

### 5.2 Cliente (alvo: wizard 3 passos)

```
Lista → Busca → + Novo
  Passo 1: Dados pessoais (foto, CPF, tel, tipo cobrança, rota)
  Passo 2: Endereço (CEP ViaCEP)
  Passo 3: Documentos (upload)
  → Salvar → toast → volta à lista
```

**Hoje:** modal único com scroll; faltam foto, billingType, indicador, rota, complemento, documentos, exclusão.

### 5.3 Empréstimo (a implementar)

```
Lista → Filtro status → + Contrato
  Form (simulateLoan preview) → Confirmar
  → Modal WhatsApp opcional
Parcela → Registrar pagamento (2 etapas se só juros)
```

### 5.4 Dashboard

```
Hero boas-vindas + role
Grid métricas (6–10 cards)
Gráfico barras: aberto | pago | vencido
Ações rápidas: + Cliente, + Empréstimo, Agenda hoje
```

---

## 6. Design system (tokens)

### Cores — expandir `styles/theme.ts`

```ts
// Sugestão de extensão
surfaceSuccess: '#E8F5F1',
surfaceWarning: '#FEF3C7',
surfaceDanger: '#FEE2E2',
surfaceMuted: '#F3F4F6',
```

Substituir hex hardcoded nos screens por tokens.

### Espaçamento — escala 4px

| Token | Valor |
|-------|-------|
| space-1 | 4 |
| space-2 | 8 |
| space-3 | 12 |
| space-4 | 16 |
| space-5 | 20 |
| space-6 | 24 |
| space-8 | 32 |

### Componentes base (biblioteca alvo)

| Componente | Uso |
|------------|-----|
| `SafeScreen` | Safe area iOS/Android |
| `ScreenShell` | ✓ existe |
| `PrimaryButton` | ✓ existe |
| `Input` | ✓ existe; usar `error` prop |
| `MetricCard` | Extrair do dashboard |
| `StatusBadge` | Ativo, score, parcela |
| `MenuListItem` | Mais → stack |
| `AlertBanner` | Setup error, offline |
| `ResponsiveModal` | Sheet mobile / dialog web |
| `WizardStepper` | Cliente, pagamento |
| `CurrencyInput` | Valores R$ |
| `EmptyState` | Listas vazias com CTA |
| `Skeleton` | Loading dashboard/listas |

---

## 7. Web vs Android

| Aspecto | Web | Android |
|---------|-----|---------|
| Layout | `maxWidth: 1024`, conteúdo centrado | Full width |
| Modal cliente | Dialog centrado (~640px) | Full-screen sheet |
| Tab bar | Largura limitada, centrada | Edge-to-edge |
| Safe area | Menor impacto | `SafeAreaView` obrigatório |
| Teclado | OK | `KeyboardAvoidingView` também no Android |
| Push | Indisponível — aviso explícito | Development build |
| Câmera/docs | `<input type="file">` | expo-image-picker |
| Offline | Simplificado | SQLite completo (Fase 4) |

---

## 8. Prioridades de implementação UI

### P0 — Bloqueadores

1. Stack navigation + itens do **Mais** clicáveis
2. Tela **Empréstimos** MVP (lista + form + pagamento)
3. Formulário cliente alinhado ao schema (ou ocultar campos não editáveis)
4. Recuperação de senha
5. Safe area + teclado Android
6. Remover painel debug Appwrite do **Mais** (admin/dev only)
7. Gate para manager não aprovado

### P1 — Qualidade

1. Dashboard com métricas e gráfico reais
2. Wizard cliente 3 passos
3. Toasts, confirmação de exclusão, erros por campo
4. Empty states com CTA
5. Score e sync na listagem de clientes
6. Logout no **Mais**

### P2 — Polish

1. Logo RioCred, favicon, splash
2. Dark mode (tokens)
3. Remover componentes legados do starter (`Header`, `Button` rosa)
4. Acessibilidade (labels, foco web)
5. Skeleton loaders
6. Debounce na busca

---

## 9. Microcopy (PT-BR)

| Contexto | Texto sugerido |
|----------|----------------|
| Login vazio | Entre na sua conta para gerenciar a carteira. |
| Manager pendente | Sua conta aguarda aprovação do administrador. |
| Lista clientes vazia | Nenhum cliente cadastrado. Toque em + Novo cliente. |
| Empréstimos vazio | Nenhum contrato ainda. Crie o primeiro empréstimo. |
| Offline | Sem internet. Alterações serão sincronizadas quando voltar. |
| Erro Appwrite | Não foi possível conectar ao servidor. Verifique sua conexão. |

---

## 10. Checklist de aceite visual

- [ ] Contraste WCAG AA em textos principais
- [ ] Touch targets ≥ 48px
- [ ] Valores monetários com 2 decimais e prefixo R$
- [ ] Datas em pt-BR (`Intl.DateTimeFormat('pt-BR')`)
- [ ] Loading / empty / error em toda lista
- [ ] Responsivo 360px – 1024px+ sem quebra
- [ ] Admin vê badge; manager pendente vê bloqueio
- [ ] Sem strings em inglês na UI de produção

---

## 11. Referências internas

- `styles/theme.ts` — tokens atuais
- `styles/font.ts` — tipografia
- `components/ScreenShell.tsx`, `Input.tsx`, `PrimaryButton.tsx` — base UI
- `components/CustomerFormModal.tsx` — form a evoluir para wizard
- `FUNCIONALIDADES.md` — requisitos de produto
- `SPEC.md` — fases de implementação

---

*UI/UX v1.0 — RioCred / Appwrite rebuild*
