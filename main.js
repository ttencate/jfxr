jfxrApp.controller('JfxrCtrl', function(context, Player, worker, $scope, localStorage) {
	var player = new Player();

	this.worker = worker;

	this.buffer = null;

	this.sound = new jfxr.Sound(context);

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

	$scope.$watch(function() { return this.sound.serialize(); }.bind(this), function(value) {
		this.buffer = null;
		if (value) {
			worker.synth(value).then(function(buffer) {
				this.buffer = buffer;
			}.bind(this));
		}
	}.bind(this));
});
