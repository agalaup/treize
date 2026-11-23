// Fabrique les icônes de l'appli (PNG) sans aucune dépendance.
// Dessin : fond sombre arrondi, 4 cartes aux couleurs des familles.
// Lancer : node scripts/icones.js
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const FOND = [0x2a, 0x2a, 0x28];
const CARTES = [
  [0x1f, 0x4f, 0xd8], // bleu
  [0xff, 0xff, 0xff], // blanc
  [0xf2, 0xb7, 0x05], // jaune
  [0xb8, 0x4a, 0x2e], // brique
];

const tableCrc = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc(buf) {
  let c = 0xffffffff;
  for (const o of buf) c = tableCrc[(c ^ o) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function bloc(type, donnees) {
  const tete = Buffer.alloc(8);
  tete.writeUInt32BE(donnees.length, 0);
  tete.write(type, 4, 'ascii');
  const fin = Buffer.alloc(4);
  fin.writeUInt32BE(crc(Buffer.concat([tete.subarray(4), donnees])), 0);
  return Buffer.concat([tete, donnees, fin]);
}

/** Vrai si (x, y) est dans le rectangle arrondi. */
function dansArrondi(x, y, x0, y0, l, h, r) {
  if (x < x0 || y < y0 || x >= x0 + l || y >= y0 + h) return false;
  const cx = Math.min(Math.max(x, x0 + r), x0 + l - r);
  const cy = Math.min(Math.max(y, y0 + r), y0 + h - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/** `plein` : le fond couvre tout le carré (icône « maskable » et iPhone). */
function icone(t, plein) {
  const px = Buffer.alloc(t * (t * 4 + 1));
  const lc = t * 0.15;
  const hc = t * 0.42;
  const ecart = t * 0.035;
  const x0 = (t - 4 * lc - 3 * ecart) / 2;
  const y0 = (t - hc) / 2;
  for (let y = 0; y < t; y++) {
    const ligne = y * (t * 4 + 1);
    for (let x = 0; x < t; x++) {
      let c = null;
      if (plein || dansArrondi(x + 0.5, y + 0.5, 0, 0, t, t, t * 0.2)) c = FOND;
      for (let i = 0; i < 4; i++) {
        if (dansArrondi(x + 0.5, y + 0.5, x0 + i * (lc + ecart), y0, lc, hc, t * 0.025)) c = CARTES[i];
      }
      const o = ligne + 1 + x * 4;
      if (c) px.set([c[0], c[1], c[2], 255], o);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(t, 0);
  ihdr.writeUInt32BE(t, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8 bits, RVB + transparence
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloc('IHDR', ihdr),
    bloc('IDAT', deflateSync(px, { level: 9 })),
    bloc('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
writeFileSync('public/icone-192.png', icone(192, false));
writeFileSync('public/icone-512.png', icone(512, false));
writeFileSync('public/icone-pleine-512.png', icone(512, true));
writeFileSync('public/icone-iphone.png', icone(180, true));
console.log('Icônes écrites dans public/');
