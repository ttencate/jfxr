export function debounce(fn, delay) {
  var timeoutId = null;
  var finalCallArguments = null;
  return function() {
    if (timeoutId === null) {
      fn.apply(this, arguments);
      timeoutId = window.setTimeout(function() {
        timeoutId = null;
        if (finalCallArguments) {
          fn.apply(this, finalCallArguments);
          finalCallArguments = null;
        }
      }.bind(this), delay);
    } else {
      finalCallArguments = Array.prototype.slice.call(arguments);
    }
  };
}
