// This is the version written out to sound files. We maintain backwards
// compatibility with files written by older versions where possible, but
// refuse to read files written by newer versions. Only bump the version number
// if older versions of jfxr would be unable to correctly interpret files
// written by this version.
jfxr.VERSION = 1;

jfxrApp.controller('JfxrCtrl', function(context, Player, worker, $scope, localStorage) {
	var player = new Player();
	var maxSounds = 50;

	this.worker = worker;

	this.buffer = null;

	this.sounds = [];
	for (var i = 0; i < maxSounds; i++) {
		var str = localStorage.get('sounds[' + i + ']', undefined);
		if (!str) {
			break;
		}
		var sound = new jfxr.Sound();
		sound.parse(str);
		this.sounds.push(sound);
	}

	if (this.sounds.length == 0) {
		var sound = new jfxr.Sound(context);
		sound.name = 'Default sound';
		sound.sustain.value = 0.2;
		this.sounds.push(sound);
	}

	this.soundIndex = jfxr.Math.clamp(0, this.sounds.length - 1, localStorage.get('soundIndex', 0));

	this.analyserEnabled = localStorage.get('analyserEnabled', true);
	this.autoplay = localStorage.get('autoplayEnabled', true);

	this.presets = jfxr.Preset.all;

	this.getSound = function() {
		return this.sounds[this.soundIndex];
	};

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
		var sound = preset.createSound();
		var max = 0;
		for (var i = 0; i < this.sounds.length; i++) {
			var m = this.sounds[i].name.match('^' + preset.name + ' (\\d+)$');
			if (m) {
			   max = Math.max(max, parseInt(m[1]));
			}
		}
		sound.name = preset.name + ' ' + (max + 1);

		this.sounds.unshift(sound);
		this.sounds.splice(maxSounds, this.sounds.length - maxSounds);
		this.soundIndex = 0;
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

	var saveSound = function(index, value) {
		if (value == undefined && index < this.sounds.length) {
			value = this.sounds[index].serialize();
		}
		if (!value) value = '';
		localStorage.set('sounds[' + index + ']', value);
	}.bind(this);

	$scope.$watchCollection(function() { return this.sounds; }.bind(this), function(value) {
		// The entire array might have shifted, so we need to save them all.
		for (var i = 0; i < maxSounds; i++) {
			saveSound(i);
		}
	}.bind(this));

	console.log(this.sounds, this.soundIndex);
	$scope.$watch(function() { return this.getSound().serialize(); }.bind(this), function(value) {
		this.buffer = null;
		if (value != undefined && value != '') {
			saveSound(this.soundIndex, value);
			worker.synth(value).then(function(buffer) {
				this.buffer = buffer;
				if (this.buffer && this.autoplay) {
					player.play(this.buffer);
				}
			}.bind(this));
		}
	}.bind(this));

	$scope.$watch(function() { return this.soundIndex; }.bind(this), function(value) {
		if (value != undefined) {
			localStorage.set('soundIndex', value);
		}
	}.bind(this));
});
