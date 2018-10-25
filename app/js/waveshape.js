export var canvasManager = [function() {
  return {
    controller: ['$element', function($element) {
      var canvas = $element[0];
      var context = canvas.getContext('2d');
      var width = 0;
      var height = 0;
      var drawFunctions = [];

      this.registerDrawFunction = function(drawFunction) {
        drawFunctions.push(drawFunction);
      };

      this.draw = function() {
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        if (canvas.width != width) {
          canvas.width = width;
        }
        if (canvas.height != height) {
          canvas.height = height;
        }

        context.globalAlpha = 1.0;
        context.clearRect(0, 0, width, height);

        for (var i = 0; i < drawFunctions.length; i++) {
          drawFunctions[i](context, width, height);
        }
      };
    }],
  };
}];

export var waveshape = [function() {
  return {
    require: 'canvasManager',
    link: function(scope, element, attrs, ctrl) {
      var buffer = null;

      ctrl.registerDrawFunction(function(context, width, height) {
        if (!buffer) return;

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
          // TODO: make this look smoother by taking advantage of antialiasing somehow
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
      });

      scope.$watch(attrs.waveshape, function(value) {
        buffer = value;
        ctrl.draw();
      });
    },
  };
}];

export var drawAmplitude = [function() {
  return {
    require: 'canvasManager',
    link: function(scope, element, attrs, ctrl) {
      var sound = null;

      ctrl.registerDrawFunction(function(context, width, height) {
        if (!sound) return;

        var duration = sound.duration();
        var baseY = height - 0.5;
        var scaleY = -(height - 1) / (1 + sound.sustainPunch.value / 100);

        context.strokeStyle = '#d66';
        context.globalAlpha = 1.0;
        context.lineWidth = 1.0;
        context.beginPath();
        for (var x = 0; x < width; x++) {
          var time = x / width * duration;
          context.lineTo(x, baseY + sound.amplitudeAt(time) * scaleY);
        }
        context.stroke();
      });

      scope.$watch(attrs.drawAmplitude + '.serialize()', function(unused_value) {
        sound = scope.$eval(attrs.drawAmplitude);
        ctrl.draw();
      });
    },
  };
}];

export var drawFrequency = [function() {
  return {
    require: 'canvasManager',
    link: function(scope, element, attrs, ctrl) {
      var sound = null;

      ctrl.registerDrawFunction(function(context, width, height) {
        if (!sound) return;

        var duration = sound.duration();

        var min = 0;
        var max = 0;
        var x;
        for (x = 0; x < width; x++) {
          var f = sound.frequencyAt(x / width * duration);
          max = Math.max(max, f);
        }
        var baseY;
        var scaleY;
        if (max - min > 0) {
          scaleY = -(height - 1) / (max - min);
          baseY = height - 0.5 - min * scaleY;
        } else {
          scaleY = 0;
          baseY = height / 2;
        }

        context.strokeStyle = '#bb5';
        context.globalAlpha = 1.0;
        context.lineWidth = 1.0;
        context.beginPath();
        for (x = 0; x < width; x++) {
          var time = x / width * duration;
          context.lineTo(x, baseY + sound.frequencyAt(time) * scaleY);
        }
        context.stroke();
      });

      scope.$watch(attrs.drawFrequency + '.serialize()', function(unused_value) {
        sound = scope.$eval(attrs.drawFrequency);
        ctrl.draw();
      });
    },
  };
}];
