window.AudioContext =
	window.AudioContext ||
	window.webkitAudioContext;
window.requestAnimationFrame =
	window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	window.oRequestAnimationFrame ||
	window.msRequestAnimationFrame;

jfxr.service('context', function() {
	return new AudioContext();
});

jfxr.service('Sound', function(context) {
	var Sound = function() {
		this.buffer = context.createBuffer(2, 44100, 44100);
		var freq = 440;
		for (var c = 0; c < this.buffer.numberOfChannels; c++) {
			var data = this.buffer.getChannelData(c);
			for (var i = 0; i < data.length; i++) {
				data[i] = Math.sin(2 * Math.PI * i * (freq * (1 + i * 16 / 44100)) / 44100);
			}
		}
	};

	Sound.prototype.getBuffer = function() {
		return this.buffer;
	};

	return Sound;
});

jfxr.service('Player', function($rootScope, $timeout, context) {
	var Player = function(sound) {
		var self = this;

		this.sound = sound;
		this.position = 0;

		this.playing = false;

		this.analyser = context.createAnalyser();
		this.analyser.fftSize = 256;
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
			self.analyser.getFloatFrequencyData(self.frequencyData);
			for (var c = 0; c < e.outputBuffer.numberOfChannels; c++) {
				e.outputBuffer.getChannelData(c).set(e.inputBuffer.getChannelData(c));
			}
		};
		this.script.connect(this.analyser);
	};

	Player.prototype.play = function() {
		if (this.playing) {
			this.stop();
		}
		var self = this;
		this.source = context.createBufferSource();
		this.source.connect(this.script);
		this.source.buffer = this.sound.getBuffer();
		this.source.start();
		this.source.onended = function() {
			$rootScope.$apply(function() {
				self.playing = false;
			});
		};
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

jfxr.directive('analyser', function() {
	var clear = function(context, width, height) {
		context.clearRect(0, 0, width, height);
	};

	var draw = function(context, width, height, data) {
		var barWidth = Math.max(2, Math.ceil(width / data.length));
		var numBars = Math.floor(width / barWidth);
		var barGap = 1;

		var blockHeight = 3;
		var blockGap = 1;
		var numBlocks = Math.floor(height / blockHeight);

		clear(context, width, height);

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
					clear(context, width, height);
				}
			});
		},
	};
});

jfxr.directive('waveform', function() {
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

		var channels = [];
		for (var c = 0; c < buffer.numberOfChannels; c++) {
			channels.push(buffer.getChannelData(c));
		}

		var numSamples = buffer.length;
		context.strokeStyle = '#88f';
		context.lineWidth = 1.0;
		context.globalAlpha = 1.0;
		context.beginPath();
		context.moveTo(0, height / 2);
		for (var i = 0; i < numSamples; i++) {
			var sample = (channels[0][i] + channels[1][i]) / 2;
			context.lineTo(i / numSamples * width, (sample + 1) * height / 2);
		}
		context.stroke();

		context.strokeStyle = '#fff';
		context.globalAlpha = 0.1;
		context.beginPath();
		context.moveTo(0, height / 2);
		context.lineTo(width, height / 2);
		context.stroke();
	};

	return {
		scope: {
			'waveform': '=',
		},
		link: function(scope, element, attrs, ctrl) {
			var destroyed = false;
			element.bind('$destroy', function() {
				destroyed = true;
			});

			var canvas = element[0];

			scope.$watch(function() {
				var data = scope.$eval('waveform');
				draw(canvas, data);
			});
		},
	};
});

jfxr.service('localStorage', function() {
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

jfxr.controller('JfxrCtrl', function(Sound, Player, $scope, localStorage) {
	var sound = new Sound();
	$scope.sound = sound;

	var player = new Player(sound);

	var analyserEnabled = localStorage.get('analyserEnabled', true);

	this.isPlaying = function() {
		return player.playing;
	};

	this.togglePlay = function() {
		if (player.playing) {
			player.stop();
		} else {
			player.play();
		}
	};

	this.getFrequencyData = function() {
		return player.getFrequencyData();
	};

	this.keyDown = function(e) {
		if (e.keyCode == 32) { // space
			this.togglePlay();
		}
	};

	this.isAnalyserEnabled = function() {
		return analyserEnabled;
	};

	this.toggleAnalyserEnabled = function() {
		analyserEnabled = !analyserEnabled;
		localStorage.set('analyserEnabled', analyserEnabled);
	};
});
