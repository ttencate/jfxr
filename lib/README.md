jfxr
====

This library is the core of the [jfxr](https://jfxr.frozenfractal.com) sound
effects generator. jfxr generates sounds from a small JSON object containing
parameters like pitch, duration and effects.

The library was developed only for running in the browser, but it can be made
to work in a Node.js environment as well. If you need that, please [file an
issue](https://github.com/ttencate/jfxr/issues).

Installation
------------

The module is built using UMD, so it should work with AMD, CommonJS, or as a
browser global. Use one of these approaches:

* To use it in the browser without any module system, you can use
  the minified bundle `dist/jfxr.min.js`, and include it via a `<script>` tag:

        <script src="jfxr.js"></script>

  This will expose the API on the global `jfxr` object.

* If you want to use it as a proper module:

        npm install --save jfxr

  Then import it and use it using one of:

        var jfxr = require('jfxr');  // Node.js syntax (CommonJS)
        import jfxr from 'jfxr';     // ES2015 module syntax

Example
-------

This shows how you might run the synthesizer, and then play the resulting sound
effect using the `AudioContext` API.

    var AudioContext = new AudioContext();

    var synth = new jfxr.Synth(mySound);

    synth.run(function(clip) {
      var buffer = context.createBuffer(1, clip.array.length, clip.sampleRate);
      buffer.getChannelData(0).set(clip.toFloat32Array());
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
  callback is invoked with a single parameter, `clip`, which is a `Clip`
  object.

* `synth.cancel()` cancels any in-progress synthesis.

### `Clip`

The `Clip` class represents a rendered sound effect. It's just a wrapper around
an array of samples.

* `clip.getNumSamples()` returns the number of audio samples in the clip.

* `clip.getSampleRate()` returns the sample rate in Hertz, typically 44100.

* `clip.toFloat32Array()` returns a `Float32Array` containing the generated
  samples (mono). Usually the values will be between -1 and 1.

* `clip.toWavBytes()` returns a `Uint8Array` containing the raw bytes of a WAV
  file, encoded in 16-bits PCM.
