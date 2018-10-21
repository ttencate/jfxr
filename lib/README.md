jfxr
====

This library is the core of the [jfxr](https://jfxr.frozenfractal.com) sound
effects generator. jfxr generates sounds from a small JSON object containing
parameters like pitch, duration and effects.

The library was developed only for running in the browser, but it might work in
a Node.js environment as well.

Installation
------------

The module is built using UMD, so it should work with AMD, CommonJS, or as a
browser global. Use one of these approaches:

* To use it in the browser without any module system, you can just copy
  `jfxr.js`, include it via a `<script>` tag:

        <script src="jfxr.js"></script>

  This will expose the API on the global `jfxr` object.

* If you want to use it as a proper module:

        npm install --save jfxr

  Then import it and use it using one of:

        var jfxr = require('jfxr');  // Node.js syntax
        import jfxr from 'jfxr';     // ES2015 module syntax

Example
-------

This shows how you might run the synthesizer, and then play the resulting sound
effect using the `AudioContext` API.

    var AudioContext = new AudioContext();

    var synth = new jfxr.Synth(mySound);

    synth.run(function(result) {
      var buffer = context.createBuffer(1, result.array.length, result.sampleRate);
      buffer.getChannelData(0).set(result.array);
      context.resume().then(function() {
        var source = context.createBufferSource();
        source.buffer = buffer;
        source.start(0);
      });
    });

API
---

### `Synth`

The `Synth` class is what produces the sound. Its interface is very simple:

* `new Synth(str)` creates a new synth object which can render the sound
  described by the string `str`. This must be a valid JSON string as saved from
  the jfxr app (the contents of a `.jfxr` file).

* `synth.run(callback)` starts synthesis asynchronously. When complete, the
  callback is invoked with a single parameter, `result`. This is an object with
  the following properties:

    * `result.array` is a `Float32Array` containing the generated samples
      (mono). Usually the values will be between -1 and 1.
    * `result.sampleRate` is the sample rate, in Hertz, typically 44100.

* `synth.cancel()` cancels any in-progress synthesis.
