jfxr.Parameter = function(args) {
	this.type_ = args.type || 'float';
	this.value_ = args.value;
	this.values_ = this.type_ == 'enum' ? (args.values || []) : null;
};

Object.defineProperty(jfxr.Parameter.prototype, 'value', {
	enumerable: true,
	get: function() {
		return this.value_;
	},
	set: function(value) {
		switch (this.type_) {
			case 'float':
				this.value_ = parseFloat(value);
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
		value: 'sine',
		type: 'enum',
		values: {
			'sine': 'Sine',
			'triangle': 'Triangle',
			'sawtooth': 'Sawtooth',
			'square': 'Square',
		},
	});
	this.frequency = new jfxr.Parameter({value: 880});
	this.frequencySlide = new jfxr.Parameter({value: 0});

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
		var sampleRate = this.sampleRate;
		this.buffer = this.context.createBuffer(1, 0.1 * sampleRate, sampleRate);
		var frequency = this.frequency.value;
		var frequencySlide = this.frequencySlide.value;
		var data = this.buffer.getChannelData(0);
		var waveform = this.waveform.value;
		for (var i = 0; i < data.length; i++) {
			var sample = 0;

			var t = i / sampleRate;
			var f = frequency + t * frequencySlide;
			var phase = t * f - Math.floor(t * f);
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

			data[i] = sample;
		}
		this.dirty = false;
	}
	return this.buffer;
};
