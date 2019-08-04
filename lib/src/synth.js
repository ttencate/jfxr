import { clamp, frac, lerp } from './math.js';
import { Clip } from './clip.js';
import { Random } from './random.js';
import { Sound } from './sound.js';

/**
 * This class synthesizes sound effects. It is intended for one-shot use, so do
 * not try to use a single instance multiple times.
 *
 * Example usage:
 *
 *     var json = '{...}'; // E.g. contents of a .jfxr file.
 *     var synth = new Synth(json);
 *     synth.run(function(clip) {
 *       var samples = sound.array;         // raw samples as a Float32Array
 *       var sampleRate = sound.sampleRate; // sample rate in Hz
 *     });
 *
 * @param {function} setTimeout A function that can be called in the same way
 *     as window.setTimeout (remember to bind() it or use a fat arrow if
 *     needed). If not provided, window.setTimeout will be used directly.
 * @param {string} json A string containing a serialized Sound.
 */
export var Synth = function(json, setTimeout) {
  this.setTimeout = setTimeout ||
    (typeof window !== 'undefined' && window.setTimeout && window.setTimeout.bind(window)) || // eslint-disable-line no-undef
    (typeof global !== 'undefined' && global.setTimeout && global.setTimeout.bind(global)); // eslint-disable-line no-undef
  this.sound = new Sound();
  this.sound.parse(json);

  var sampleRate = this.sound.sampleRate.value;

  var numSamples = Math.max(1, Math.ceil(sampleRate * this.sound.duration()));

  this.array = new Float32Array(numSamples);

  var classes = [
    Synth.Generator,
    Synth.Envelope,
    Synth.Flanger,
    Synth.BitCrush,
    Synth.LowPass,
    Synth.HighPass,
    Synth.Compress,
    Synth.Normalize,
    Synth.Amplify,
  ];

  this.transformers = [];
  for (var i = 0; i < classes.length; i++) {
    this.transformers.push(new classes[i](this.sound, this.array));
  }

  this.startTime = Date.now();

  this.startSample = 0;
  this.blockSize = 10240;
};

/**
 * @param {function} doneCallback A callback that is invoked when the synthesis
 *     is complete. It receives one argument, which is a Clip object.
 */
Synth.prototype.run = function(doneCallback) {
  if (this.doneCallback) {
    return;
  }
  this.doneCallback = doneCallback;
  this.tick();
};

/**
 * @return {bool} True if the synth is currently running (between a call to
 *     run() and either cancel() or receipt of a doneCallback() call).
 */
Synth.prototype.isRunning = function() {
  return !!this.doneCallback;
};

/**
 * Cancels synthesis if currently running.
 */
Synth.prototype.cancel = function() {
  if (!this.isRunning()) {
    return;
  }
  this.doneCallback = null;
};

/**
 * @private
 */
Synth.prototype.tick = function() {
  if (!this.isRunning()) {
    return;
  }

  var numSamples = this.array.length;
  var endSample = Math.min(numSamples, this.startSample + this.blockSize);
  for (var i = 0; i < this.transformers.length; i++) {
    this.transformers[i].run(this.sound, this.array, this.startSample, endSample);
  }
  this.startSample = endSample;

  if (this.startSample == numSamples) {
    this.renderTimeMs = Date.now() - this.startTime;
    // Always invoke the callback from a timeout so that, in case setTimeout is
    // $timeout, Angular will run a digest after it.
    this.setTimeout(function() {
      if (this.doneCallback) {
        this.doneCallback(new Clip(this.array, this.sound.sampleRate.value));
        this.doneCallback = null;
      }
    }.bind(this));
  } else {
    // TODO be smarter about block size (sync with animation frames)
    // window.requestAnimationFrame(this.tick.bind(this));
    this.tick();
  }
};

Synth.Generator = function(sound, unused_array) {
  var oscillatorClass = {
    sine: Synth.SineOscillator,
    triangle: Synth.TriangleOscillator,
    sawtooth: Synth.SawtoothOscillator,
    square: Synth.SquareOscillator,
    tangent: Synth.TangentOscillator,
    whistle: Synth.WhistleOscillator,
    breaker: Synth.BreakerOscillator,
    whitenoise: Synth.WhiteNoiseOscillator,
    pinknoise: Synth.PinkNoiseOscillator,
    brownnoise: Synth.BrownNoiseOscillator,
  }[sound.waveform.value];

  var amp = 1;
  var totalAmp = 0;
  this.oscillators = [];
  for (var harmonicIndex = 0; harmonicIndex <= sound.harmonics.value; harmonicIndex++) {
    totalAmp += amp;
    amp *= sound.harmonicsFalloff.value;
    this.oscillators.push(new oscillatorClass(sound));
  }
  this.firstHarmonicAmp = 1 / totalAmp;

  this.phase = 0;
  this.prevPhase = 0;
};

