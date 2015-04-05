jfxr.Parameter = function(args) {
  this.label = args.label || '<unnamed>';
  this.description = args.description || '<no description>';
  this.unit = args.unit || '';
  this.type = args.type || 'float';
  var numeric = this.type == 'float' || this.type == 'int';
  this.value_ = args.defaultValue;
  this.defaultValue = this.value_;
  this.values = this.type == 'enum' ? (args.values || {}) : null;
  this.minValue = numeric ? args.minValue : null;
  this.maxValue = numeric ? args.maxValue : null;
  this.step = numeric ? (args.step || 'any') : null;
  this.logarithmic = !!(this.type == 'float' && args.logarithmic);
  this.digits = this.type == 'float' ? Math.max(0, Math.round(-Math.log(this.step) / Math.log(10))) : null;
  this.disabledReason_ = args.disabledReason || null;
  this.locked = false;
};

Object.defineProperty(jfxr.Parameter.prototype, 'value', {
  enumerable: true,
  get: function() {
    return this.value_;
  },
  set: function(value) {
    switch (this.type) {
      case 'float':
      case 'int':
        if (typeof value == 'string') {
          value = parseFloat(value);
        }
        if (value != value) { // NaN
          break;
        }
        if (this.type == 'int') {
          value = Math.round(value);
        }
        if (this.minValue !== null && value < this.minValue) {
          value = this.minValue;
        }
        if (this.maxValue !== null && value > this.maxValue) {
          value = this.maxValue;
        }
        this.value_ = value;
        break;
      case 'enum':
        value = '' + value;
        if (!this.values[value]) {
          return;
        }
        this.value_ = value;
        break;
      case 'boolean':
        this.value_ = !!value;
        break;
    }
  },
});

jfxr.Parameter.prototype.valueTitle = function() {
  if (this.type == 'enum') {
    return this.values[this.value_];
  }
  if (this.type == 'boolean') {
    return this.value_ ? 'Enabled' : 'Disabled';
  }
};

jfxr.Parameter.prototype.isDisabled = function(sound) {
  return !!(this.disabledReason_ && this.disabledReason_(sound));
};

jfxr.Parameter.prototype.whyDisabled = function(sound) {
  return this.disabledReason_ && this.disabledReason_(sound);
};

jfxr.Parameter.prototype.toggleLocked = function() {
  this.locked = !this.locked;
};

jfxr.Parameter.prototype.reset = function() {
  this.value = this.defaultValue;
};

jfxr.Parameter.prototype.hasDefaultValue = function() {
  return this.value == this.defaultValue;
};

