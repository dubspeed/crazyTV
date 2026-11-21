// CrazyTV – Fernsehbild: Genre-Animationen, Testbild, Werbung.
// Wird für den Mini-Fernseher (DOM-Canvas) und die Bürofernseher im 3D-Turm (CanvasTexture) benutzt.

const TAU = Math.PI * 2;

function poly(g, pts, fill) {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}
function circle(g, x, y, r, fill, sides = 10) {
  const pts = [];
  for (let i = 0; i < sides; i++) pts.push(x + Math.cos((i / sides) * TAU) * r, y + Math.sin((i / sides) * TAU) * r);
  poly(g, pts, fill);
}
function rect(g, x, y, w, h, fill) { g.fillStyle = fill; g.fillRect(x, y, w, h); }
function bg(g, w, h, a, b) {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, a); gr.addColorStop(1, b);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}
// Kleine Low-Poly-Figur (Kopf + Körper)
function person(g, x, y, s, shirt, skin = '#f1c7a3', bob = 0) {
  poly(g, [x - 0.5 * s, y, x + 0.5 * s, y, x + 0.4 * s, y - 0.9 * s, x - 0.4 * s, y - 0.9 * s], shirt);
  circle(g, x, y - 1.25 * s + bob, 0.38 * s, skin, 7);
}

