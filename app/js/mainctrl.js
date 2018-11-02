import angular from 'angular';

import { Sound, Preset, ALL_PRESETS } from '../../lib';
import { debounce } from './debounce.js';
import { callIfSaveAsBroken } from './shims.js';

export var MainCtrl = ['context', 'Player', '$scope', '$timeout', '$window', 'localStorage', 'fileStorage', 'history', 'synthFactory', function(
      context, Player, $scope, $timeout, $window, localStorage, fileStorage, history, synthFactory) {
  this.showDonateTooltip = !localStorage.get('donated', false) &&
    localStorage.get('donateTooltipLastHidden', 0) + 1000*60*60*24 < Date.now();

  this.showSafariWarning = false;
  callIfSaveAsBroken(function() { this.showSafariWarning = true; }.bind(this));

  var player = new Player();

  this.buffer = null;
  this.synth = null;

  this.history = history;

  this.analyserEnabled = localStorage.get('analyserEnabled', true);
  this.autoplay = localStorage.get('autoplayEnabled', true);
  this.createNew = localStorage.get('createNew', true);

  this.presets = ALL_PRESETS;

  this.link = null;

  this.hoveredParam = null;

  this.dismissDonateTooltip = function() {
    this.showDonateTooltip = false;
    localStorage.set('donateTooltipLastHidden', Date.now());
  };

  this.dismissDonateTooltipForever = function() {
    this.dismissDonateTooltip();
    localStorage.set('donated', true);
  };

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
      console.error('Could not load sound', error); // eslint-disable-line no-console
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
    url.hash = encodeURIComponent(this.getSound().serialize());
    this.link = url.href;
  };

  this.exportSound = function() {
    this.synth.run().then(function(clip) {
      fileStorage.downloadWav(clip, this.getSound().name);
    }.bind(this));
  };

  this.applyPreset = function(preset) {
    var sound;
    if (this.createNew) {
      sound = history.newSound(preset.name);
    } else {
      sound = this.getSound();
      sound.reset();
    }
    preset.applyTo(sound);
  };

  this.mutate = function() {
    Preset.mutate(this.getSound());
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

  $scope.$watch(function() { return this.createNew; }.bind(this), function(value) {
    if (angular.isDefined(value)) {
      localStorage.set('createNew', value);
    }
  });

  $scope.$watch(function() { return this.getSound().serialize(); }.bind(this), debounce(
    function(newValue, oldValue) {
      if (this.synth) {
        this.synth.cancel();
        this.synth = null;
      }
      player.stop();
      this.buffer = null;
      if (newValue !== undefined && newValue !== '') {
        this.synth = synthFactory(newValue);
        this.synth.run().then(function(clip) {
          this.buffer = context.createBuffer(1, clip.getNumSamples(), clip.getSampleRate());
          this.buffer.getChannelData(0).set(clip.toFloat32Array());
          if (this.autoplay && newValue !== oldValue) {
            player.play(this.buffer);
          }
        }.bind(this));
      }
    }.bind(this),
    500
  ));

  $scope.$on('parammouseenter', function($event, param) {
    this.hoveredParam = param;
  }.bind(this));

  $scope.$on('parammouseleave', function(unused_$event, unused_param) {
    this.hoveredParam = null;
  }.bind(this));

  var parseHash = function() {
    var json = decodeURIComponent($window.location.hash.replace(/^#/, ''));
    $window.location.hash = '';
    if (json.length > 0) {
      var sound = new Sound();
      try {
        sound.parse(json);
      } catch (ex) {
        console.error('Could not parse sound from URL fragment', ex); // eslint-disable-line no-console
        return;
      }
      this.history.addSound(sound);
    }
  }.bind(this);
  parseHash();

  // Fire a ready event to be used for integrations (e.g. Electron iframe).
  // When running within an iframe, the event is emitted from the parent window
  // instead. Otherwise, it is emitted from the current window (since in that
  // case, window.parent == window).
  var readyEvent = new Event('jfxrReady');
  readyEvent.mainCtrl = this;
  if ($window.parent) {
    $window.parent.dispatchEvent(readyEvent);
  }
}];
