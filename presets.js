jfxr.Preset = function(args) {
	this.name = args.name;
	this.createSound = args.createSound;
};

jfxr.Preset.all = [
	new jfxr.Preset({
		name: 'Reset',
		createSound: function() {
			return new jfxr.Sound();
		},
	}),
	new jfxr.Preset({
		name: 'Randomize',
		createSound: function() {
			var sound = new jfxr.Sound();
			var random = new jfxr.Random();
			sound.forEachParam(function(key, param) {
				if (random.uniform() > 0.5) {
					return;
				}
				switch (param.type) {
					case 'boolean':
						param.value = (random.uniform() >= 0.5);
						break;
					case 'float':
						param.value = random.uniform(param.minValue, param.maxValue);
						break;
					case 'int':
						param.value = random.int(param.minValue, param.maxValue);
						break;
					case 'enum':
						var values = [];
						for (var v in param.values) {
							values.push(v);
						}
						param.value = random.fromArray(values);
						break;
				}
			});
			sound.normalization.value = true;
			sound.amplification.value = 100;
			return sound;
		},
	}),
];
