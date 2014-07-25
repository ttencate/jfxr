jfxr.Preset = function(args) {
  this.name = args.name;
  this.createSound = args.createSound || null;
  this.modifySound = args.modifySound || null;
  this.random = new jfxr.Random();
};

jfxr.Preset.reset = new jfxr.Preset({
  name: 'Reset',
  createSound: function() {
    var sound = new jfxr.Sound();
    sound.sustain.value = 0.2;
    return sound;
  },
});

jfxr.Preset.prototype.randomize = function(param, min, max) {
  if (min == undefined) min = param.minValue;
  if (max == undefined) max = param.maxValue;
  switch (param.type) {
    case 'boolean':
      param.value = (this.random.uniform() >= 0.5);
      break;
    case 'float':
      param.value = jfxr.Math.roundTo(this.random.uniform(min, max), param.step);
      break;
    case 'int':
      param.value = this.random.int(min, max);
      break;
    case 'enum':
      var values = [];
      for (var v in param.values) {
        values.push(v);
      }
      param.value = this.random.fromArray(values);
      break;
  }
};

jfxr.Preset.all = [
  jfxr.Preset.reset,

  new jfxr.Preset({
    name: 'Randomize',
    createSound: function() {
      var sound = new jfxr.Sound();
      var random = this.random;
      var randomize = this.randomize.bind(this);

      var attackSustainDecay = random.int(3, 16);
      // Attack typically leads to less useful sounds. Reduce probability by requiring two bits.
      if ((attackSustainDecay & 1) && (attackSustainDecay & 2)) {
        randomize(sound.attack, 0.0, 2.0);
      }
      // For the other parameters, use just one bit.
      if (attackSustainDecay & 4) {
        randomize(sound.sustain, 0.0, 1.0);
        if (random.boolean(0.5)) {
          randomize(sound.sustainPunch);
        }
      }
      if (attackSustainDecay & 8) {
        randomize(sound.decay);
      }

      if (random.boolean(0.5)) {
        randomize(sound.tremoloDepth);
        randomize(sound.tremoloFrequency);
      }

      randomize(sound.frequency);
      if (random.boolean(0.5)) {
        randomize(sound.frequencySweep);
      }
      if (random.boolean(0.5)) {
        randomize(sound.frequencyDeltaSweep);
      }

      var repeatJump = random.int(0, 3);
      if (repeatJump >= 1) {
        randomize(sound.repeatFrequency,
            1 / (sound.attack.value + sound.sustain.value + sound.decay.value),
            sound.repeatFrequency.maxValue);
      }
      if (repeatJump >= 2) {
        randomize(sound.frequencyJump1Onset);
        randomize(sound.frequencyJump1Amount);
        if (random.boolean(0.5)) {
          randomize(sound.frequencyJump2Onset);
          randomize(sound.frequencyJump2Amount);
          if (sound.frequencyJump2Onset.value < sound.frequencyJump1Onset.value) {
            var tmp = sound.frequencyJump1Onset.value;
            sound.frequencyJump1Onset.value = sound.frequencyJump2Onset.value;
            sound.frequencyJump2Onset.value = tmp;
          }
        }
      }

      if (random.boolean(0.5)) {
        randomize(sound.harmonics);
        randomize(sound.harmonicsFalloff);
      }

      randomize(sound.waveform);
      randomize(sound.interpolateNoise);

      if (random.boolean(0.5)) {
        randomize(sound.vibratoDepth);
        randomize(sound.vibratoFrequency);
      }
      if (sound.waveform.value == 'square' && random.boolean(0.5)) {
        randomize(sound.squareDuty);
        randomize(sound.squareDutySweep);
      }

      if (random.boolean(0.5)) {
        randomize(sound.flangerOffset);
        if (random.boolean(0.5)) {
          randomize(sound.flangerOffsetSweep);
        }
      }

      if (random.boolean(0.2)) {
        randomize(sound.bitCrush);
        if (random.boolean(0.5)) {
          randomize(sound.bitCrushSweep);
        }
      }

      while (true) {
        sound.lowPassCutoff.reset();
        sound.lowPassCutoffSweep.reset();
        sound.highPassCutoff.reset();
        sound.highPassCutoffSweep.reset();
        if (random.boolean(0.5)) {
          randomize(sound.lowPassCutoff, 0, 10000);
        }
        if (random.boolean(0.5)) {
          randomize(sound.highPassCutoffSweep, 0, 10000);
        }
        if (random.boolean(0.5)) {
          randomize(sound.highPassCutoff, 0, 10000);
        }
        if (random.boolean(0.5)) {
          randomize(sound.highPassCutoffSweep, 0, 10000);
        }
        if (sound.lowPassCutoff.value > sound.highPassCutoff.value) {
          break;
        }
        if (sound.lowPassCutoff.value + sound.lowPassCutoffSweep.value > sound.highPassCutoff.value + sound.highPassCutoffSweep.value) {
          break;
        }
      }

      if (random.boolean(0.5)) {
        randomize(sound.compression);
      }

      sound.normalization.value = true;
      sound.amplification.value = 100;

      return sound;
    },
  }),

  new jfxr.Preset({
    name: 'Mutate',
    modifySound: function(sound) {
      var random = new jfxr.Random();
      sound.forEachParam(function(key, param) {
        if (param.locked) return;
        if (key == 'normalization' || key == 'amplification') return;
        switch (param.type) {
          case 'boolean':
            if (random.boolean(0.1)) {
              param.value = !param.value;
            }
            break;
          case 'float':
            if (param.value != param.defaultValue || random.boolean(0.3)) {
              var range = 0.05 * (param.maxValue - param.minValue);
              param.value = jfxr.Math.roundTo(param.value + random.uniform(-range, range), param.step);
            }
            break;
          case 'int':
            param.value += random.int(-1, 1);
            break;
          case 'enum':
            if (random.boolean(0.1)) {
              var values = [];
              for (var v in param.values) {
                values.push(v);
              }
              param.value = random.fromArray(values);
            }
            break;
        }
      });
    },
  }),

  new jfxr.Preset({
    name: 'Pickup/coin',
    createSound: function(sound) {
      var sound = new jfxr.Sound();
      var random = this.random;
      var randomize = this.randomize.bind(this);

      sound.waveform.value = random.fromArray(['sine', 'square', 'whistle', 'breaker']);
      randomize(sound.squareDuty);
      randomize(sound.squareDutySweep);

      randomize(sound.sustain, 0.02, 0.1);
      if (random.boolean(0.5)) {
        randomize(sound.sustainPunch, 0, 100);
      }
      randomize(sound.decay, 0.05, 0.4);

      randomize(sound.frequency, 100, 2000);
      if (random.boolean(0.7)) {
        randomize(sound.frequencyJump1Onset, 10, 30);
        randomize(sound.frequencyJump1Amount, 10, 100);
        if (random.boolean(0.3)) {
        randomize(sound.frequencyJump2Onset, 20, 40);
        randomize(sound.frequencyJump2Amount, 10, 100);
        }
      }

      if (random.boolean(0.5)) {
        randomize(sound.flangerOffset, 0, 10);
        randomize(sound.flangerOffsetSweep, -10, 10);
      }

      return sound;
    }
  }),

  new jfxr.Preset({
    name: 'Laser/shoot',
    createSound: function(sound) {
      var sound = new jfxr.Sound();
      var random = this.random;
      var randomize = this.randomize.bind(this);

      sound.waveform.value = random.fromArray(['sine', 'triangle', 'sawtooth', 'square', 'tangent', 'whistle', 'breaker']);
      randomize(sound.squareDuty);
      randomize(sound.squareDutySweep);

      randomize(sound.sustain, 0.02, 0.1);
      if (random.boolean(0.5)) {
        randomize(sound.sustainPunch, 0, 100);
      }
      randomize(sound.decay, 0.02, 0.1);

      randomize(sound.frequency, 500, 2000);
      randomize(sound.frequencySweep, -100, -2000);
      randomize(sound.frequencyDeltaSweep, -100, -2000);

      if (random.boolean(0.5)) {
        randomize(sound.flangerOffset, 0, 10);
        randomize(sound.flangerOffsetSweep, -10, 10);
      }

      return sound;
    }
  }),

  new jfxr.Preset({
    name: 'Explosion',
    createSound: function(sound) {
      var sound = new jfxr.Sound();
      var random = this.random;
      var randomize = this.randomize.bind(this);

      sound.waveform.value = random.fromArray(['whitenoise', 'pinknoise', 'brownnoise']);

      randomize(sound.sustain, 0.05, 0.1);
      if (random.boolean(0.5)) {
        randomize(sound.sustainPunch, 0, 100);
      }
      randomize(sound.decay, 0.3, 0.5);

      if (sound.waveform.value == 'brownnoise') {
        randomize(sound.frequency, 10000, 20000);
      } else {
        randomize(sound.frequency, 1000, 10000);
      }
      randomize(sound.frequencySweep, -1000, -5000);
      randomize(sound.frequencyDeltaSweep, -1000, -5000);

      if (random.boolean(0.5)) {
        randomize(sound.flangerOffset, 0, 10);
        randomize(sound.flangerOffsetSweep, -10, 10);
      }

      if (random.boolean(0.5)) {
        randomize(sound.compression, 0.5, 2.0);
      }

      return sound;
    }
  }),
];
