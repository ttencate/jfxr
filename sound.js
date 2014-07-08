jfxr.Parameter = function(args) {
	this.label = args.label || '<unnamed>';
	this.unit = args.unit || '';
	this.type_ = args.type || 'float';
	this.value_ = args.value;
	this.values_ = this.type_ == 'enum' ? (args.values || []) : null;
	this.minValue = this.type_ == 'float' ? args.minValue : null;
	this.maxValue = this.type_ == 'float' ? args.maxValue : null;
	this.step = this.type_ == 'float' ? (args.step || 'any') : null;
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
				value = parseFloat(value);
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
			return 'Frequency settings do not apply to noise';
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
		value: 880,
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
	this.release = new jfxr.Parameter({
		label: 'Release',
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
		var vibratoDepth = this.vibratoDepth.value;
		var vibratoFrequency = this.vibratoFrequency.value;
		var squareDuty = this.squareDuty.value;
		var squareDutySweep = this.squareDutySweep.value;
		var attack = this.attack.value;
		var sustain = this.sustain.value;
		var release = this.release.value;
		var tremoloDepth = this.tremoloDepth.value;
		var tremoloFrequency = this.tremoloFrequency.value;

		var sampleRate = this.sampleRate;
		var numSamples = Math.max(1, Math.ceil(sampleRate * (attack + sustain + release)));
		this.buffer = this.context.createBuffer(1, numSamples, sampleRate);
		var data = this.buffer.getChannelData(0);

		// Pink noise parameters
		var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

		// Brown noise parameters
		var prevSample = 0;

		var random = new jfxr.Random(0x3cf78ba3); // Chosen by fair dice roll. Guaranteed to be random.

		var phase = 0;
		for (var i = 0; i < numSamples; i++) {
			var sample = 0;
			var t = i / sampleRate;

			switch (waveform) {
				case 'sine':
					sample = Math.sin(2 * Math.PI * phase);
					break;
				case 'triangle':
					sample =
						phase < 0.25 ? 4 * phase :
						phase < 0.75 ? 2 - 4 * phase :
						-4 + 4 * phase;
					break;
				case 'sawtooth':
					sample = phase < 0.5 ? 2 * phase : -2 + 2 * phase;
					break;
				case 'square':
					var d = (squareDuty + t * squareDutySweep) / 100;
					sample = phase < d ? 1 : -1;
					break;
				case 'tangent':
					sample = 0.3 * Math.tan(Math.PI * phase);
					break;
				case 'whistle':
					sample = 0.75 * Math.sin(2 * Math.PI * phase) + 0.25 * Math.sin(40 * Math.PI * phase);
					break;
				case 'breaker':
					// Make sure to start at a zero crossing.
					var p = phase + Math.sqrt(0.75);
					if (p >= 1) p -= 1;
					sample = -1 + 2 * Math.abs(1 - p*p*2);
					break;
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

			var f = frequency + t * frequencySlide;
			f += 1 - vibratoDepth * (0.5 - 0.5 * Math.sin(2 * Math.PI * t * vibratoFrequency));
			var periodInSamples = sampleRate / f;
			phase += 1 / periodInSamples;
			phase = phase - Math.floor(phase);

			sample *= 1 - (tremoloDepth / 100) * (0.5 + 0.5 * Math.cos(2 * Math.PI * t * tremoloFrequency));

			if (t < attack) {
				sample *= t / attack;
			} else if (t > attack + sustain) {
				sample *= 1 - (t - attack - sustain) / release;
			}

			data[i] = sample;
		}
		this.dirty = false;
	}
	return this.buffer;
};
