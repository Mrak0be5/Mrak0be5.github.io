(function (root) {
  const SURFACES = ['floor', 'ladder', 'deck'];
  const LABELS = {
    floor: 'Твёрдый пол',
    deck: 'Настил',
    ladder: 'Лестница',
  };

  function key(x, y, z) {
    return x + ':' + y + ':' + z;
  }

  function defaultPatterns() {
    const patterns = {
      floor: new Set(),
      deck: new Set(),
      ladder: new Set(),
    };
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        for (let x = -1; x <= 1; x++) {
          if (x === 0 && y === 0 && z === 0) continue;
          patterns.floor.add(key(x, y, z));
        }
      }
    }
    for (let y = 0; y <= 1; y++) {
      patterns.deck.add(key(1, y, 0));
      patterns.deck.add(key(-1, y, 0));
      patterns.deck.add(key(0, y, 1));
      patterns.deck.add(key(0, y, -1));
    }
    return patterns;
  }

  function clonePatterns(source) {
    return {
      floor: new Set(source.floor),
      deck: new Set(source.deck),
      ladder: new Set(source.ladder),
    };
  }

  let patterns = defaultPatterns();
  let draft = clonePatterns(patterns);
  let surface = 'floor';
  let opened = false;
  let overlay;
  let canvas;
  let renderer;
  let scene;
  let camera;
  let cells;
  let rootGroup;
  let raycaster;
  let pointer;
  let pointerDownX = 0;
  let pointerDownY = 0;
  let previousX = 0;
  let previousY = 0;
  let moved = false;
  let onApply;

  function allows(mode, dx, dy, dz) {
    if (mode === 3) {
      const offset = key(dx, dy, dz);
      return patterns.ladder.has(offset) || patterns.deck.has(offset);
    }
    return patterns[SURFACES[mode]].has(key(dx, dy, dz));
  }

  function injectUi() {
    const style = document.createElement('style');
    style.textContent = [
      '#build-pattern-overlay{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(16,13,10,.72);backdrop-filter:blur(8px);pointer-events:auto}',
      '#build-pattern-overlay.hidden{display:none}',
      '.build-pattern-panel{width:min(760px,100%);padding:20px;background:rgba(32,26,20,.96);border:1px solid rgba(231,193,90,.34);border-radius:20px;box-shadow:0 24px 80px rgba(0,0,0,.38)}',
      '.build-pattern-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}',
      '.build-pattern-head h2{margin:3px 0 4px;font-family:Unbounded,Manrope,sans-serif;font-size:21px}',
      '.build-pattern-head p{margin:0;color:#c9bba6;font-size:13px}',
      '.build-pattern-tabs,.build-pattern-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}',
      '.build-pattern-tabs button,.build-pattern-actions button,.build-pattern-close{border:0;border-radius:999px;padding:8px 13px;background:rgba(255,255,255,.07);color:#c9bba6;font-weight:800;cursor:pointer}',
      '.build-pattern-tabs button.on{background:rgba(231,193,90,.22);color:#f4ecdf;box-shadow:inset 0 0 0 1px rgba(231,193,90,.45)}',
      '.build-pattern-close{padding:7px 11px;font-size:18px;line-height:1}',
      '#build-pattern-canvas{display:block;width:100%;height:min(52vh,440px);margin-top:12px;border-radius:14px;background:radial-gradient(circle at 50% 42%,rgba(122,151,169,.34),rgba(17,22,24,.74));touch-action:none;cursor:grab}',
      '#build-pattern-canvas.dragging{cursor:grabbing}',
      '.build-pattern-foot{display:flex;align-items:center;justify-content:space-between;gap:16px}',
      '.build-pattern-hint{color:#c9bba6;font-size:12px;line-height:1.45}',
      '.build-pattern-actions{justify-content:flex-end;margin-top:12px}',
      '.build-pattern-actions .apply{background:linear-gradient(180deg,#f0d48a,#e0a84a);color:#3a2712}',
    ].join('');
    document.head.appendChild(style);

    overlay = document.createElement('div');
    overlay.id = 'build-pattern-overlay';
    overlay.className = 'hidden';
    overlay.innerHTML =
      '<section class="build-pattern-panel">' +
        '<div class="build-pattern-head">' +
          '<div><p class="kicker">Паттерн строительства</p><h2>Доступные кубы</h2><p>Выбор зеркально применяется по горизонтальным осям X и Z.</p></div>' +
          '<button type="button" class="build-pattern-close" aria-label="Закрыть">×</button>' +
        '</div>' +
        '<div class="build-pattern-tabs"></div>' +
        '<canvas id="build-pattern-canvas"></canvas>' +
        '<div class="build-pattern-foot">' +
          '<div class="build-pattern-hint">Золотой — разрешено · серый — запрещено<br>Центральная фигура — рабочий</div>' +
          '<div class="build-pattern-actions"><button type="button" data-action="reset">По умолчанию</button><button type="button" data-action="cancel">Отмена</button><button type="button" class="apply" data-action="apply">Применить</button></div>' +
        '</div>' +
      '</section>';
    document.body.appendChild(overlay);
    canvas = document.getElementById('build-pattern-canvas');

    const tabs = overlay.querySelector('.build-pattern-tabs');
    for (let i = 0; i < SURFACES.length; i++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.surface = SURFACES[i];
      button.textContent = LABELS[SURFACES[i]];
      button.addEventListener('click', function () {
        surface = button.dataset.surface;
        refreshTabs();
        refreshCells();
      });
      tabs.appendChild(button);
    }

    overlay.querySelector('.build-pattern-close').addEventListener('click', close);
    overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
    overlay.querySelector('[data-action="reset"]').addEventListener('click', function () {
      draft[surface] = defaultPatterns()[surface];
      refreshCells();
    });
    overlay.querySelector('[data-action="apply"]').addEventListener('click', function () {
      patterns = clonePatterns(draft);
      close();
      onApply();
    });
    overlay.addEventListener('pointerdown', function (event) {
      if (event.target === overlay) close();
    });
    window.addEventListener('keydown', function (event) {
      if (opened && event.key === 'Escape') close();
    });
  }

  function createScene() {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(6.6, 5.4, 7.6);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xfff1d4, 0x345064, 1.7));
    const light = new THREE.DirectionalLight(0xffffff, 1.4);
    light.position.set(4, 7, 5);
    scene.add(light);
    rootGroup = new THREE.Group();
    rootGroup.rotation.y = 0.35;
    scene.add(rootGroup);
    cells = [];
    const geometry = new THREE.BoxGeometry(0.82, 0.82, 0.82);
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        for (let x = -1; x <= 1; x++) {
          const center = x === 0 && y === 0 && z === 0;
          const material = new THREE.MeshStandardMaterial({
            color: center ? 0xd4844a : 0x87939b,
            transparent: true,
            opacity: center ? 0.86 : 0.12,
            roughness: 0.58,
            metalness: 0.08,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(x, y, z);
          mesh.userData = { x: x, y: y, z: z, center: center };
          rootGroup.add(mesh);
          const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry),
            new THREE.LineBasicMaterial({ color: center ? 0xffd27e : 0xb9c4ca, transparent: true, opacity: center ? 0.9 : 0.32 })
          );
          edges.position.copy(mesh.position);
          rootGroup.add(edges);
          if (!center) cells.push(mesh);
        }
      }
    }
    const worker = new THREE.Group();
    const shirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.44, 8), new THREE.MeshStandardMaterial({ color: 0x2f6fed }));
    shirt.position.y = -0.06;
    worker.add(shirt);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe1ae75 }));
    head.position.y = 0.27;
    worker.add(head);
    rootGroup.add(worker);
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
    canvas.addEventListener('pointerdown', beginPointer);
    canvas.addEventListener('pointermove', movePointer);
    canvas.addEventListener('pointerup', endPointer);
  }

  function beginPointer(event) {
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
    previousX = event.clientX;
    previousY = event.clientY;
    moved = false;
    canvas.classList.add('dragging');
    canvas.setPointerCapture(event.pointerId);
  }

  function movePointer(event) {
    if (!canvas.hasPointerCapture(event.pointerId)) return;
    const dx = event.clientX - previousX;
    const dy = event.clientY - previousY;
    previousX = event.clientX;
    previousY = event.clientY;
    if (Math.abs(event.clientX - pointerDownX) + Math.abs(event.clientY - pointerDownY) > 5) moved = true;
    rootGroup.rotation.y += dx * 0.008;
    rootGroup.rotation.x += dy * 0.006;
    render();
  }

  function endPointer(event) {
    canvas.classList.remove('dragging');
    canvas.releasePointerCapture(event.pointerId);
    if (moved) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(cells, false);
    if (hits.length === 0) return;
    toggleCell(hits[0].object.userData);
  }

  function toggleCell(cell) {
    const selected = draft[surface].has(key(cell.x, cell.y, cell.z));
    const xs = cell.x === 0 ? [0] : [Math.abs(cell.x), -Math.abs(cell.x)];
    const zs = cell.z === 0 ? [0] : [Math.abs(cell.z), -Math.abs(cell.z)];
    for (let ix = 0; ix < xs.length; ix++) {
      for (let iz = 0; iz < zs.length; iz++) {
        const id = key(xs[ix], cell.y, zs[iz]);
        if (selected) draft[surface].delete(id);
        else draft[surface].add(id);
      }
    }
    refreshCells();
  }

  function refreshTabs() {
    overlay.querySelectorAll('[data-surface]').forEach(function (button) {
      button.classList.toggle('on', button.dataset.surface === surface);
    });
  }

  function refreshCells() {
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const selected = draft[surface].has(key(cell.userData.x, cell.userData.y, cell.userData.z));
      cell.material.color.setHex(selected ? 0xe7c15a : 0x87939b);
      cell.material.opacity = selected ? 0.58 : 0.1;
    }
    render();
  }

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  }

  function render() {
    renderer.render(scene, camera);
  }

  function open() {
    draft = clonePatterns(patterns);
    opened = true;
    overlay.classList.remove('hidden');
    refreshTabs();
    requestAnimationFrame(function () {
      resize();
      refreshCells();
    });
  }

  function close() {
    opened = false;
    overlay.classList.add('hidden');
  }

  function init(apply) {
    onApply = apply;
    injectUi();
    createScene();
    window.addEventListener('resize', function () {
      if (opened) resize();
    });
    document.getElementById('build-patterns').addEventListener('click', open);
  }

  root.BuildPatterns = {
    allows: allows,
  };
  root.BuildPatternEditor = {
    init: init,
    get opened() {
      return opened;
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
