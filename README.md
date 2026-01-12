# brazildecoded.webapp

Site estático inicial para o projeto BrazilDecoded — Viagem & Turismo.

Arquivos adicionados:

- `index.html` — página inicial
- `contato.html` — formulário de contato (salva em localStorage como protótipo)
- `cadastro.html` — formulário de cadastro de e-mail (lead capture)
- `assets/style.css` — estilos básicos e responsividade simples
- `assets/script.js` — lógica de formulário para protótipo estático

Como abrir localmente:

1. Abra o arquivo `index.html` no navegador (duplo-clique ou arraste para a janela do navegador).
2. Os formulários gravam dados em `localStorage` como protótipo. Para ver os dados, abra o console do navegador e execute `localStorage.getItem('brazildecoded_leads')` ou `localStorage.getItem('brazildecoded_contacts')`.

Próximos passos sugeridos:

- Melhorar o layout e a acessibilidade.
- Integrar um back-end ou serviço de e-mail para persistência real dos leads.
- Adicionar validação e testes mais robustos.
