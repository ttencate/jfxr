jfxr.Synth = function() {
};

jfxr.Synth.prototype.generate = function(str) {
	this.generate = null; // Avoid accidental reuse.

	var json = JSON.parse(str);
	this.json = json;

	var sampleRate = json.sampleRate;
	var attack = json.attack;
	var sustain = json.sustain;
	var decay = json.decay;

	var numSamples = Math.max(1, Math.ceil(sampleRate * (attack + sustain + decay)));
	var duration = numSamples / sampleRate;

	this.array = new Float32Array(numSamples);

	var startTime = Date.now();

	this.transform(jfxr.Synth.generateTone);
	this.transform(jfxr.Synth.tremolo);
	this.transform(jfxr.Synth.lowPass);
	this.transform(jfxr.Synth.highPass);
	this.transform(jfxr.Synth.envelope);
	this.transform(jfxr.Synth.compress);
	this.transform(jfxr.Synth.normalize);
	this.transform(jfxr.Synth.amplify);

	var renderTimeMs = Date.now() - startTime;

	return {
		arrayBuffer: this.array.buffer,
		sampleRate: sampleRate,
		renderTimeMs: renderTimeMs,
	};
};

jfxr.Synth.prototype.transform = function(func) {
	this.array = func(this.json, this.array, 0, this.array.length);
};

jfxr.Synth.generateTone = function(json, array, startSample, endSample) {
	var numSamples = array.length;
	var sampleRate = json.sampleRate;
	var frequency = json.frequency;
	var frequencySweep = json.frequencySweep;
	var frequencyDeltaSweep = json.frequencyDeltaSweep;
	var repeatFrequency = json.repeatFrequency;
	var frequencyJump1Onset = json.frequencyJump1Onset;
	var frequencyJump1Amount = json.frequencyJump1Amount;
	var frequencyJump2Onset = json.frequencyJump2Onset;
	var frequencyJump2Amount = json.frequencyJump2Amount;
	var vibratoDepth = json.vibratoDepth;
	var vibratoFrequency = json.vibratoFrequency;
	var harmonics = json.harmonics;
	var harmonicsFalloff = json.harmonicsFalloff;
	var waveform = json.waveform;
	var squareDuty = json.squareDuty;
	var squareDutySweep = json.squareDutySweep;

	var duration = numSamples / sampleRate;
	var phase = 0;
	var random = new jfxr.Random(0x3cf78ba3); // Chosen by fair dice roll. Guaranteed to be random.

	var amp = 1;
	var totalAmp = 0;
	for (var harmonicIndex = 0; harmonicIndex <= harmonics; harmonicIndex++) {
		totalAmp += amp;
		amp *= harmonicsFalloff;
	}
	var firstHarmonicAmp = 1 / totalAmp;

	if (repeatFrequency < 1 / duration) {
		repeatFrequency = 1 / duration;
	}

	// Pink noise parameters
	var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

	// Brown noise parameters
	var prevSample = 0;

	for (var i = startSample; i < endSample; i++) {
		var time = i / sampleRate;
		var fractionInRepetition = jfxr.Math.frac(time * repeatFrequency);

		var currentFrequency = frequency;
		currentFrequency +=
			fractionInRepetition * frequencySweep +
			fractionInRepetition * fractionInRepetition * frequencyDeltaSweep;
		if (fractionInRepetition > frequencyJump1Onset / 100) {
			currentFrequency *= 1 + frequencyJump1Amount / 100;
		}
		if (fractionInRepetition > frequencyJump2Onset / 100) {
			currentFrequency *= 1 + frequencyJump2Amount / 100;
		}
		currentFrequency += 1 - vibratoDepth * (0.5 - 0.5 * Math.sin(2 * Math.PI * time * vibratoFrequency));
		phase = jfxr.Math.frac(phase + currentFrequency / sampleRate);

		var sample = 0;
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
				var harmonicPhase = jfxr.Math.frac(phase * (harmonicIndex + 1));
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
						var d = (squareDuty + fractionInRepetition * squareDutySweep) / 100;
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
		array[i] = sample;
	}

	return array;
};

