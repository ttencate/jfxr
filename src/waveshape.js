jfxrApp.directive('waveshape', [function() {
  var draw = function(canvas, buffer) {
    var width = canvas.clientWidth;
    var height = canvas.clientHeight;
    if (canvas.width != width) {
      canvas.width = width;
    }
    if (canvas.height != height) {
      canvas.height = height;
    }

    var context = canvas.getContext('2d');
    context.globalAlpha = 1.0;
    context.clearRect(0, 0, width, height);

    if (!buffer) {
      return;
    }

    var channel = buffer.getChannelData(0);
    var numSamples = buffer.length;

    context.strokeStyle = '#fff';
    context.globalAlpha = 0.1;
    context.lineWidth = 1.0;
    context.beginPath();
    context.moveTo(0, height / 2);
    context.lineTo(width, height / 2);
    context.stroke();

    context.strokeStyle = '#57d';
    context.globalAlpha = 1.0;

    var i;
    var sample;

    if (numSamples < width) {
      // Draw a line between each pair of successive samples.
      context.beginPath();
      context.moveTo(0, height / 2);
      for (i = 0; i < numSamples; i++) {
        sample = channel[i];
        context.lineTo(i / numSamples * width, (1 - sample) * height / 2);
      }
      context.stroke();
    } else {
      // More samples than pixels. At a 5s buffer, drawing all samples
      // takes 300ms. For performance, draw a vertical line in each pixel
      // column, representing the range of samples falling into this
      // column.
      // TODO: make this look better by taking advantage of antialiasing somehow
      for (var x = 0; x < width; x++) {
        var min = 1e99, max = -1e99;
        var start = Math.floor(x / width * numSamples);
        var end = Math.ceil((x + 1) / width * numSamples);
        for (i = start; i < end; i++) {
          sample = channel[i];
          if (sample < min) min = sample;
          if (sample > max) max = sample;
        }
        context.beginPath();
        context.moveTo(x + 0.5, (1 - min) * height / 2 - 0.5);
        context.lineTo(x + 0.5, (1 - max) * height / 2 + 0.5);
        context.stroke();
      }
    }
  };

  return {
    scope: {
      'buffer': '=waveshape',
    },
    link: function(scope, element, attrs, ctrl) {
      var destroyed = false;
      element.bind('$destroy', function() {
        destroyed = true;
      });

      var canvas = element[0];

      scope.$watch('buffer', function(value) {
        if (value) {
          draw(canvas, value);
        }
      });
    },
  };
}]);
