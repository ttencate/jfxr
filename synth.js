jfxr.Synth = function(context, $q, $rootScope) {
	this.context = context;
	this.$q = $q;
	this.$rootScope = $rootScope;

	this.renderTimeMs = null;

	this.useWebWorkers = jfxr.shims.haveWebWorkers();
};

jfxr.Synth.prototype.synth = function(str, finishedCallback) {
	var deferred = this.$q.defer();

	if (this.useWebWorkers) {
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}

		this.worker = new Worker('worker.js');
		this.worker.addEventListener('message', function(e) {
			this.$rootScope.$apply(function() {
				if (e.error) {
					deferred.reject(e.error);
				} else {
					deferred.resolve(e.data);
				}
			}.bind(this));
		}.bind(this));
		this.worker.postMessage(str);
	} else {
		var msg = jfxr.Worker.generate(str);
		deferred.resolve(msg);
	}

	return deferred.promise.then(function(msg) {
		this.worker = null;
		this.renderTimeMs = msg.renderTimeMs;
		var array = new Float32Array(msg.arrayBuffer);
		var buffer = this.context.createBuffer(1, array.length, msg.sampleRate);
		buffer.getChannelData(0).set(array);
		return buffer;
	}.bind(this), function(error) {
		console.error('Synth failed: ' + error);
		return null;
	});
};

jfxrApp.service('synth', jfxr.Synth);
