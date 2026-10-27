// Adaptado do Mira mira-history/scripts/narrar.mjs. Copyright Sandeco; LICENSE-MIRA.
const BITRATES = {
  1: {
    1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
    2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
    3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  },
  2: {
    1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
    2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  },
};
const SAMPLES = {
  1: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  25: [11025, 12000, 8000],
};
export function mp3Duration(buf) {
  let i = 0;
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33)
    i =
      10 +
      (((buf[6] & 127) << 21) |
        ((buf[7] & 127) << 14) |
        ((buf[8] & 127) << 7) |
        (buf[9] & 127));
  let seg = 0,
    quadros = 0;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) {
      i++;
      continue;
    }
    const verBits = (buf[i + 1] >> 3) & 3,
      layer = 4 - ((buf[i + 1] >> 1) & 3),
      brIdx = buf[i + 2] >> 4,
      srIdx = (buf[i + 2] >> 2) & 3,
      pad = (buf[i + 2] >> 1) & 1;
    const ver = verBits === 3 ? 1 : verBits === 2 ? 2 : verBits === 0 ? 25 : 0;
    if (!ver || layer === 4 || brIdx === 0 || brIdx === 15 || srIdx === 3) {
      i++;
      continue;
    }
    const br = BITRATES[ver === 1 ? 1 : 2][layer][brIdx] * 1000,
      sr = SAMPLES[ver][srIdx];
    const spf = layer === 1 ? 384 : layer === 2 ? 1152 : ver === 1 ? 1152 : 576;
    const len =
      layer === 1
        ? (((12 * br) / sr + pad) * 4) | 0
        : (((spf / 8) * br) / sr + pad) | 0;
    if (len <= 0) {
      i++;
      continue;
    }
    seg += spf / sr;
    quadros++;
    i += len;
  }
  return quadros > 0 ? seg : 0;
}
