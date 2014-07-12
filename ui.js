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

		context.strokeStyle = '#88f';
		context.lineWidth = 1.0;
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
				context.moveTo(x + 0.5, (1 - min) * height / 2);
				context.lineTo(x + 0.5, (1 - max) * height / 2);
				context.stroke();
			}
		}

		context.strokeStyle = '#fff';
		context.globalAlpha = 0.1;
		context.beginPath();
		context.moveTo(0, height / 2);
		context.lineTo(width, height / 2);
		context.stroke();
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
				draw(canvas, value);
			});
		},
	};
});

jfxrApp.directive('customParam', function() {
	return {
		restrict: 'E',
		scope: {
			'label': '=',
			'value': '=',
			'unit': '=',
		},
		transclude: true,
		template: 
			'<div class="param">' +
            '  <div class="paramlabel">{{label}}</div>' +
            '  <div class="paramcontrol" ng-transclude></div>' +
            '  <div class="customparamvalue">{{value}}</div>' +
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
			'<div class="param" ng-class="{\'param-disabled\': sound[param].isDisabled(sound)}" title={{sound[param].whyDisabled(sound)}}>' +
            '  <div class="paramlabel">{{sound[param].label}}</div>' +
            '  <div class="paramcontrol">' +
			'    <input type="range" min="{{sound[param].minValue}}" max="{{sound[param].maxValue}}" step="{{sound[param].step}}" ng-model="sound[param].value" ng-disabled="sound[param].isDisabled(sound)" class="floatslider"></input>' +
			'  </div>' +
            '  <div class="paramvalue" ng-switch="sound[param].isDisabled(sound)">' +
			'    <input ng-switch-when="false" class="floattext" type="text" ng-model="sound[param].value"></input>' +
			'    <span ng-switch-when="true">&mdash;</span>' +
			'  </div>' +
            '  <div class="paramunit">{{sound[param].unit}}</div>' +
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

jfxrApp.directive('booleanParam', function() {
	return {
		restrict: 'E',
		scope: {
			sound: '=',
			param: '@',
		},
		template:
			'<div class="param" ng-class="{\'param-disabled\': sound[param].isDisabled(sound)}" title={{sound[param].whyDisabled(sound)}}>' +
            '  <div class="paramlabel">{{sound[param].label}}</div>' +
            '  <div class="paramcontrol">' +
			'    <label class="booleanlabel" ng-class="{\'booleanlabel-checked\': sound[param].value}"><input type="checkbox" ng-model="sound[param].value" ng-disabled="sound[param].isDisabled(sound)"></input></label>' +
			'  </div>' +
            '  <div class="customparamvalue">' +
			'    {{sound[param].valueTitle()}}' +
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

	return new LocalStorage();
});
