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

	var onchange = function() {
		if (self.onchange) self.onchange();
	};
	for (var key in this) {
		if (this[key] instanceof jfxr.Parameter) {
			this[key].onchange = onchange;
		}
	}
};