Synth.Generator.prototype.run = function(sound, array, startSample, endSample) {
  var sampleRate = sound.sampleRate.value;
  var harmonics = sound.harmonics.value;
  var harmonicsFalloff = sound.harmonicsFalloff.value;

  var firstHarmonicAmp = this.firstHarmonicAmp;
  var oscillators = this.oscillators;

  var phase = this.phase;

  for (var i = startSample; i < endSample; i++) {
    var time = i / sampleRate;

    var currentFrequency = sound.frequencyAt(time);
    phase = frac(phase + currentFrequency / sampleRate);

    var sample = 0;
    var amp = firstHarmonicAmp;
    for (var harmonicIndex = 0; harmonicIndex <= harmonics; harmonicIndex++) {
      var harmonicPhase = frac(phase * (harmonicIndex + 1));
      sample += amp * oscillators[harmonicIndex].getSample(harmonicPhase, time);
      amp *= harmonicsFalloff;
    }
    array[i] = sample;
  }

  this.phase = phase;
};

Synth.SineOscillator = function() {};
Synth.SineOscillator.prototype.getSample = function(phase) {
  return Math.sin(2 * Math.PI * phase);
};

Synth.TriangleOscillator = function() {};
Synth.TriangleOscillator.prototype.getSample = function(phase) {
  if (phase < 0.25) return 4 * phase;
  if (phase < 0.75) return 2 - 4 * phase;
  return -4 + 4 * phase;
};

Synth.SawtoothOscillator = function() {};
Synth.SawtoothOscillator.prototype.getSample = function(phase) {
  return phase < 0.5 ? 2 * phase : -2 + 2 * phase;
};

Synth.SquareOscillator = function(sound) {
  this.sound = sound;
};
Synth.SquareOscillator.prototype.getSample = function(phase, time) {
  return phase < this.sound.squareDutyAt(time) ? 1 : -1;
};

Synth.TangentOscillator = function() {};
Synth.TangentOscillator.prototype.getSample = function(phase) {
  // Arbitrary cutoff value to make normalization behave.
  return clamp(-2, 2, 0.3 * Math.tan(Math.PI * phase));
};

Synth.WhistleOscillator = function() {};
Synth.WhistleOscillator.prototype.getSample = function(phase) {
  return 0.75 * Math.sin(2 * Math.PI * phase) + 0.25 * Math.sin(40 * Math.PI * phase);
};

Synth.BreakerOscillator = function() {};
Synth.BreakerOscillator.prototype.getSample = function(phase) {
  // Make sure to start at a zero crossing.
  var p = frac(phase + Math.sqrt(0.75));
  return -1 + 2 * Math.abs(1 - p*p*2);
};

Synth.WhiteNoiseOscillator = function(sound) {
  this.interpolateNoise = sound.interpolateNoise.value;

  this.random = new Random(0x3cf78ba3);
  this.prevPhase = 0;
  this.prevRandom = 0;
  this.currRandom = 0;
};
Synth.WhiteNoiseOscillator.prototype.getSample = function(phase) {
  // Need two samples per phase in order to include the desired frequencies.
  phase = frac(phase * 2);
  if (phase < this.prevPhase) {
    this.prevRandom = this.currRandom;
    this.currRandom = this.random.uniform(-1, 1);
  }
  this.prevPhase = phase;

  return this.interpolateNoise ?
    lerp(this.prevRandom, this.currRandom, phase) :
    this.currRandom;
};

