jfxrApp.directive('customParam', [function() {
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
      '    <button class="iconbutton iconbutton-reset" title="Reset to default value" ng-click="sound[param].reset()" ng-disabled="sound[param].isDisabled(sound) || sound[param].hasDefaultValue()"></button>' +
      '    <button class="iconbutton iconbutton-lock" ng-class="{\'iconbutton-lock-locked\': sound[param].locked}" title="Lock from mutations" ng-click="sound[param].toggleLocked()" ng-disabled="sound[param].isDisabled(sound)"></button>' +
      '  </div>' +
      '</div>',
  };
}]);

jfxrApp.directive('floatParam', [function() {
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
}]);

jfxrApp.directive('booleanParam', [function() {
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
        if (value !== undefined) {
          element.find('input')[0].value = value;
          unwatch();
        }
      });
    },
  };
}]);

jfxrApp.directive('waveformButton', [function() {
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
}]);

jfxrApp.directive('linkbox', ['$document', '$timeout', function($document, $timeout) {
  return {
    scope: {
      for: '=',
    },
    template: '<input type="text" readonly class="linkbox" ng-model="for" ng-show="for"></input>',
    link: function(scope, element, attrs, ctrl) {
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
}]);
