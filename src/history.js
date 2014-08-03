jfxrApp.service('history', ['$rootScope', 'localStorage', function($rootScope, localStorage) {
  var sounds = [];
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
    soundIndex = jfxr.Math.clamp(0, sounds.length - 1, index);
  };

  this.newSound = function(basename) {
    var sound = new jfxr.Sound();
    sound.name = getFreeName(basename);
    this.addSound(sound);
    return sound;
  };

  this.addSound = function(sound, index) {
    if (index === undefined) index = 0;
    sounds.splice(index, 0, sound);
    soundIndex = index;
  };

  this.duplicateSound = function(index) {
    var dup = sounds[index].clone();
    dup.name = getFreeName(dup.name.replace(/ \d+$/, ''));
    this.addSound(dup, index);
  };

  this.deleteSound = function(index) {
    sounds.splice(index, 1);
    if (soundIndex >= sounds.length) {
      soundIndex = sounds.length - 1;
    }
    if (soundIndex < 0) {
      soundIndex = null;
    }
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
    var sound = new jfxr.Sound();
    sound.parse(str);
    sounds.push(sound);
  }

  soundIndex = jfxr.Math.clamp(0, sounds.length - 1, localStorage.get('soundIndex', 0));

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

  $rootScope.$watch(function() { return this.getCurrentSound() && this.getCurrentSound().serialize(); }.bind(this), function(value) {
    if (value) {
      storeSound(this.soundIndex, value);
    }
  });

  $rootScope.$watch(function() { return this.getCurrentIndex(); }.bind(this), function(value) {
    localStorage.set('soundIndex', value);
  }.bind(this));
}]);