const ART = {
  reality(g, w, h, t) {
    bg(g, w, h, '#4fd1ff', '#ffe08a');
    circle(g, w * 0.8, h * 0.25, h * 0.14, '#fff36e', 12);
    rect(g, 0, h * 0.72, w, h * 0.28, '#f5d27a');
    poly(g, [0, h * 0.72, w, h * 0.7, w, h * 0.78, 0, h * 0.8], '#3ec1d3');
    const sway = Math.sin(t * 1.5) * 4;
    poly(g, [w * 0.18, h * 0.75, w * 0.21, h * 0.75, w * 0.22 + sway * 0.5, h * 0.35, w * 0.19 + sway * 0.5, h * 0.35], '#8b5a3c');
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI + Math.PI;
      poly(g, [w * 0.205 + sway, h * 0.33, w * 0.205 + sway + Math.cos(a) * w * 0.12, h * 0.33 + Math.sin(a) * h * 0.1 + h * 0.08, w * 0.205 + sway + Math.cos(a + 0.3) * w * 0.1, h * 0.33 + Math.sin(a + 0.3) * h * 0.1 + h * 0.1], '#3d9157');
    }
    person(g, w * 0.48, h * 0.8, h * 0.2, '#ff4f9a', '#f1c7a3', Math.sin(t * 4) * 2);
    person(g, w * 0.62, h * 0.8, h * 0.2, '#19c3b1', '#c98d64', Math.sin(t * 4 + 1) * 2);
    if (Math.sin(t * 2) > 0) circle(g, w * 0.55, h * 0.38, h * 0.06, '#ff6b6b', 6);
  },
  crime(g, w, h, t) {
    bg(g, w, h, '#1d2240', '#3b3f6b');
    circle(g, w * 0.82, h * 0.22, h * 0.1, '#fff6c4', 12);
    for (let i = 0; i < 4; i++) rect(g, w * (0.05 + i * 0.12), h * (0.35 + (i % 2) * 0.1), w * 0.1, h, '#2a2e52');
    poly(g, [w * 0.55, h, w * 0.68, h * 0.3, w * 0.81, h], 'rgba(255,240,180,0.18)');
    person(g, w * 0.68, h * 0.95, h * 0.28, '#5a4636');
    poly(g, [w * 0.6, h * 0.55, w * 0.76, h * 0.55, w * 0.72, h * 0.48, w * 0.64, h * 0.48], '#5a4636');
    const mx = w * 0.3 + Math.sin(t * 1.2) * w * 0.12;
    circle(g, mx, h * 0.62, h * 0.12, 'rgba(180,220,255,0.35)', 12);
    poly(g, [mx + h * 0.08, h * 0.7, mx + h * 0.1, h * 0.68, mx + h * 0.24, h * 0.85, mx + h * 0.22, h * 0.87], '#c9a26b');
  },
  drama(g, w, h, t) {
    bg(g, w, h, '#5b1f2e', '#2a0f18');
    for (let i = 0; i < 6; i++) poly(g, [i * w / 6, 0, (i + 1) * w / 6, 0, (i + 0.8) * w / 6, h, (i + 0.2) * w / 6, h], i % 2 ? '#8b2335' : '#a52a3f');
    poly(g, [0, 0, w * 0.18, 0, w * 0.1, h], '#6b1626');
    poly(g, [w, 0, w * 0.82, 0, w * 0.9, h], '#6b1626');
    const tilt = Math.sin(t) * 0.15;
    g.save(); g.translate(w * 0.4, h * 0.5); g.rotate(-0.2 + tilt);
    circle(g, 0, 0, h * 0.18, '#f6f4ef', 9);
    circle(g, -h * 0.06, -h * 0.03, h * 0.03, '#2a0f18', 5); circle(g, h * 0.06, -h * 0.03, h * 0.03, '#2a0f18', 5);
    poly(g, [-h * 0.08, h * 0.08, h * 0.08, h * 0.08, 0, h * 0.04], '#2a0f18');
    g.restore();
    g.save(); g.translate(w * 0.6, h * 0.52); g.rotate(0.2 - tilt);
    circle(g, 0, 0, h * 0.18, '#f0b429', 9);
    circle(g, -h * 0.06, -h * 0.03, h * 0.03, '#2a0f18', 5); circle(g, h * 0.06, -h * 0.03, h * 0.03, '#2a0f18', 5);
    poly(g, [-h * 0.08, h * 0.04, h * 0.08, h * 0.04, 0, h * 0.09], '#2a0f18');
    g.restore();
  },
  docu(g, w, h, t) {
    bg(g, w, h, '#8fd3ff', '#e9f6ff');
    poly(g, [0, h * 0.75, w * 0.3, h * 0.55, w * 0.55, h * 0.7, w, h * 0.5, w, h, 0, h], '#ffffff');
    poly(g, [0, h * 0.85, w, h * 0.78, w, h, 0, h], '#cfe8f5');
    for (let i = 0; i < 3; i++) {
      const x = w * (0.3 + i * 0.18) + Math.sin(t * 2 + i) * 3;
      const y = h * 0.82;
      poly(g, [x - h * 0.06, y, x + h * 0.06, y, x + h * 0.05, y - h * 0.22, x - h * 0.05, y - h * 0.22], '#1d2733');
      poly(g, [x - h * 0.035, y - h * 0.02, x + h * 0.035, y - h * 0.02, x + h * 0.03, y - h * 0.17, x - h * 0.03, y - h * 0.17], '#f6f4ef');
      circle(g, x, y - h * 0.26, h * 0.05, '#1d2733', 7);
      poly(g, [x + h * 0.03, y - h * 0.26, x + h * 0.07, y - h * 0.25, x + h * 0.03, y - h * 0.24], '#f4c34f');
    }
  },
  scifi(g, w, h, t) {
    bg(g, w, h, '#0b0b25', '#2b1d5c');
    for (let i = 0; i < 30; i++) {
      const x = ((i * 97 + t * 30 * (1 + (i % 3))) % w);
      rect(g, w - x, (i * 53) % h, 2, 2, '#ffffff');
    }
    circle(g, w * 0.2, h * 0.75, h * 0.3, '#8f6cf0', 12);
    circle(g, w * 0.2, h * 0.75, h * 0.3 * 0.7, '#a98cf5', 12);
    const ry = h * 0.45 + Math.sin(t * 2) * h * 0.06;
    g.save(); g.translate(w * 0.62, ry); g.rotate(-0.4);
    poly(g, [0, -h * 0.22, h * 0.07, -h * 0.05, h * 0.07, h * 0.12, -h * 0.07, h * 0.12, -h * 0.07, -h * 0.05], '#f6f4ef');
    poly(g, [-h * 0.07, h * 0.04, -h * 0.14, h * 0.16, -h * 0.07, h * 0.12], '#e2574c');
    poly(g, [h * 0.07, h * 0.04, h * 0.14, h * 0.16, h * 0.07, h * 0.12], '#e2574c');
    circle(g, 0, -h * 0.04, h * 0.03, '#4fb3ff', 6);
    poly(g, [-h * 0.05, h * 0.12, h * 0.05, h * 0.12, 0, h * (0.24 + Math.random() * 0.06)], '#ffb020');
    g.restore();
  },
  anim(g, w, h, t) {
    bg(g, w, h, '#ffd6f0', '#c9f2ff');
    for (let i = 0; i < 5; i++) poly(g, [0, h * (0.5 + i * 0.07), w, h * (0.5 + i * 0.07), w, h * (0.57 + i * 0.07), 0, h * (0.57 + i * 0.07)], ['#ff6b6b', '#ffc857', '#5fd68f', '#4f8fe2', '#8f6cf0'][i]);
    const jump = Math.abs(Math.sin(t * 3)) * h * 0.2;
    const x = w * 0.5, y = h * 0.62 - jump;
    poly(g, [x - h * 0.16, y, x + h * 0.14, y, x + h * 0.12, y - h * 0.14, x - h * 0.14, y - h * 0.14], '#ffffff');
    circle(g, x + h * 0.16, y - h * 0.2, h * 0.08, '#ffffff', 8);
    poly(g, [x + h * 0.18, y - h * 0.27, x + h * 0.22, y - h * 0.4, x + h * 0.2, y - h * 0.26], '#f4c34f');
    rect(g, x - h * 0.13, y, h * 0.04, h * 0.1, '#ffffff'); rect(g, x + h * 0.08, y, h * 0.04, h * 0.1, '#ffffff');
    poly(g, [x - h * 0.16, y - h * 0.12, x - h * 0.26, y - h * 0.04, x - h * 0.16, y - h * 0.04], '#ff6fa8');
  },
  show(g, w, h, t) {
    bg(g, w, h, '#2b1d5c', '#5b2a8c');
    for (let i = 0; i < 8; i++) {
      const a = t * 0.8 + (i / 8) * TAU;
      g.fillStyle = `rgba(255,255,255,${0.05 + (i % 2) * 0.05})`;
      g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2 + Math.cos(a) * w, Math.sin(a) * h + h); g.lineTo(w / 2 + Math.cos(a + 0.2) * w, Math.sin(a + 0.2) * h + h); g.fill();
    }
    const cx = w * 0.5, cy = h * 0.55, r = h * 0.3;
    const cols = ['#ff4f9a', '#19c3b1', '#f0b429', '#4f8fe2', '#ff8a3d', '#8f6cf0'];
    for (let i = 0; i < 12; i++) {
      const a0 = t * 2 + (i / 12) * TAU, a1 = a0 + TAU / 12;
      poly(g, [cx, cy, cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r], cols[i % cols.length]);
    }
    circle(g, cx, cy, r * 0.15, '#ffffff', 8);
    poly(g, [cx - 6, cy - r - 8, cx + 6, cy - r - 8, cx, cy - r + 6], '#ffffff');
  },
  cook(g, w, h, t) {
    bg(g, w, h, '#ffe7c2', '#f2c38a');
    rect(g, 0, h * 0.7, w, h * 0.3, '#c8955c');
    for (let i = 0; i < 6; i++) rect(g, w * (i / 6), 0, 2, h * 0.7, 'rgba(255,255,255,0.4)');
    poly(g, [w * 0.28, h * 0.66, w * 0.62, h * 0.66, w * 0.58, h * 0.78, w * 0.32, h * 0.78], '#2d3140');
    rect(g, w * 0.62, h * 0.68, w * 0.18, h * 0.03, '#2d3140');
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.6 + i / 3) % 1;
      g.fillStyle = `rgba(255,255,255,${0.7 * (1 - p)})`;
      circle(g, w * (0.38 + i * 0.08) + Math.sin(p * 6 + i) * 6, h * (0.6 - p * 0.45), h * (0.04 + p * 0.06), g.fillStyle, 7);
    }
    const flip = Math.abs(Math.sin(t * 2.5)) * h * 0.18;
    circle(g, w * 0.45, h * 0.64 - flip, h * 0.06, '#f4c34f', 8);
  },
  sitcom(g, w, h, t) {
    bg(g, w, h, '#ffd27f', '#f7b267');
    rect(g, w * 0.08, h * 0.15, w * 0.22, h * 0.3, '#9fd8ea');
    rect(g, w * 0.7, h * 0.18, w * 0.16, h * 0.22, '#8f6cf0');
    rect(g, 0, h * 0.8, w, h * 0.2, '#c8955c');
    poly(g, [w * 0.25, h * 0.82, w * 0.75, h * 0.82, w * 0.75, h * 0.55, w * 0.25, h * 0.55], '#4f8fe2');
    rect(g, w * 0.22, h * 0.6, w * 0.06, h * 0.22, '#3d74c2'); rect(g, w * 0.72, h * 0.6, w * 0.06, h * 0.22, '#3d74c2');
    const laugh = Math.sin(t * 8) > 0.3 ? -3 : 0;
    person(g, w * 0.42, h * 0.72, h * 0.18, '#ff6fa8', '#f1c7a3', laugh);
    person(g, w * 0.58, h * 0.72, h * 0.18, '#5cc98a', '#8d5a3b', -laugh);
  },
  sport(g, w, h, t) {
    bg(g, w, h, '#4caf6a', '#3d9157');
    for (let i = 0; i < 6; i++) rect(g, w * (i / 6), 0, w / 12, h, 'rgba(255,255,255,0.06)');
    rect(g, w * 0.5 - 1, 0, 2, h, 'rgba(255,255,255,0.7)');
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
    g.beginPath(); g.arc(w / 2, h / 2, h * 0.2, 0, TAU); g.stroke();
    const bx = w * 0.5 + Math.sin(t * 1.7) * w * 0.32;
    const by = h * 0.55 + Math.sin(t * 3.1) * h * 0.2;
    circle(g, bx, by, h * 0.06, '#ffffff', 7);
    circle(g, bx, by, h * 0.025, '#2d3140', 5);
    person(g, bx - w * 0.12, h * 0.9, h * 0.16, '#e2574c');
    person(g, bx + w * 0.14, h * 0.85, h * 0.16, '#4f8fe2');
  },
  talk(g, w, h, t) {
    bg(g, w, h, '#16224a', '#2d3a74');
    for (let i = 0; i < 12; i++) circle(g, (i * 71) % w, ((i * 37) % (h * 0.5)), 1.5, '#ffe36e', 4);
    rect(g, w * 0.1, h * 0.62, w * 0.45, h * 0.18, '#8b5a3c');
    rect(g, w * 0.1, h * 0.6, w * 0.45, h * 0.04, '#c8955c');
    person(g, w * 0.32, h * 0.62, h * 0.18, '#2d3140');
    rect(g, w * 0.315, h * 0.38, 3, h * 0.2, '#2d3140');
    rect(g, w * 0.66, h * 0.58, w * 0.22, h * 0.12, '#e2574c');
    person(g, w * 0.76, h * 0.62, h * 0.17, '#f0b429', '#c98d64', Math.sin(t * 6) > 0 ? -2 : 0);
  },
  comedy(g, w, h, t) {
    bg(g, w, h, '#fff36e', '#ffb020');
    for (let i = 0; i < 10; i++) {
      const a = t * 0.5 + (i / 10) * TAU;
      poly(g, [w / 2, h / 2, w / 2 + Math.cos(a) * w, h / 2 + Math.sin(a) * w, w / 2 + Math.cos(a + 0.25) * w, h / 2 + Math.sin(a + 0.25) * w], 'rgba(255,255,255,0.25)');
    }
    const s = 1 + Math.sin(t * 6) * 0.05;
    const r = h * 0.3 * s;
    circle(g, w / 2, h / 2, r, '#ffd23f', 12);
    circle(g, w / 2 - r * 0.35, h / 2 - r * 0.25, r * 0.12, '#2d3140', 6);
    circle(g, w / 2 + r * 0.35, h / 2 - r * 0.25, r * 0.12, '#2d3140', 6);
    poly(g, [w / 2 - r * 0.55, h / 2 + r * 0.1, w / 2 + r * 0.55, h / 2 + r * 0.1, w / 2 + r * 0.3, h / 2 + r * 0.55, w / 2 - r * 0.3, h / 2 + r * 0.55], '#8b2335');
    circle(g, w / 2 - r * 0.75, h / 2 - r * 0.05 + Math.sin(t * 6) * 2, r * 0.1, '#4fd1ff', 5);
  },
};

