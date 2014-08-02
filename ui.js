jfxrApp.service('context', function() {
  return new AudioContext();
});

jfxrApp.service('Player', function($rootScope, $timeout, context) {
  var Player = function() {
    this.position = 0;

    this.playing = false;

    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.5;
    this.analyser.connect(context.destination);

    this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
    for (var i = 0; i < this.frequencyData.length; i++) {
      this.frequencyData[i] = -100;
    }

    // Make sure that the AnalyserNode is tickled at a regular interval,
    // even if we paint the canvas at irregular intervals. This is needed
    // because smoothing is applied only when the data is requested.
    this.script = context.createScriptProcessor();
    this.script.onaudioprocess = function(e) {
      this.analyser.getFloatFrequencyData(this.frequencyData);
    }.bind(this);
    // Feed zeros into the analyser because otherwise it freezes up as soon
    // as the sound stops playing.
    this.script.connect(this.analyser);
  };

  Player.prototype.play = function(buffer) {
    if (this.playing) {
      this.stop();
    }
    this.source = context.createBufferSource();
    this.source.connect(this.analyser);
    this.source.buffer = buffer;
    this.source.start();
    this.source.onended = function() {
      this.playing = false;
      $rootScope.$apply();
    }.bind(this);
    this.playing = true;
  };

  Player.prototype.stop = function() {
    if (!this.playing) {
      return;
    }
    this.source.stop();
    this.source.onended = null;
    this.source = null;
    this.playing = false;
  };

  Player.prototype.getFrequencyData = function() {
    return this.frequencyData;
  };

  return Player;
});