jfxr.Sound = function() {
  this.name = 'Unnamed';

  var isNotSquare = function(sound) {
    if (sound.waveform.value != 'square') {
      return 'Duty cycle only applies to square waveforms';
    }
    return null;
  };

  // Sound properties
  
  this.sampleRate = new jfxr.Parameter({
    label: 'Sample rate',
    unit: 'Hz',
    defaultValue: 44100,
    minValue: 44100,
    maxValue: 44100,
    disabledReason: function() { return 'Sample rate is currently not configurable'; },
  });  

  // Amplitude parameters
  
  this.attack = new jfxr.Parameter({
    label: 'Attack',
	description: 'Time from the start of the sound until the point where it reaches its maximum volume. Increase this for a gradual fade-in; decrease it to add more "punch".',
    unit: 's',
    defaultValue: 0,
    minValue: 0,
    maxValue: 5,
    step: 0.01,
    logarithmic: true,
  });
  this.sustain = new jfxr.Parameter({
    label: 'Sustain',
	description: 'Amount of time for which the sound holds its maximum volume after the attack phase. Increase this to increase the sound\'s duration.',
    unit: 's',
    defaultValue: 0.0,
    minValue: 0,
    maxValue: 5,
    step: 0.01,
    logarithmic: true,
  });
  this.sustainPunch = new jfxr.Parameter({
    label: 'Sustain punch',
	description: 'Additional volume at the start of the sustain phase, which linearly fades back to the base level. Use this to add extra "punch" to the sustain phase.',
    unit: '%',
    defaultValue: 0,
    minValue: 0,
    maxValue: 100,
    step: 10,
  });
  this.decay = new jfxr.Parameter({
    label: 'Decay',
	description: 'Time it takes from the end of the sustain phase until the sound has faded away. Increase this for a gradual fade-out.',
    unit: 's',
    defaultValue: 0,
    minValue: 0,
    maxValue: 5,
    step: 0.01,
    logarithmic: true,
  });
  this.tremoloDepth = new jfxr.Parameter({
    label: 'Tremolo depth',
	description: 'Amount by which the volume oscillates as a sine wave around its base value.',
    unit: '%',
    defaultValue: 0,
    minValue: 0,
    maxValue: 100,
    step: 1,
  });
  this.tremoloFrequency = new jfxr.Parameter({
    label: 'Tremolo frequency',
	description: 'Frequency at which the volume oscillates as a sine wave around its base value.',
    unit: 'Hz',
    defaultValue: 10,
    minValue: 0,
    maxValue: 1000,
    step: 1,
    logarithmic: true,
  });

  // Pitch parameters

  this.frequency = new jfxr.Parameter({
    label: 'Frequency',
	description: 'Initial frequency, or pitch, of the sound. This determines how high the sound starts out; higher values result in higher notes.',
    unit: 'Hz',
    defaultValue: 500,
    minValue: 10,
    maxValue: 10000,
    step: 100,
    logarithmic: true,
  });
  this.frequencySweep = new jfxr.Parameter({
    label: 'Frequency sweep',
	description: 'Amount by which the frequency is changed linearly over the duration of the sound.',
    unit: 'Hz',
    defaultValue: 0,
    minValue: -10000,
    maxValue: 10000,
    step: 100,
    logarithmic: true,
  });
  this.frequencyDeltaSweep = new jfxr.Parameter({
    label: 'Freq. delta sweep',
	description: 'Amount by which the frequency is changed quadratically over the duration of the sound.',
    unit: 'Hz',
    defaultValue: 0,
    minValue: -10000,
    maxValue: 10000,
    step: 100,
    logarithmic: true,
  });
  this.repeatFrequency = new jfxr.Parameter({
    label: 'Repeat frequency',
	description: 'Amount of times per second that the frequency is reset to its base value, and starts its sweep cycle anew.',
    unit: 'Hz',
    defaultValue: 0,
    minValue: 0,
    maxValue: 100,
    step: 0.1,
    logarithmic: true,
  });
  this.frequencyJump1Onset = new jfxr.Parameter({
    label: 'Freq. jump 1 onset',
	description: 'Point in time, as a fraction of the repeat cycle, at which the frequency makes a sudden jump.',
    unit: '%',
    defaultValue: 33,
    minValue: 0,
    maxValue: 100,
    step: 5,
  });
  this.frequencyJump1Amount = new jfxr.Parameter({
    label: 'Freq. jump 1 amount',
	description: 'Amount by which the frequency jumps at the given onset, as a fraction of the current frequency.',
    unit: '%',
    defaultValue: 0,
    minValue: -100,
    maxValue: 100,
    step: 5,
  });
  this.frequencyJump2Onset = new jfxr.Parameter({
    label: 'Freq. jump 2 onset',
	description: 'Point in time, as a fraction of the repeat cycle, at which the frequency makes a sudden jump.',
    unit: '%',
    defaultValue: 66,
    minValue: 0,
    maxValue: 100,
    step: 5,
  });
  this.frequencyJump2Amount = new jfxr.Parameter({
    label: 'Freq. jump 2 amount',
	description: 'Amount by which the frequency jumps at the given onset, as a fraction of the current frequency.',
    unit: '%',
    defaultValue: 0,
    minValue: -100,
    maxValue: 100,
    step: 5,
  });

  // Harmonics parameters
  
  this.harmonics = new jfxr.Parameter({
    label: 'Harmonics',
	description: 'Number of harmonics (overtones) to add. Generates the same sound at several multiples of the base frequency (2×, 3×, …), and mixes them with the original sound. Note that this slows down rendering quite a lot, so you may want to leave it at 0 until the last moment.',
    type: 'int',
    defaultValue: 0,
    minValue: 0,
    maxValue: 5,
    step: 1,
  });
  this.harmonicsFalloff = new jfxr.Parameter({
    label: 'Harmonics falloff',
	description: 'Volume of each subsequent harmonic, as a fraction of the previous one.',
    defaultValue: 0.5,
    minValue: 0,
    maxValue: 1,
    step: 0.01,
  });

  // Tone parameters

  this.waveform = new jfxr.Parameter({
    label: 'Waveform',
	description: 'Shape of the waveform. This is the most important factor in determining the character, or timbre, of the sound.',
    defaultValue: 'sine',
    type: 'enum',
    values: {
      'sine': 'Sine',
      'triangle': 'Triangle',
      'sawtooth': 'Sawtooth',
      'square': 'Square',
      'tangent': 'Tangent',
      'whistle': 'Whistle',
      'breaker': 'Breaker',
      'whitenoise': 'White noise',
      'pinknoise': 'Pink noise',
      'brownnoise': 'Brown noise',
    },
  });
  this.interpolateNoise = new jfxr.Parameter({
    label: 'Interpolate noise',
	description: 'Whether to use linear interpolation between individual samples of noise. This results in a smoother sound.',
    defaultValue: true,
    type: 'boolean',
    disabledReason: function(sound) {
      var waveform = sound.waveform.value;
      if (waveform != 'whitenoise' && waveform != 'pinknoise' && waveform != 'brownnoise') {
        return 'Noise interpolation only applies to noise waveforms';
      }
    },
  });
  this.vibratoDepth = new jfxr.Parameter({
    label: 'Vibrato depth',
	description: 'Amount by which to vibrate around the base frequency.',
    unit: 'Hz',
    defaultValue: 0,
    minValue: 0,
    maxValue: 1000,
    step: 10,
    logarithmic: true,
  });
  this.vibratoFrequency = new jfxr.Parameter({
    label: 'Vibrato frequency',
	description: 'Number of times per second to vibrate around the base frequency.',
    unit: 'Hz',
    defaultValue: 10,
    minValue: 0,
    maxValue: 1000,
    step: 1,
    logarithmic: true,
  });
  this.squareDuty = new jfxr.Parameter({
    label: 'Square duty',
	description: 'For square waves only, the initial fraction of time the square is in the "on" state.',
    unit: '%',
    defaultValue: 50,
    minValue: 0,
    maxValue: 100,
    step: 5,
    disabledReason: isNotSquare,
  });
  this.squareDutySweep = new jfxr.Parameter({
    label: 'Square duty sweep',
	description: 'For square waves only, change the square duty linearly by this many percentage points over the course of the sound.',
    unit: '%',
    defaultValue: 0,
    minValue: -100,
    maxValue: 100,
    step: 5,
    disabledReason: isNotSquare,
  });

  // Filter parameters

  this.flangerOffset = new jfxr.Parameter({
    label: 'Flanger offset',
	description: 'The initial offset for the flanger effect. Mixes the sound with itself, delayed initially by this amount.',
    unit: 'ms',
    defaultValue: 0,
    minValue: 0,
    maxValue: 50,
    step: 1,
  });
  this.flangerOffsetSweep = new jfxr.Parameter({
    label: 'Flanger offset sweep',
	description: 'Amount by which the flanger offset changes linearly by this amonut over the course of the sound.',
    unit: 'ms',
    defaultValue: 0,
    minValue: -50,
    maxValue: 50,
    step: 1,
  });
  this.bitCrush = new jfxr.Parameter({
    label: 'Bit crush',
	description: 'Number of bits per sample. Reduces the number of bits in each sample by this amount, and then increase it again. The result is a lower-fidelity sound effect.',
    unit: 'bits',
    defaultValue: 16,
    minValue: 1,
    maxValue: 16,
    step: 1,
  });
  this.bitCrushSweep = new jfxr.Parameter({
    label: 'Bit crush sweep',
	description: 'Amount by which to change the bit crush value linearly over the course of the sound.',
    unit: 'bits',
    defaultValue: 0,
    minValue: -16,
    maxValue: 16,
    step: 1,
  });
  this.lowPassCutoff = new jfxr.Parameter({
    label: 'Low-pass cutoff',
	description: 'Threshold above which frequencies should be filtered out, using a simple IIR low-pass filter. Use this to take some "edge" off the sound.',
    unit: 'Hz',
    defaultValue: 22050,
    minValue: 0,
    maxValue: 22050,
    step: 100,
    logarithmic: true,
  });
  this.lowPassCutoffSweep = new jfxr.Parameter({
    label: 'Low-pass sweep',
	description: 'Amount by which to change the low-pass cutoff frequency over the course of the sound.',
    unit: 'Hz',
    defaultValue: 0,
    minValue: -22050,
    maxValue: 22050,
    step: 100,
    logarithmic: true,
  });
  this.highPassCutoff = new jfxr.Parameter({
    label: 'High-pass cutoff',
	description: 'Threshold below which frequencies should be filtered out, using a simple high-pass filter.',
    unit: 'Hz',
    defaultValue: 0,
    minValue: 0,
    maxValue: 22050,
    step: 100,
    logarithmic: true,
  });
  this.highPassCutoffSweep = new jfxr.Parameter({
	label: 'High-pass sweep',
	description: 'Amount by which to change the high-pass cutoff frequency over the course of the sound.',
    unit: 'Hz',
    defaultValue: 0,
    minValue: -22050,
    maxValue: 22050,
    step: 100,
    logarithmic: true,
  });

  // Output parameters
  
  this.compression = new jfxr.Parameter({
    label: 'Compression',
	description: 'Power to which sample values should be raised. 1 is the neutral setting. Use a value less than 1 to increase the volume of quiet parts of the sound, higher than 1 to make quiet parts even quieter.',
    defaultValue: 1,
    minValue: 0,
    maxValue: 5,
    step: 0.1,
  });  
  this.normalization = new jfxr.Parameter({
    label: 'Normalization',
	description: 'Whether to adjust the volume of the sound so that the peak volume is at 100%.',
    type: 'boolean',
    defaultValue: true,
  });
  this.amplification = new jfxr.Parameter({
    label: 'Amplification',
	description: 'Percentage to amplify the sound by, after any normalization has occurred. Note that setting this too high can result in clipping.',
    unit: '%',
    defaultValue: 100,
    minValue: 0,
    maxValue: 500,
    step: 10,
  });
};

