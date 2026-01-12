# brazildecoded.webapp

Site estatico inicial para o projeto BrazilDecoded - Viagem & Turismo.

Estrutura principal:

- `index.html` - pagina inicial
- `pages/contato.html` - formulario de contato (salva em localStorage como prototipo)
- `pages/cadastro.html` - formulario de cadastro de e-mail (lead capture)
- `assets/css/style.css` - estilos e responsividade simples
- `assets/js/script.js` - logica de formulario para prototipo estatico
- `pages/leads.html` - pagina administrativa para visualizar/exportar leads

Como abrir localmente:

1. Abra o arquivo `index.html` no navegador (duplo-clique ou arraste para a janela do navegador).
2. Os formularios gravam dados em `localStorage` como prototipo. Para ver os dados, abra o console do navegador e execute `localStorage.getItem('brazildecoded_leads')` ou `localStorage.getItem('brazildecoded_contacts')`.

Administracao local:

- Abra `pages/leads.html` para visualizar os leads coletados localmente, exportar como CSV ou limpar o armazenamento local.

Proximos passos sugeridos:

- Melhorar o layout e a acessibilidade.
- Integrar um back-end ou servico de e-mail para persistencia real dos leads.
- Adicionar validacao e testes mais robustos.

Observacoes de privacidade e consentimento:

- O formulario de cadastro inclui um checkbox de consentimento; nao guarde ou envie dados pessoais sem consentimento.
