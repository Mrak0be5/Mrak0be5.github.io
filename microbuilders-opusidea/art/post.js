// Свечение (из ветки NewVisual_Opus55, art/mood.js — только пост): магма, звезда, самоцветы, золото, фонари и
// горящие ночью окна мягко светятся. Кадр рисуется в RT с MSAA ровно как на экран (флаг XR: тон-маппинг и sRGB
// в шейдерах материалов, 8 бит), затем 1/4 кадра → размытие → сведение на экран: три полноэкранных прохода.
// Маска без размытия всего кадра: материал свечения пишет в альфу 0, всё, что его заслонит, пишет 1.
// Альфа 0 на самом холсте браузер сводит в белое, поэтому смешивание маски включено только пока идёт пост
// (setActive): без поста помеченные материалы рисуются как обычные.
(function () {
  // Учёт помеченных материалов — слабые ссылки: материал, который выбросили, уходит со сборкой мусора, а живой
  // остаётся на учёте и после dispose (смена стройки освобождает и общие материалы — огни техники, ношу, городок:
  // three соберёт их заново, а свечение и смешивание при выключении поста должны остаться верными).
  const glowing = new Set();
  const known = new WeakSet();
  let active = false;

  function apply(m) {
    if (active && m.userData.mbGlow) {
      m.blending = THREE.CustomBlending;
      m.blendEquation = THREE.AddEquation;
      m.blendSrc = THREE.OneFactor;
      m.blendDst = THREE.ZeroFactor;
      m.blendSrcAlpha = THREE.ZeroFactor;
      m.blendDstAlpha = THREE.ZeroFactor;
    } else {
      m.blending = THREE.NormalBlending;
    }
  }

  // Пометить материал как светящийся (on = false — снять).
  function mark(m, on) {
    const want = on !== false;
    if (want && !known.has(m)) {
      known.add(m);
      glowing.add(new WeakRef(m));
    }
    if (!!m.userData.mbGlow === want) return;
    m.userData.mbGlow = want;
    apply(m);
  }

  // Копия помеченного материала (material.clone переносит userData и смешивание): обычная, без свечения.
  function plain(m) {
    m.userData.mbGlow = false;
    m.blending = THREE.NormalBlending;
  }

  // Пост идёт или нет: маска свечения у всех помеченных материалов включается и выключается вместе с ним.
  function setActive(on) {
    if (active === on) return;
    active = on;
    glowing.forEach(function (ref) {
      const m = ref.deref();
      if (m) apply(m);
      else glowing.delete(ref);
    });
  }

  // null, если WebGL 1 (нет MSAA у RT): тогда игра рисует как раньше.
  function create(renderer) {
    if (!renderer.capabilities.isWebGL2) return null;
    // С трафаретом, как у холста: им городок рисует контур вокруг дома (game.js buildCampView).
    const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4, colorSpace: THREE.SRGBColorSpace, internalFormat: 'RGBA8', stencilBuffer: true });
    rt.isXRRenderTarget = true;
    const rtDown = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    const rtBlur = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    // «Миниатюра» (tilt-shift): 1/8 кадра из размытого 1/4 (его rgb — обычный цвет кадра) и ещё одно размытие.
    const rtTiltA = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    const rtTiltB = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    const size = new THREE.Vector2();
    const vertexShader = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
    function pass(uniforms, fragmentShader) {
      return new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: vertexShader, fragmentShader: fragmentShader, depthTest: false, depthWrite: false });
    }
    // Маска свечения: альфа 0 × яркость — светится только освещённое или горящее.
    const down = pass({ src: { value: rt.texture }, px: { value: new THREE.Vector2() } }, [
      'uniform sampler2D src; uniform vec2 px; varying vec2 vUv;',
      'vec4 tap(vec2 d){ vec4 c = texture2D(src, vUv + d * px); float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)); return vec4(c.rgb, (1.0 - c.a) * smoothstep(0.3, 0.85, l)); }',
      'void main(){ gl_FragColor = 0.25 * (tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0))); }',
    ].join('\n'));
    const BLUR = [
      'uniform sampler2D src; uniform vec2 px; varying vec2 vUv;',
      'vec4 t(float x, float y){ return texture2D(src, vUv + vec2(x, y) * px); }',
      'void main(){ gl_FragColor = 0.25 * t(0.0, 0.0) + 0.125 * (t(1.5, 0.0) + t(-1.5, 0.0) + t(0.0, 1.5) + t(0.0, -1.5)) + 0.0625 * (t(1.5, 1.5) + t(-1.5, 1.5) + t(1.5, -1.5) + t(-1.5, -1.5)); }',
    ].join('\n');
    const blur = pass({ src: { value: rtDown.texture }, px: { value: new THREE.Vector2() } }, BLUR);
    const tiltDown = pass({ src: { value: rtBlur.texture }, px: { value: new THREE.Vector2() } }, [
      'uniform sampler2D src; uniform vec2 px; varying vec2 vUv;',
      'void main(){ gl_FragColor = 0.25 * (texture2D(src, vUv + vec2(-0.5, -0.5) * px) + texture2D(src, vUv + vec2(0.5, -0.5) * px) +',
      '  texture2D(src, vUv + vec2(-0.5, 0.5) * px) + texture2D(src, vUv + vec2(0.5, 0.5) * px)); }',
    ].join('\n'));
    const tiltBlur = pass({ src: { value: rtTiltA.texture }, px: { value: new THREE.Vector2() } }, BLUR);
    // Сведение в экранных значениях: «миниатюра» — выше и ниже полосы фокуса (focus — доля высоты, где стройка) кадр
    // плавно переходит в размытый; ореол вокруг маски цвета самого свечения; альфа холста — 1.
    const comp = pass({ tMain: { value: rt.texture }, tSoft: { value: rtBlur.texture }, tTilt: { value: rtTiltB.texture },
      glow: { value: 0 }, tilt: { value: 0 }, focus: { value: 0.5 } }, [
      'uniform sampler2D tMain; uniform sampler2D tSoft; uniform sampler2D tTilt; uniform float glow; uniform float tilt;',
      'uniform float focus; varying vec2 vUv;',
      'void main(){',
      '  vec4 c = texture2D(tMain, vUv); vec4 b = texture2D(tSoft, vUv);',
      '  vec3 col = c.rgb;',
      '  if (tilt > 0.0) col = mix(col, texture2D(tTilt, vUv).rgb, tilt * smoothstep(0.14, 0.46, abs(vUv.y - focus)));',
      '  col += b.rgb / max(max(max(b.r, b.g), b.b), 0.001) * b.a * glow * (0.4 + 0.6 * c.a);',
      '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
      '}',
    ].join('\n'));
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), comp);
    quad.frustumCulled = false;
    const quadScene = new THREE.Scene();
    quadScene.add(quad);
    const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    function run(material, to) {
      quad.material = material;
      renderer.setRenderTarget(to);
      renderer.render(quadScene, quadCamera);
    }

    // Вместо renderer.render(scene, camera): glow — сила ореола (днём ~0,3, ночью ~0,55), tilt — сила «миниатюры»
    // (0 — без неё), focus — где по высоте кадра (0 — низ, 1 — верх) полоса резкости.
    function render(scene, camera, glow, tilt, focus) {
      renderer.getDrawingBufferSize(size);
      if (size.x !== rt.width || size.y !== rt.height) {
        rt.setSize(size.x, size.y);
        rtDown.setSize(Math.ceil(size.x / 4), Math.ceil(size.y / 4));
        rtBlur.setSize(Math.ceil(size.x / 4), Math.ceil(size.y / 4));
        rtTiltA.setSize(Math.ceil(size.x / 8), Math.ceil(size.y / 8));
        rtTiltB.setSize(Math.ceil(size.x / 8), Math.ceil(size.y / 8));
        down.uniforms.px.value.set(1 / size.x, 1 / size.y);
        blur.uniforms.px.value.set(1 / rtDown.width, 1 / rtDown.height);
        tiltDown.uniforms.px.value.set(1 / rtBlur.width, 1 / rtBlur.height);
        tiltBlur.uniforms.px.value.set(1 / rtTiltA.width, 1 / rtTiltA.height);
      }
      comp.uniforms.glow.value = glow;
      comp.uniforms.tilt.value = tilt || 0;
      comp.uniforms.focus.value = focus === undefined ? 0.5 : focus;
      // Посту нужен только цвет: глубину и трафарет из MSAA не копировать (внутренний флаг three r160, его же ставит
      // WebXR). Иначе three копирует их каждый кадр, а на ANGLE/D3D11 это дороже всего поста: 3.11, RTX 4090 под
      // нагрузкой, кадр 1056×2112 — 24,7 мс с копией, 10,7 мс без неё. Флаг — каждый кадр: setSize и сброс контекста его стирают.
      renderer.properties.get(rt).__ignoreDepthValues = true;
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      const calls = renderer.info.render.calls;
      const triangles = renderer.info.render.triangles;
      const autoClear = renderer.autoClear;
      renderer.autoClear = false; // полноэкранные проходы перекрывают всё сами
      run(down, rtDown);
      run(blur, rtBlur);
      if (tilt > 0) {
        run(tiltDown, rtTiltA);
        run(tiltBlur, rtTiltB);
      }
      run(comp, null);
      renderer.autoClear = autoClear;
      const passes = tilt > 0 ? 5 : 3;
      renderer.info.render.calls = calls + passes; // счётчик кадра как у сцены плюс полноэкранные проходы
      renderer.info.render.triangles = triangles + passes * 2;
    }

    // Выключили пост (качество ниже «высокого»): освободить буферы, при включении они создадутся заново.
    function release() {
      rt.setSize(1, 1);
      rtDown.setSize(1, 1);
      rtBlur.setSize(1, 1);
      rtTiltA.setSize(1, 1);
      rtTiltB.setSize(1, 1);
    }

    return { render: render, release: release, targets: { main: rt, down: rtDown, blur: rtBlur } };
  }

  window.MicroBuildersPost = { create: create, mark: mark, plain: plain, setActive: setActive };
})();
