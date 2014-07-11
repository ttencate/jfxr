jfxrApp.controller('JfxrCtrl', function(context, Player, synth, $scope, localStorage) {
	var self = this;

	var player = new Player();

	this.synth = synth;

	this.buffer = null;

	this.sound = new jfxr.Sound(context);
	this.sound.onchange = function() {
		self.buffer = self.synth.synth(self.sound);
	};
	this.sound.onchange();

	var analyserEnabled = localStorage.get('analyserEnabled', true);

	this.autoplay = true;

	this.isPlaying = function() {
		return player.playing;
	};

	this.togglePlay = function() {
		if (player.playing) {
			player.stop();
		} else {
			player.play(this.buffer);
		}
	};

	this.getFrequencyData = function() {
		return player.getFrequencyData();
	};

	this.keyDown = function(e) {
		if (e.keyCode == 32) { // space
			this.togglePlay();
			e.preventDefault();
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
