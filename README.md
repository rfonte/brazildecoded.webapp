# brazildecoded.webapp

[![Deploy Eleventy to GitHub Pages](https://github.com/rfonte/brazildecoded.webapp/actions/workflows/pages.yml/badge.svg)](https://github.com/rfonte/brazildecoded.webapp/actions/workflows/pages.yml)
[![Unit Tests](https://img.shields.io/github/actions/workflow/status/rfonte/brazildecoded.webapp/ci.yml?label=unit%20tests)](https://github.com/rfonte/brazildecoded.webapp/actions/workflows/ci.yml)
[![SEO Structured Data](https://img.shields.io/badge/SEO-structured%20data-green)](docs/SEO.md)
[![SonarCloud Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=rfonte_brazildecoded.webapp&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=rfonte_brazildecoded.webapp)
[![SonarCloud Coverage](https://sonarcloud.io/api/project_badges/measure?project=rfonte_brazildecoded.webapp&metric=coverage)](https://sonarcloud.io/summary/new_code?id=rfonte_brazildecoded.webapp)

Site estático do **BrazilDecoded** — guia de viagem para o Brasil voltado para estrangeiros. Construído com Eleventy (SSG) e um servidor Express para autenticação e APIs internas.

---

## Sumário

- [Visão geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Desenvolvimento local](#desenvolvimento-local)
- [Scripts disponíveis](#scripts-disponíveis)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Backend e autenticação](#backend-e-autenticação)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Formulário Starter Kit](#formulário-starter-kit)
- [Integrações externas](#integrações-externas)
- [Testes](#testes)
- [Lint e formatação](#lint-e-formatação)
- [Deploy](#deploy)
- [Contribuição](#contribuição)

---

## Visão geral

- **Frontend:** site estático gerado com Eleventy (Nunjucks + CSS + JS vanilla), publicado via GitHub Pages.
- **Backend:** servidor Express com autenticação JWT, armazenamento JSON (MVP) e APIs protegidas por role.
- **Formulário principal:** `/free-starter-kit/` captura leads e envia para um Cloudflare Worker → Make → Airtable → email com link de download seguro.
- **Proteção anti-bot:** Cloudflare Turnstile + honeypot + verificação de tempo de preenchimento + `form_token`.
- **Qualidade:** cobertura de testes ≥ 90% (Vitest), testes E2E (Playwright) e análise estática (SonarCloud + ESLint + Stylelint + HTMLHint).

---

## Arquitetura

```
Navegador
  │
  ├── GET /free-starter-kit/   → Eleventy (HTML estático)
  │
  └── POST /cadastro           → Cloudflare Worker (brazildecoded-api)
                                      │
                                      └── Make (webhook)
                                              ├── Validação Turnstile
                                              ├── Airtable (criar/atualizar lead)
                                              └── Email com token de download

Servidor Express (localhost:3001)
  ├── POST /api/auth/login
  ├── POST /api/auth/logout
  ├── POST /api/auth/refresh
  ├── GET  /api/account/profile
  ├── PUT  /api/account/profile
  ├── POST /api/account/change-password
  ├── GET  /api/admin/stats
  ├── GET  /api/admin/leads
  ├── GET  /api/admin/users
  └── GET  /health
```

---

## Requisitos

- **Node.js 18+**
- **npm 9+**
- Navegador moderno (para testes Playwright)

---

## Instalação

```powershell
npm install
```

O `postinstall` instala automaticamente os browsers do Playwright.

---

## Desenvolvimento local

### Frontend (Eleventy)

```powershell
npm run serve
```

Abre em `http://localhost:8080/`.

### Backend (Express)

```powershell
# Uma execução simples
npm run server:dev

# Com hot-reload (nodemon)
npm run server:watch
```

O servidor sobe em `http://localhost:3001/`.

Copie `.env.example` para `.env` antes de iniciar:

```powershell
Copy-Item .env.example .env
```

> Para rodar frontend e backend juntos, abra dois terminais.

---

## Scripts disponíveis

| Script | O que faz |
|---|---|
| `npm run build` | Gera o site estático em `dist/` |
| `npm run serve` | Eleventy com live reload (`localhost:8080`) |
| `npm run server:dev` | Backend Express com dotenv (`localhost:3001`) |
| `npm run server:watch` | Backend com nodemon (auto-reload) |
| `npm run lint` | ESLint + Stylelint + HTMLHint |
| `npm run format` | Prettier (JS, CSS, Markdown) |
| `npm run format:check` | Verifica formatação sem alterar arquivos |
| `npm run test:unit` | Testes unitários (Vitest) |
| `npm run test:unit:coverage` | Testes com cobertura (threshold 90%) |
| `npm run test:e2e` | Testes end-to-end (Playwright) |
| `npm run docs` | Gera documentação JSDoc |
| `npm run sd:report` | Relatório de structured data |
| `npm run sonar` | Análise SonarCloud |
| `npm run prepush` | Testes + cobertura + Sonar (pré-push) |

---

## Estrutura do projeto

```
.
├── src/
│   ├── index.njk                   # Página inicial
│   ├── pages/
│   │   ├── free-starter-kit.njk    # Formulário de captura de leads
│   │   ├── contact.njk             # Formulário de contato
│   │   ├── leads.njk               # Painel admin local (protótipo)
│   │   ├── the-guide.njk           # Página do guia completo
│   │   ├── about-the-author.njk    # Sobre o autor
│   │   ├── thank-you.njk           # Confirmação de envio
│   │   ├── contato-sucesso.njk     # Sucesso do formulário de contato
│   │   ├── privacy.njk             # Política de privacidade
│   │   ├── terms.njk               # Termos de uso
│   │   └── ...                     # Páginas SEO e institucionais
│   ├── _includes/
│   │   └── layout.njk              # Layout compartilhado (head, nav, footer)
│   ├── _data/
│   │   └── site.json               # Config global (sitekey Turnstile, GTM, apiUrl)
│   ├── assets/
│   │   ├── css/                    # Estilos do site
│   │   ├── js/
│   │   │   ├── script.js           # Lógica principal do frontend
│   │   │   └── lib/
│   │   │       └── starter-kit.js  # Helpers: buildPayload, getUTM, isHumanTiming
│   │   └── images/
│   └── download/                   # Redirect estático para download via Worker
├── backend-server.js               # Servidor Express all-in-one (dev/prototipagem)
├── server.js                       # Servidor modular (importa rotas de src-backend/)
├── src-backend/
│   └── routes/
│       ├── auth.js                 # Login, logout, refresh
│       ├── account.js              # Perfil e senha do usuário
│       └── admin.js                # Estatísticas e gestão de leads/usuários
├── tests/
│   ├── unit/                       # Vitest (script.test.mjs, starter-kit.test.mjs)
│   └── e2e/                        # Playwright (starter-kit.spec.js, site.spec.js)
├── tools/                          # Scripts utilitários (Sonar, structured data)
├── docs/                           # Documentação adicional (SEO.md)
├── .env.example                    # Template de variáveis de ambiente
└── dist/                           # Build gerado (não commitar)
```

---

## Backend e autenticação

### Dois modos de servidor

| Arquivo | Quando usar |
|---|---|
| `backend-server.js` | Prototipagem rápida — tudo em um arquivo |
| `server.js` + `src-backend/` | Desenvolvimento estruturado (recomendado) |

### Autenticação JWT

- Token armazenado em cookie `httpOnly`, `Secure`, `SameSite=Strict`
- Expiração configurável via `JWT_EXPIRY` (padrão: `15m`)
- Refresh automático via `POST /api/auth/refresh` (expira em `JWT_REFRESH_EXPIRY`, padrão `7d`)
- Roles: `admin` e `user`

### Banco de dados (MVP)

Armazenamento em JSON local (`db/`). Para produção, trocar `DATABASE_TYPE` para `mongodb` ou `postgresql` e configurar `DATABASE_URL`.

Usuários padrão para desenvolvimento:

| Email | Senha | Role |
|---|---|---|
| `admin@brazildecoded.com` | `password123` | admin |
| `user@brazildecoded.com` | `password123` | user |

> **Troque as senhas antes de qualquer exposição pública.**

---

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```env
NODE_ENV=development
PORT=3001

JWT_SECRET=troque-por-uma-chave-forte
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

CLIENT_URL=http://localhost:8080
SERVER_URL=http://localhost:3001

DATABASE_TYPE=json
# DATABASE_URL=mongodb+srv://...

LOG_LEVEL=debug

# Opcionais — para envio de email
# RESEND_API_KEY=
# SENDGRID_API_KEY=
```

> `JWT_SECRET` é obrigatório em produção. Nunca commite o `.env`.

---

## Formulário Starter Kit

### Payload enviado ao Worker

Toda chave usa **snake_case em inglês**. A função `buildPayload` em `src/assets/js/lib/starter-kit.js` é a única fonte de verdade para o formato do payload.

```json
{
  "type": "starter_kit",
  "name": "Rodrigo",
  "email": "user@example.com",
  "page": "/free-starter-kit/",
  "referrer": "https://google.com/",
  "user_agent": "Mozilla/5.0 ...",
  "source": "free_starter_kit",
  "form_token": "bd_starterkit_v1",
  "form_started_at": "1780335513236",
  "consent": true,
  "company": "",
  "turnstile_token": "1.5xSGL...",
  "utm_source": "",
  "utm_medium": "",
  "utm_campaign": "",
  "utm_content": "",
  "utm_term": ""
}
```

### Camadas de proteção anti-bot

| Camada | Como funciona |
|---|---|
| **Honeypot** | Campo `company` oculto — se preenchido, o envio é silenciosamente bloqueado |
| **Timing** | Formulário bloqueado se enviado em menos de 3 segundos após carregar |
| **form_token** | Valor fixo validado no frontend; falha invalida o envio |
| **Cloudflare Turnstile** | Widget CAPTCHA — botão só habilita após `onTurnstileSuccess` |
| **Worker / Make** | Validação server-side do token Turnstile via `siteverify` |

---

## Integrações externas

### Cloudflare Turnstile

- `site_key` configurado em `src/_data/site.json` → `turnstileSiteKey`
- Script carregado em `src/_includes/layout.njk`
- Validação server-side obrigatória no Make (HTTP → POST para o endpoint `siteverify` da Cloudflare)

### Cloudflare Worker

- URL: `https://brazildecoded-api.rodcafonte.workers.dev`
- Endpoint de captura de lead: `POST /cadastro`
- Após validação, repassa para o cenário Make

### Make (automação)

Fluxo do cenário:

```
Webhook → Validações anti-bot → Validar Turnstile → Normalizar email
→ Gerar Download Token → Airtable Search → Router
    ├─ Create Record (novo lead)
    └─ Update Record (lead existente)
→ Enviar email → Atualizar Airtable (status do envio)
```

### Cloudflare R2

- Bucket privado para o PDF do Starter Kit
- Acesso apenas via Worker com token de download
- Token gerado pelo Make, expira em 24h

### Google Tag Manager

- GTM ID: `GTM-PS36XKLG` (configurado em `site.json`)
- Eventos personalizados: `starter_kit_form_submit`, `starter_kit_form_error`

---

## Testes

### Unitários (Vitest)

```powershell
npm run test:unit

# Com cobertura (threshold: 90%)
npm run test:unit:coverage
```

Arquivos testados: `src/assets/js/**/*.js`
Cobertura atual: ~98% statements, ~91% branches.

### E2E (Playwright)

```powershell
npm run test:e2e
```

O Playwright inicia o Eleventy automaticamente. Cobre o formulário Starter Kit, páginas SEO e fluxo de contato.

### SonarCloud

```powershell
$env:SONAR_TOKEN = "SEU_TOKEN"
npm run sonar
```

> Use `setx SONAR_TOKEN "SEU_TOKEN"` para persistir a variável no Windows (requer novo terminal).

---

## Lint e formatação

```powershell
# Verificar
npm run lint

# Formatar
npm run format

# Só checar sem alterar
npm run format:check
```

Ferramentas: ESLint (JS), Stylelint (CSS), HTMLHint (Nunjucks), Prettier.

---

## Deploy

- **Frontend:** publicado via GitHub Actions → GitHub Pages a partir de `dist/`.
- **Backend:** servidor Express rodando separadamente (VPS, Railway, Render, etc.).
- **Worker:** deployado no Cloudflare Workers.
- **Cache:** GitHub Pages não suporta `_headers`. Use Cloudflare para cabeçalhos customizados.
  - HTML: bypass cache ou TTL curto
  - `/assets/*`: Cache Everything, Edge TTL 1 ano
  - `site.buildVersion` nos bundles CSS/JS garante cache busting

---

## Contribuição

1. Abra uma issue descrevendo o bug ou sugestão.
2. Crie um branch a partir de `main`.
3. Execute antes de abrir o PR:

```powershell
npm run lint
npm run test:unit
npm run test:e2e
```

4. Abra o PR com descrição clara do problema e das mudanças.

---

## Links úteis

- [Eleventy](https://www.11ty.dev/)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [SonarCloud](https://sonarcloud.io/)
- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)
- [Make (Integromat)](https://www.make.com/)
- Documentação SEO: `docs/SEO.md`
- Setup backend: `BACKEND_SETUP_GUIDE.md`
- Quick start auth: `QUICK_START_AUTH.md`
