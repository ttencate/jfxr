jfxr.Synth = function(context, $q, $rootScope) {
	this.context = context;
	this.$q = $q;

	this.promise = null;

	this.renderTimeMs = null;

	this.worker = new Worker('worker.js');
	this.worker.addEventListener('message', function(e) {
		$rootScope.$apply(function() {
			var deferred = this.deferred;
			this.deferred = null;
			deferred.resolve(e.data);
		}.bind(this));
	}.bind(this));
};

jfxr.Synth.prototype.synth = function(str, finishedCallback) {
	// TODO: handle the case where the worker is already working
	this.deferred = this.$q.defer();
	this.worker.postMessage(str);
	return this.deferred.promise.then(function(msg) {
		this.renderTimeMs = msg.renderTimeMs;
		var array = new Float32Array(msg.arrayBuffer);
		var buffer = this.context.createBuffer(1, array.length, msg.sampleRate);
		buffer.getChannelData(0).set(array);
		return buffer;
	}.bind(this));
};

jfxr.Synth.prototype.computeNumSamples = function(json) {
	return Math.max(1, Math.ceil(json.sampleRate * (json.attack + json.sustain + json.decay)));
};

jfxrApp.service('synth', jfxr.Synth);