jfxrApp.directive('analyser', function() {
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

    context.fillStyle = gradient;
    context.globalAlpha = 1.0;
    for (var i = 0; i < numBars; i++) {
      var f = (data[i] + 100) / 100;
      var y = Math.round(f * numBlocks) / numBlocks;
      context.fillRect(i * barWidth, (1 - y) * height, barWidth - barGap, y * height);
    }

    context.fillStyle = '#111';
    context.globalAlpha = 0.3;
    for (var i = 0; i < numBlocks; i++) {
      var y = i * blockHeight + 1;
      context.fillRect(0, y, width, blockGap);
    }
  };

  return {
    scope: {
      'analyser': '=',
      'enabled': '=',
    },
    link: function(scope, element, attrs, ctrl) {
      var destroyed = false;
      element.bind('$destroy', function() {
        destroyed = true;
      });

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
});

jfxrApp.directive('waveshape', function() {
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

    if (numSamples < width) {
      // Draw a line between each pair of successive samples.
      context.beginPath();
      context.moveTo(0, height / 2);
      for (var i = 0; i < numSamples; i++) {
        var sample = channel[i];
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
        for (var i = start; i < end; i++) {
          var sample = channel[i];
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
});

jfxrApp.directive('customParam', function() {
  return {
    restrict: 'E',
    scope: {
      sound: '=',
      param: '@',
    },
    transclude: true,
    template: 
      '<div class="param" ng-class="{\'param-disabled\': sound[param].isDisabled(sound)}" title={{sound[param].whyDisabled(sound)}}>' +
            '  <div class="paramlabel">{{sound[param].label}}</div>' +
            '  <div class="paramcontent" ng-transclude></div>' +
      '  <div class="parambuttons">' +
      '    <button class="iconbutton iconbutton-lock" ng-class="{\'iconbutton-lock-locked\': sound[param].locked}" title="Lock from mutations" ng-click="sound[param].toggleLocked()" ng-disabled="sound[param].isDisabled(sound)"></button>' +
      '    <button class="iconbutton iconbutton-reset" title="Reset to default value" ng-click="sound[param].reset()" ng-disabled="sound[param].isDisabled(sound) || sound[param].hasDefaultValue()"></button>' +
      '  </div>' +
      '</div>',
  };
});

jfxrApp.directive('floatParam', function() {
  return {
    restrict: 'E',
    scope: {
      sound: '=',
      param: '@',
    },
    template:
      '<custom-param sound="sound" param="{{param}}" value="sound[param].value">' +
      '  <div class="paramcontrol">' +
      '    <input type="range" min="{{sound[param].minValue}}" max="{{sound[param].maxValue}}" step="{{sound[param].step}}" ng-model="sound[param].value" ng-model-options="{debounce: 300}" ng-disabled="sound[param].isDisabled(sound)" class="floatslider"></input>' +
      '  </div>' +
      '  <div class="paramvalue">' +
      '    <input ng-show="!sound[param].isDisabled(sound)" class="floattext" type="text" ng-model="ctrl.editedValue"></input>' +
      '    <span ng-show="sound[param].isDisabled(sound)">&mdash;</span>' +
      '  </div>' +
      '  <div class="paramunit">{{sound[param].unit}}</div>' +
      '</div>',
    controller: function() {
      this.editedValue = null;
    },
    controllerAs: 'ctrl',
    link: function(scope, element, attrs, ctrl) {
      element.bind('wheel', function(e) {
        if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey || e.buttons) {
          return;
        }
        var delta = e.deltaX + e.deltaY;
        scope.$apply(function() {
          var param = scope.sound[scope.param];
          param.value -= jfxr.Math.sign(delta) * param.step;
        });
        e.preventDefault();
      });

      scope.$watch('sound[param].value', function(value) {
        ctrl.editedValue = value;
      });

      var textInput = angular.element(element[0].getElementsByClassName('floattext'));
      textInput.bind('blur', function(e) {
        console.log(e);
        scope.sound[scope.param].value = ctrl.editedValue;
        ctrl.editedValue = scope.sound[scope.param].value;
        scope.$apply();
      });
      textInput.bind('keydown', function(e) {
        switch (e.keyCode) {
          case 13: // Enter
            textInput[0].blur();
            e.preventDefault();
            break;
          case 27: // Esc
            ctrl.editedValue = scope.sound[scope.param].value;
            textInput[0].blur();
            e.preventDefault();
            break;
        }
      });
    },
  };
});

jfxrApp.directive('booleanParam', function() {
  return {
    restrict: 'E',
    scope: {
      sound: '=',
      param: '@',
    },
    template:
      '<custom-param sound="sound" param="{{param}}">' +
      '  <div class="paramcontrol">' +
      '    <label class="booleanlabel" ng-class="{\'booleanlabel-checked\': sound[param].value, \'booleanlabel-disabled\': sound[param].isDisabled(sound)}"><input type="checkbox" ng-model="sound[param].value" ng-disabled="sound[param].isDisabled(sound)"></input></label>' +
      '  </div>' +
      '  <div class="customparamvalue" ng-switch="sound[param].isDisabled(sound)">' +
      '    <span ng-switch-when="false">{{sound[param].valueTitle()}}</span>' +
      '    <span ng-switch-when="true">&mdash;</span>' +
      '  </div>' +
      '</div>',
    link: function(scope, element, attrs, ctrl) {
      element.bind('wheel', function(e) {
        if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey || e.buttons) {
          return;
        }
        var delta = e.deltaX + e.deltaY;
        scope.$apply(function() {
          var param = scope.sound[scope.param];
          param.value -= jfxr.Math.sign(delta) * param.step;
        });
        e.preventDefault();
      });

      // Something funny is going on with initialization of range elements with float values.
      // E.g. without this, the sustain slider will start at the 0 position. Angular bug?
      var unwatch = scope.$watch('sound[param].value', function(value) {
        if (value != undefined) {
          element.find('input')[0].value = value;
          unwatch();
        }
      });
    },
  };
});

jfxrApp.directive('waveformButton', function() {
  return {
    require: 'ngModel',
    scope: {
      title: '@',
      waveform: '@waveformButton',
      ngModel: '=',
    },
    template:
      '<label class="waveform" ' +
      '       ng-class="\'waveform-\' + waveform + (checked ? \' checked\' : \'\')" title="{{title}}">' +
      '  <input type="radio" name="waveform" ng-value="waveform"></input>' +
      '  {{title}}' +
      '</label>',
    link: function(scope, element, attrs, modelCtrl) {
      var input = element.find('input');
      var value = scope.waveform;

      scope.$watch(function() { return input[0].checked; }, function(checked) {
        scope.checked = checked;
      });

      modelCtrl.$render = function() {
        input[0].checked = (modelCtrl.$viewValue == value);
      };
      input.bind('click', function() {
        scope.$apply(function() {
          if (input[0].checked) {
            modelCtrl.$setViewValue(value);
          }
        });
      });
    },
  };
});

jfxrApp.service('localStorage', function() {
  var LocalStorage = function() {
    this.data = window.localStorage || {};
  };

  LocalStorage.prototype.get = function(key, defaultValue) {
    var json = this.data[key];
    if (json == undefined) {
      return defaultValue;
    }
    return JSON.parse(json);
  };

  LocalStorage.prototype.set = function(key, value) {
    this.data[key] = JSON.stringify(value);
  };

  LocalStorage.prototype.delete = function(key) {
    this.data.removeItem(key);
  };

  return new LocalStorage();
});

// http://stackoverflow.com/questions/16240864/update-number-boundary-using-ng-model

jfxr.isEmpty = function(value) {
  return angular.isUndefined(value) || value === '' || value === null || value !== value;
}

jfxrApp.directive('ngMin', function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, elem, attr, ctrl) {
      scope.$watch(attr.ngMin, function(){
        ctrl.$setViewValue(ctrl.$viewValue);
      });
      var minValidator = function(value) {
        var min = scope.$eval(attr.ngMin) || 0;
        if (!jfxr.isEmpty(value) && value < min) {
          ctrl.$setValidity('ngMin', false);
          return undefined;
        } else {
          ctrl.$setValidity('ngMin', true);
          return value;
        }
      };

      ctrl.$parsers.push(minValidator);
      ctrl.$formatters.push(minValidator);
    },
  };
});

jfxrApp.directive('ngMax', function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, elem, attr, ctrl) {
      scope.$watch(attr.ngMax, function(){
        ctrl.$setViewValue(ctrl.$viewValue);
      });
      var maxValidator = function(value) {
        var max = scope.$eval(attr.ngMax) || Infinity;
        if (!jfxr.isEmpty(value) && value > max) {
          ctrl.$setValidity('ngMax', false);
          return undefined;
        } else {
          ctrl.$setValidity('ngMax', true);
          return value;
        }
      };

      ctrl.$parsers.push(maxValidator);
      ctrl.$formatters.push(maxValidator);
    },
  };
});
