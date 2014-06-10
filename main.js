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
	};

	Player.prototype.play = function() {
		if (this.playing) {
			this.stop();
		}
		var self = this;
		this.source = context.createBufferSource();
		this.source.connect(this.analyser);
		this.source.buffer = this.sound.buffer;
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

	Player.prototype.getAnalyser = function() {
		return this.analyser;
	};

	return Player;
});

jfxr.directive('analyser', function() {
	var draw = function(canvas, data, minData, maxData) {
		var width = canvas.clientWidth;
		var height = canvas.clientHeight;
		if (canvas.width != width) {
			canvas.width = width;
		}
		if (canvas.height != height) {
			canvas.height = height;
		}

		var numBars = data.length;
		var barWidth = Math.max(1, Math.ceil(width / numBars));

		var context = canvas.getContext('2d');
		context.clearRect(0, 0, width, height);

		var gradient = context.createLinearGradient(0, 0, 0, height);
		gradient.addColorStop(0, '#f00');
		gradient.addColorStop(0.6, '#dd0');
		gradient.addColorStop(1, '#0b0');

		context.fillStyle = gradient;
		context.globalAlpha = 1.0;
		for (var i = 0; i < numBars; i++) {
			var f = (data[i] + 100) / 100;
			context.fillRect(i * barWidth, (1 - f) * height, barWidth, f * height);
		}

		context.fillStyle = '#fff';
		context.globalAlpha = 0.2;
		for (var i = 0; i <= 6; i++) {
			var y = i / 6 * (height - 1) + 0.5;
			context.fillRect(0, y, width, 0.5);
		}
	};

	return {
		scope: {
			'analyser': '=',
			'playing': '=',
		},
		link: function(scope, element, attrs, ctrl) {
			var destroyed = false;
			element.bind('$destroy', function() {
				destroyed = true;
			});

			var canvas = element[0];

			var analyser = null;
			var data = null;
			scope.$watch('analyser', function(value) {
				analyser = value;
				data = new Float32Array(analyser.frequencyBinCount);
			});

			var playing = null;
			scope.$watch('playing', function(value) {
				playing = value;
				// AnalyserNode without inputs just keeps handing back the last
				// valid data, so fill the array with silence.
				if (!playing) {
					for (var i = 0; i < data.length; i++) {
						data[i] = -1000;
					}
				}
			});

			var animFrame = function() {
				if (destroyed || !analyser || !data) {
					return;
				}
				if (playing) {
					analyser.getFloatFrequencyData(data);
				}
				draw(canvas, data);
				window.requestAnimationFrame(animFrame);
			};
			window.requestAnimationFrame(animFrame);
		},
	};
});

jfxr.controller('JfxrCtrl', function(Sound, Player, $scope) {
	var sound = new Sound();
	$scope.sound = sound;

	var player = new Player(sound);

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

	this.getAnalyser = function() {
		return player.getAnalyser();
	};

	this.keyDown = function(e) {
		if (e.keyCode == 32) { // space
			this.togglePlay();
		}
	};
});
