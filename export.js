jfxr.export = {};

jfxr.export.toWavBlob = function(buffer, sampleRate) {
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

  return new Blob(parts, {type: 'audio/wav'});
};

jfxr.export.download = function(blob, basename) {
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = basename + '.wav';
  link.click();
};
