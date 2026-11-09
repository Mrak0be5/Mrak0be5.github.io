// Кадр уровня «Телефон»: один проход сцены прямо в холст. Сглаживание — MSAA самого холста (контекст с antialias),
// тон-маппинг (AgX) и sRGB — в шейдерах материалов, без целей рендера и полноэкранных проходов: на плиточных
// видеокартах телефонов каждая цель и каждый проход по экрану — полоса памяти. Чёткость холста ведёт оригинал
// (средняя — 1,5 от CSS) и сам снижает её, если кадров мало (watchQuality меряет и кадр вида).
// Меши только для тени (geo.js → SHADOW_ONLY: тень здания и двора одним вызовом) видимы лишь на время прохода тени
// (geo.js → shadowOnlyPass, ставит scene.js): рендерер строит списки кадра до него, в кадр они не попадают.

export function createMobile(renderer, scene, camera) {
  return {
    mobile: true,
    // холст и его чёткость — у игры; своих целей нет
    setSize: function () {},
    render: function () {
      renderer.setRenderTarget(null);
      renderer.autoClear = true;
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);
    },
    compile: function () {
      renderer.setRenderTarget(null);
      return renderer.compile(scene, camera);
    },
  };
}
