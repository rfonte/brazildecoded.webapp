# brazildecoded.webapp

Site estático inicial para o projeto BrazilDecoded — Viagem & Turismo.

Arquivos adicionados:

- `index.html` — página inicial
- `contato.html` — formulário de contato (salva em localStorage como protótipo)
- `cadastro.html` — formulário de cadastro de e-mail (lead capture)
- `assets/style.css` — estilos básicos e responsividade simples
- `assets/script.js` — lógica de formulário para protótipo estático
- `leads.html` — página administrativa para visualizar/exportar leads

Como abrir localmente:

1. Abra o arquivo `index.html` no navegador (duplo-clique ou arraste para a janela do navegador).
2. Os formulários gravam dados em `localStorage` como protótipo. Para ver os dados, abra o console do navegador e execute `localStorage.getItem('brazildecoded_leads')` ou `localStorage.getItem('brazildecoded_contacts')`.

Administração local:

- Abra `leads.html` para visualizar os leads coletados localmente, exportar como CSV ou limpar o armazenamento local.

Próximos passos sugeridos:

- Melhorar o layout e a acessibilidade.
- Integrar um back-end ou serviço de e-mail para persistência real dos leads.
- Adicionar validação e testes mais robustos.

Observações de privacidade e consentimento:

- Os formulários agora incluem um checkbox de consentimento no cadastro de e-mail; não guarde ou envie dados pessoais sem consentimento.
