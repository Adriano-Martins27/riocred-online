# Appwrite — Setup do RioCred

## Setup automático (recomendado)

### 1. Criar API Key

1. Abra [Appwrite Console → API Keys](https://cloud.appwrite.io/console/project-6a3222d2000513ac5182/settings/api-keys)
2. **Create API Key** → nome: `riocred-setup`
3. Scopes necessários:
   - `databases.read` / `databases.write`
   - `collections.read` / `collections.write`
   - `attributes.read` / `attributes.write`
   - `indexes.read` / `indexes.write`
   - `documents.read` / `documents.write`
   - `users.read` / `users.write`
4. Copie a key e cole no `.env`:

```env
APPWRITE_API_KEY=sua_key_aqui
```

### 2. Habilitar Auth

Em **Auth → Settings**, ative **Email/Password**.

### 3. Rodar setup

```bash
npm run setup:appwrite
```

Isso cria automaticamente:
- Database `riocred`
- Collections `profiles` e `customers` (com atributos)
- Usuário admin (credenciais do `.env`)
- Profile com `role: admin` e `isApproved: true`

### 4. Validar

```bash
npm run validate:appwrite
```

Ou no app: tela de login mostra **Appwrite: conectado ✓** → entrar com admin.

---

## Credenciais admin (padrão `.env`)

| Campo | Valor |
|-------|-------|
| E-mail | `admin@riocred.online` |
| Senha | `Riocred@2026!` |

Altere em `.env` antes de rodar `setup:appwrite` se quiser outros valores.

---

## Schema manual (referência)

### Collection `profiles`

| Attribute | Type | Required |
|-----------|------|----------|
| fullName | string | yes |
| email | string | yes |
| role | string | yes |
| isApproved | boolean | yes |

Document ID = User ID do Appwrite Auth.

### Collection `customers`

Ver atributos em `scripts/setup-appwrite.mjs` ou `SPEC.md`.

---

## Fallback sem API Key

Se o database já existir no console, cadastre-se no app com o e-mail definido em:

```env
EXPO_PUBLIC_BOOTSTRAP_ADMIN_EMAIL=admin@riocred.online
```

O primeiro signup com esse e-mail recebe `role: admin` automaticamente.

---

## Verificar no app

1. `npm run web`
2. Login com admin
3. Dashboard → badge **Administrador / Acesso total**
4. **Mais** → **Testar conexão (ping)**
5. **Clientes** → **+ Novo cliente**