const STATION_COLOR = { k7: '#19c3b1', trash: '#ff4f9a', prestige: '#f0b429' };
const STATION_SHORT = { k7: 'K7½', trash: 'T24', prestige: 'P1' };

function testbild(g, w, h, sid, t) {
  const bars = ['#f6f4ef', '#f4c34f', '#4fd1ff', '#5fd68f', '#ff6fa8', '#e2574c', '#4f8fe2'];
  bars.forEach((c, i) => rect(g, (i * w) / 7, 0, w / 7 + 1, h * 0.68, c));
  const gr = ['#111', '#333', '#555', '#777', '#999', '#bbb', '#ddd'];
  gr.forEach((c, i) => rect(g, (i * w) / 7, h * 0.68, w / 7 + 1, h * 0.12, c));
  rect(g, 0, h * 0.8, w, h * 0.2, '#20233a');
  circle(g, w / 2, h * 0.4, h * 0.26, '#20233a', 16);
  circle(g, w / 2, h * 0.4, h * 0.22, STATION_COLOR[sid] || '#888', 16);
  g.fillStyle = '#20233a';
  g.font = `700 ${Math.round(h * 0.16)}px Fredoka, "Trebuchet MS", sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(STATION_SHORT[sid] || '', w / 2, h * 0.41);
  g.fillStyle = '#ffffff';
  g.font = `700 ${Math.round(h * 0.09)}px Fredoka, sans-serif`;
  g.fillText(Math.floor(t) % 2 ? 'SENDESCHLUSS' : '18:00 ON AIR', w / 2, h * 0.9);
}

function brk(g, w, h, info, t) {
  const c = STATION_COLOR[info.sid];
  bg(g, w, h, c, '#20233a');
  const s = 1 + Math.sin(t * 2) * 0.04;
  g.save(); g.translate(w / 2, h * 0.42); g.scale(s, s);
  circle(g, 0, 0, h * 0.24, 'rgba(255,255,255,0.18)', 14);
  g.fillStyle = '#ffffff';
  g.font = `700 ${Math.round(h * 0.2)}px Fredoka, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(STATION_SHORT[info.sid], 0, 0);
  g.restore();
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.font = `800 ${Math.round(h * 0.075)}px Nunito, sans-serif`;
  g.textAlign = 'center';
  g.fillText(info.next ? `Gleich: ${info.next}` : 'Pause', w / 2, h * 0.82, w * 0.9);
}

