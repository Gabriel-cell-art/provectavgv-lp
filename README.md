# Provecta VGV — landing page

LP única para construtoras e incorporadoras. Build estático com Vite, deploy
automático na Vercel a partir da branch conectada. Domínio: `vgv.provectamkt.com`.

## Rodar

```bash
npm install
npm run dev       # desenvolvimento
npm run build     # gera dist/
npm run preview   # serve dist/ em localhost:4173
```

## Estrutura

```
index.html              markup semântico (um <h1>, hierarquia correta)
src/styles/base.css     tokens, tipografia, reveal, prefers-reduced-motion
src/styles/secoes.css   componentes e seções
src/scripts/main.js     entrada única — importa GSAP, ScrollTrigger e Lenis UMA vez
src/scripts/formulario.js  captação isolada do motion
src/scripts/entrega.js  página /entrega (seções do .md, quiz, pop-up)
src/config.js           WhatsApp e destinos de lead
content/                materiais do funil e pop-up de diagnóstico
public/assets/frames/   48 frames WebP da sequência cinematográfica (desktop)
public/assets/video/    slot do vídeo do hero (vazio por enquanto)
tools/                  scripts de auditoria (Lighthouse e screenshots)
```

## Vídeo do hero — como plugar

O hero tem vídeo. Sem ele, o fundo em código assume sozinho (arco de luz com
gradiente radial que respira em 7,5s + textura de pontos LED) — **não é um
espaço vazio**.

Arquivos em `public/assets/video/`:

| arquivo | o que é | peso |
|---|---|---|
| `hero.mp4` | 1920x1080, 12,1s, 30fps, H.264 high, **sem faixa de áudio** | 776 KB |
| `hero.webm` | mesma fonte em VP9, servido antes do MP4 quando suportado | 443 KB |
| `hero-poster.webp` | primeiro frame, definido via JS (não como atributo) | 5,8 KB |

**Trocando o vídeo**, atente a três coisas:

1. **H.264, nunca H.265/HEVC.** O master original veio em HEVC, que o Chrome e o
   Firefox não tocam em MP4. Transcodifique:
   `ffmpeg -i origem.mp4 -an -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 30 -preset slow -movflags +faststart hero.mp4`
2. **Remova a faixa de áudio** (`-an`). O elemento roda mudo; áudio é só peso.
3. **Reveja o enquadramento.** O vídeo atual tem o logo centralizado, que em
   tamanho natural cai atrás do card do formulário e lê como marca cortada.
   O CSS o escala em 2.6 e desloca (`.hero-video` em `secoes.css`) para que só a
   aresta diagonal e o campo de luz entrem em quadro. Outro vídeo provavelmente
   pede outra escala — ou nenhuma.

A duração de 12,1s foge da recomendação original de 6–8s de propósito: o primeiro
e o último frame do clipe são praticamente idênticos, então ele fecha o loop
sozinho. Cortar para 8s quebraria essa emenda, e a 776 KB a duração extra não
custa nada.

O `vite.config.js` detecta `hero.mp4` em tempo de build. Sem o arquivo, todo o
código do vídeo é eliminado do bundle — zero requisição, zero 404. Com o arquivo,
ele entra sozinho no próximo deploy.

**Condições de carregamento** (nenhuma delas é opcional):
- largura ≥ 1024px — no celular fica só o fundo em CSS
- `navigator.connection.saveData` desligado
- `prefers-reduced-motion` não solicitado
- sempre depois do LCP, via `requestIdleCallback` — o texto do hero renderiza primeiro

## Motion

- **Lenis** só em desktop com ponteiro fino, integrado ao ScrollTrigger via
  `gsap.ticker` (`lagSmoothing(0)`). Sem loop `requestAnimationFrame` paralelo.
- **`gsap.matchMedia()`** com variante própria por dispositivo, não versão cortada:
  - desktop: pin com scrub nos 48 frames em canvas + parallax + cursor
  - mobile: zoom atravessando a logo em vetor (`force3D:false`), pin curto, sem cursor
- **`prefers-reduced-motion`**: desliga Lenis, pin, parallax, ticker, cursor e vídeo.
  O conteúdo aparece inteiro, estático.
- Só `transform` e `opacity` são animados.

## Captação de lead

`src/scripts/formulario.js` é inicializado **antes** do motion e isolado dele: se o
GSAP falhar, o formulário continua funcionando e visível.

- **Formspree** (`mljdbbkw`) dispara o e-mail e decide sucesso/erro na tela.
- **Make** recebe em paralelo, sem bloquear, para não quebrar automação existente.
  Para desligar, esvazie a constante `MAKE`.
- Campo honeypot (`_gotcha`) contra bot.
- Backup de cada lead em `localStorage` (`provecta_leads`).
- `?debug=1` mostra status HTTP e resposta do endpoint na tela e no console.

> Plano free do Formspree limita a 50 envios/mês. Acima disso os envios são
> bloqueados em silêncio — confira o plano antes de subir campanha.

## Funil orgânico: materiais, quiz e Raio-X

