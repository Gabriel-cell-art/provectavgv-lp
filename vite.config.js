import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';

// O video do hero e opcional. Em vez de sondar por rede em runtime (que gera
// 404 no console quando o arquivo nao existe), o build detecta a presenca do
// arquivo e o JS so tenta carregar quando ele realmente esta la.
// Basta colocar hero.mp4 em public/assets/video/ e publicar: o deploy da Vercel
// roda o build de novo e o video passa a entrar sozinho.
const TEM_VIDEO = existsSync('public/assets/video/hero.mp4');

export default defineConfig({
  define:{ __TEM_VIDEO__: JSON.stringify(TEM_VIDEO) },
  build:{
    target:'es2020',
    cssCodeSplit:false,
    assetsInlineLimit:2048,
    rollupOptions:{ output:{ manualChunks:{ motion:['gsap','lenis'] } } }
  }
});
