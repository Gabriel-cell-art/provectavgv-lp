/* Espelha no preview local a reescrita que o vercel.json faz em producao:
   "/" com ?m= serve funil/index.html. Sem isso, o comportamento so
   apareceria depois do deploy. */
export default function rotaFunil(){
  const reescrever = (req,_res,next) => {
    try{
      const u = new URL(req.url, 'http://x');
      if((u.pathname === '/' || u.pathname === '/index.html') && u.searchParams.get('m')){
        req.url = '/funil/index.html' + u.search;
      }
    }catch(e){}
    next();
  };
  return {
    name:'rota-funil',
    configureServer(s){ s.middlewares.use(reescrever); },
    configurePreviewServer(s){ s.middlewares.use(reescrever); }
  };
}