Home com `?m=<palavra>` entra em modo funil. O envio gera um `lead_id` (uuid),
manda junto com o cadastro e redireciona para
`/entrega/?m=<PALAVRA>&q=<0|1>&s=<segmento>&l=<lead_id>`.
`s` = `construtora | imobiliaria | corretor | outro`.

Configuração global em `src/config.js` (`WHATSAPP_NUMERO`, Formspree, Make).

### Material novo (só arquivos em `content/materiais/`)

| arquivo | obrigatório | o que é |
|---|---|---|
| `<palavra>.md` | sim | frontmatter + seções. A palavra é o nome do arquivo. |
| `<palavra>.quiz.json` | com `quiz: true` | perguntas: `chave`, `texto`, `tipo` (`texto`/`unica`/`multipla`), `obrigatoria`, `placeholder`, `opcoes`, `exclusiva`, `padrao` |
| `<palavra>.prompt.txt` | com `quiz: true` | prompt-modelo com `{{chave}}` |

Frontmatter: `titulo`, `descricao`, `tipo`, `ativo`, `quiz`, `proximo`,
`urlMaterial`, `acaoWhatsapp` (frase do pop-up, aceita `{{chave}}` do quiz),
`rotulo_<secao>`. Lista completa em `src/data/materiais.js`.

Seções do `.md`, renderizadas na ordem do arquivo, cada uma aberta por um
marcador: `<!-- intro -->`, `<!-- passos -->`, `<!-- quiz -->`,
`<!-- material -->`, `<!-- proximo -->`, `<!-- qualificado -->` (só q=1),
`<!-- nao-qualificado -->` (só q=0). Parágrafo que é só um link vira botão.
`<!-- proximo -->` só aparece se o material de `proximo` existir e estiver ativo.
Um `.md` só com frontmatter usa o cartão simples de antes (ex.: `forms.md`).

No prompt, múltipla escolha entra separada por vírgula, opcional vazia entra
vazia e `padrao` preenche a resposta em branco.

### Pop-up de diagnóstico (Raio-X)

Global, definido em `content/popup-diagnostico.json`: perguntas, regra de
vazamento por opção (`vazamento`), frases, títulos e mensagem de WhatsApp.
Abre só depois de copiar o prompt e enquanto não foi respondido: no
carregamento, ao voltar para a aba (visibilitychange/focus/pageshow) ou 30s
após a cópia. No máximo uma vez por sessão. Fechado sem resposta, vira cartão
no fim da página; respondido, o cartão mostra o resultado salvo.

Estado salvo em `localStorage` por material e lead (`provecta:<PALAVRA>:<lead_id>`):
respostas do quiz, prompt, flag `copiou`, respostas do pop-up. Quem volta do app
do Claude e tem a página recarregada encontra o prompt pronto.

Quiz e pop-up enviam ao Make e ao Formspree com `lead_id`, `m`,
`origem = funil-ia` e `tipo_envio` (`quiz` ou `raio-x`). Para poupar a cota do
Formspree, `RESPOSTAS_NO_FORMSPREE = false` em `src/config.js`.

## Resultado da auditoria

Lighthouse mobile (throttling 4x CPU, Slow 4G), rodado sobre `npm run preview`:

| | |
|---|---|
| Performance | **98** |
| Acessibilidade | **100** |
| Boas práticas | **100** |
| SEO | **100** |
| LCP | **1,9s** (meta < 2,5s) |
| CLS | **0,005** (meta < 0,1) |
| Peso total | **141 KiB** (meta < 1,5 MB sem vídeo) |

O vídeo não entra nessas medições porque nunca é requisitado no celular — as
condições de carregamento acima o excluem, e isso é verificado por
`tools/mobile-check.mjs`.

Os 48 frames (2,05 MB em WebP) são **desktop apenas** e carregam via
`requestIdleCallback` depois do hero — não entram no peso do mobile.

Para repetir a auditoria:

```bash
npm i -D lighthouse playwright
npm run build && npm run preview &
node tools/lh.mjs      # Lighthouse
node tools/shot.mjs    # screenshots + overflow + erros de console
```

## Decisões de marca registradas

- **Azul canônico `#2B9FF6`** (`--azul`). Contraste 6,95:1 sobre `#0A0A0F`.
- **`--glow`** é uma variável separada do `--azul`. O brief do hero pedia um arco
  **verde**, cor proibida pelo sistema de marca (§3). Está em azul e isolada:
  trocar só `--glow` muda o hero sem contaminar o resto da página.
- Tipografia: Inter (400/500/600/800/900) e IBM Plex Mono (400/500). Bricolage
  Grotesque e Hanken Grotesk foram removidas.
- Logo: SVG real vetorizado, reaproveitado do site anterior. Também gera o favicon.

## Sem preço, sem dado de cliente

Nenhum valor, tabela ou modelo de remuneração aparece na página. O dashboard e a
conversa de chat são ilustrativos e estão rotulados como tal. Os únicos números de
resultado são os validados (Goto +130%, Mood Costa Azul) e os de mercado com fonte
citada (ADEMI-BA, Brain).
