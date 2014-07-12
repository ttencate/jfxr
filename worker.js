// COPY PASTE
// TODO clean this up

var jfxr = jfxr || {};

Math.sign = function(x) {
    if (+x === x) { // check if a number was given
        return (x === 0) ? x : (x > 0) ? 1 : -1;
    }
    return NaN;
};

Math.frac = function(x) {
	return x - Math.floor(x);
};

Math.clamp = function(min, max, x) {
	if (x < min) return min;
	if (x > max) return max;
	return x;
};

// A fast, but not crytographically strong xorshift PRNG, to make up for
// the lack of a seedable random number generator in JavaScript.
// If seed is 0 or undefined, the current time is used.
jfxr.Random = function(seed) {
	if (!seed) seed = Date.now();
	this.x = seed & 0xffffffff;
	this.y = 362436069;
	this.z = 521288629;
	this.w = 88675123;
	// Mix it up, because some bits of the current Unix time are quite predictable.
	for (var i = 0; i < 32; i++) this.uint32();
};

jfxr.Random.prototype.uint32 = function() {
	var t = this.x ^ ((this.x << 11) & 0xffffffff);
	this.x = this.y;
	this.y = this.z;
	this.z = this.w;
	this.w = (this.w ^ (this.w >>> 19) ^ (t ^ (t >>> 8)));
	return this.w + 0x80000000;
};

jfxr.Random.prototype.uniform = function(min, max) {
	if (max == undefined) {
		max = min;
		min = 0;
	}
	if (min == undefined) {
		min = 0;
	}
	return min + (max - min) * this.uint32() / 0xffffffff;
};
// END COPY PASTE

this.addEventListener('message', function(e) {
	var str = e.data;
	var msg = run(str);
	this.postMessage(msg, [msg.arrayBuffer]);
});

function run(str) {
	var startTime = Date.now();

	var json = JSON.parse(str);

	var sampleRate = json.sampleRate;
	var waveform = json.waveform;
	var frequency = json.frequency;
	var frequencySlide = json.frequencySlide;
	var frequencyDeltaSlide = json.frequencyDeltaSlide;
	var vibratoDepth = json.vibratoDepth;
	var vibratoFrequency = json.vibratoFrequency;
	var squareDuty = json.squareDuty;
	var squareDutySweep = json.squareDutySweep;
	var attack = json.attack;
	var sustain = json.sustain;
	var decay = json.decay;
	var tremoloDepth = json.tremoloDepth;
	var tremoloFrequency = json.tremoloFrequency;
	var harmonics = json.harmonics;
	var harmonicsFalloff = json.harmonicsFalloff;
	var lowPassCutoff = json.lowPassCutoff;
	var lowPassCutoffSweep = json.lowPassCutoffSweep;
	var highPassCutoff = json.highPassCutoff;
	var highPassCutoffSweep = json.highPassCutoffSweep;
	var compression = json.compression;
	var normalization = json.normalization;

	var numSamples = Math.max(1, Math.ceil(sampleRate * (attack + sustain + decay)));
	var array = new Float32Array(numSamples);

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

		array[i] = sample;
		maxSample = Math.max(maxSample, Math.abs(sample));
	}

	// TODO re-enable once we have a way to specify absolute amplification as an alternative
	var amplification = normalization / 100 / maxSample;
	for (var i = 0; i < numSamples; i++) {
		// array[i] *= amplification;
	}

	var renderTimeMs = Date.now() - startTime;

	return {
		arrayBuffer: array.buffer,
		sampleRate: sampleRate,
		renderTimeMs: renderTimeMs,
	};
};
