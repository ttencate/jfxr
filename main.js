window.AudioContext =
	window.AudioContext ||
	window.webkitAudioContext;

jfxr.service('context', function() {
	return new AudioContext();
});

jfxr.service('Sound', function(context) {
	var Sound = function() {
		this.buffer = context.createBuffer(2, 44100, 44100);
		for (var c = 0; c < this.buffer.numberOfChannels; c++) {
			var data = this.buffer.getChannelData(c);
			for (var i = 0; i < data.length; i++) {
				data[i] = Math.sin(0.05 * i);
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
	};

	Player.prototype.play = function() {
		if (this.playing) {
			this.stop();
		}
		var self = this;
		this.source = context.createBufferSource();
		this.source.connect(context.destination);
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

	return Player;
});

jfxr.controller('JfxrCtrl', function(Sound, Player, $scope) {
	$scope.sound = new Sound();
	$scope.player = new Player($scope.sound);
});
