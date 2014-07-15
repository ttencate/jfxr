// This is the version written out to sound files. We maintain backwards
// compatibility with files written by older versions where possible, but
// refuse to read files written by newer versions. Only bump the version number
// if older versions of jfxr would be unable to correctly interpret files
// written by this version.
jfxr.VERSION = 1;

jfxrApp.controller('JfxrCtrl', function(context, Player, worker, $scope, localStorage) {
	var player = new Player();

	this.worker = worker;

	this.buffer = null;

	this.sound = new jfxr.Sound(context);
	var str = localStorage.get('currentSound', undefined);
	if (str) {
		this.sound.parse(str);
	} else {
		this.sound.sustain.value = 0.2;
	}

	this.analyserEnabled = localStorage.get('analyserEnabled', true);
	this.autoplay = localStorage.get('autoplayEnabled', true);

	this.presets = jfxr.Preset.all;

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

	this.applyPreset = function(preset) {
		this.sound = preset.createSound();
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
