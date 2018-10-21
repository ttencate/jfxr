// stackoverflow.com/questions/21363064/chrome-chromium-doesnt-know-javascript-function-math-sign
export function sign(x) {
  if (+x === x) { // check if a number was given
    return (x === 0) ? x : (x > 0) ? 1 : -1;
  }
  return NaN;
}

export function frac(x) {
  return x - Math.floor(x);
}

export function clamp(min, max, x) {
  if (x < min) return min;
  if (x > max) return max;
  return x;
}

export function roundTo(x, multiple) {
  return Math.round(x / multiple) * multiple;
}

export function lerp(a, b, f) {
  return (1 - f) * a + f * b;
}