jfxr.Sound.prototype.duration = function() {
  return this.attack.value + this.sustain.value + this.decay.value;
};

jfxr.Sound.prototype.amplitudeAt = function(time) {
  var attack = this.attack.value;
  var sustain = this.sustain.value;
  var sustainPunch = this.sustainPunch.value;
  var decay = this.decay.value;
  var tremoloDepth = this.tremoloDepth.value;
  var amp;
  if (time < attack) {
    amp = time / attack;
  } else if (time < attack + sustain) {
    amp = 1 + sustainPunch / 100 * (1 - (time - attack) / sustain);
  } else {
    amp = 1 - (time - attack - sustain) / decay;
  }
  if (tremoloDepth !== 0) {
    amp *= 1 - (tremoloDepth / 100) * (0.5 + 0.5 * Math.cos(2 * Math.PI * time * this.tremoloFrequency.value));
  }
  return amp;
};

jfxr.Sound.prototype.effectiveRepeatFrequency = function() {
  return Math.max(this.repeatFrequency.value, 1 / this.duration());
};

jfxr.Sound.prototype.frequencyAt = function(time) {
  var repeatFrequency = this.effectiveRepeatFrequency();
  var fractionInRepetition = jfxr.Math.frac(time * repeatFrequency);
  var freq =
    this.frequency.value +
    fractionInRepetition * this.frequencySweep.value +
    fractionInRepetition * fractionInRepetition * this.frequencyDeltaSweep.value;
  if (fractionInRepetition > this.frequencyJump1Onset.value / 100) {
    freq *= 1 + this.frequencyJump1Amount.value / 100;
  }
  if (fractionInRepetition > this.frequencyJump2Onset.value / 100) {
    freq *= 1 + this.frequencyJump2Amount.value / 100;
  }
  if (this.vibratoDepth.value !== 0) {
    freq += 1 - this.vibratoDepth.value * (0.5 - 0.5 * Math.sin(2 * Math.PI * time * this.vibratoFrequency.value));
  }
  return Math.max(0, freq);
};

