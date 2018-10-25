export var analyser = [function() {
  var draw = function(context, width, height, data) {
    var barWidth = Math.max(2, Math.ceil(width / data.length));
    var numBars = Math.floor(width / barWidth);
    var barGap = 1;

    var blockHeight = 3;
    var blockGap = 1;
    var numBlocks = Math.floor(height / blockHeight);

    context.clearRect(0, 0, width, height);

    var gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f00');
    gradient.addColorStop(0.6, '#dd0');
    gradient.addColorStop(1, '#0b0');

    var i;
    var y;

    context.fillStyle = gradient;
    context.globalAlpha = 1.0;
    for (i = 0; i < numBars; i++) {
      var f = (data[i] + 100) / 100;
      y = Math.round(f * numBlocks) / numBlocks;
      context.fillRect(i * barWidth, (1 - y) * height, barWidth - barGap, y * height);
    }

    context.fillStyle = '#111';
    context.globalAlpha = 0.3;
    for (i = 0; i < numBlocks; i++) {
      y = i * blockHeight + 1;
      context.fillRect(0, y, width, blockGap);
    }
  };

  return {
    scope: {
      'analyser': '=',
      'enabled': '=',
    },
    link: function(scope, element, unused_attrs, unused_ctrl) {
      var canvas = element[0];
      var context = canvas.getContext('2d');
      var width = canvas.width;
      var height = canvas.height;

      var animFrame = function() {
        if (!enabled) {
          return;
        }
        if (data) {
          draw(context, width, height, data);
        }
        window.requestAnimationFrame(animFrame);
      };

      var data = null;
      scope.$watch('analyser', function(value) {
        data = value;
      });

      var enabled = true;
      scope.$watch('enabled', function(value) {
        enabled = value;
        if (enabled) {
          window.requestAnimationFrame(animFrame);
        } else {
          context.clearRect(0, 0, width, height);
        }
      });
    },
  };
}];
