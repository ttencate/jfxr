jfxrApp.service('synthFactory', ['$q', '$timeout', function($q, $timeout) {
  return function(str) {
    return new jfxr.Synth($q, $timeout, str);
  };
}]);

jfxr.Synth = function($q, $timeout, json) {
  this.$q = $q;
  this.$timeout = $timeout;
  this.sound = new jfxr.Sound();
  this.sound.parse(json);

  var sampleRate = this.sound.sampleRate.value;

  var numSamples = Math.max(1, Math.ceil(sampleRate * this.sound.duration()));

  this.array = new Float32Array(numSamples);

  var classes = [
    jfxr.Synth.Generator,
    jfxr.Synth.Envelope,
    jfxr.Synth.Tremolo,
    jfxr.Synth.Flanger,
    jfxr.Synth.BitCrush,
    jfxr.Synth.LowPass,
    jfxr.Synth.HighPass,
    jfxr.Synth.Compress,
    jfxr.Synth.Normalize,
    jfxr.Synth.Amplify,
  ];

  this.transformers = [];
  for (var i = 0; i < classes.length; i++) {
    this.transformers.push(new classes[i](this.sound, this.array));
  }

  this.startTime = Date.now();

  this.startSample = 0;
  this.blockSize = 10240;
};

jfxr.Synth.prototype.run = function() {
  if (this.deferred) {
    return this.deferred.promise;
  }
  this.running = true;
  this.deferred = this.$q.defer();
  var promise = this.deferred.promise;
  this.tick();
  return promise;
};

jfxr.Synth.prototype.tick = function() {
  if (!this.deferred) {
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
    this.$timeout(function() {
      this.running = false;
      if (this.deferred) {
        this.deferred.resolve({array: this.array, sampleRate: this.sound.sampleRate.value});
      }
    }.bind(this));
  } else {
    // TODO be smarter about block size (sync with animation frames)
    // window.requestAnimationFrame(this.tick.bind(this));
    this.tick();
  }
};

jfxr.Synth.prototype.isRunning = function() {
  return this.running;
};

jfxr.Synth.prototype.cancel = function() {
  if (!this.isRunning()) {
    return;
  }
  this.deferred.reject();
  this.deferred = null;
  this.running = false;
};

