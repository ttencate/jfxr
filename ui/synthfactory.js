jfxrApp.service('synthFactory', ['$q', '$timeout', function($q, $timeout) {
  return function(str) {
    return new jfxr.PromiseSynth(str, $timeout, $q);
  };
}]);

jfxr.PromiseSynth = function(str, $timeout, $q) {
  jfxr.Synth.call(this, str, $timeout);
  this.$q = $q;
};
jfxr.PromiseSynth.prototype = Object.create(jfxr.Synth.prototype);

jfxr.PromiseSynth.prototype.run = function() {
  if (this.deferred) {
    return this.deferred.promise;
  }
  this.deferred = this.$q.defer();
  var doneCallback = this.deferred.resolve.bind(this.deferred);
  jfxr.Synth.prototype.run.call(this, doneCallback);
  return this.deferred.promise;
};

jfxr.PromiseSynth.prototype.cancel = function() {
  if (!this.deferred) {
    return;
  }
  jfxr.Synth.prototype.cancel.call(this);
  this.deferred.reject();
  this.deferred = null;
};
