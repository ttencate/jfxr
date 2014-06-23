window.AudioContext =
	window.AudioContext ||
	window.webkitAudioContext;

window.requestAnimationFrame =
	window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	window.oRequestAnimationFrame ||
	window.msRequestAnimationFrame;

// stackoverflow.com/questions/21363064/chrome-chromium-doesnt-know-javascript-function-math-sign
Math.sign = function(x) {
    if (+x === x) { // check if a number was given
        return (x === 0) ? x : (x > 0) ? 1 : -1;
    }
    return NaN;
};
