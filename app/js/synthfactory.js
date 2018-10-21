import { Synth } from '../../lib';

export var synthFactory = ['$q', '$timeout', function($q, $timeout) {
  return function(str) {
    return new PromiseSynth(str, $timeout, $q);
  };
}];

var PromiseSynth = function(str, $timeout, $q) {
  Synth.call(this, str, $timeout);
  this.$q = $q;
};
PromiseSynth.prototype = Object.create(Synth.prototype);

PromiseSynth.prototype.run = function() {
  if (this.deferred) {
    return this.deferred.promise;
  }
  this.deferred = this.$q.defer();
  var doneCallback = this.deferred.resolve.bind(this.deferred);
  Synth.prototype.run.call(this, doneCallback);
  return this.deferred.promise;
};

PromiseSynth.prototype.cancel = function() {
  if (!this.deferred) {
    return;
  }
  Synth.prototype.cancel.call(this);
  this.deferred.reject();
  this.deferred = null;
};
