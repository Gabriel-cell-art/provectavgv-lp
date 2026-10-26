/* Le content/materiais/*.md e injeta o mapa palavra->titulo como script
   inline na pagina do funil. Assim o <h1> ja sai com o nome certo na
   primeira pintura, sem esperar modulo nenhum e sem deslocar layout. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function lerMapa(raiz){
  const dir = join(raiz,'content','materiais');
  const mapa = {};
  for(const f of readdirSync(dir)){
    if(!f.endsWith('.md')) continue;
    const texto = readFileSync(join(dir,f),'utf8');
    const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(texto);
    if(!m) continue;
    const fm = {};
    m[1].split(/\r?\n/).forEach(l=>{
      const i=l.indexOf(':'); if(i<1) return;
      fm[l.slice(0,i).trim()] = l.slice(i+1).trim();
    });
    if(fm.ativo === 'false') continue;
    const palavra = (fm.palavra || f.replace(/\.md$/,'')).toUpperCase();
    const titulo  = fm.titulo || '';
    if(!titulo) continue;
    // d = destino pos-envio. Material com quiz tem entrega propria; o
    // resto vai direto ao WhatsApp. `destino` no frontmatter tem prioridade.
    const destino = fm.destino ? fm.destino.toLowerCase()
                  : (fm.quiz === 'true' ? 'entrega' : 'whatsapp');
    const item = { t:titulo, d:destino };
    mapa[palavra] = item;
    if(fm.alias) mapa[fm.alias.toUpperCase()] = item;
  }
  return mapa;
}

export default function mapaMateriais(){
  let raiz = process.cwd();
  return {
    name:'mapa-materiais',
    configResolved(c){ raiz = c.root; },
    transformIndexHtml(html, ctx){
      if(!/funil[\\/]index\.html$/.test(ctx.filename || '')) return html;
      const json = JSON.stringify(lerMapa(raiz));
      return html.replace('/*__MAPA__*/', 'window.__MAT__=' + json + ';');
    }
  };
}
