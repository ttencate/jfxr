jfxrApp.directive('waveshape', [function() {
  return {
    scope: {
      'buffer': '=waveshapeBuffer',
      'sound': '=waveshapeSound',
    },
    link: function(scope, element, attrs, ctrl) {
      var canvas = element[0];
      var context = canvas.getContext('2d');
      var width;
      var height;

      var prepare = function() {
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        if (canvas.width != width) {
          canvas.width = width;
        }
        if (canvas.height != height) {
          canvas.height = height;
        }
      };

      var clear = function() {
        context.globalAlpha = 1.0;
        context.clearRect(0, 0, width, height);
      };

      var drawBuffer = function(buffer) {
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

      var drawSound = function(sound) {
        var scaleX = width / sound.duration();
        var baseY = height / 2;
        var scaleY = -(height / 2 - 0.5) / (1 + sound.sustainPunch.value / 100);

        var points = [
          [0, 0],
          [sound.attack.value, 1],
          [sound.attack.value, 1 + sound.sustainPunch.value / 100],
          [sound.attack.value + sound.sustain.value, 1],
          [sound.attack.value + sound.sustain.value + sound.decay.value, 0],
        ];

        context.strokeStyle = '#d66';
        context.globalAlpha = 1.0;
        context.lineWidth = 1.0;
        context.beginPath();
        for (var j = -1; j <= 1; j += 2) {
          context.moveTo(points[0][0] * scaleX, baseY + points[0][1] * scaleY);
          for (var i = 1; i < points.length; i++) {
            context.lineTo(points[i][0] * scaleX, baseY + j * points[i][1] * scaleY);
          }
          context.stroke();
        }
      };

      scope.$watchGroup(['sound', 'buffer'], function(values) {
        prepare();
        clear();
        if (values[1]) {
          drawBuffer(values[1]);
        }
        if (values[0]) {
          drawSound(values[0]);
        }
      });
    },
  };
}]);
