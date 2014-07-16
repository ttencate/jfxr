jfxr.Parameter = function(args) {
	this.label = args.label || '<unnamed>';
	this.unit = args.unit || '';
	this.type = args.type || 'float';
	var numeric = this.type == 'float' || this.type == 'int';
	this.value_ = args.defaultValue;
	this.defaultValue = this.value_;
	this.values = this.type == 'enum' ? (args.values || {}) : null;
	this.minValue = numeric ? args.minValue : null;
	this.maxValue = numeric ? args.maxValue : null;
	this.step = numeric ? (args.step || 'any') : null;
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

jfxr.Sound = function() {
	this.name = 'Unnamed';

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
		unit: 's',
		defaultValue: 0,
		minValue: 0,
		maxValue: 5,
		step: 0.01,
	});
	this.sustain = new jfxr.Parameter({
		label: 'Sustain',
		unit: 's',
		defaultValue: 0.0,
		minValue: 0,
		maxValue: 5,
		step: 0.01,
	});
	this.decay = new jfxr.Parameter({
		label: 'Decay',
		unit: 's',
		defaultValue: 0,
		minValue: 0,
		maxValue: 5,
		step: 0.01,
	});
	this.tremoloDepth = new jfxr.Parameter({
		label: 'Tremolo depth',
		unit: '%',
		defaultValue: 0,
		minValue: 0,
		maxValue: 100,
		step: 1,
	});
	this.tremoloFrequency = new jfxr.Parameter({
		label: 'Tremolo frequency',
		unit: 'Hz',
		defaultValue: 10,
		minValue: 1,
		maxValue: 1000,
		step: 1,
	});

	// Pitch parameters

	this.frequency = new jfxr.Parameter({
		label: 'Frequency',
		unit: 'Hz',
		defaultValue: 500,
		minValue: 10,
		maxValue: 10000,
		step: 100,
		disabledReason: frequencyIsMeaningless,
	});
	this.frequencySweep = new jfxr.Parameter({
		label: 'Frequency sweep',
		unit: 'Hz',
		defaultValue: 0,
		minValue: -10000,
		maxValue: 10000,
		step: 100,
		disabledReason: frequencyIsMeaningless,
	});
	this.frequencyDeltaSweep = new jfxr.Parameter({
		label: 'Freq. delta sweep',
		unit: 'Hz',
		defaultValue: 0,
		minValue: -10000,
		maxValue: 10000,
		step: 100,
		disabledReason: frequencyIsMeaningless,
	});
	this.repeatFrequency = new jfxr.Parameter({
		label: 'Repeat frequency',
		unit: 'Hz',
		defaultValue: 0,
		minValue: 0,
		maxValue: 100,
		step: 0.1,
		disabledReason: frequencyIsMeaningless,
	});
	this.frequencyJump1Onset = new jfxr.Parameter({
		label: 'Freq. jump 1 onset',
		unit: '%',
		defaultValue: 33,
		minValue: 0,
		maxValue: 100,
		step: 5,
		disabledReason: frequencyIsMeaningless,
	});
	this.frequencyJump1Amount = new jfxr.Parameter({
		label: 'Freq. jump 1 amount',
		unit: '%',
		defaultValue: 0,
		minValue: -100,
		maxValue: 100,
		step: 5,
		disabledReason: frequencyIsMeaningless,
	});
	this.frequencyJump2Onset = new jfxr.Parameter({
		label: 'Freq. jump 2 onset',
		unit: '%',
		defaultValue: 66,
		minValue: 0,
		maxValue: 100,
		step: 5,
		disabledReason: frequencyIsMeaningless,
	});
	this.frequencyJump2Amount = new jfxr.Parameter({
		label: 'Freq. jump 2 amount',
		unit: '%',
		defaultValue: 0,
		minValue: -100,
		maxValue: 100,
		step: 5,
		disabledReason: frequencyIsMeaningless,
	});

	// Harmonics parameters
	
	this.harmonics = new jfxr.Parameter({
		label: 'Harmonics',
		type: 'int',
		defaultValue: 0,
		minValue: 0,
		maxValue: 5,
		step: 1,
		disabledReason: frequencyIsMeaningless,
	});
	this.harmonicsFalloff = new jfxr.Parameter({
		label: 'Harmonics falloff',
		defaultValue: 0.5,
		minValue: 0,
		maxValue: 1,
		step: 0.01,
		disabledReason: frequencyIsMeaningless,
	});

	// Tone parameters

	this.waveform = new jfxr.Parameter({
		label: 'Waveform',
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
	this.vibratoDepth = new jfxr.Parameter({
		label: 'Vibrato depth',
		unit: 'Hz',
		defaultValue: 0,
		minValue: 0,
		maxValue: 1000,
		step: 10,
		disabledReason: frequencyIsMeaningless,
	});
	this.vibratoFrequency = new jfxr.Parameter({
		label: 'Vibrato frequency',
		unit: 'Hz',
		defaultValue: 10,
		minValue: 1,
		maxValue: 1000,
		step: 1,
		disabledReason: frequencyIsMeaningless,
	});
	this.squareDuty = new jfxr.Parameter({
		label: 'Square duty',
		unit: '%',
		defaultValue: 50,
		minValue: 0,
		maxValue: 100,
		step: 5,
		disabledReason: isNotSquare,
	});
	this.squareDutySweep = new jfxr.Parameter({
		label: 'Square duty sweep',
		unit: '%',
		defaultValue: 0,
		minValue: -100,
		maxValue: 100,
		step: 5,
		disabledReason: isNotSquare,
	});

	// Filter parameters

	this.lowPassCutoff = new jfxr.Parameter({
		label: 'Low-pass cutoff',
		unit: 'Hz',
		defaultValue: 22050,
		minValue: 0,
		maxValue: 22050,
		step: 100,
	});
	this.lowPassCutoffSweep = new jfxr.Parameter({
		label: 'Low-pass sweep',
		unit: 'Hz',
		defaultValue: 0,
		minValue: -22050,
		maxValue: 22050,
		step: 100,
	});
	this.highPassCutoff = new jfxr.Parameter({
		label: 'High-pass cutoff',
		unit: 'Hz',
		defaultValue: 0,
		minValue: 0,
		maxValue: 22050,
		step: 100,
	});
	this.highPassCutoffSweep = new jfxr.Parameter({
		label: 'High-pass sweep',
		unit: 'Hz',
		defaultValue: 0,
		minValue: -22050,
		maxValue: 22050,
		step: 100,
	});

	// Output parameters
	
	this.compression = new jfxr.Parameter({
		label: 'Compression exponent',
		defaultValue: 1,
		minValue: 0,
		maxValue: 10,
		step: 0.1,
	});	
	this.normalization = new jfxr.Parameter({
		label: 'Normalization',
		type: 'boolean',
		defaultValue: true,
	});
	this.amplification = new jfxr.Parameter({
		label: 'Amplification',
		unit: '%',
		defaultValue: 100,
		minValue: 0,
		maxValue: 500,
		step: 10,
	});
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

jfxr.Sound.prototype.serialize = function() {
	var json = {
		_version: 1,
		_locked: [],
	};
	this.forEachParam(function(key, param) {
		json[key] = param.value;
		if (param.locked) {
			json._locked.push(key);
		}
	});
	json.name = this.name;
	return JSON.stringify(json);
};

jfxr.Sound.prototype.parse = function(str) {
	this.reset();
	if (str && str != '') {
		var json = JSON.parse(str);
		if (json._version > jfxr.VERSION) {
			throw new Error('Cannot read this sound; it was written by jfxr version ' + json._version +
					' but we support only up to version ' + jfxr.VERSION + '. Please update jfxr.');
		}

		this.name = json.name || 'Unnamed';
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
