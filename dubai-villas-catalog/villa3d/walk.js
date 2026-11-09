// Прогулка от первого лица. Компьютер: мышь (захват указателя; без него — тянуть мышью), WASD или стрелки, Shift — бег.
// Телефон: джойстик слева, обзор пальцем справа. Столкновения: круг игрока против коробок и многоугольников,
// пол — по «поверхностям» модели: ступени до 0,3 м перешагиваются, выше — препятствие.
// Персонаж — взрослый 1,75 м: глаза на 1,62 м, плечи 0,5 м, шаг 1,4 м/с, бег 3,2 м/с; покачивание головы — с частотой шагов.
// phys.dynamic — подвижные препятствия (закрытые двери), их список модель меняет на ходу.
import * as THREE from 'three';

const RADIUS = 0.25, EYE = 1.62, BODY = 1.8, STEP = 0.3, KNEE = 0.12, WALK = 1.4, RUN = 3.2, GRAVITY = 9.8;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class Walker {
  constructor(camera, dom, getPhys, opts = {}) {
    this.camera = camera;
    this.dom = dom;
    this.getPhys = getPhys;
    this.onChange = opts.onChange || (() => {});
    this.active = false;
    this.locked = false;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.camY = 0;
    this.bob = 0;
    this.keys = new Set();
    this.drag = null;
    this.stick = null;
    this.look = null;
    this.move = { x: 0, z: 0 };
    this._onKey = (e) => this.key(e);
    this._onMouse = (e) => this.mouse(e);
    this._onLock = () => this.lockChange();
    this._onDown = (e) => this.down(e);
    this._onUp = (e) => this.up(e);
    this._onTouch = (e) => this.touch(e);
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('keyup', this._onKey);
    document.addEventListener('mousemove', this._onMouse);
    document.addEventListener('pointerlockchange', this._onLock);
    dom.addEventListener('mousedown', this._onDown);
    window.addEventListener('mouseup', this._onUp);
    for (const t of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) dom.addEventListener(t, this._onTouch, { passive: false });
    // джойстик для телефона
    this.ui = document.createElement('div');
    this.ui.className = 'walk-stick';
    this.ui.innerHTML = '<span></span>';
    this.ui.hidden = true;
    dom.parentElement.append(this.ui);
  }

  start(spawn) {
    this.pos.set(...spawn.pos);
    this.yaw = spawn.yaw || 0;
    this.pitch = 0;
    this.vel.set(0, 0, 0);
    this.vy = 0;
    this.camY = this.pos.y + EYE;
    this.active = true;
    this.keys.clear();
    this.coarse = matchMedia('(pointer: coarse)').matches;
    this.ui.hidden = !this.coarse;
    if (!this.coarse && this.dom.requestPointerLock) {
      try { const r = this.dom.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch {}
    }
    this.update(0);
    this.onChange({ active: true, locked: this.locked, coarse: this.coarse });
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this.ui.hidden = true;
    if (document.pointerLockElement === this.dom) document.exitPointerLock();
    this.onChange({ active: false, locked: false });
  }

  lockChange() {
    this.locked = document.pointerLockElement === this.dom;
    if (this.active) this.onChange({ active: true, locked: this.locked, coarse: this.coarse });
  }

  relock() {
    if (this.active && !this.coarse && !this.locked && this.dom.requestPointerLock) {
      try { const r = this.dom.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch {}
    }
  }

  key(e) {
    if (!this.active) return;
    const codes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space'];
    if (!codes.includes(e.code)) return;
    e.preventDefault();
    if (e.type === 'keydown') this.keys.add(e.code); else this.keys.delete(e.code);
  }

  turn(dx, dy) {
    this.yaw -= dx;
    this.pitch = clamp(this.pitch - dy, -1.45, 1.45);
  }

  mouse(e) {
    if (!this.active) return;
    if (this.locked) this.turn(e.movementX * 0.0022, e.movementY * 0.0022);
    else if (this.drag) {
      this.turn((e.clientX - this.drag.x) * 0.004, (e.clientY - this.drag.y) * 0.004);
      this.drag = { x: e.clientX, y: e.clientY };
    }
  }

  down(e) {
    if (!this.active || this.coarse) return;
    if (!this.locked) {
      this.drag = { x: e.clientX, y: e.clientY };
      this.relock();
    }
  }

  up() { this.drag = null; }

  touch(e) {
    if (!this.active) return;
    e.preventDefault();
    const rect = this.dom.getBoundingClientRect();
    for (const t of e.changedTouches) {
      const x = t.clientX - rect.left, y = t.clientY - rect.top;
      if (e.type === 'touchstart') {
        if (x < rect.width * 0.45 && !this.stick) {
          this.stick = { id: t.identifier, x, y };
          this.ui.style.left = `${x - 60}px`;
          this.ui.style.top = `${y - 60}px`;
          this.ui.classList.add('is-on');
        } else if (!this.look) this.look = { id: t.identifier, x, y };
      } else if (e.type === 'touchmove') {
        if (this.stick && t.identifier === this.stick.id) {
          const dx = clamp((x - this.stick.x) / 55, -1, 1), dy = clamp((y - this.stick.y) / 55, -1, 1);
          this.move = { x: dx, z: -dy };
          this.ui.firstChild.style.transform = `translate(${dx * 38}px, ${dy * 38}px)`;
        } else if (this.look && t.identifier === this.look.id) {
          this.turn((x - this.look.x) * 0.006, (y - this.look.y) * 0.006);
          this.look = { id: t.identifier, x, y };
        }
      } else {
        if (this.stick && t.identifier === this.stick.id) {
          this.stick = null;
          this.move = { x: 0, z: 0 };
          this.ui.firstChild.style.transform = '';
          this.ui.classList.remove('is-on');
        }
        if (this.look && t.identifier === this.look.id) this.look = null;
      }
    }
  }

  // самая высокая поверхность под точкой не выше maxTop
  groundAt(x, z, maxTop) {
    let best = -Infinity;
    for (const w of this.getPhys().walkables) {
      if (x < w[0] || x > w[2] || z < w[1] || z > w[3]) continue;
      if (w[4] <= maxTop && w[4] > best) best = w[4];
    }
    return best;
  }

  // поверхность на уровне тела (выше шага, ниже головы) — уступ, через который не пройти
  ledge(x, z, feet) {
    for (const w of this.getPhys().walkables) {
      if (x < w[0] - RADIUS * 0.5 || x > w[2] + RADIUS * 0.5 || z < w[1] - RADIUS * 0.5 || z > w[3] + RADIUS * 0.5) continue;
      if (w[4] > feet + STEP && w[4] < feet + BODY) return true;
    }
    return false;
  }

  collide(p, feet) {
    const phys = this.getPhys();
    for (let iter = 0; iter < 4; iter++) {
      let moved = false;
      for (const c of phys.dynamic ? phys.colliders.concat(phys.dynamic) : phys.colliders) {
        if (c[4] <= feet + KNEE || c[1] >= feet + BODY) continue;
        if (p.x < c[0] - RADIUS || p.x > c[3] + RADIUS || p.z < c[2] - RADIUS || p.z > c[5] + RADIUS) continue;
        const nx = clamp(p.x, c[0], c[3]), nz = clamp(p.z, c[2], c[5]);
        const dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
        if (d2 >= RADIUS * RADIUS) continue;
        if (d2 > 1e-10) {
          const d = Math.sqrt(d2);
          p.x += (dx / d) * (RADIUS - d);
          p.z += (dz / d) * (RADIUS - d);
        } else {
          const pens = [p.x - c[0], c[3] - p.x, p.z - c[2], c[5] - p.z];
          const i = pens.indexOf(Math.min(...pens));
          if (i === 0) p.x = c[0] - RADIUS; else if (i === 1) p.x = c[3] + RADIUS; else if (i === 2) p.z = c[2] - RADIUS; else p.z = c[5] + RADIUS;
        }
        moved = true;
      }
      for (const poly of phys.polys) {
        if (poly.y1 <= feet + KNEE || poly.y0 >= feet + BODY) continue;
        const pts = poly.pts;
        let inside = false, best = Infinity, bx = 0, bz = 0;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [ax, az] = pts[j], [cx, cz] = pts[i];
          if ((cz > p.z) !== (az > p.z) && p.x < ((ax - cx) * (p.z - cz)) / (az - cz) + cx) inside = !inside;
          const ex = cx - ax, ez = cz - az, l2 = ex * ex + ez * ez || 1;
          const t = clamp(((p.x - ax) * ex + (p.z - az) * ez) / l2, 0, 1);
          const qx = ax + ex * t, qz = az + ez * t, d = Math.hypot(p.x - qx, p.z - qz);
          if (d < best) { best = d; bx = qx; bz = qz; }
        }
        if (!inside && best >= RADIUS) continue;
        let dx = p.x - bx, dz = p.z - bz;
        const d = Math.hypot(dx, dz) || 1;
        dx /= d; dz /= d;
        if (inside) { dx = -dx; dz = -dz; }
        p.x = bx + dx * RADIUS * 1.01;
        p.z = bz + dz * RADIUS * 1.01;
        moved = true;
      }
      if (!moved) break;
    }
  }

  update(dt) {
    if (!this.active) return;
    const k = this.keys;
    let f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) + this.move.z;
    let s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) + this.move.x;
    const len = Math.hypot(f, s);
    if (len > 1) { f /= len; s /= len; }
    const speed = k.has('ShiftLeft') || k.has('ShiftRight') ? RUN : WALK;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const tx = (-sin * f + cos * s) * speed, tz = (-cos * f - sin * s) * speed;
    const a = 1 - Math.exp(-dt * 11);
    this.vel.x += (tx - this.vel.x) * a;
    this.vel.z += (tz - this.vel.z) * a;
    const p = this.pos;
    const dist = Math.hypot(this.vel.x, this.vel.z) * dt;
    const steps = Math.max(1, Math.ceil(dist / 0.1));
    for (let i = 0; i < steps; i++) {
      const nx = p.x + (this.vel.x * dt) / steps, nz = p.z + (this.vel.z * dt) / steps;
      if (!this.ledge(nx, p.z, p.y)) p.x = nx;
      if (!this.ledge(p.x, nz, p.y)) p.z = nz;
      this.collide(p, p.y);
    }
    const g = this.groundAt(p.x, p.z, p.y + STEP);
    if (g === -Infinity) { this.vy = 0; }
    else if (g >= p.y - 0.03) { p.y = g; this.vy = 0; }
    else {
      this.vy -= GRAVITY * dt;
      p.y += this.vy * dt;
      if (p.y <= g) { p.y = g; this.vy = 0; }
    }
    const want = p.y + EYE;
    this.camY = want > this.camY ? this.camY + (want - this.camY) * (1 - Math.exp(-dt * 12)) : want;
    const v = Math.hypot(this.vel.x, this.vel.z), moving = Math.min(1, v / WALK);
    this.bob += dt * (3.4 + 1.7 * v) * moving;                  // ≈1,9 шага/с при ходьбе, ≈2,8 — при беге
    this.camera.position.set(p.x, this.camY + Math.sin(this.bob * 2) * 0.02 * moving * Math.min(1.6, Math.max(1, v / WALK)), p.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  dispose() {
    this.stop();
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('keyup', this._onKey);
    document.removeEventListener('mousemove', this._onMouse);
    document.removeEventListener('pointerlockchange', this._onLock);
    this.dom.removeEventListener('mousedown', this._onDown);
    window.removeEventListener('mouseup', this._onUp);
    for (const t of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) this.dom.removeEventListener(t, this._onTouch);
    this.ui.remove();
  }
}
