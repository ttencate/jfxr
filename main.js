jfxrApp.controller('JfxrCtrl', function(context, Player, $scope, localStorage) {
	var sound = new jfxr.Sound(context);
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
