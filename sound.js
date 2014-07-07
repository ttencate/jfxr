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

jfxr.Sound = function(context) {
	var self = this;
	this.context = context;

	this.sampleRate = 44100;

	this.waveform = new jfxr.Parameter({
		label: 'Waveform',
		value: 'sine',
		type: 'enum',
		values: {
			'sine': 'Sine',
			'triangle': 'Triangle',
			'sawtooth': 'Sawtooth',
			'square': 'Square',
		},
	});
	this.frequency = new jfxr.Parameter({
		label: 'Frequency',
		unit: 'Hz',
		value: 880,
		minValue: 10,
		maxValue: 10000,
		step: 1,
	});
	this.frequencySlide = new jfxr.Parameter({
		label: 'Frequency slide',
		unit: 'Hz/s',
		value: 0,
		minValue: -10000,
		maxValue: 10000,
		step: 100,
	});
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
		var attack = this.attack.value;
		var sustain = this.sustain.value;
		var release = this.release.value;

		var sampleRate = this.sampleRate;
		var numSamples = Math.max(1, Math.ceil(sampleRate * (attack + sustain + release)));
		this.buffer = this.context.createBuffer(1, numSamples, sampleRate);
		var data = this.buffer.getChannelData(0);

		var phase = 0;
		for (var i = 0; i < numSamples; i++) {
			var sample = 0;
			var t = i / sampleRate;

			var f = frequency + t * frequencySlide;
			var periodInSamples = sampleRate / f;
			phase += 1 / periodInSamples;
		   	phase = phase - Math.floor(phase);
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
					sample = phase < 0.5 ? 1 : -1;
					break;
			}

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
