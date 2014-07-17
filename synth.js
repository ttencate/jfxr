jfxr.Synth = function(str, callback) {
	this.json = JSON.parse(str);
	this.callback = callback;

	var sampleRate = this.json.sampleRate;
	var attack = this.json.attack;
	var sustain = this.json.sustain;
	var decay = this.json.decay;

	var numSamples = Math.max(1, Math.ceil(sampleRate * (attack + sustain + decay)));

	this.array = new Float32Array(numSamples);

	var classes = [];
	switch (this.json.waveform) {
		case 'whitenoise':
			classes.push(jfxr.Synth.WhiteNoise); break;
		case 'pinknoise':
			classes.push(jfxr.Synth.PinkNoise); break;
		case 'brownnoise':
			classes.push(jfxr.Synth.BrownNoise); break;
		default:
			classes.push(jfxr.Synth.Oscillator); break;
	}
	classes.push(jfxr.Synth.Tremolo);
	classes.push(jfxr.Synth.LowPass);
	classes.push(jfxr.Synth.HighPass);
	classes.push(jfxr.Synth.Envelope);
	classes.push(jfxr.Synth.Compress);
	classes.push(jfxr.Synth.Normalize);
	classes.push(jfxr.Synth.Amplify);

	this.transformers = [];
	for (var i = 0; i < classes.length; i++) {
		this.transformers.push(new classes[i](this.json, this.array));
	}

	this.startTime = Date.now();

	this.startSample = 0;
	this.blockSize = 44100;

	this.tick();
};

jfxr.Synth.prototype.tick = function() {
	if (!this.callback) {
		return;
	}

	var numSamples = this.array.length;
	var endSample = Math.min(numSamples, this.startSample + this.blockSize);
	for (var i = 0; i < this.transformers.length; i++) {
		this.transformers[i].run(this.json, this.array, this.startSample, endSample);
	}
	this.startSample = endSample;

	if (this.startSample == numSamples) {
		this.renderTimeMs = Date.now() - this.startTime;
		var callback = this.callback;
		this.callback = null;
		window.requestAnimationFrame(function() { callback(this.array, this.json.sampleRate); }.bind(this));
	} else {
		window.requestAnimationFrame(this.tick.bind(this));
	}
};

jfxr.Synth.prototype.isRunning = function() {
	return !!this.callback;
};

jfxr.Synth.prototype.cancel = function() {
	this.callback = null;
};

jfxr.Synth.Oscillator = function(json, array) {
	var numSamples = array.length;
	var sampleRate = json.sampleRate;

	var duration = numSamples / sampleRate;
	this.repeatFrequency = json.repeatFrequency;
	if (this.repeatFrequency < 1 / duration) {
		this.repeatFrequency = 1 / duration;
	}

	this.tone = {
		sine: jfxr.Synth.sineTone,
		triangle: jfxr.Synth.triangleTone,
		sawtooth: jfxr.Synth.sawtoothTone,
		square: jfxr.Synth.squareTone,
		tangent: jfxr.Synth.tangentTone,
		whistle: jfxr.Synth.whistleTone,
		breaker: jfxr.Synth.breakerTone,
	}[json.waveform];

	var amp = 1;
	var totalAmp = 0;
	for (var harmonicIndex = 0; harmonicIndex <= json.harmonics; harmonicIndex++) {
		totalAmp += amp;
		amp *= json.harmonicsFalloff;
	}
	this.firstHarmonicAmp = 1 / totalAmp;

	this.phase = 0;
};

