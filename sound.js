jfxr.Parameter = function(args) {
	this.label = args.label || '<unnamed>';
	this.unit = args.unit || '';
	this.type_ = args.type || 'float';
	var numeric = this.type_ == 'float' || this.type_ == 'int';
	this.value_ = args.value;
	this.values_ = this.type_ == 'enum' ? (args.values || []) : null;
	this.minValue = numeric ? args.minValue : null;
	this.maxValue = numeric ? args.maxValue : null;
	this.step = numeric ? (args.step || 'any') : null;
	this.digits = this.type_ == 'float' ? Math.max(0, Math.round(-Math.log(this.step) / Math.log(10))) : null;
	this.disabledReason_ = args.disabledReason || null;
};

Object.defineProperty(jfxr.Parameter.prototype, 'value', {
	enumerable: true,
	get: function() {
		return this.value_;
	},
	set: function(value) {
		switch (this.type_) {
			case 'float':
			case 'int':
				value = parseFloat(value);
				if (this.type_ == 'int') {
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
				var found = false;
				for (var v in this.values_) {
					if (value == v) {
						this.value_ = v;
						found = true;
						break;
					}
				}
				if (!found) {
					return;
				}
				break;
		}
		if (this.onchange) {
			this.onchange();
		}
	},
});

jfxr.Parameter.prototype.valueTitle = function() {
	if (this.type_ == 'enum') {
		return this.values_[this.value_];
	}
};

jfxr.Parameter.prototype.isDisabled = function(sound) {
	return !!(this.disabledReason_ && this.disabledReason_(sound));
};

jfxr.Parameter.prototype.whyDisabled = function(sound) {
	return this.disabledReason_ && this.disabledReason_(sound);
};

jfxr.Sound = function(context) {
	var self = this;
	this.context = context;

	this.sampleRate = 44100;

	var frequencyIsMeaningless = function(sound) {
		var w = sound.waveform.value;
		if (w == 'whitenoise' || w == 'pinknoise' || w == 'brownnoise') {
			return 'Frequency and harmonics settings do not apply to noise';
		}
		return null;
	};
	var isNotSquare = function(sound) {
		if (sound.waveform.value != 'square') {
			return 'Duty cycle only applies to square waveforms';
		}
		return null;
	};

	// Frequency parameters

	this.waveform = new jfxr.Parameter({
		label: 'Waveform',
		value: 'sine',
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
	this.frequency = new jfxr.Parameter({
		label: 'Frequency',
		unit: 'Hz',
		value: 440,
		minValue: 10,
		maxValue: 10000,
		step: 1,
		disabledReason: frequencyIsMeaningless,
	});
	this.frequencySlide = new jfxr.Parameter({
		label: 'Frequency slide',
		unit: 'Hz/s',
		value: 0,
		minValue: -10000,
		maxValue: 10000,
		step: 100,
		disabledReason: frequencyIsMeaningless,
	});
	this.frequencyDeltaSlide = new jfxr.Parameter({
		label: 'Frequency delta slide',
		unit: 'Hz/s²',
		value: 0,
		minValue: -500000,
		maxValue: 500000,
		step: 1000,
		disabledReason: frequencyIsMeaningless,
	});
	this.vibratoDepth = new jfxr.Parameter({
		label: 'Vibrato depth',
		unit: 'Hz',
		value: 0,
		minValue: 0,
		maxValue: 1000,
		step: 10,
		disabledReason: frequencyIsMeaningless,
	});
	this.vibratoFrequency = new jfxr.Parameter({
		label: 'Vibrato frequency',
		unit: 'Hz',
		value: 10,
		minValue: 1,
		maxValue: 1000,
		step: 1,
		disabledReason: frequencyIsMeaningless,
	});
	this.squareDuty = new jfxr.Parameter({
		label: 'Square duty',
		unit: '%',
		value: 50,
		minValue: 0,
		maxValue: 100,
		step: 1,
		disabledReason: isNotSquare,
	});
	this.squareDutySweep = new jfxr.Parameter({
		label: 'Square duty sweep',
		unit: '%/s',
		value: 0,
		minValue: -1000,
		maxValue: 1000,
		step: 5,
		disabledReason: isNotSquare,
	});

	// Amplitude parameters
	
	this.attack = new jfxr.Parameter({
		label: 'Attack',
		unit: 's',
		value: 0,
		minValue: 0,
		maxValue: 5,
		step: 0.01,
	});
	this.sustain = new jfxr.Parameter({
		label: 'Sustain',
		unit: 's',
		value: 0.1,
		minValue: 0,
		maxValue: 5,
		step: 0.01,
	});
	this.decay = new jfxr.Parameter({
		label: 'Decay',
		unit: 's',
		value: 0,
		minValue: 0,
		maxValue: 5,
		step: 0.01,
	});
	this.tremoloDepth = new jfxr.Parameter({
		label: 'Tremolo depth',
		unit: '%',
		value: 0,
		minValue: 0,
		maxValue: 100,
		step: 1,
	});
	this.tremoloFrequency = new jfxr.Parameter({
		label: 'Tremolo frequency',
		unit: 'Hz',
		value: 10,
		minValue: 1,
		maxValue: 1000,
		step: 1,
	});

	// Harmonics parameters
	
	this.harmonics = new jfxr.Parameter({
		label: 'Harmonics',
		type: 'int',
		value: 0,
		minValue: 0,
		maxValue: 5,
		step: 1,
		disabledReason: frequencyIsMeaningless,
	});
	this.harmonicsFalloff = new jfxr.Parameter({
		label: 'Harmonics falloff',
		value: 0.5,
		minValue: 0,
		maxValue: 1,
		step: 0.01,
		disabledReason: frequencyIsMeaningless,
	});

	// Filter parameters

	this.lowPassCutoff = new jfxr.Parameter({
		label: 'Low-pass cutoff',
		unit: 'Hz',
		value: 44100,
		minValue: 0,
		maxValue: 44100,
		step: 1000,
	});
	this.lowPassCutoffSweep = new jfxr.Parameter({
		label: 'Low-pass cutoff sweep',
		unit: 'Hz/s',
		value: 0,
		minValue: -10000,
		maxValue: 10000,
		step: 100,
	});
	this.highPassCutoff = new jfxr.Parameter({
		label: 'High-pass cutoff',
		unit: 'Hz',
		value: 0,
		minValue: 0,
		maxValue: 44100,
		step: 1000,
	});
	this.highPassCutoffSweep = new jfxr.Parameter({
		label: 'High-pass cutoff sweep',
		unit: 'Hz/s',
		value: 0,
		minValue: -10000,
		maxValue: 10000,
		step: 100,
	});

	// Output parameters
	
	this.compression = new jfxr.Parameter({
		label: 'Compression exponent',
		value: 1,
		minValue: 0,
		maxValue: 10,
		step: 0.1,
	});	
	this.normalization = new jfxr.Parameter({
		label: 'Normalization level',
		unit: '%',
		value: 100,
		minValue: 0,
		maxValue: 500,
		step: 10,
	});

	this.buffer = null;
	this.dirty = true;

	var onchange = function() { self.dirty = true; }
	for (var key in this) {
		if (this[key] instanceof jfxr.Parameter) {
			this[key].onchange = onchange;
		}
	}
};

jfxr.Sound.prototype.getBuffer = function() {
	if (this.dirty) {
		var waveform = this.waveform.value;
		var frequency = this.frequency.value;
		var frequencySlide = this.frequencySlide.value;
		var frequencyDeltaSlide = this.frequencyDeltaSlide.value;
		var vibratoDepth = this.vibratoDepth.value;
		var vibratoFrequency = this.vibratoFrequency.value;
		var squareDuty = this.squareDuty.value;
		var squareDutySweep = this.squareDutySweep.value;
		var attack = this.attack.value;
		var sustain = this.sustain.value;
		var decay = this.decay.value;
		var tremoloDepth = this.tremoloDepth.value;
		var tremoloFrequency = this.tremoloFrequency.value;
		var harmonics = this.harmonics.value;
		var harmonicsFalloff = this.harmonicsFalloff.value;
		var lowPassCutoff = this.lowPassCutoff.value;
		var lowPassCutoffSweep = this.lowPassCutoffSweep.value;
		var highPassCutoff = this.highPassCutoff.value;
		var highPassCutoffSweep = this.highPassCutoffSweep.value;
		var compression = this.compression.value;
		var normalization = this.normalization.value;

		var sampleRate = this.sampleRate;
		var numSamples = Math.max(1, Math.ceil(sampleRate * (attack + sustain + decay)));
		this.buffer = this.context.createBuffer(1, numSamples, sampleRate);
		var data = this.buffer.getChannelData(0);

		// Pink noise parameters
		var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

		// Brown noise parameters
		var prevSample = 0;

		var random = new jfxr.Random(0x3cf78ba3); // Chosen by fair dice roll. Guaranteed to be random.

		var amp = 1;
		var totalAmp = 0;
		for (var harmonicIndex = 0; harmonicIndex <= harmonics; harmonicIndex++) {
			totalAmp += amp;
			amp *= harmonicsFalloff;
		}
		var firstHarmonicAmp = 1 / totalAmp;

		var phase = 0;
		var maxSample = 0;
		for (var i = 0; i < numSamples; i++) {
			var sample = 0;
			var t = i / sampleRate;

			if (waveform == 'whitenoise' || waveform == 'pinknoise' || waveform == 'brownnoise') {
				switch (waveform) {
					case 'whitenoise':
						sample = random.uniform(-1, 1);
						break;
					case 'pinknoise':
						// Method pk3 from http://www.firstpr.com.au/dsp/pink-noise/,
						// due to Paul Kellet.
						var white = random.uniform(-1, 1);
						b0 = 0.99886 * b0 + white * 0.0555179;
						b1 = 0.99332 * b1 + white * 0.0750759;
						b2 = 0.96900 * b2 + white * 0.1538520;
						b3 = 0.86650 * b3 + white * 0.3104856;
						b4 = 0.55000 * b4 + white * 0.5329522;
						b5 = -0.7616 * b5 + white * 0.0168980;
						sample = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) / 7;
						b6 = white * 0.115926;
						break;
					case 'brownnoise':
						var white = random.uniform(-1, 1);
						sample = prevSample + 0.1 * white;
						if (sample < -1) sample = -1;
						if (sample > 1) sample = 1;
						prevSample = sample;
						break;
				}
			} else {
				var amp = firstHarmonicAmp;
				for (var harmonicIndex = 0; harmonicIndex <= harmonics; harmonicIndex++) {
					var harmonicPhase = Math.frac(phase * (harmonicIndex + 1));
					var h;
					switch (waveform) {
						case 'sine':
							h = Math.sin(2 * Math.PI * harmonicPhase);
							break;
						case 'triangle':
							h =
								harmonicPhase < 0.25 ? 4 * harmonicPhase :
								harmonicPhase < 0.75 ? 2 - 4 * harmonicPhase :
								-4 + 4 * harmonicPhase;
							break;
						case 'sawtooth':
							h = harmonicPhase < 0.5 ? 2 * harmonicPhase : -2 + 2 * harmonicPhase;
							break;
						case 'square':
							var d = (squareDuty + t * squareDutySweep) / 100;
							h = harmonicPhase < d ? 1 : -1;
							break;
						case 'tangent':
							h = 0.3 * Math.tan(Math.PI * harmonicPhase);
							// Arbitrary cutoff value to make normalization behave.
							if (h > 2) h = 2;
							if (h < -2) h = -2;
							break;
						case 'whistle':
							h = 0.75 * Math.sin(2 * Math.PI * harmonicPhase) + 0.25 * Math.sin(40 * Math.PI * harmonicPhase);
							break;
						case 'breaker':
							// Make sure to start at a zero crossing.
							var p = harmonicPhase + Math.sqrt(0.75);
							if (p >= 1) p -= 1;
							h = -1 + 2 * Math.abs(1 - p*p*2);
							break;
					}
					sample += amp * h;
					amp *= harmonicsFalloff;
				}
			}

			var f = frequency + t * frequencySlide + t * t * frequencyDeltaSlide;
			f += 1 - vibratoDepth * (0.5 - 0.5 * Math.sin(2 * Math.PI * t * vibratoFrequency));
			var periodInSamples = sampleRate / f;
			phase = Math.frac(phase + 1 / periodInSamples);

			sample *= 1 - (tremoloDepth / 100) * (0.5 + 0.5 * Math.cos(2 * Math.PI * t * tremoloFrequency));

			if (t < attack) {
				sample *= t / attack;
			} else if (t > attack + sustain) {
				sample *= 1 - (t - attack - sustain) / decay;
			}

			if (sample >= 0) {
				sample = Math.pow(sample, compression);
			} else {
				sample = -Math.pow(-sample, compression);
			}

			data[i] = sample;
			maxSample = Math.max(maxSample, Math.abs(sample));
		}

		var amplification = normalization / 100 / maxSample;
		for (var i = 0; i < numSamples; i++) {
			data[i] *= amplification;
		}

		this.dirty = false;
	}
	return this.buffer;
};
