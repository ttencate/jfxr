window.AudioContext =
  window.AudioContext ||
  window.webkitAudioContext;

window.requestAnimationFrame =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame;

export function missingBrowserFeatures() {
  var missing = [];
  if (window.Blob === undefined || window.FileReader === undefined ||
      window.URL === undefined || URL.createObjectURL === undefined) {
    missing.push('File API');
  }
  if (window.AudioContext === undefined) {
    missing.push('Web Audio');
  }
  if (window.HTMLCanvasElement === undefined) {
    missing.push('Canvas');
  }
  return missing;
}

export function callIfSaveAsBroken(callback) {
  // https://github.com/eligrey/FileSaver.js/issues/12#issuecomment-34557946
  var svg = new Blob(["<svg xmlns='http://www.w3.org/2000/svg'></svg>"], {type: "image/svg+xml;charset=utf-8"});
  var img = new Image();
  img.onerror = callback;
  img.src = URL.createObjectURL(svg);
}

export function haveWebWorkers() {
  if (!window.Worker) {
    console.log('Web workers not supported'); // eslint-disable-line no-console
    return false;
  }

  // Web worker cleanup is buggy on Chrome < 34.0.1847.131, see
  // https://code.google.com/p/chromium/issues/detail?id=361792
  var m = navigator.appVersion.match(/Chrome\/((\d+\.)*\d)/);
  if (m && m[1] && compareVersionStrings(m[1], '34.0.1847.131') < 0) {
    console.log('Web workers buggy and disabled, please update your browser'); // eslint-disable-line no-console
    return false;
  }

  return true;
}

function compareVersionStrings(a, b) {
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
}
