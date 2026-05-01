# brazildecoded.webapp

[![Deploy Eleventy to GitHub Pages](https://github.com/rfonte/brazildecoded.webapp/actions/workflows/pages.yml/badge.svg)](https://github.com/rfonte/brazildecoded.webapp/actions/workflows/pages.yml)
[![Unit Tests](https://img.shields.io/github/actions/workflow/status/rfonte/brazildecoded.webapp/ci.yml?label=unit%20tests)](https://github.com/rfonte/brazildecoded.webapp/actions/workflows/ci.yml)
[![SEO Structured Data](https://img.shields.io/badge/SEO-structured%20data-green)](docs/SEO.md)
[![SonarCloud Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=rfonte_brazildecoded.webapp&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=rfonte_brazildecoded.webapp)
[![SonarCloud Coverage](https://sonarcloud.io/api/project_badges/measure?project=rfonte_brazildecoded.webapp&metric=coverage)](https://sonarcloud.io/summary/new_code?id=rfonte_brazildecoded.webapp)

Static site for BrazilDecoded, built with Eleventy. This repository contains the Eleventy templates, CSS, JavaScript, and form flows for the Starter Kit lead capture prototype, support page, and local admin experience.

## Visão geral

- **Escopo:** site estático com captura de leads por email, formulário de contato, painel admin local e integrações de webhook.
- **Diferenciais:** estrutura Eleventy simples, foco em acessibilidade básica (ARIA, labels, foco), e testes automatizados (Vitest + Playwright).
- **Limitações:** os dados de lead são mantidos localmente no prototype; integração externa depende de webhook/Make e configuração adicional.

## Sumário

- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Desenvolvimento local](#desenvolvimento-local)
- [Build](#build)
- [Testes](#testes)
- [Lint e formatação](#lint-e-formatação)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Fluxo de formulários e leads](#fluxo-de-formulários-e-leads)
- [Configuração sensível](#configuração-sensível)
- [Deploy](#deploy)
- [Contribuição](#contribuição)
- [Links úteis](#links-úteis)

## Requisitos

- Node.js 18+ recomendado
- npm
- Navegador moderno para testes Playwright

## Instalação

```powershell
npm install
```

## Desenvolvimento local

```powershell
npm run serve
```

Abra `http://localhost:8080/` no navegador.

## Build

```powershell
npm run build
```

## Testes

- Testes unitários (Vitest):

```powershell
npm run test:unit
```

- Testes unitários com cobertura:

```powershell
npm run test:unit:coverage
```

- E2E (Playwright):

```powershell
npm run test:e2e
```

  - A suíte E2E atual inclui `tests/e2e/starter-kit.spec.js` e `tests/e2e/site.spec.js`, cobrindo o formulário do Starter Kit, páginas de SEO e o fluxo de contato.

- Relatório SonarCloud:

```powershell
$env:SONAR_TOKEN="YOUR_TOKEN_HERE"
npm run sonar:summary
```

- Executar SonarCloud diretamente:

```powershell
$env:SONAR_TOKEN="YOUR_TOKEN_HERE"
npm run sonar
```

- Gancho pre-push:

```powershell
npm run prepush
```

> Observação: `setx SONAR_TOKEN "YOUR_TOKEN_HERE"` grava a variável para o usuário atual, mas é necessário abrir um novo terminal para que ela tenha efeito.

## Lint e formatação

```powershell
npm run lint
npm run format
```

## Estrutura do projeto

- `src/index.njk` - página inicial
- `src/pages/free-starter-kit.njk` - formulário de Starter Kit
- `src/pages/contact.njk` - formulário de contato
- `src/pages/leads.njk` - painel de leads local
- `src/pages/thank-you.njk` - página de agradecimento
- `src/pages/contato-sucesso.njk` - página de sucesso do Starter Kit
- `src/_includes/layout.njk` - layout compartilhado e tags globais
- `src/assets/css/` - CSS do site
- `src/assets/js/` - JavaScript do site
- `src/assets/images/` - imagens e ícones
- `src/_data/site.json` - dados de navegação e site
- `src/CNAME` - domínio customizado para GitHub Pages
- `docs/` - documentação adicional (SEO, TODOs)
- `tests/unit/` - testes de unidade (Vitest)
- `tests/e2e/` - testes end-to-end (Playwright)
- `tools/` - scripts utilitários (relatórios, Sonar)

## Fluxo de formulários e leads

- O Starter Kit usa `data-make-url` em `src/pages/free-starter-kit.njk` para apontar para um webhook Make.
- O formulário exige consentimento explícito antes de enviar dados.
- O admin local (`/pages/leads.html`) funciona como protótipo de exportação/visualização de leads.

## Configuração sensível

- O webhook em `data-make-url` é uma configuração sensível. mantenha-o fora de repositórios públicos e rotacione se vazar.
- O checkbox de consentimento (`#consent`) deve permanecer `required` antes de enviar o formulário.
- Não armazene nem envie dados pessoais sem consentimento. Ajuste a mensagem de privacidade conforme a legislação aplicável.

## Make webhook

1. Crie um cenário no Make com um gatilho **Custom webhook**.
2. Copie a URL do webhook para `data-make-url` em `src/pages/free-starter-kit.njk`.
3. Teste com **Run once** e, após validar, ative o cenário.
4. Conecte os módulos downstream (Google Sheets, Mailchimp, email, etc.).

## Deploy

- Publicação via GitHub Pages usando GitHub Actions.
- O site é construído com Eleventy e deployado a partir de `dist/`.

## GitHub Pages e cache

- GitHub Pages não aplica `_headers`. Use Cloudflare se precisar de cabeçalhos de cache personalizados.
- Exemplo de regra de cache:
  - `*/*` -> Bypass cache ou TTL curto para HTML
  - `/assets/*` -> Cache Everything, Edge TTL 1 ano
- Use `site.buildVersion` para controle de cache em CSS/JS.

## Contribuição

- Crie uma issue para bugs ou sugestões.
- Abra um PR com uma descrição clara do problema e das mudanças.
- Execute `npm run lint`, `npm run test:unit` e `npm run test:e2e` antes de submeter.

## Links úteis

- Eleventy: https://www.11ty.dev/
- Vitest: https://vitest.dev/
- Playwright: https://playwright.dev/
- SonarCloud: https://sonarcloud.io/
- Structured data report: `docs/SEO.md`

## Observações

- A versão mínima recomendada do Node.js é 18.
- Os arquivos gerados pela build não devem ser comitados se estiverem no `.gitignore`.
- Mantenha o texto de consentimento do formulário sincronizado com as regras de privacidade.


