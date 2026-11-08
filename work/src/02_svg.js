/* ================= 内联 SVG 工具（头像渲染） ================= */
function hexMix(hex, target, p) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(target.slice(1), 16);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * p), g = Math.round(ag + (bg - ag) * p), bl = Math.round(ab + (bb - ab) * p);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
}
const dark = (h, p) => hexMix(h, '#120b1a', p);
const light = (h, p) => hexMix(h, '#ffffff', p);

function avatarSVG(m) {
  const src = (typeof ART_AV !== 'undefined' && ART_AV[m.key]) || '';
  if (!src) return `<span class="av-fallback" style="background:${m.color}"></span>`;
  return `<img class="av-img" src="${src}" alt="${m.name}" draggable="false" loading="lazy" decoding="async">`;
}
