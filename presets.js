jfxr.Preset = function(args) {
	this.name = args.name;
	this.createSound = args.createSound;
};

jfxr.Preset.all = [
	new jfxr.Preset({
		name: 'Reset',
		createSound: function() {
			var sound = new jfxr.Sound();
			sound.sustain.value = 0.2;
			return sound;
		},
	}),
	new jfxr.Preset({
		name: 'Randomize',
		createSound: function() {
			var sound = new jfxr.Sound();
			var random = new jfxr.Random();

			function randomize(param, min, max) {
				if (min == undefined) min = param.minValue;
				if (max == undefined) max = param.maxValue;
				switch (param.type) {
					case 'boolean':
						param.value = (random.uniform() >= 0.5);
						break;
					case 'float':
						param.value = jfxr.Math.roundTo(random.uniform(min, max), param.step);
						break;
					case 'int':
						param.value = random.int(min, max);
						break;
					case 'enum':
						var values = [];
						for (var v in param.values) {
							values.push(v);
						}
						param.value = random.fromArray(values);
						break;
				}
			}

			var attackSustainDecay = random.int(3, 16);
			// Attack typically leads to less useful sounds. Reduce probability by requiring two bits.
			if ((attackSustainDecay & 1) && (attackSustainDecay & 2)) {
				randomize(sound.attack, 0.0, 2.0);
			}
			// For the other parameters, use just one bit.
			if (attackSustainDecay & 4) {
				randomize(sound.sustain, 0.0, 1.0);
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

			if (random.boolean(0.5)) {
				randomize(sound.vibratoDepth);
				randomize(sound.vibratoFrequency);
			}
			if (sound.waveform.value == 'square' && random.boolean(0.5)) {
				randomize(sound.squareDuty);
				randomize(sound.squareDutySweep);
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
];
