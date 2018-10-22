import { clamp } from './math.js';

/**
 * Represents a generated sound effect.
 */
export function Clip(array, sampleRate) {
  this.array = array;
  this.sampleRate = sampleRate;
}

Clip.prototype.getSampleRate = function() {
  return this.sampleRate;
};

Clip.prototype.getNumSamples = function() {
  return this.array.length;
};

Clip.prototype.toFloat32Array = function() {
  return this.array;
};

Clip.prototype.toWavBytes = function() {
  var floats = this.array;
  var numSamples = floats.length;

  // http://soundfile.sapp.org/doc/WaveFormat/

  var fileLength = 44 + numSamples * 2;
  var bytes = new Uint8Array(fileLength);
  var nextIndex = 0;

  function byte(value) {
    bytes[nextIndex++] = value;
  }

  function asciiString(value) {
    for (var i = 0; i < value.length; i++) {
      byte(value.charCodeAt(i));
    }
  }

  function uint16le(value) {
    byte(value & 0xFF);
    value >>= 8;
    byte(value & 0xFF);
  }

  function uint32le(value) {
    byte(value & 0xFF);
    value >>= 8;
    byte(value & 0xFF);
    value >>= 8;
    byte(value & 0xFF);
    value >>= 8;
    byte(value & 0xFF);
  }

  asciiString('RIFF'); // RIFF identifier
  uint32le(fileLength - 8); // size following this number
  asciiString('WAVE'); // RIFF type

  asciiString('fmt '); // format subchunk identifier
  uint32le(16); // format subchunk length
  uint16le(1); // sample format: PCM
  uint16le(1); // channel count
  uint32le(this.sampleRate); // sample rate
  uint32le(this.sampleRate * 2); // byte rate: sample rate * block align
  uint16le(2); // block align
  uint16le(16); // bits per sample

  asciiString('data'); // data subchunk length
  uint32le(numSamples * 2); // data subchunk length

  for (var i = 0; i < floats.length; i++) {
    uint16le(clamp(-0x8000, 0x7FFF, Math.round(floats[i] * 0x8000)));
  }

  return bytes;
};
