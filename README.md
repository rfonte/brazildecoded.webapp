# brazildecoded.webapp

Site estatico inicial para o projeto BrazilDecoded - Viagem & Turismo, agora usando Eleventy para reaproveitar layout.

Estrutura principal:

- `src/index.njk` - pagina inicial
- `src/pages/cadastro.njk` - formulario de cadastro de e-mail (lead capture)
- `src/pages/contato.njk` - formulario de contato (salva em localStorage como prototipo)
- `src/pages/leads.njk` - pagina administrativa para visualizar/exportar leads
- `src/pages/thank-you.njk` - pagina de confirmacao (noindex)
- `src/_includes/layout.njk` - header/footer compartilhados
- `src/assets/` - estilos e scripts
- `dist/` - build gerado (saida)

Como rodar localmente:

1. Instale dependencias com `npm install`.
2. Inicie o servidor com `npm run serve` (Eleventy).
3. Acesse o site gerado em `http://localhost:8080/`.

Administracao local:

- Abra `http://localhost:8080/pages/leads.html` para visualizar os leads coletados localmente, exportar como CSV ou limpar o armazenamento local.

Proximos passos sugeridos:

- Melhorar o layout e a acessibilidade.
- Integrar um back-end ou servico de e-mail para persistencia real dos leads.
- Adicionar validacao e testes mais robustos.

Observacoes de privacidade e consentimento:

- O formulario de cadastro inclui um checkbox de consentimento; nao guarde ou envie dados pessoais sem consentimento.
