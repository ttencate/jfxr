import angular from 'angular';

import { sign } from '../../lib';

export var customParam = [function() {
  return {
    restrict: 'E',
    scope: {
      sound: '=',
      param: '@',
    },
    transclude: true,
    template:
      '<div class="param" ng-class="{\'param-disabled\': sound[param].isDisabled(sound)}" title={{sound[param].whyDisabled(sound)}} ng-mouseenter="$emit(\'parammouseenter\', sound[param])" ng-mouseleave="$emit(\'parammouseleave\', sound[param])">' +
            '  <div class="paramlabel">{{sound[param].label}}</div>' +
            '  <div class="paramcontent" ng-transclude></div>' +
      '  <div class="parambuttons">' +
      '    <button class="iconbutton iconbutton-reset" title="Reset to default value" ng-click="sound[param].reset()" ng-disabled="sound[param].isDisabled(sound) || sound[param].hasDefaultValue()"></button>' +
      '    <button class="iconbutton iconbutton-lock" ng-class="{\'iconbutton-lock-locked\': sound[param].locked}" title="Lock from mutations" ng-click="sound[param].toggleLocked()" ng-disabled="sound[param].isDisabled(sound)"></button>' +
      '  </div>' +
      '</div>',
  };
}];

export var floatParam = [function() {
  return {
    restrict: 'E',
    scope: {
      sound: '=',
      param: '@',
    },
    template:
      '<custom-param sound="sound" param="{{param}}" value="sound[param].value">' +
      '  <div class="paramcontrol">' +
      '    <input type="range" min="{{ctrl.minValue}}" max="{{ctrl.maxValue}}" step="{{ctrl.step}}" ng-model="ctrl.rangeValue" ng-disabled="sound[param].isDisabled(sound)" class="floatslider"></input>' +
      '  </div>' +
      '  <div class="paramvalue">' +
      '    <input ng-show="!sound[param].isDisabled(sound)" class="floattext" type="text" ng-model="ctrl.textValue"></input>' +
      '    <span ng-show="sound[param].isDisabled(sound)">&mdash;</span>' +
      '  </div>' +
      '  <div class="paramunit">{{sound[param].unit}}</div>' +
      '</div>',
    controller: ['$scope', function($scope) {
      // These are bound by ngModel; do not use them for anything else directly.
      this.rangeValue = '';
      this.textValue = '';

      // If r is the value on the range slider, and p the corresponding value of the parameter:
      // p = (2^abs(r) - 1) * sign(r)
      // This works for negative numbers and ensures continuity (and even differentiability)
      // through 0, but loses precision for numbers close to 0.
      function fromLog(r) {
        return sign(r) * (Math.pow(2, Math.abs(r)) - 1);
      }
      function toLog(p) {
        return sign(p) * Math.log(Math.abs(p) + 1) / Math.log(2);
      }

      var param = null;
      var logarithmic = false;
      this.minValue = 0;
      this.maxValue = 0;
      this.step = 0;
      $scope.$watch(function() { return $scope.sound[$scope.param]; }, function(p) {
        if (!p) return;
        param = p;
        logarithmic = param.logarithmic;
        if (logarithmic) {
          this.minValue = toLog(param.minValue);
          this.maxValue = toLog(param.maxValue);
          this.step = 1e-99;
        } else {
          this.minValue = param.minValue;
          this.maxValue = param.maxValue;
          this.step = param.step;
        }
      }.bind(this));

      this.getRangeValue = function() {
        if (logarithmic) {
          return fromLog(parseFloat(this.rangeValue));
        } else {
          return this.rangeValue;
        }
      };

      this.setRangeValue = function(value) {
        if (logarithmic) {
          this.rangeValue = toLog(value);
        } else {
          this.rangeValue = value;
        }
      };

      this.getTextValue = function() {
        return this.textValue;
      };

      this.setTextValue = function(value) {
        this.textValue = value;
      };

      this.getParamValue = function() {
        if (!param) return null;
        return param.value;
      };

      this.setParamValue = function(value) {
        if (!param) return;
        param.value = value;
      };

      this.stepParam = function(delta) {
        if (!param) return;
        var value = this.getParamValue();
        delta = sign(delta);
        if (logarithmic) {
          value -= delta * param.step;
        } else {
          value /= param.step;
        }
        this.setParamValue(value);
      };
    }],
    controllerAs: 'ctrl',
    link: function(scope, element, attrs, ctrl) {
      element.bind('wheel', function(e) {
        if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey || e.buttons) {
          return;
        }
        var delta = e.deltaX + e.deltaY;
        ctrl.stepParam(delta);
        scope.$apply();
        e.preventDefault();
      });

      scope.$watch(ctrl.getParamValue.bind(ctrl), function(value) {
        ctrl.setRangeValue(value);
        ctrl.setTextValue(value);
      });

      var rangeInput = angular.element(element[0].getElementsByClassName('floatslider'));
      rangeInput.bind('input', function(unused_e) {
        var value = ctrl.getRangeValue();
        ctrl.setTextValue(value);
        ctrl.setParamValue(value);
        scope.$apply();
      });

      var textInput = angular.element(element[0].getElementsByClassName('floattext'));
      textInput.bind('blur', function(unused_e) {
        ctrl.setParamValue(ctrl.getTextValue());
        ctrl.setTextValue(ctrl.getParamValue()); // Propagates clamping etc. back to the text input.
        scope.$apply();
      });
      textInput.bind('keydown', function(e) {
        switch (e.keyCode) {
          case 13: // Enter
            textInput[0].blur();
            e.preventDefault();
            break;
          case 27: // Esc
            ctrl.setTextValue(ctrl.getParamValue());
            textInput[0].blur();
            e.preventDefault();
            break;
        }
      });
    },
  };
}];

export var booleanParam = [function() {
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
    link: function(scope, element, unused_attrs, unused_ctrl) {
      element.bind('wheel', function(e) {
        if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey || e.buttons) {
          return;
        }
        var delta = e.deltaX + e.deltaY;
        scope.$apply(function() {
          var param = scope.sound[scope.param];
          param.value -= sign(delta) * param.step;
        });
        e.preventDefault();
      });

      // Something funny is going on with initialization of range elements with float values.
      // E.g. without this, the sustain slider will start at the 0 position. Angular bug?
      var unwatch = scope.$watch('sound[param].value', function(value) {
        if (value !== undefined) {
          element.find('input')[0].value = value;
          unwatch();
        }
      });
    },
  };
}];

export var waveformButton = [function() {
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
}];

export var linkbox = ['$document', '$timeout', function($document, $timeout) {
  return {
    scope: {
      for: '=',
    },
    template: '<input type="text" readonly class="linkbox" ng-model="for" ng-show="for"></input>',
    link: function(scope, element, unused_attrs, unused_ctrl) {
      var input = element.find('input');
      input.on('blur', function() {
        scope['for'] = null;
        scope.$apply();
      });
      scope.$watch('for', function(value) {
        if (value) {
          $timeout(function() {
            input[0].focus();
            input[0].setSelectionRange(0, value.length);
          });
        }
      });
    },
  };
}];
