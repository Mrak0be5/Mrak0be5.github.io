// Витрина C14: window.HC_Layout('page'|'spread') зовёт jslib K28a (HCLayout.jslib) на BattleStarted и при выходе из боя.
// Запрошенный бой сохраняется при повороте окна; телефон и ?layout=page остаются страницей.
(function () {
  var requested = 'page';
  function apply() {
    if (!document.body) return 0;
    document.body.classList.toggle('hc-bookless', new URLSearchParams(location.search).get('book') === '0');
    var on = requested === 'spread' && new URLSearchParams(location.search).get('layout') !== 'page' &&
      window.matchMedia('(pointer: fine)').matches && window.innerWidth > window.innerHeight * 1.25;
    document.body.classList.toggle('spread', on);
    return on ? 1 : 0;
  }
  window.HC_Layout = function (mode) {
    requested = mode === 'spread' ? 'spread' : 'page';
    var on = apply();
    window.dispatchEvent(new Event('resize'));
    return on;
  };
  window.addEventListener('resize', apply);
  window.addEventListener('DOMContentLoaded', apply);
})();
