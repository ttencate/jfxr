jfxr.Sound = function(context) {
	this.context = context;

	this.buffer = null;
};

jfxr.Sound.prototype.getBuffer = function() {
	if (!this.buffer) {
		this.buffer = this.context.createBuffer(2, 44100, 44100);
		var freq = 440;
		for (var c = 0; c < this.buffer.numberOfChannels; c++) {
			var data = this.buffer.getChannelData(c);
			for (var i = 0; i < data.length; i++) {
				data[i] = Math.sin(2 * Math.PI * i * (freq * (1 + i * 16 / 44100)) / 44100);
			}
		}
	}
	return this.buffer;
};
