// Свечение (из ветки NewVisual_Opus55, art/mood.js — только пост): магма, звезда, самоцветы, золото, фонари и
// горящие ночью окна мягко светятся. Кадр рисуется в RT с MSAA ровно как на экран (флаг XR: тон-маппинг и sRGB
// в шейдерах материалов, 8 бит), затем 1/4 кадра → размытие → сведение на экран: три полноэкранных прохода.
// Маска без размытия всего кадра: материал свечения пишет в альфу 0, всё, что его заслонит, пишет 1.
// Альфа 0 на самом холсте браузер сводит в белое, поэтому смешивание маски включено только пока идёт пост
// (setActive): без поста помеченные материалы рисуются как обычные.
(function () {
  const glowing = new Set();
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
    if (!!m.userData.mbGlow === want) return;
    m.userData.mbGlow = want;
    if (want && !glowing.has(m)) {
      glowing.add(m);
      m.addEventListener('dispose', forget);
    }
    apply(m);
  }

  // Уничтоженный материал забывается и снова обычный: кэшированные материалы (ноша, городок) после смены
  // стройки рисуются без свечения, но не белым, когда пост выключат.
  function forget(event) {
    const m = event.target;
    m.removeEventListener('dispose', forget);
    glowing.delete(m);
    m.userData.mbGlow = false;
    m.blending = THREE.NormalBlending;
  }

  // Пост идёт или нет: маска свечения у всех помеченных материалов включается и выключается вместе с ним.
  function setActive(on) {
    if (active === on) return;
    active = on;
    glowing.forEach(apply);
  }

  // null, если WebGL 1 (нет MSAA у RT): тогда игра рисует как раньше.
  function create(renderer) {
    if (!renderer.capabilities.isWebGL2) return null;
    // С трафаретом, как у холста: им городок рисует контур вокруг дома (game.js buildCampView).
    const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4, colorSpace: THREE.SRGBColorSpace, internalFormat: 'RGBA8', stencilBuffer: true });
    rt.isXRRenderTarget = true;
    const rtDown = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    const rtBlur = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
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
    const blur = pass({ src: { value: rtDown.texture }, px: { value: new THREE.Vector2() } }, [
      'uniform sampler2D src; uniform vec2 px; varying vec2 vUv;',
      'vec4 t(float x, float y){ return texture2D(src, vUv + vec2(x, y) * px); }',
      'void main(){ gl_FragColor = 0.25 * t(0.0, 0.0) + 0.125 * (t(1.5, 0.0) + t(-1.5, 0.0) + t(0.0, 1.5) + t(0.0, -1.5)) + 0.0625 * (t(1.5, 1.5) + t(-1.5, 1.5) + t(1.5, -1.5) + t(-1.5, -1.5)); }',
    ].join('\n'));
    // Сведение в экранных значениях: ореол вокруг маски цвета самого свечения; альфа холста — 1.
    const comp = pass({ tMain: { value: rt.texture }, tSoft: { value: rtBlur.texture }, glow: { value: 0 } }, [
      'uniform sampler2D tMain; uniform sampler2D tSoft; uniform float glow; varying vec2 vUv;',
      'void main(){',
      '  vec4 c = texture2D(tMain, vUv); vec4 b = texture2D(tSoft, vUv);',
      '  vec3 col = c.rgb + b.rgb / max(max(max(b.r, b.g), b.b), 0.001) * b.a * glow * (0.4 + 0.6 * c.a);',
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

    // Вместо renderer.render(scene, camera): glow — сила ореола (днём ~0,3, ночью ~0,55).
    function render(scene, camera, glow) {
      renderer.getDrawingBufferSize(size);
      if (size.x !== rt.width || size.y !== rt.height) {
        rt.setSize(size.x, size.y);
        rtDown.setSize(Math.ceil(size.x / 4), Math.ceil(size.y / 4));
        rtBlur.setSize(Math.ceil(size.x / 4), Math.ceil(size.y / 4));
        down.uniforms.px.value.set(1 / size.x, 1 / size.y);
        blur.uniforms.px.value.set(1 / rtDown.width, 1 / rtDown.height);
      }
      comp.uniforms.glow.value = glow;
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      const calls = renderer.info.render.calls;
      const triangles = renderer.info.render.triangles;
      const autoClear = renderer.autoClear;
      renderer.autoClear = false; // полноэкранные проходы перекрывают всё сами
      run(down, rtDown);
      run(blur, rtBlur);
      run(comp, null);
      renderer.autoClear = autoClear;
      renderer.info.render.calls = calls + 3; // счётчик кадра как у сцены плюс три прохода
      renderer.info.render.triangles = triangles + 6;
    }

    // Выключили пост (качество ниже «высокого»): освободить буферы, при включении они создадутся заново.
    function release() {
      rt.setSize(1, 1);
      rtDown.setSize(1, 1);
      rtBlur.setSize(1, 1);
    }

    return { render: render, release: release };
  }

  window.MicroBuildersPost = { create: create, mark: mark, setActive: setActive };
})();