Synth.PinkNoiseOscillator = function(sound, unused_array) {
  this.interpolateNoise = sound.interpolateNoise.value;

  this.random = new Random(0x3cf78ba3);
  this.prevPhase = 0;
  this.b = [0, 0, 0, 0, 0, 0, 0];
  this.prevRandom = 0;
  this.currRandom = 0;
};
Synth.PinkNoiseOscillator.prototype.getSample = function(phase) {
  // Need two samples per phase in order to include the desired frequencies.
  phase = frac(phase * 2);
  if (phase < this.prevPhase) {
    this.prevRandom = this.currRandom;
    // Method pk3 from http://www.firstpr.com.au/dsp/pink-noise/,
    // due to Paul Kellet.
    var white = this.random.uniform(-1, 1);
    this.b[0] = 0.99886 * this.b[0] + white * 0.0555179;
    this.b[1] = 0.99332 * this.b[1] + white * 0.0750759;
    this.b[2] = 0.96900 * this.b[2] + white * 0.1538520;
    this.b[3] = 0.86650 * this.b[3] + white * 0.3104856;
    this.b[4] = 0.55000 * this.b[4] + white * 0.5329522;
    this.b[5] = -0.7616 * this.b[5] + white * 0.0168980;
    this.currRandom = (this.b[0] + this.b[1] + this.b[2] + this.b[3] + this.b[4] + this.b[5] + this.b[6] + white * 0.5362) / 7;
    this.b[6] = white * 0.115926;
  }
  this.prevPhase = phase;

  return this.interpolateNoise ?
    lerp(this.prevRandom, this.currRandom, phase) :
    this.currRandom;
};

Synth.BrownNoiseOscillator = function(sound, unused_array) {
  this.interpolateNoise = sound.interpolateNoise.value;

  this.random = new Random(0x3cf78ba3);
  this.prevPhase = 0;
  this.prevRandom = 0;
  this.currRandom = 0;
};
Synth.BrownNoiseOscillator.prototype.getSample = function(phase) {
  // Need two samples per phase in order to include the desired frequencies.
  phase = frac(phase * 2);
  if (phase < this.prevPhase) {
    this.prevRandom = this.currRandom;
    this.currRandom = clamp(-1, 1, this.currRandom + 0.1 * this.random.uniform(-1, 1));
  }
  this.prevPhase = phase;

  return this.interpolateNoise ?
    lerp(this.prevRandom, this.currRandom, phase) :
    this.currRandom;
};

Synth.Flanger = function(sound, unused_array) {
  if (sound.flangerOffset.value === 0 && sound.flangerOffsetSweep.value === 0) {
    return;
  }

  // Maximum 100ms offset
  this.buffer = new Float32Array(Math.ceil(sound.sampleRate.value * 0.1));
  this.bufferPos = 0;
};

Synth.Flanger.prototype.run = function(sound, array, startSample, endSample) {
  if (!this.buffer) {
    return;
  }

  var numSamples = array.length;
  var sampleRate = sound.sampleRate.value;
  var flangerOffset = sound.flangerOffset.value;
  var flangerOffsetSweep = sound.flangerOffsetSweep.value;

  var buffer = this.buffer;
  var bufferPos = this.bufferPos;
  var bufferLength = buffer.length;

  for (var i = startSample; i < endSample; i++) {
    buffer[bufferPos] = array[i];

    var offsetSamples = Math.round((flangerOffset + i / numSamples * flangerOffsetSweep) / 1000 * sampleRate);
    offsetSamples = clamp(0, bufferLength - 1, offsetSamples);
    array[i] += buffer[(bufferPos - offsetSamples + bufferLength) % bufferLength];
    bufferPos = (bufferPos + 1) % bufferLength;
  }

  this.bufferPos = bufferPos;
};

Synth.BitCrush = function(unused_sound, unused_array) {
};

Synth.BitCrush.prototype.run = function(sound, array, startSample, endSample) {
  var numSamples = array.length;
  var bitCrush = sound.bitCrush.value;
  var bitCrushSweep = sound.bitCrushSweep.value;

  if (bitCrush === 0 && bitCrushSweep === 0) {
    return;
  }

  for (var i = startSample; i < endSample; i++) {
    var bits = bitCrush + i / numSamples * bitCrushSweep;
    bits = clamp(1, 16, Math.round(bits));
    var steps = Math.pow(2, bits);
    array[i] = -1 + 2 * Math.round((0.5 + 0.5 * array[i]) * steps) / steps;
  }
};

Synth.LowPass = function(unused_sound, unused_array) {
  this.lowPassPrev = 0;
};

