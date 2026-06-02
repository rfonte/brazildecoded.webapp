# Changelog

## [1.1.0](https://github.com/rfonte/brazildecoded.webapp/compare/v1.0.0...v1.1.0) (2026-06-02)


### Features

* add Express backend server with JWT auth and dev tooling ([3312c77](https://github.com/rfonte/brazildecoded.webapp/commit/3312c7715060744bb50a841095d4889c39626b7b))
* add Pinterest domain verification meta tag ([19ce672](https://github.com/rfonte/brazildecoded.webapp/commit/19ce67283030ab9879a05db28768776db95288ee))
* destaque para links sociais com icones e nova secao ([4882de6](https://github.com/rfonte/brazildecoded.webapp/commit/4882de6ea1a93c54f2a2a90cfa3f65f92404fde5))
* integrar Cloudflare Turnstile e Worker no formulário do starter kit ([69631c8](https://github.com/rfonte/brazildecoded.webapp/commit/69631c82f09897243e52a18a3bb6dfecbc67aae9))
* redesign starter kit email template ([4a719d6](https://github.com/rfonte/brazildecoded.webapp/commit/4a719d67f03a8ceb587020936db9ca4bec13cc92))
* redesign starter kit page layout and success panel ([a1aae5e](https://github.com/rfonte/brazildecoded.webapp/commit/a1aae5ef7f7da8e84c7295599e0a1649844f3207))
* Revisão do redme, melhorias no visual e complemento ([3819d2a](https://github.com/rfonte/brazildecoded.webapp/commit/3819d2a533828f832e86212ad79979e00ffb3962))
* updates to JS, pages, config, and tests ([59f0050](https://github.com/rfonte/brazildecoded.webapp/commit/59f005023ff344a17ed3195024a5f38b16fd25c4))


### Bug Fixes

* add rate limiting to all authenticated routes (CodeQL) ([7df2beb](https://github.com/rfonte/brazildecoded.webapp/commit/7df2bebb18bbf936ddc8bd867ef1bac487ae76b1))
* add rate limiting to server.js route mounts ([72f4ca7](https://github.com/rfonte/brazildecoded.webapp/commit/72f4ca77182830d480dfe03f1ce6793985b9eec5))
* ajustar validação de Turnstile e restaurar Make webhook ([3906f6d](https://github.com/rfonte/brazildecoded.webapp/commit/3906f6d10755a00ee4331b14049e28ff51d7b8e1))
* correct download URL in email template ([f177a5a](https://github.com/rfonte/brazildecoded.webapp/commit/f177a5a66ee22fe648163448628f1b3c0fadb8f4))
* correct unit tests import and remove duplicates ([95e1cc4](https://github.com/rfonte/brazildecoded.webapp/commit/95e1cc4c254b897a1afc586e22689696a0312fff))
* downgrade jsonwebtoken to 9.0.2 (9.1.2 does not exist on npm) ([6a5cfb3](https://github.com/rfonte/brazildecoded.webapp/commit/6a5cfb3c82ac813ca657e33d6b57a34f6371d0d0))
* include company and form_token in starter kit payload ([0579f0c](https://github.com/rfonte/brazildecoded.webapp/commit/0579f0cc0d37f9c8a33577a8e080965c52697e17))
* make starter-kit button interactive; use .disabled class so consent messages show ([a92ae25](https://github.com/rfonte/brazildecoded.webapp/commit/a92ae2549accd86cc4b893df810e54853beae7bc))
* make success state unambiguous after form submit ([9d5e21d](https://github.com/rfonte/brazildecoded.webapp/commit/9d5e21decc2d2ff32051a07e5129ab6783c1ea68))
* migrar pool para vmForks, corrigir setLocation e asserção errada no Turnstile ([0ecbed2](https://github.com/rfonte/brazildecoded.webapp/commit/0ecbed224271118be393f59a751f81458cdae007))
* remove native disabled attribute from starter-kit button in cadastro.njk ([35bff15](https://github.com/rfonte/brazildecoded.webapp/commit/35bff151be2fbba635f3fd098a3e33dcc2acd1e2))
* remove native disabled from lead.njk ([d6b4c76](https://github.com/rfonte/brazildecoded.webapp/commit/d6b4c76cdb5e8a1ddc94df03e7ae4a9d46ab5bcb))
* renomear campo name→nome e turnstile_token→token no payload ([08e49cb](https://github.com/rfonte/brazildecoded.webapp/commit/08e49cb56650b5ed89313b56693b653e2d5870c2))
* standardize payload keys to English convention ([1cbd53f](https://github.com/rfonte/brazildecoded.webapp/commit/1cbd53f7105ddb47f9990b59c9bb36f0e7becbac))
* success state takes over full page width on submit ([a1e617c](https://github.com/rfonte/brazildecoded.webapp/commit/a1e617cbdcd32efb8dd07ec8b9f00ee2181a57a3))
* use position:absolute on honeypot to improve bot detection ([b18989a](https://github.com/rfonte/brazildecoded.webapp/commit/b18989af76266960f5e46a5dfbc8fe57b87adf6d))
* validateStarterForm always returned undefined on normal flow ([d4646c6](https://github.com/rfonte/brazildecoded.webapp/commit/d4646c6bee789b18c8ca1e045a8ac8a1968adb53))


### Performance

* minify HTML, add cache headers, update docs/scripts ([b448b1f](https://github.com/rfonte/brazildecoded.webapp/commit/b448b1f9e1fe3049975b41e0cbf63f405cd1959e))
