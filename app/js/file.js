import angular from 'angular';
import { saveAs } from 'file-saver';

import { Sound } from '../../lib';

export var fileStorage = ['$q', function($q) {

  var download = function(blob, filename) {
    saveAs(blob, filename);
  };

  var uploadFile = function(file) {
    var deferred = $q.defer();
    var reader = new FileReader();
    reader.addEventListener('load', function() {
      deferred.resolve({name: file.name, data: reader.result});
    });
    reader.addEventListener('error', function() {
      deferred.reject(reader.error);
    });
    reader.readAsText(file);
    return deferred.promise;
  }

  var upload = function() {
    var input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    var deferred = $q.defer();
    angular.element(input).on('change', function() {
      var filePromises = [];
      for (var i = 0; i < input.files.length; i++) {
        var file = input.files[i];
        if (file) {
          filePromises.push(uploadFile(file));
        }
      }
      $q.all(filePromises).then(function(msgs) {
        deferred.resolve(msgs);
      }, function(err) {
        deferred.reject(err);
      });
    });
    input.focus();
    input.click();
    // Note: if the file picker dialog is cancelled, we never reject the
    // promise so we leak some memory. Detecting cancel is tricky:
    // https://stackoverflow.com/questions/4628544/how-to-detect-when-cancel-is-clicked-on-file-input
    return deferred.promise;
  };

  this.downloadWav = function(clip, basename) {
    var blob = new Blob([clip.toWavBytes()], {type: 'audio/wav'});
    download(blob, basename + '.wav');
  };

  this.saveJfxr = function(sound, basename) {
    var json = sound.serialize();
    var blob = new Blob([json], {type: 'application/json'});
    download(blob, basename + '.jfxr');
  };

  this.loadJfxrs = function() {
    return upload().then(function(msgs) {
      var sounds = [];
      for (var i = 0; i < msgs.length; i++) {
        var msg = msgs[i];
        var sound = new Sound();
        try {
          sound.parse(msg.data);
        } catch (ex) {
          console.error('Could not parse sound', ex); // eslint-disable-line no-console
          continue;
        }
        sound.name = msg.name.replace(/\.jfxr$/, '');
        sounds.push(sound);
      }
      return sounds;
    });
  };
}];
