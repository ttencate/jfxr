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
  if (min === undefined && max === undefined) {
    min = 0;
    max = 1;
  } else if (max === undefined) {
    max = min;
    min = 0;
  }
  return min + (max - min) * this.uint32() / 0xffffffff;
};

jfxr.Random.prototype.int = function(min, max) {
  return Math.floor(this.uniform(min, max));
};

jfxr.Random.prototype.boolean = function(trueProbability) {
  return this.uniform() < trueProbability;
};

jfxr.Random.prototype.fromArray = function(array) {
  return array[this.int(array.length)];
};
