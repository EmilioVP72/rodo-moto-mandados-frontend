(function () {
  try {
    var w = window.innerWidth || document.documentElement.clientWidth || 360;
    var ua = navigator.userAgent || '';
    var isMobile = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || w < 768;
    var isTablet =
      /iPad|Tablet/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
      (w >= 768 && w < 1024);
    var cls = isMobile ? 'device-mobile' : isTablet ? 'device-tablet' : 'device-desktop';
    document.documentElement.classList.add(cls);
  } catch (e) {}
})();