Synth.LowPass.prototype.run = function(sound, array, startSample, endSample) {
  var numSamples = array.length;
  var lowPassCutoff = sound.lowPassCutoff.value;
  var lowPassCutoffSweep = sound.lowPassCutoffSweep.value;
  var sampleRate = sound.sampleRate.value;

  if (lowPassCutoff >= sampleRate / 2 && lowPassCutoff + lowPassCutoffSweep >= sampleRate / 2) {
    return;
  }

  var lowPassPrev = this.lowPassPrev;

  for (var i = startSample; i < endSample; i++) {
    var fraction = i / numSamples;
    var cutoff = clamp(0, sampleRate / 2, lowPassCutoff + fraction * lowPassCutoffSweep);
    var wc = cutoff / sampleRate * Math.PI; // Don't we need a factor 2pi instead of pi?
    var cosWc = Math.cos(wc);
    var lowPassAlpha;
    if (cosWc <= 0) {
      lowPassAlpha = 1;
    } else {
      // From somewhere on the internet: cos wc = 2a / (1+a^2)
      lowPassAlpha = 1 / cosWc - Math.sqrt(1 / (cosWc * cosWc) - 1);
      lowPassAlpha = 1 - lowPassAlpha; // Probably the internet's definition of alpha is different.
    }
    var sample = array[i];
    sample = lowPassAlpha * sample + (1 - lowPassAlpha) * lowPassPrev;
    lowPassPrev = sample;
    array[i] = sample;
  }

  this.lowPassPrev = lowPassPrev;
};

Synth.HighPass = function(unused_sound, unused_array) {
  this.highPassPrevIn = 0;
  this.highPassPrevOut = 0;
};

Synth.HighPass.prototype.run = function(sound, array, startSample, endSample) {
  var numSamples = array.length;
  var sampleRate = sound.sampleRate.value;
  var highPassCutoff = sound.highPassCutoff.value;
  var highPassCutoffSweep = sound.highPassCutoffSweep.value;

  if (highPassCutoff <= 0 && highPassCutoff + highPassCutoffSweep <= 0) {
    return;
  }

  var highPassPrevIn = this.highPassPrevIn;
  var highPassPrevOut = this.highPassPrevOut;

  for (var i = startSample; i < endSample; i++) {
    var fraction = i / numSamples;
    var cutoff = clamp(0, sampleRate / 2, highPassCutoff + fraction * highPassCutoffSweep);
    var wc = cutoff / sampleRate * Math.PI;
    // From somewhere on the internet: a = (1 - sin wc) / cos wc
    var highPassAlpha = (1 - Math.sin(wc)) / Math.cos(wc);
    var sample = array[i];
    var origSample = sample;
    sample = highPassAlpha * (highPassPrevOut - highPassPrevIn + sample);
    highPassPrevIn = origSample;
    highPassPrevOut = sample;
    array[i] = sample;
  }

  this.highPassPrevIn = highPassPrevIn;
  this.highPassPrevOut = highPassPrevOut;
};

Synth.Envelope = function(unused_sound, unused_array) {
};

Synth.Envelope.prototype.run = function(sound, array, startSample, endSample) {
  var sampleRate = sound.sampleRate.value;
  var attack = sound.attack.value;
  var sustainPunch = sound.sustainPunch.value;
  var decay = sound.decay.value;
  var tremoloDepth = sound.tremoloDepth.value;

  if (attack === 0 && sustainPunch == 0 && decay === 0 && tremoloDepth === 0) {
    return;
  }

  for (var i = startSample; i < endSample; i++) {
    var time = i / sampleRate;
    array[i] *= sound.amplitudeAt(time);
  }
};

Synth.Compress = function(unused_sound, unused_array) {
};

Synth.Compress.prototype.run = function(sound, array, startSample, endSample) {
  var compression = sound.compression.value;

  if (compression == 1) {
    return;
  }

  for (var i = startSample; i < endSample; i++) {
    var sample = array[i];
    if (sample >= 0) {
      sample = Math.pow(sample, compression);
    } else {
      sample = -Math.pow(-sample, compression);
    }
    array[i] = sample;
  }
};

Synth.Normalize = function(unused_sound, unused_array) {
  this.maxSample = 0;
};

Synth.Normalize.prototype.run = function(sound, array, startSample, endSample) {
  if (!sound.normalization.value) {
    return;
  }

  var maxSample = this.maxSample;
  var i;
  for (i = startSample; i < endSample; i++) {
    maxSample = Math.max(maxSample, Math.abs(array[i]));
  }
  this.maxSample = maxSample;

  var numSamples = array.length;
  if (endSample == numSamples) {
    var factor = 1 / maxSample;
    for (i = 0; i < numSamples; i++) {
      array[i] *= factor;
    }
  }
};

Synth.Amplify = function(unused_sound, unused_array) {
};

Synth.Amplify.prototype.run = function(sound, array, startSample, endSample) {
  var factor = sound.amplification.value / 100;

  if (factor == 1) {
    return;
  }

  for (var i = startSample; i < endSample; i++) {
    array[i] *= factor;
  }
};
