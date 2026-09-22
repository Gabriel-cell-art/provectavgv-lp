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
public/assets/frames/   48 frames WebP da sequência cinematográfica (desktop)
public/assets/video/    slot do vídeo do hero (vazio por enquanto)
tools/                  scripts de auditoria (Lighthouse e screenshots)
```

## Vídeo do hero — como plugar

O hero funciona sem vídeo: o fundo é feito em código (arco de luz com gradiente
radial que respira em 7,5s + textura de pontos estilo LED). **Não é um espaço vazio.**

Para adicionar o vídeo, coloque os arquivos em `public/assets/video/` e publique:

| arquivo | formato |
|---|---|
| `hero.mp4` | 1080p, 6–8s em loop, **sem áudio**, H.264, **abaixo de 3 MB** |
| `hero.webm` | mesma fonte, VP9 (opcional, servido antes do MP4 quando suportado) |

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

## Resultado da auditoria

Lighthouse mobile (throttling 4x CPU, Slow 4G), rodado sobre `npm run preview`:

| | |
|---|---|
| Performance | **99** |
| Acessibilidade | **100** |
| Boas práticas | **100** |
| SEO | **100** |
| LCP | **1,7s** (meta < 2,5s) |
| CLS | **0,005** (meta < 0,1) |
| Peso total | **141 KiB** (meta < 1,5 MB sem vídeo) |

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
