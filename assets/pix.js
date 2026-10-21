// Pix "copia e cola" (BR Code estático, padrão EMV do Banco Central) com valor e identificador.

const field = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`;

function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

const plain = (s, max) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 .\-]/g, '').toUpperCase().slice(0, max).trim();

// Chave: telefone com +55, CPF/CNPJ só números, e-mail minúsculo, aleatória como está.
export function normalizeKey(k) {
  const key = String(k || '').trim();
  if (key.includes('@')) return key.toLowerCase();
  if (key.startsWith('+')) return `+${key.replace(/\D/g, '')}`;
  if (/^[\d.\-/ ]+$/.test(key)) return key.replace(/\D/g, '');
  return key;
}

export function pixPayload({ chave, nome, cidade, valor, txid }) {
  const merchant = field('00', 'br.gov.bcb.pix') + field('01', normalizeKey(chave));
  const id = (String(txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25)) || '***';
  const body = field('00', '01')
    + field('26', merchant)
    + field('52', '0000')
    + field('53', '986')
    + (valor ? field('54', Number(valor).toFixed(2)) : '')
    + field('58', 'BR')
    + field('59', plain(nome, 25) || 'EKKLESIA')
    + field('60', plain(cidade, 15) || 'BRASIL')
    + field('62', field('05', id))
    + '6304';
  return body + crc16(body);
}

export function qrSVG(text, size = 240) {
  const q = window.qrcode(0, 'M');
  q.addData(text);
  q.make();
  const n = q.getModuleCount(), m = 2, t = n + m * 2;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
  return `<svg viewBox="0 0 ${t} ${t}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="QR Code Pix"><rect width="${t}" height="${t}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

export const _test = { crc16 };
