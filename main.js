jfxrApp.controller('JfxrCtrl', function(context, Player, worker, $scope, localStorage) {
	var player = new Player();

	this.worker = worker;

	this.buffer = null;

	this.sound = new jfxr.Sound(context);
	this.sound.parse(localStorage.get('currentSound', '{}'));

	this.analyserEnabled = localStorage.get('analyserEnabled', true);
	this.autoplay = localStorage.get('autoplayEnabled', true);

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

	$scope.$watch(function() { return this.analyserEnabled; }.bind(this), function(value) {
		if (angular.isDefined(value)) {
			localStorage.set('analyserEnabled', value);
		}
	});

	$scope.$watch(function() { return this.autoplay; }.bind(this), function(value) {
		if (angular.isDefined(value)) {
			localStorage.set('autoplayEnabled', value);
		}
	});

	$scope.$watch(function() { return this.sound.serialize(); }.bind(this), function(value) {
		this.buffer = null;
		if (value) {
			localStorage.set('currentSound', value);
			worker.synth(value).then(function(buffer) {
				this.buffer = buffer;
				if (this.buffer && this.autoplay) {
					player.play(this.buffer);
				}
			}.bind(this));
		}
	}.bind(this));
});
