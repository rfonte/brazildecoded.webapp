# brazildecoded.webapp

Site estático inicial para o projeto **BrazilDecoded — Viagem & Turismo**, gerado com Eleventy. Este repositório contém templates, estilos e scripts do protótipo de captura de leads e páginas de contato.

**Avaliação do projeto (resumo rápido)**:

- **Escopo:** site estático com captura de e-mails (lead capture), formulário de contato e página administrativa local para exportar leads (usando localStorage como protótipo).
- **Pontos fortes:** estrutura Eleventy clara, boa separação de templates (`src/_includes`), CSS moderno e atenção à acessibilidade (skip-link, foco visível, ARIA).
- **Limitações atuais:** persistência de dados é apenas local (localStorage). Integração com serviço externo (Make, Mailchimp, backend) é opcional e precisa ser configurada.

**Estrutura principal**

- `src/index.njk` — página inicial
- `src/pages/cadastro.njk` — formulário de cadastro de e-mail (lead capture)
- `src/pages/contato.njk` — formulário de contato (prototipado para gravar em `localStorage`)
- `src/pages/leads.njk` / `leads.html` — página administrativa para visualizar/exportar leads
- `src/pages/thank-you.njk` — página de confirmação
- `src/_includes/layout.njk` — header/footer compartilhados e inclusão de `assets/js/script.js`
- `src/assets/` — CSS e JS fonte
- `dist/` — saída gerada pelo build (não comitada por padrão)

**Como rodar localmente (desenvolvimento)**

1. Instale Node.js (versão compatível) e npm.
2. No diretório do projeto, instale dependências:

```powershell
npm install
```

3. Rode o servidor de desenvolvimento (Eleventy com live-reload):

```powershell
npm run serve
```

4. Abra `http://localhost:8080/` no navegador.

Observação: ao editar arquivos em `src/`, o Eleventy irá regenerar `dist/` automaticamente.

**Build e deploy**

- Para gerar a saída estática em `dist/`:

```powershell
npm run build
```

- Deploy sugerido: GitHub Pages (via GitHub Actions) ou um serviço estático (Netlify, Vercel). Garanta que `dist/` seja usado como diretório de publicação.

**Formulários e fluxo de leads**

- O formulário do starter kit (`id="starterKitForm"`) usa `data-make-url` para enviar a um webhook (Make) — se configurado, o script fará `fetch` para essa URL.
- Como protótipo, os formulários também salvam em `localStorage` para testes locais. Veja `src/assets/js/script.js` para detalhes.
- Página administrativa local: abra `/pages/leads.html` para ver, exportar (CSV) ou limpar leads salvos.

**Privacidade e consentimento**

- O formulário de cadastro exige um checkbox de consentimento antes do envio. Não envie ou armazene dados pessoais sem o consentimento explícito do usuário.
- Ao integrar com serviços externos (Mailchimp, Google Sheets, etc.), verifique requisitos legais de proteção de dados (LGPD/GDPR) e termos desses serviços.

**Configuração de webhook (Make / Integromat)**

1. Crie um scenario no Make e adicione um módulo de webhook personalizado.
2. Cole a URL do webhook no atributo `data-make-url` do formulário em `src/pages/cadastro.njk`.
3. Ative o scenario e teste um envio real.

**Checklist de qualidade / próximos passos recomendados**

- [ ] Validar e traduzir mensagens para PT-BR (atualmente algumas mensagens em inglês).
- [ ] Adicionar testes automáticos para validação de formulários (unit/integration).
- [ ] Implementar persistência segura server-side (serverless function ou pequeno backend).
- [ ] Adicionar envio real de e-mail (Mailchimp, SendGrid ou similar) e confirmação por e-mail.
- [ ] Revisar políticas de privacidade e SLA do serviço de e-mail escolhido.

**Solução rápida de problemas**

- Se o botão "Send me the Starter Kit" não reage: verifique se `src/assets/js/script.js` está carregado e se o checkbox de consentimento está marcado (o script usa a classe `.disabled` para controle visual).
- Se o webhook não funcionar: confirme a URL em `data-make-url` e verifique os logs do serviço (Make).

Se quiser, eu posso:

- traduzir todas as mensagens do formulário para PT-BR e atualizar o site, ou
- implementar uma função serverless (ex.: Netlify Functions / Vercel Serverless / AWS Lambda) para persistir leads, ou
- criar uma integração pronta com Mailchimp/Tally.

---
