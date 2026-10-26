/* ============================================================
   CONFIGURACAO GLOBAL DO FUNIL
   Valores que valem para todos os materiais. Nada aqui e
   especifico de um material: o conteudo de cada um mora em
   content/materiais/.
   ============================================================ */

// Formato internacional exigido pelo wa.me: 55 + DDD + numero, so digitos.
// Unico numero do site: home, Proximo elo e pop-up de diagnostico.
export const WHATSAPP_NUMERO = '5571993068515';

// Botao do bloco qualificado (q=1): o unico caminho para o diagnostico.
export const AGENDA_URL = 'https://calendar.app.google/3wJX8SBvu4HLUA8z5';
// Botao do bloco nao qualificado (q=0).
export const INSTAGRAM_URL = 'https://instagram.com/provecta.vgv';

// Destino dos leads: o mesmo do formulario da home.
export const FORMSPREE = 'https://formspree.io/f/mljdbbkw';
export const MAKE      = 'https://hook.us2.make.com/pybg5rima742nx5l2brpvj7cfe9oa18g';

// Respostas de quiz e pop-up vao so para o Make. Com true, tambem vao ao
// Formspree (um e-mail por envio, dentro do limite de 50/mes do plano free).
export const RESPOSTAS_NO_FORMSPREE = false;

export const ORIGEM = 'funil-ia';