jfxr.Synth.tremolo = function(json, array, startSample, endSample) {
	var sampleRate = json.sampleRate;
	var tremoloDepth = json.tremoloDepth;
	var tremoloFrequency = json.tremoloFrequency;

	for (var i = startSample; i < endSample; i++) {
		var time = i / sampleRate;
		array[i] *= 1 - (tremoloDepth / 100) * (0.5 + 0.5 * Math.cos(2 * Math.PI * time * tremoloFrequency));
	}

	return array;
};

jfxr.Synth.lowPass = function(json, array, startSample, endSample) {
	var numSamples = array.length;
	var sampleRate = json.sampleRate;
	var lowPassCutoff = json.lowPassCutoff;
	var lowPassCutoffSweep = json.lowPassCutoffSweep;

	var lowPassPrev = 0;

	for (var i = startSample; i < endSample; i++) {
		var fraction = i / numSamples;
		var cutoff = jfxr.Math.clamp(0, sampleRate / 2, lowPassCutoff + fraction * lowPassCutoffSweep);
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
		var sample = array[i];
		sample = lowPassAlpha * sample + (1 - lowPassAlpha) * lowPassPrev;
		lowPassPrev = sample;
		array[i] = sample;
	}

	return array;
};

jfxr.Synth.highPass = function(json, array, startSample, endSample) {
	var numSamples = array.length;
	var sampleRate = json.sampleRate;
	var highPassCutoff = json.highPassCutoff;
	var highPassCutoffSweep = json.highPassCutoffSweep;

	var highPassPrevIn = 0;
	var highPassPrevOut = 0;

	for (var i = startSample; i < endSample; i++) {
		var fraction = i / numSamples;
		var cutoff = jfxr.Math.clamp(0, sampleRate / 2, highPassCutoff + fraction * highPassCutoffSweep);
		var wc = cutoff / sampleRate * Math.PI;
		// From somewhere on the internet: a = (1 - sin wc) / cos wc
		var highPassAlpha = (1 - Math.sin(wc)) / Math.cos(wc);
		var sample = array[i];
		var origSample = sample;
		sample = highPassAlpha * (highPassPrevOut - highPassPrevIn + sample);
		highPassPrevIn = origSample;
		highPassPrevOut = sample;
		array[i] = sample;
	}

	return array;
};

jfxr.Synth.envelope = function(json, array, startSample, endSample) {
	var sampleRate = json.sampleRate;
	var attack = json.attack;
	var sustain = json.sustain;
	var decay = json.decay;

	for (var i = startSample; i < endSample; i++) {
		var time = i / sampleRate;
		if (time < attack) {
			array[i] *= time / attack;
		} else if (time > attack + sustain) {
			array[i] *= 1 - (time - attack - sustain) / decay;
		}
	}

	return array;
};

jfxr.Synth.compress = function(json, array, startSample, endSample) {
	var compression = json.compression;

	for (var i = startSample; i < endSample; i++) {
		var sample = array[i];
		if (sample >= 0) {
			sample = Math.pow(sample, compression);
		} else {
			sample = -Math.pow(-sample, compression);
		}
		array[i] = sample;
	}

	return array;
};

jfxr.Synth.normalize = function(json, array, startSample, endSample) {
	var normalization = json.normalization;

	var maxSample = 0;
	for (var i = startSample; i < endSample; i++) {
		maxSample = Math.max(maxSample, Math.abs(array[i]));
	}

	var factor = 1;
	if (normalization) {
		factor /= maxSample;
	}

	for (var i = startSample; i < endSample; i++) {
		array[i] *= factor;
	}

	return array;
};

jfxr.Synth.amplify = function(json, array, startSample, endSample) {
	var amplification = json.amplification;

	var factor = amplification / 100;
	for (var i = startSample; i < endSample; i++) {
		array[i] *= factor;
	}

	return array;
};
