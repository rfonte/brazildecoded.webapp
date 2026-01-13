SEO: Mapeamento de palavras-chave

Objetivo: melhorar o posicionamento e conversão do site com foco em vendas do eBook e captação de leads.

1) Palavras-chave principais por página

- Home (`/index.html`)
  - Primárias: "guia de viagem Brasil", "guia para viajar ao Brasil", "dicas de viagem Brasil"
  - Secundárias: "roteiros Brasil", "segurança viagem Brasil", "o que fazer no Brasil"
  - Meta title sugerido: "BrazilDecoded — Guia de Viagem para o Brasil | Dicas, Segurança e Roteiros"
  - Meta description sugerida: "Guia prático para viajar pelo Brasil: dicas de segurança, transporte, atrações imperdíveis e roteiros. Compre o eBook ou baixe o Starter Kit gratuito."

- Cadastro / Starter Kit (`/pages/cadastro.html`)
  - Primárias: "starter kit viagem Brasil", "kit viagem grátis Brasil", "baixar starter kit Brasil"
  - Secundárias: "guia viagem gratuito", "guia PDF Brasil"
  - Title: "Starter Kit de Viagem — BrazilDecoded"
  - Description: "Baixe o Starter Kit de Viagem do BrazilDecoded por e-mail — dicas de segurança, etiqueta e checklist."

- Página de checkout / vendas (separada) (Hotmart/Gumroad)
  - Primárias: "comprar guia viagem Brasil", "guia Brasil comprar", "eBook viagem Brasil"
  - Use páginas de produto com `Product` schema + preço e disponibilidade.

- Contato (`/pages/contato.html`)
  - Primárias: "contato BrazilDecoded", "parcerias guia Brasil", "suporte guia viagem"
  - Description: "Fale com o BrazilDecoded para parcerias, suporte ao cliente ou dúvidas sobre o guia de viagem."

- Thank-you (noindex)
  - Title: "Obrigado — Pedido recebido | BrazilDecoded"

2) Ações aplicadas nesta alteração

- Titles e descriptions atualizados para PT-BR nas páginas: `index.njk`, `cadastro.njk`, `contato.njk`, `thank-you.njk`.
- `cadastro.njk` recebeu JSON-LD `Product` para rich results.
- `src/_data/site.json` atualizado com descrição em PT-BR e labels de navegação em PT-BR.
- `src/_includes/layout.njk` inclui JSON-LD de `WebSite` e `Organization`, OG e Twitter defaults.
- `src/sitemap.xml.njk` com `changefreq` e `priority`.

3) Próximos passos recomendados

- Mapear palavras-chave de cauda longa por seção (ex.: "roteiro 7 dias Rio de Janeiro e Salvador").
- Criar páginas de conteúdo (blog/guides) otimizadas para essas palavras-chave para atrair tráfego orgânico.
- Implementar `hreflang` se houver conteúdo multilíngue.
- Submeter sitemap ao Google Search Console e testar páginas com Rich Results Test.
- Monitorar tráfego e conversões com Google Analytics/GA4 e ajustar copy/páginas conforme resultados.

4) Monitoramento e métricas

- Métricas iniciais: taxa de conversão do formulário de Starter Kit, visualizações da página de vendas, CTR de resultados orgânicos.
- Ferramentas recomendadas: Google Search Console, Google Analytics (GA4), Hotjar (heatmaps), Ahrefs/SEMrush.

---

Se quiser, eu aplico hreflang, variantes de titles para A/B testing ou crio a primeira página de conteúdo otimizada (ex.: "Roteiro de 7 dias pelo Brasil: o essencial").
