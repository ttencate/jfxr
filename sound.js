jfxr.Parameter = function(args) {
	this.value_ = args.value;
};

Object.defineProperty(jfxr.Parameter.prototype, 'value', {
	enumerable: true,
	get: function() {
		return this.value_;
	},
	set: function(value) {
		this.value_ = value;
		if (this.onchange) {
			this.onchange();
		}
	},
});

jfxr.Sound = function(context) {
	var self = this;
	this.context = context;

	this.sampleRate = 44100;

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
		this.buffer = this.context.createBuffer(1, 1 * sampleRate, sampleRate);
		var frequency = this.frequency.value;
		var frequencySlide = this.frequencySlide.value;
		var data = this.buffer.getChannelData(0);
		for (var i = 0; i < data.length; i++) {
			var t = i / sampleRate;
			var f = frequency + t * frequencySlide;
			data[i] = Math.sin(2 * Math.PI * t * f);
		}
		this.dirty = false;
	}
	return this.buffer;
};