jfxr.Synth.Oscillator.prototype.run = function(json, array, startSample, endSample) {
	var sampleRate = json.sampleRate;
	var frequency = json.frequency;
	var frequencySweep = json.frequencySweep;
	var frequencyDeltaSweep = json.frequencyDeltaSweep;
	var frequencyJump1Onset = json.frequencyJump1Onset;
	var frequencyJump1Amount = json.frequencyJump1Amount;
	var frequencyJump2Onset = json.frequencyJump2Onset;
	var frequencyJump2Amount = json.frequencyJump2Amount;
	var vibratoDepth = json.vibratoDepth;
	var vibratoFrequency = json.vibratoFrequency;
	var harmonics = json.harmonics;
	var harmonicsFalloff = json.harmonicsFalloff;
	var squareDuty = json.squareDuty;
	var squareDutySweep = json.squareDutySweep;

	var repeatFrequency = this.repeatFrequency;
	var firstHarmonicAmp = this.firstHarmonicAmp;
	var tone = this.tone;

	var phase = this.phase;

	for (var i = startSample; i < endSample; i++) {
		var time = i / sampleRate;
		var fractionInRepetition = jfxr.Math.frac(time * repeatFrequency);

		var currentFrequency =
			frequency +
			fractionInRepetition * frequencySweep +
			fractionInRepetition * fractionInRepetition * frequencyDeltaSweep;
		if (fractionInRepetition > frequencyJump1Onset / 100) {
			currentFrequency *= 1 + frequencyJump1Amount / 100;
		}
		if (fractionInRepetition > frequencyJump2Onset / 100) {
			currentFrequency *= 1 + frequencyJump2Amount / 100;
		}
		if (vibratoDepth != 0) {
			currentFrequency += 1 - vibratoDepth * (0.5 - 0.5 * Math.sin(2 * Math.PI * time * vibratoFrequency));
		}
		phase = jfxr.Math.frac(phase + currentFrequency / sampleRate);

		var sample = 0;
		var amp = firstHarmonicAmp;
		for (var harmonicIndex = 0; harmonicIndex <= harmonics; harmonicIndex++) {
			var harmonicPhase = jfxr.Math.frac(phase * (harmonicIndex + 1));
			sample += amp * tone(harmonicPhase, fractionInRepetition, squareDuty, squareDutySweep);
			amp *= harmonicsFalloff;
		}
		array[i] = sample;
	}

	this.phase = phase;
};

jfxr.Synth.sineTone = function(phase) {
	return Math.sin(2 * Math.PI * phase);
};

jfxr.Synth.triangleTone = function(phase) {
	if (phase < 0.25) return 4 * phase;
	if (phase < 0.75) return 2 - 4 * phase;
	return -4 + 4 * phase;
};

jfxr.Synth.sawtoothTone = function(phase) {
	return phase < 0.5 ? 2 * phase : -2 + 2 * phase;
};

jfxr.Synth.squareTone = function(phase, fractionInRepetition, squareDuty, squareDutySweep) {
	return phase < ((squareDuty + fractionInRepetition * squareDutySweep) / 100) ? 1 : -1;
};

jfxr.Synth.tangentTone = function(phase) {
	// Arbitrary cutoff value to make normalization behave.
	return jfxr.Math.clamp(-2, 2, 0.3 * Math.tan(Math.PI * phase));
};

jfxr.Synth.whistleTone = function(phase) {
	return 0.75 * Math.sin(2 * Math.PI * phase) + 0.25 * Math.sin(40 * Math.PI * phase);
};

jfxr.Synth.breakerTone = function(phase) {
	// Make sure to start at a zero crossing.
	var p = jfxr.Math.frac(phase + Math.sqrt(0.75));
	return -1 + 2 * Math.abs(1 - p*p*2);
};

jfxr.Synth.WhiteNoise = function(json, array) {
	this.random = new jfxr.Random(0x3cf78ba3);
};

jfxr.Synth.WhiteNoise.prototype.run = function(json, array, startSample, endSample) {
	var random = this.random;
	for (var i = startSample; i < endSample; i++) {
		array[i] = random.uniform(-1, 1);
	}
};

jfxr.Synth.PinkNoise = function(json, array) {
	this.random = new jfxr.Random(0x3cf78ba3);
	this.b = [0, 0, 0, 0, 0, 0, 0];
};

jfxr.Synth.PinkNoise.prototype.run = function(json, array, startSample, endSample) {
	var random = this.random;
	var b0 = this.b[0];
	var b1 = this.b[1];
	var b2 = this.b[2];
	var b3 = this.b[3];
	var b4 = this.b[4];
	var b5 = this.b[5];
	var b6 = this.b[6];

	for (var i = startSample; i < endSample; i++) {
		// Method pk3 from http://www.firstpr.com.au/dsp/pink-noise/,
		// due to Paul Kellet.
		var white = random.uniform(-1, 1);
		b0 = 0.99886 * b0 + white * 0.0555179;
		b1 = 0.99332 * b1 + white * 0.0750759;
		b2 = 0.96900 * b2 + white * 0.1538520;
		b3 = 0.86650 * b3 + white * 0.3104856;
		b4 = 0.55000 * b4 + white * 0.5329522;
		b5 = -0.7616 * b5 + white * 0.0168980;
		var sample = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) / 7;
		b6 = white * 0.115926;
		array[i] = sample;
	}

	this.b = [b0, b1, b2, b3, b4, b5, b6];
};

jfxr.Synth.BrownNoise = function(json, array) {
	this.random = new jfxr.Random(0x3cf78ba3);
	this.prevSample = 0;
};