jfxr.Synth.Generator = function(sound, array) {
  var numSamples = array.length;
  var sampleRate = sound.sampleRate.value;

  var duration = numSamples / sampleRate;

  var oscillatorClass = {
    sine: jfxr.Synth.SineOscillator,
    triangle: jfxr.Synth.TriangleOscillator,
    sawtooth: jfxr.Synth.SawtoothOscillator,
    square: jfxr.Synth.SquareOscillator,
    tangent: jfxr.Synth.TangentOscillator,
    whistle: jfxr.Synth.WhistleOscillator,
    breaker: jfxr.Synth.BreakerOscillator,
    whitenoise: jfxr.Synth.WhiteNoiseOscillator,
    pinknoise: jfxr.Synth.PinkNoiseOscillator,
    brownnoise: jfxr.Synth.BrownNoiseOscillator,
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

jfxr.Synth.Generator.prototype.run = function(sound, array, startSample, endSample) {
  var sampleRate = sound.sampleRate.value;
  var harmonics = sound.harmonics.value;
  var harmonicsFalloff = sound.harmonicsFalloff.value;

  var firstHarmonicAmp = this.firstHarmonicAmp;
  var oscillators = this.oscillators;
  var random = new jfxr.Random(0x3cf78ba3);

  var phase = this.phase;

  for (var i = startSample; i < endSample; i++) {
    var time = i / sampleRate;

    var currentFrequency = sound.frequencyAt(time);
    phase = jfxr.Math.frac(phase + currentFrequency / sampleRate);

    var sample = 0;
    var amp = firstHarmonicAmp;
    for (var harmonicIndex = 0; harmonicIndex <= harmonics; harmonicIndex++) {
      var harmonicPhase = jfxr.Math.frac(phase * (harmonicIndex + 1));
      sample += amp * oscillators[harmonicIndex].getSample(harmonicPhase, time);
      amp *= harmonicsFalloff;
    }
    array[i] = sample;
  }

  this.phase = phase;
};

jfxr.Synth.SineOscillator = function() {};
jfxr.Synth.SineOscillator.prototype.getSample = function(phase) {
  return Math.sin(2 * Math.PI * phase);
};

jfxr.Synth.TriangleOscillator = function() {};
jfxr.Synth.TriangleOscillator.prototype.getSample = function(phase) {
  if (phase < 0.25) return 4 * phase;
  if (phase < 0.75) return 2 - 4 * phase;
  return -4 + 4 * phase;
};

jfxr.Synth.SawtoothOscillator = function() {};
jfxr.Synth.SawtoothOscillator.prototype.getSample = function(phase) {
  return phase < 0.5 ? 2 * phase : -2 + 2 * phase;
};

jfxr.Synth.SquareOscillator = function(sound) {
  this.sound = sound;
};
jfxr.Synth.SquareOscillator.prototype.getSample = function(phase, time) {
  return phase < this.sound.squareDutyAt(time) ? 1 : -1;
};

jfxr.Synth.TangentOscillator = function() {};
jfxr.Synth.TangentOscillator.prototype.getSample = function(phase) {
  // Arbitrary cutoff value to make normalization behave.
  return jfxr.Math.clamp(-2, 2, 0.3 * Math.tan(Math.PI * phase));
};

jfxr.Synth.WhistleOscillator = function() {};
jfxr.Synth.WhistleOscillator.prototype.getSample = function(phase) {
  return 0.75 * Math.sin(2 * Math.PI * phase) + 0.25 * Math.sin(40 * Math.PI * phase);
};

jfxr.Synth.BreakerOscillator = function() {};
jfxr.Synth.BreakerOscillator.prototype.getSample = function(phase) {
  // Make sure to start at a zero crossing.
  var p = jfxr.Math.frac(phase + Math.sqrt(0.75));
  return -1 + 2 * Math.abs(1 - p*p*2);
};

jfxr.Synth.WhiteNoiseOscillator = function(sound) {
  this.interpolateNoise = sound.interpolateNoise.value;

  this.random = new jfxr.Random(0x3cf78ba3);
  this.prevPhase = 0;
  this.prevRandom = 0;
  this.currRandom = 0;
};
jfxr.Synth.WhiteNoiseOscillator.prototype.getSample = function(phase) {
  // Need two samples per phase in order to include the desired frequencies.
  phase = jfxr.Math.frac(phase * 2);
  if (phase < this.prevPhase) {
    this.prevRandom = this.currRandom;
    this.currRandom = this.random.uniform(-1, 1);
  }
  this.prevPhase = phase;

  return this.interpolateNoise ?
    jfxr.Math.lerp(this.prevRandom, this.currRandom, phase) :
    this.currRandom;
};

jfxr.Synth.PinkNoiseOscillator = function(sound, array) {
  this.interpolateNoise = sound.interpolateNoise.value;

  this.random = new jfxr.Random(0x3cf78ba3);
  this.prevPhase = 0;
  this.b = [0, 0, 0, 0, 0, 0, 0];
  this.prevRandom = 0;
  this.currRandom = 0;
};
jfxr.Synth.PinkNoiseOscillator.prototype.getSample = function(phase) {
  // Need two samples per phase in order to include the desired frequencies.
  phase = jfxr.Math.frac(phase * 2);
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
    jfxr.Math.lerp(this.prevRandom, this.currRandom, phase) :
    this.currRandom;
};

jfxr.Synth.BrownNoiseOscillator = function(sound, array) {
  this.interpolateNoise = sound.interpolateNoise.value;

  this.random = new jfxr.Random(0x3cf78ba3);
  this.prevPhase = 0;
  this.prevRandom = 0;
  this.currRandom = 0;
};
jfxr.Synth.BrownNoiseOscillator.prototype.getSample = function(phase) {
  // Need two samples per phase in order to include the desired frequencies.
  phase = jfxr.Math.frac(phase * 2);
  if (phase < this.prevPhase) {
    this.prevRandom = this.currRandom;
    this.currRandom = jfxr.Math.clamp(-1, 1, this.currRandom + 0.1 * this.random.uniform(-1, 1));
  }
  this.prevPhase = phase;

  return this.interpolateNoise ?
    jfxr.Math.lerp(this.prevRandom, this.currRandom, phase) :
    this.currRandom;
};

jfxr.Synth.Tremolo = function(sound, array) {
};

jfxr.Synth.Tremolo.prototype.run = function(sound, array, startSample, endSample) {
  var sampleRate = sound.sampleRate.value;
  var tremoloDepth = sound.tremoloDepth.value;
  var tremoloFrequency = sound.tremoloFrequency.value;

  if (tremoloDepth === 0) {
    return;
  }

  for (var i = startSample; i < endSample; i++) {
    var time = i / sampleRate;
    array[i] *= 1 - (tremoloDepth / 100) * (0.5 + 0.5 * Math.cos(2 * Math.PI * time * tremoloFrequency));
  }
};

jfxr.Synth.Flanger = function(sound, array) {
  if (sound.flangerOffset.value === 0 && sound.flangerOffsetSweep.value === 0) {
    return;
  }

  // Maximum 100ms offset
  this.buffer = new Float32Array(Math.ceil(sound.sampleRate.value * 0.1));
  this.bufferPos = 0;
};

jfxr.Synth.Flanger.prototype.run = function(sound, array, startSample, endSample) {
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
    offsetSamples = jfxr.Math.clamp(0, bufferLength - 1, offsetSamples);
    array[i] += buffer[(bufferPos - offsetSamples + bufferLength) % bufferLength];
    bufferPos = (bufferPos + 1) % bufferLength;
  }

  this.bufferPos = bufferPos;
};

jfxr.Synth.BitCrush = function(sound, array) {
};

jfxr.Synth.BitCrush.prototype.run = function(sound, array, startSample, endSample) {
  var numSamples = array.length;
  var bitCrush = sound.bitCrush.value;
  var bitCrushSweep = sound.bitCrushSweep.value;

  if (bitCrush === 0 && bitCrushSweep === 0) {
    return;
  }

  for (var i = startSample; i < endSample; i++) {
    var bits = bitCrush + i / numSamples * bitCrushSweep;
    bits = jfxr.Math.clamp(1, 16, Math.round(bits));
    var steps = Math.pow(2, bits);
    array[i] = -1 + 2 * Math.round((0.5 + 0.5 * array[i]) * steps) / steps;
  }
};

jfxr.Synth.LowPass = function(sound, array) {
  this.lowPassPrev = 0;
};

jfxr.Synth.LowPass.prototype.run = function(sound, array, startSample, endSample) {
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
    var cutoff = jfxr.Math.clamp(0, sampleRate / 2, lowPassCutoff + fraction * lowPassCutoffSweep);
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

jfxr.Synth.HighPass = function(sound, array) {
  this.highPassPrevIn = 0;
  this.highPassPrevOut = 0;
};

jfxr.Synth.HighPass.prototype.run = function(sound, array, startSample, endSample) {
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
    var cutoff = jfxr.Math.clamp(0, sampleRate / 2, highPassCutoff + fraction * highPassCutoffSweep);
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

jfxr.Synth.Envelope = function(sound, array) {
};

jfxr.Synth.Envelope.prototype.run = function(sound, array, startSample, endSample) {
  var sampleRate = sound.sampleRate.value;
  var attack = sound.attack.value;
  var sustain = sound.sustain.value;
  var sustainPunch = sound.sustainPunch.value;
  var decay = sound.decay.value;

  if (attack === 0 && decay === 0) {
    return;
  }

  for (var i = startSample; i < endSample; i++) {
    var time = i / sampleRate;
    array[i] *= sound.amplitudeAt(time);
  }
};

jfxr.Synth.Compress = function(sound, array) {
};

jfxr.Synth.Compress.prototype.run = function(sound, array, startSample, endSample) {
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

jfxr.Synth.Normalize = function(sound, array) {
  this.maxSample = 0;
};

jfxr.Synth.Normalize.prototype.run = function(sound, array, startSample, endSample) {
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

jfxr.Synth.Amplify = function(sound, array) {
};

jfxr.Synth.Amplify.prototype.run = function(sound, array, startSample, endSample) {
  var factor = sound.amplification.value / 100;

  if (factor == 1) {
    return;
  }

  for (var i = startSample; i < endSample; i++) {
    array[i] *= factor;
  }
};
