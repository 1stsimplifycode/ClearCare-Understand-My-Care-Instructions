// Minimal 2D DOMMatrix/Path2D shim so the vendored pdf.js legacy build can be
// imported in Node for TEXT extraction only. Rendering is never performed
// server-side. Installed only when the globals are missing.
class DOMMatrixShim {
  constructor(init) {
    const v = Array.isArray(init) || ArrayBuffer.isView(init) ? [...init] : [1, 0, 0, 1, 0, 0];
    [this.a, this.b, this.c, this.d, this.e, this.f] = v.length === 6 ? v : [1, 0, 0, 1, 0, 0];
    this.is2D = true;
  }
  get m11() { return this.a; } get m12() { return this.b; } get m21() { return this.c; } get m22() { return this.d; } get m41() { return this.e; } get m42() { return this.f; }
  get isIdentity() { return this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0; }
  multiplySelf(m) { const { a, b, c, d, e, f } = this; this.a = a * m.a + c * m.b; this.b = b * m.a + d * m.b; this.c = a * m.c + c * m.d; this.d = b * m.c + d * m.d; this.e = a * m.e + c * m.f + e; this.f = b * m.e + d * m.f + f; return this; }
  preMultiplySelf(m) { const r = new DOMMatrixShim([m.a, m.b, m.c, m.d, m.e, m.f]).multiplySelf(this); Object.assign(this, { a: r.a, b: r.b, c: r.c, d: r.d, e: r.e, f: r.f }); return this; }
  multiply(m) { return new DOMMatrixShim([this.a, this.b, this.c, this.d, this.e, this.f]).multiplySelf(m); }
  translate(x = 0, y = 0) { return this.multiply(new DOMMatrixShim([1, 0, 0, 1, x, y])); }
  translateSelf(x = 0, y = 0) { return this.multiplySelf(new DOMMatrixShim([1, 0, 0, 1, x, y])); }
  scale(x = 1, y = x) { return this.multiply(new DOMMatrixShim([x, 0, 0, y, 0, 0])); }
  scaleSelf(x = 1, y = x) { return this.multiplySelf(new DOMMatrixShim([x, 0, 0, y, 0, 0])); }
  invertSelf() { const { a, b, c, d, e, f } = this; const det = a * d - b * c; if (!det) { Object.assign(this, { a: NaN, b: NaN, c: NaN, d: NaN, e: NaN, f: NaN }); return this; } Object.assign(this, { a: d / det, b: -b / det, c: -c / det, d: a / det, e: (c * f - d * e) / det, f: (b * e - a * f) / det }); return this; }
  inverse() { return new DOMMatrixShim([this.a, this.b, this.c, this.d, this.e, this.f]).invertSelf(); }
  transformPoint(p = {}) { const x = p.x || 0, y = p.y || 0; return { x: this.a * x + this.c * y + this.e, y: this.b * x + this.d * y + this.f, z: 0, w: 1 }; }
}
class Path2DShim { addPath() {} moveTo() {} lineTo() {} bezierCurveTo() {} quadraticCurveTo() {} rect() {} closePath() {} }
export function installDomMatrixShim() {
  if (typeof globalThis.DOMMatrix === 'undefined') globalThis.DOMMatrix = DOMMatrixShim;
  if (typeof globalThis.Path2D === 'undefined') globalThis.Path2D = Path2DShim;
}
