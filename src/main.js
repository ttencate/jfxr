// This is the version written out to sound files. We maintain backwards
// compatibility with files written by older versions where possible, but
// refuse to read files written by newer versions. Only bump the version number
// if older versions of jfxr would be unable to correctly interpret files
// written by this version.
jfxr.VERSION = 1;

jfxrApp.controller('JfxrCtrl', ['context', 'Player', '$scope', '$timeout', '$window', 'localStorage', 'fileStorage', 'history', 'synthFactory', 'allPresets', function(
      context, Player, $scope, $timeout, $window, localStorage, fileStorage, history, synthFactory, allPresets) {
  var player = new Player();

  this.buffer = null;
  this.synth = null;

  this.history = history;

  this.analyserEnabled = localStorage.get('analyserEnabled', true);
  this.autoplay = localStorage.get('autoplayEnabled', true);

  this.presets = allPresets;

  this.link = null;

  this.getSounds = function() {
    return this.history.getSounds();
  };

  this.getSound = function() {
    return this.history.getCurrentSound();
  };

  this.currentSoundIndex = function() {
    return this.history.getCurrentIndex();
  };

  this.setCurrentSoundIndex = function(index) {
    this.history.setCurrentIndex(index);
  };

  this.deleteSound = function(index) {
    this.history.deleteSound(index);
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

  this.openSound = function() {
    fileStorage.loadJfxr().then(function(sound) {
      this.history.addSound(sound);
    }.bind(this), function(error) {
      console.error('Could not load sound', error);
    });
  };

  this.saveSound = function() {
    fileStorage.saveJfxr(this.getSound(), this.getSound().name);
  };

  this.duplicateSound = function() {
    this.history.duplicateSound(this.history.getCurrentIndex());
  };

  this.createLink = function() {
    // http://stackoverflow.com/questions/3213531/creating-a-new-location-object-in-javascript
    var url = document.createElement('a');
    url.href = window.location.href;
    url.hash = this.getSound().serialize();
    this.link = url.href;
  };

  this.exportSound = function() {
    this.synth.run().then(function(msg) {
      fileStorage.downloadWav(msg.array, msg.sampleRate, this.getSound().name);
    }.bind(this));
  };

  this.applyPreset = function(preset) {
    var sound = history.newSound(preset.name);
    preset.applyTo(sound);
  };

  this.mutate = function() {
    jfxr.Preset.mutate(this.getSound());
  };

  this.canUndo = function() {
    return this.history.canUndo();
  };

  this.undo = function() {
    this.history.undo();
  };

  this.keyDown = function(e) {
    if (e.target.tagName == 'INPUT' && e.target.type == 'text') {
      return;
    }
    if (e.keyCode == 32) { // space
      this.togglePlay();
      e.preventDefault();
    }
  };

  this.soundNameKeyDown = function(e, currentName) {
    switch (e.keyCode) {
      case 13: // Enter
        $timeout(function() { e.target.blur(); });
        e.preventDefault();
        break;
      case 27: // Esc
        e.target.value = currentName;
        $timeout(function() { e.target.blur(); });
        e.preventDefault();
        break;
    }
  };

  // Make sure there is always a sound to operate on.
  $scope.$watch(function() { return this.getSounds().length; }.bind(this), function(value) {
    if (value === 0) {
      this.applyPreset(this.presets[0]);
    }
  }.bind(this));

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

  $scope.$watch(function() { return this.getSound().serialize(); }.bind(this), function(value) {
    if (this.synth) {
      this.synth.cancel();
      this.synth = null;
    }
    player.stop();
    this.buffer = null;
    if (value !== undefined && value !== '') {
      this.synth = synthFactory(value);
      this.synth.run().then(function(msg) {
        this.buffer = context.createBuffer(1, msg.array.length, msg.sampleRate);
        this.buffer.getChannelData(0).set(msg.array);
        if (this.autoplay) {
          player.play(this.buffer);
        }
      }.bind(this));
    }
  }.bind(this));

  var parseHash = function() {
    var json = $window.location.hash.replace(/^#/, '');
    $window.location.hash = '';
    if (json.length > 0) {
      var sound = new jfxr.Sound();
      try {
        sound.parse(json);
      } catch (ex) {
        console.error('Could not parse sound from URL fragment', ex);
        return;
      }
      this.history.addSound(sound);
    }
  }.bind(this);
  parseHash();
}]);
