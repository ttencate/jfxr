export var localStorage = [function() {
  var LocalStorage = function() {
    this.data = window.localStorage || {};
  };

  LocalStorage.prototype.get = function(key, defaultValue) {
    var json = this.data[key];
    if (json === undefined) {
      return defaultValue;
    }
    return JSON.parse(json);
  };

  LocalStorage.prototype.set = function(key, value) {
    this.data[key] = JSON.stringify(value);
  };

  LocalStorage.prototype.delete = function(key) {
    this.data.removeItem(key);
  };

  return new LocalStorage();
}];
