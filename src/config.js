/* ============================================================
   CONFIGURACAO GLOBAL DO FUNIL
   Valores que valem para todos os materiais. Nada aqui e
   especifico de um material: o conteudo de cada um mora em
   content/materiais/.
   ============================================================ */

// Formato internacional exigido pelo wa.me: 55 + DDD + numero, so digitos.
// Usado pela /entrega (Proximo elo e pop-up de diagnostico).
export const WHATSAPP_NUMERO = '5571993068515';

// Destino dos leads: o mesmo do formulario da home.
export const FORMSPREE = 'https://formspree.io/f/mljdbbkw';
export const MAKE      = 'https://hook.us2.make.com/pybg5rima742nx5l2brpvj7cfe9oa18g';

// Respostas de quiz e pop-up tambem vao para o Formspree (um e-mail por envio).
// O plano free limita a 50 envios/mes somando tudo: com cadastro + quiz +
// pop-up, cada lead pode gastar 3. Troque para false para mandar so ao Make.
export const RESPOSTAS_NO_FORMSPREE = true;

export const ORIGEM = 'funil-ia';