jfxr.Synth.BrownNoise.prototype.run = function(json, array, startSample, endSample) {
	var random = this.random;

	var prevSample = this.prevSample;

	for (var i = startSample; i < endSample; i++) {
		var white = random.uniform(-1, 1);
		var sample = prevSample + 0.1 * white;
		if (sample < -1) sample = -1;
		if (sample > 1) sample = 1;
		prevSample = sample;
		array[i] = sample;
	}

	this.prevSample = prevSample;
};

jfxr.Synth.Tremolo = function(json, array) {
};

jfxr.Synth.Tremolo.prototype.run = function(json, array, startSample, endSample) {
	var sampleRate = json.sampleRate;
	var tremoloDepth = json.tremoloDepth;
	var tremoloFrequency = json.tremoloFrequency;

	if (tremoloDepth == 0) {
		return;
	}

	for (var i = startSample; i < endSample; i++) {
		var time = i / sampleRate;
		array[i] *= 1 - (tremoloDepth / 100) * (0.5 + 0.5 * Math.cos(2 * Math.PI * time * tremoloFrequency));
	}
};

jfxr.Synth.LowPass = function(json, array) {
	this.lowPassPrev = 0;
};

jfxr.Synth.LowPass.prototype.run = function(json, array, startSample, endSample) {
	var numSamples = array.length;
	var lowPassCutoff = json.lowPassCutoff;
	var lowPassCutoffSweep = json.lowPassCutoffSweep;
	var sampleRate = json.sampleRate;

	if (lowPassCutoff >= sampleRate / 2 && lowPassCutoff + lowPassCutoffSweep >= sampleRate / 2) {
		return;
	}

	var lowPassPrev = this.lowPassPrev;

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

	this.lowPassPrev = lowPassPrev;
};

jfxr.Synth.HighPass = function(json, array) {
	this.highPassPrevIn = 0;
	this.highPassPrevOut = 0;
};

jfxr.Synth.HighPass.prototype.run = function(json, array, startSample, endSample) {
	var numSamples = array.length;
	var sampleRate = json.sampleRate;
	var highPassCutoff = json.highPassCutoff;
	var highPassCutoffSweep = json.highPassCutoffSweep;

	if (highPassCutoff <= 0 && highPassCutoff + highPassCutoffSweep <= 0) {
		return;
	}

	var highPassPrevIn = this.highPassPrevIn;
	var highPassPrevOut = this.highPassPrevOut;

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

	this.highPassPrevIn = highPassPrevIn;
	this.highPassPrevOut = highPassPrevOut;
};

jfxr.Synth.Envelope = function(json, array) {
};

jfxr.Synth.Envelope.prototype.run = function(json, array, startSample, endSample) {
	var sampleRate = json.sampleRate;
	var attack = json.attack;
	var sustain = json.sustain;
	var decay = json.decay;

	if (attack == 0 && decay == 0) {
		return;
	}

	for (var i = startSample; i < endSample; i++) {
		var time = i / sampleRate;
		if (time < attack) {
			array[i] *= time / attack;
		} else if (time > attack + sustain) {
			array[i] *= 1 - (time - attack - sustain) / decay;
		}
	}
};

jfxr.Synth.Compress = function(json, array) {
};

jfxr.Synth.Compress.prototype.run = function(json, array, startSample, endSample) {
	var compression = json.compression;

	if (compression == 1) {
		return;
	}

	for (var i = startSample; i < endSample; i++) {
		var sample = array[i];
		if (sample >= 0) {
			sample = Math.pow(sample, compression);
		} else {
			sample = -Math.pow(-sample, compression);
		}
		array[i] = sample;
	}
};

jfxr.Synth.Normalize = function(json, array) {
	this.maxSample = 0;
};

jfxr.Synth.Normalize.prototype.run = function(json, array, startSample, endSample) {
	if (!json.normalization) {
		return;
	}

	var maxSample = this.maxSample;
	for (var i = startSample; i < endSample; i++) {
		maxSample = Math.max(maxSample, Math.abs(array[i]));
	}
	this.maxSample = maxSample;

	var numSamples = array.length;
	if (endSample == numSamples) {
		var factor = 1 / maxSample;
		for (var i = 0; i < numSamples; i++) {
			array[i] *= factor;
		}
	}
};

jfxr.Synth.Amplify = function(json, array) {
};

jfxr.Synth.Amplify.prototype.run = function(json, array, startSample, endSample) {
	var factor = json.amplification / 100;

	if (factor == 1) {
		return;
	}

	for (var i = startSample; i < endSample; i++) {
		array[i] *= factor;
	}
};
