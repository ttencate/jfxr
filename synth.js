jfxr.Synth = function(context) {
	this.context = context;

	this.renderTimeMs = null;
};

jfxr.Synth.prototype.synth = function(sound) {
	this.renderTimeMs = null;
	var startTime = Date.now();

	var waveform = sound.waveform.value;
	var frequency = sound.frequency.value;
	var frequencySlide = sound.frequencySlide.value;
	var frequencyDeltaSlide = sound.frequencyDeltaSlide.value;
	var vibratoDepth = sound.vibratoDepth.value;
	var vibratoFrequency = sound.vibratoFrequency.value;
	var squareDuty = sound.squareDuty.value;
	var squareDutySweep = sound.squareDutySweep.value;
	var attack = sound.attack.value;
	var sustain = sound.sustain.value;
	var decay = sound.decay.value;
	var tremoloDepth = sound.tremoloDepth.value;
	var tremoloFrequency = sound.tremoloFrequency.value;
	var harmonics = sound.harmonics.value;
	var harmonicsFalloff = sound.harmonicsFalloff.value;
	var lowPassCutoff = sound.lowPassCutoff.value;
	var lowPassCutoffSweep = sound.lowPassCutoffSweep.value;
	var highPassCutoff = sound.highPassCutoff.value;
	var highPassCutoffSweep = sound.highPassCutoffSweep.value;
	var compression = sound.compression.value;
	var normalization = sound.normalization.value;

	var sampleRate = sound.sampleRate;
	var numSamples = Math.max(1, Math.ceil(sampleRate * (attack + sustain + decay)));
	var buffer = this.context.createBuffer(1, numSamples, sampleRate);
	var data = buffer.getChannelData(0);

	// Pink noise parameters
	var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

	// Brown noise parameters
	var prevSample = 0;

	// Low-pass filter parameters
	var lowPassPrev = 0;

	// High-pass filter parameters
	var highPassPrevIn = 0;
	var highPassPrevOut = 0;

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

		var cutoff = Math.clamp(0, sampleRate / 2, lowPassCutoff + t * lowPassCutoffSweep);
		var wc = cutoff / sampleRate * Math.PI; // Don't we need a factor 2pi instead of pi?
		var cosWc = Math.cos(wc);
		var lowPassAlpha;
		if (cosWc <= 0) {
			lowPassAlpha = 1;
		} else {
			// From somewhere on the internet: cos wc = 2a / (1+a^2)
			var lowPassAlpha = 1 / cosWc - Math.sqrt(1 / (cosWc * cosWc) - 1);
			lowPassAlpha = 1 - lowPassAlpha; // Probably the internet's definition of alpha is different.
		}
		sample = lowPassAlpha * sample + (1 - lowPassAlpha) * lowPassPrev;
		lowPassPrev = sample;

		cutoff = Math.clamp(0, sampleRate / 2, highPassCutoff + t * highPassCutoffSweep);
		wc = cutoff / sampleRate * Math.PI;
		// From somewhere on the internet: a = (1 - sin wc) / cos wc
		var highPassAlpha = (1 - Math.sin(wc)) / Math.cos(wc);
		var origSample = sample;
		sample = highPassAlpha * (highPassPrevOut - highPassPrevIn + sample);
		highPassPrevIn = origSample;
		highPassPrevOut = sample;

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

	// TODO re-enable once we have a way to specify absolute amplification as an alternative
	var amplification = normalization / 100 / maxSample;
	for (var i = 0; i < numSamples; i++) {
		// data[i] *= amplification;
	}

	this.renderTimeMs = Date.now() - startTime;

	return buffer;
};

jfxrApp.service('synth', function(context) {
	return new jfxr.Synth(context);
});
