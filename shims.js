window.AudioContext =
  window.AudioContext ||
  window.webkitAudioContext;

window.requestAnimationFrame =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame;

jfxr.shims = {};

jfxr.shims.haveWebWorkers = function() {
  if (!window.Worker) {
    console.log('Web workers not supported');
    return false;
  }

  // Web worker cleanup is buggy on Chrome < 34.0.1847.131, see
  // https://code.google.com/p/chromium/issues/detail?id=361792
  var m = navigator.appVersion.match(/Chrome\/((\d+\.)*\d)/);
  if (m && m[1] && jfxr.shims.compareVersionStrings(m[1], '34.0.1847.131') < 0) {
    console.log('Web workers buggy and disabled, please update your browser');
    return false;
  }
  
  return true;
};

jfxr.shims.compareVersionStrings = function(a, b) {
  function toArray(x) {
    var array = x.split('.');
    for (var i = 0; i < array.length; i++) {
      array[i] = parseInt(array[i]);
    }
    return array;
  }
  a = toArray(a);
  b = toArray(b);

  for (var i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  if (a.length > b.length) return 1;
  if (a.length < b.length) return -1;
  return 0;
};
