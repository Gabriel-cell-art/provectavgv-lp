import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import mapaMateriais from './plugins/mapa-materiais.js';
import rotaFunil from './plugins/rota-funil.js';

// O video do hero e opcional. Em vez de sondar por rede em runtime (que gera
// 404 no console quando o arquivo nao existe), o build detecta a presenca do
// arquivo e o JS so tenta carregar quando ele realmente esta la.
// Basta colocar hero.mp4 em public/assets/video/ e publicar: o deploy da Vercel
// roda o build de novo e o video passa a entrar sozinho.
const TEM_VIDEO = existsSync('public/assets/video/hero.mp4');

export default defineConfig({
  plugins:[ mapaMateriais(), rotaFunil() ],
  // Multipagina: sem fallback de SPA, senao /entrega cai na home silenciosamente.
  appType:'mpa',
  define:{ __TEM_VIDEO__: JSON.stringify(TEM_VIDEO) },
  build:{
    target:'es2020',
    cssCodeSplit:true,   // cada pagina so carrega o proprio CSS; o funil usa inline
    assetsInlineLimit:2048,
    rollupOptions:{
      // Multipagina: a home e a pagina de entrega do funil organico.
      input:{
        main:    resolve(process.cwd(),'index.html'),
        entrega: resolve(process.cwd(),'entrega/index.html'),
        funil:   resolve(process.cwd(),'funil/index.html')
      },
      output:{ manualChunks:{ motion:['gsap','lenis'] } }
    }
  }
});