function ad(g, w, h, info, t) {
  const hue = (info.brand || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  bg(g, w, h, `hsl(${hue},80%,62%)`, `hsl(${(hue + 40) % 360},80%,45%)`);
  const s = 1 + Math.sin(t * 5) * 0.06;
  g.save(); g.translate(w / 2, h * 0.45); g.scale(s, s); g.rotate(-0.06);
  g.fillStyle = '#ffffff';
  g.font = `700 ${Math.round(h * 0.17)}px Fredoka, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(info.brand || 'WERBUNG', 0, 0);
  g.restore();
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(w * 0.06, h * 0.06, h * 0.42, h * 0.11);
  g.fillStyle = '#ffffff';
  g.font = `800 ${Math.round(h * 0.07)}px Nunito, sans-serif`;
  g.textAlign = 'left';
  g.fillText('WERBUNG', w * 0.08, h * 0.12);
  if (info.spot) {
    g.textAlign = 'center';
    g.font = `800 ${Math.round(h * 0.09)}px Nunito, sans-serif`;
    g.fillText(`Spot ${info.spot}`, w / 2, h * 0.75);
  }
}

function stamp(g, w, h, st, t) {
  g.save();
  g.translate(w * 0.5, h * 0.48);
  g.rotate(-0.12);
  g.globalAlpha = Math.max(0, Math.min(1, (st.until - t) * 2));
  g.fillStyle = st.ok ? 'rgba(46,170,96,0.92)' : 'rgba(214,52,52,0.92)';
  const bw = w * 0.62, bh = h * 0.34;
  g.fillRect(-bw / 2, -bh / 2, bw, bh);
  g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(2, h * 0.02);
  g.strokeRect(-bw / 2 + 4, -bh / 2 + 4, bw - 8, bh - 8);
  g.fillStyle = '#ffffff';
  g.font = `700 ${Math.round(h * 0.15)}px Fredoka, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(`${st.ok ? '✓' : '✗'} ${st.text}`, 0, 2);
  g.restore();
}

/**
 * Zeichnet ein Fernsehbild.
 * info: { mode: 'test'|'show'|'ad'|'off', sid, title, genre, viewers, brand, crown, osd }
 */
export function drawScreen(g, w, h, info, t) {
  g.save();
  if (info.mode === 'off') { rect(g, 0, 0, w, h, '#0d0f18'); g.restore(); return; }
  if (info.mode === 'test') testbild(g, w, h, info.sid, t);
  else if (info.mode === 'ad') ad(g, w, h, info, t);
  else if (info.mode === 'break') brk(g, w, h, info, t);
  else (ART[info.genre] || ART.comedy)(g, w, h, t);
  if (info.osd !== false && info.mode !== 'test' && info.mode !== 'break') {
    // Senderlogo
    const c = STATION_COLOR[info.sid];
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(w - h * 0.36, h * 0.05, h * 0.31, h * 0.14);
    g.fillStyle = c;
    g.font = `700 ${Math.round(h * 0.11)}px Fredoka, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(STATION_SHORT[info.sid], w - h * 0.205, h * 0.125);
    if (info.mode === 'show') {
      g.fillStyle = 'rgba(10,8,24,0.72)';
      g.fillRect(0, h * 0.82, w, h * 0.18);
      g.fillStyle = '#ffffff';
      g.font = `800 ${Math.round(h * 0.085)}px Nunito, sans-serif`;
      g.textAlign = 'left';
      const tw = g.measureText(info.title).width;
      const avail = w - h * 0.12;
      const off = tw > avail ? ((t * 30) % (tw + w * 0.3)) : 0;
      g.save(); g.beginPath(); g.rect(h * 0.06, h * 0.82, avail, h * 0.18); g.clip();
      g.fillText(info.title, h * 0.06 - off, h * 0.915);
      if (off) g.fillText(info.title, h * 0.06 - off + tw + w * 0.3, h * 0.915);
      g.restore();
    }
    if (info.crown) { g.font = `${Math.round(h * 0.13)}px sans-serif`; g.textAlign = 'left'; g.fillText('👑', h * 0.05, h * 0.13); }
  }
  if (info.stamp) stamp(g, w, h, info.stamp, performance.now() / 1000);
  // Scanlines für Röhren-Flair
  g.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
  g.restore();
}
