// This is the version written out to sound files. We maintain backwards
// compatibility with files written by older versions where possible, but
// refuse to read files written by newer versions. Only bump the version number
// if older versions of jfxr would be unable to correctly interpret files
// written by this version.
jfxr.VERSION = 1;

jfxrApp.controller('JfxrCtrl', function(context, Player, $scope, $timeout, localStorage, fileStorage, synthFactory) {
  var player = new Player();

  this.buffer = null;
  this.synth = null;

  this.sounds = [];
  for (var i = 0;; i++) {
    var str = localStorage.get('sounds[' + i + ']', undefined);
    if (!str) {
      break;
    }
    var sound = new jfxr.Sound();
    sound.parse(str);
    this.sounds.push(sound);
  }

  var addSound = function(sound) {
    this.sounds.unshift(sound);
    this.soundIndex = 0;
  }.bind(this);

  var getFreeName = function(basename) {
    var max = 0;
    for (var i = 0; i < this.sounds.length; i++) {
      var m = this.sounds[i].name.match('^' + basename + ' (\\d+)$');
      if (m) {
         max = Math.max(max, parseInt(m[1]));
      }
    }
    return basename + ' ' + (max + 1);
  }.bind(this);

  var maybeAddDefaultSound = function() {
    if (this.sounds.length == 0) {
      this.newSound();
    }
  }.bind(this);
  maybeAddDefaultSound();

  this.soundIndex = jfxr.Math.clamp(0, this.sounds.length - 1, localStorage.get('soundIndex', 0));

  this.analyserEnabled = localStorage.get('analyserEnabled', true);
  this.autoplay = localStorage.get('autoplayEnabled', true);

  this.presets = jfxr.Preset.all;

  this.getSound = function() {
    return this.sounds[this.soundIndex];
  };

  this.deleteSound = function(index) {
    this.sounds.splice(index, 1);
    maybeAddDefaultSound();
    if (this.soundIndex >= this.sounds.length) {
      this.soundIndex = this.sounds.length - 1;
    }
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

  this.newSound = function() {
    var sound = new jfxr.Sound(context);
    sound.name = getFreeName('New');
    sound.sustain.value = 0.2;
    this.sounds.unshift(sound);
    this.soundIndex = 0;
  };

  this.openSound = function() {
    fileStorage.loadJfxr().then(function(sound) {
      this.sounds.unshift(sound);
      this.soundIndex = 0;
    }.bind(this));
  };

  this.saveSound = function() {
    fileStorage.saveJfxr(this.getSound(), this.getSound().name);
  };

  this.exportSound = function() {
    this.synth.run().then(function(msg) {
      fileStorage.downloadWav(msg.array, msg.sampleRate, this.getSound().name);
    }.bind(this));
  };

  this.applyPreset = function(preset) {
    var sound = preset.createSound();
    sound.name = getFreeName(preset.name);
    addSound(sound);
  };

  this.mutate = function() {
    jfxr.Preset.mutate(this.getSound());
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

  var storeSound = function(index, value) {
    if (value == undefined && index < this.sounds.length) {
      value = this.sounds[index].serialize();
    }
    if (!value) value = '';
    localStorage.set('sounds[' + index + ']', value);
  }.bind(this);

  $scope.$watchCollection(function() { return this.sounds; }.bind(this), function(value, oldValue) {
    // The entire array might have shifted, so we need to save them all.
    for (var i = 0; i < value.length; i++) {
      storeSound(i);
    }
    for (var i = value.length; i < oldValue.length; i++) {
      localStorage.delete('sounds[' + i + ']');
    }
  }.bind(this));

  $scope.$watch(function() { return this.getSound().serialize(); }.bind(this), function(value) {
    if (this.synth) {
      this.synth.cancel();
      this.synth = null;
    }
    player.stop();
    this.buffer = null;
    if (value != undefined && value != '') {
      storeSound(this.soundIndex, value);
      this.synth = synthFactory(value);
      this.synth.run().then(function(msg) {
        this.buffer = context.createBuffer(1, msg.array.length, msg.sampleRate);
        this.buffer.getChannelData(0).set(msg.array);
        if (this.autoplay) {
          player.play(this.buffer);
        }
      }.bind(this), function() {
        // Cancelled.
      });
    }
  }.bind(this));

  $scope.$watch(function() { return this.soundIndex; }.bind(this), function(value) {
    if (value != undefined) {
      localStorage.set('soundIndex', value);
    }
  }.bind(this));
});
