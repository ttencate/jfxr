jfxr.Math = jfxr.Math || {};

// stackoverflow.com/questions/21363064/chrome-chromium-doesnt-know-javascript-function-math-sign
jfxr.Math.sign = function(x) {
    if (+x === x) { // check if a number was given
        return (x === 0) ? x : (x > 0) ? 1 : -1;
    }
    return NaN;
};

jfxr.Math.frac = function(x) {
	return x - Math.floor(x);
};

jfxr.Math.clamp = function(min, max, x) {
	if (x < min) return min;
	if (x > max) return max;
	return x;
};

jfxr.Math.roundTo = function(x, multiple) {
	return Math.round(x / multiple) * multiple;
};
