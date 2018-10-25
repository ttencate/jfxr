import { clamp, Sound } from '../../lib';

export var history = ['$rootScope', 'localStorage', function($rootScope, localStorage) {
  var sounds = [];
  var undoStacks = [];
  var soundIndex = null;

  this.getSounds = function() {
    return sounds;
  };

  this.getCurrentIndex = function() {
    return soundIndex;
  };

  this.getCurrentSound = function() {
    if (soundIndex === null) return null;
    return sounds[soundIndex];
  };

  this.setCurrentIndex = function(index) {
    index = index || 0;
    if (sounds.length === 0) return;
    soundIndex = clamp(0, sounds.length - 1, index);
  };

  this.newSound = function(basename) {
    var sound = new Sound();
    sound.name = getFreeName(basename);
    this.addSound(sound);
    return sound;
  };

  this.addSound = function(sound, index) {
    if (index === undefined) index = 0;
    sounds.splice(index, 0, sound);
    undoStacks.splice(index, 0, []);
    soundIndex = index;
  };

  this.duplicateSound = function(index) {
    var dup = sounds[index].clone();
    dup.name = getFreeName(dup.name.replace(/ \d+$/, ''));
    this.addSound(dup, index);
  };

  this.deleteSound = function(index) {
    sounds.splice(index, 1);
    undoStacks.splice(index, 1);
    if (soundIndex > index) {
      soundIndex--;
    }
    if (soundIndex >= sounds.length) {
      soundIndex = sounds.length - 1;
    }
    if (soundIndex < 0) {
      soundIndex = null;
    }
  };

  this.undo = function() {
    if (soundIndex === null) return;
    var undoStack = undoStacks[soundIndex];
    if (undoStack.length > 0) {
      var json = undoStack[undoStack.length - 1];
      this.getCurrentSound().parse(json);
      // We don't pop, because the change to the current sound triggers a watch
      // on the current sound. That watch is responsible for removing the top
      // of the stack. If we did it here, the watch would immediately re-add
      // the previous (now undone) state on top of the stack.
    }
  };

  this.canUndo = function() {
    return soundIndex !== null && undoStacks[soundIndex].length > 0;
  };

  var getFreeName = function(basename) {
    var max = 0;
    for (var i = 0; i < sounds.length; i++) {
      var m = sounds[i].name.match('^' + basename + ' (\\d+)$');
      if (m) {
         max = Math.max(max, parseInt(m[1]));
      }
    }
    return basename + ' ' + (max + 1);
  }.bind(this);

  var storageName = function(index) {
    return 'sounds[' + index + ']';
  };

  var storeSound = function(index, value) {
    if (value === undefined && index < sounds.length) {
      value = sounds[index].serialize();
    }
    if (!value) value = '';
    localStorage.set(storageName(index), value);
  }.bind(this);

  for (var i = 0;; i++) {
    var str = localStorage.get(storageName(i), undefined);
    if (!str) {
      break;
    }
    var sound = new Sound();
    try {
      sound.parse(str);
    } catch (ex) {
      console.error('Could not parse sound from local storage', ex); // eslint-disable-line no-console
      continue;
    }
    this.addSound(sound, i);
  }

  soundIndex = clamp(0, sounds.length - 1, localStorage.get('soundIndex', 0));

  $rootScope.$watchCollection(function() { return this.getSounds(); }.bind(this), function(value, oldValue) {
    var i;
    // The entire array might have shifted, so we need to save them all.
    for (i = 0; i < value.length; i++) {
      storeSound(i);
    }
    for (i = value.length; i < oldValue.length; i++) {
      localStorage.delete(storageName(i));
    }
  }.bind(this));

  var unwatchCurrentSound = null;
  $rootScope.$watch(function() { return this.getCurrentSound(); }.bind(this), function(value) {
    if (unwatchCurrentSound) {
      unwatchCurrentSound();
      unwatchCurrentSound = null;
    }
    if (value) {
      unwatchCurrentSound = $rootScope.$watch(
          function() { return value.serialize(); }, function(json, prevJson) {
        storeSound(soundIndex, json);
        if (json != prevJson) {
          var undoStack = undoStacks[soundIndex];
          if (undoStack.length > 0 && undoStack[undoStack.length - 1] == json) {
            // We just undid something.
            undoStack.pop();
          } else {
            undoStacks[soundIndex].push(prevJson);
          }
        }
      });
    }
  });

  $rootScope.$watch(function() { return this.getCurrentIndex(); }.bind(this), function(value) {
    localStorage.set('soundIndex', value);
  }.bind(this));
}];
