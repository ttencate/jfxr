jfxrApp.service('fileStorage', ['$q', function($q) {

  var download = function(blob, filename) {
    // saveAs from FileSaver.js
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
  
  this.downloadWav = function(buffer, sampleRate, basename) {
    var floats = new Float32Array(buffer);
    var shorts = new Int16Array(floats.length);
    for (var i = 0; i < floats.length; i++) {
      shorts[i] = jfxr.Math.clamp(-0x8000, 0x7FFF, Math.round(floats[i] * 0x8000));
    }

    function uint16(value) {
      var buffer = new Uint16Array(1);
      buffer[0] = value;
      return buffer;
    }

    function uint32(value) {
      var buffer = new Uint32Array(1);
      buffer[0] = value;
      return buffer;
    }

    var parts = [
      'RIFF', // RIFF identifier
      uint32(36 + shorts.length * 2), // file length
      'WAVE', // RIFF type

      'fmt ', // format subchunk identifier
      uint32(16), // format subchunk length
      uint16(1), // sample format: PCM
      uint16(1), // channel count
      uint32(sampleRate), // sample rate
      uint32(sampleRate * 2), // byte rate: sample rate * block align
      uint16(2), // block align
      uint16(16), // bits per sample

      'data', // data subchunk length
      uint32(shorts.length * 2), // data subchunk length
      shorts, // actual data
    ];

    var blob = new Blob(parts, {type: 'audio/wav'});
    download(blob, basename + '.wav');
  };

  this.saveJfxr = function(sound, basename) {
    var json = sound.serialize();
    var blob = new Blob([json], {type: 'application/json'});
    download(blob, basename + '.jfxr');
  };

  this.loadJfxr = function() {
    return upload().then(function(msg) {
      var sound = new jfxr.Sound();
      sound.parse(msg.data);
      sound.name = msg.name.replace(/\.jfxr$/, '');
      return sound;
    });
  };
}]);