jfxr.Sound.prototype.squareDutyAt = function(time) {
  var repeatFrequency = this.effectiveRepeatFrequency();
  var fractionInRepetition = jfxr.Math.frac(time * repeatFrequency);
  return (this.squareDuty.value + fractionInRepetition * this.squareDutySweep.value) / 100;
};

jfxr.Sound.prototype.forEachParam = function(func) {
  for (var key in this) {
    var value = this[key];
    if (value instanceof jfxr.Parameter) {
      func(key, value);
    }
  }
};

jfxr.Sound.prototype.reset = function() {
  this.forEachParam(function(key, param) {
    param.reset();
    param.locked = false;
  });
};

jfxr.Sound.prototype.clone = function() {
  var clone = new jfxr.Sound();
  clone.parse(this.serialize());
  return clone;
};

jfxr.Sound.prototype.serialize = function() {
  var json = {
    _version: 1,
    _name: this.name,
    _locked: [],
  };
  this.forEachParam(function(key, param) {
    json[key] = param.value;
    if (param.locked) {
      json._locked.push(key);
    }
  });
  return JSON.stringify(json);
};

jfxr.Sound.prototype.parse = function(str) {
  this.reset();
  if (str && str !== '') {
    var json = JSON.parse(str);
    if (json._version > jfxr.VERSION) {
      throw new Error('Cannot read this sound; it was written by jfxr version ' + json._version +
          ' but we support only up to version ' + jfxr.VERSION + '. Please update jfxr.');
    }

    this.name = json._name || 'Unnamed';
    this.forEachParam(function(key, param) {
      if (key in json) {
        param.value = json[key];
      }
    });

    var locked = json._locked || [];
    for (var i = 0; i < locked.length; i++) {
      var param = this[locked[i]];
      if (param instanceof jfxr.Parameter) {
        param.locked = true;
      }
    }
  }
};
