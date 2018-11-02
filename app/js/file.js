import angular from 'angular';
import { saveAs } from 'file-saver';

import { Sound } from '../../lib';

export var fileStorage = ['$q', function($q) {

  var download = function(blob, filename) {
    saveAs(blob, filename);
  };

  var upload = function() {
    var input = document.createElement('input');
    input.type = 'file';
    var deferred = $q.defer();
    angular.element(input).on('change', function() {
      var file = input.files[0];
      if (file) {
        var reader = new FileReader();
        reader.addEventListener('load', function() {
          deferred.resolve({name: file.name, data: reader.result});
        });
        reader.addEventListener('error', function() {
          deferred.reject(reader.error);
        });
        reader.readAsText(file);
      }
    });
    input.focus();
    input.click();
    // Note: if the file picker dialog is cancelled, we never reject the
    // promise.
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

  this.loadJfxr = function() {
    return upload().then(function(msg) {
      var sound = new Sound();
      sound.parse(msg.data);
      sound.name = msg.name.replace(/\.jfxr$/, '');
      return sound;
    });
  };
}];
