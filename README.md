JFXR
====

Jfxr is a browser-based tool to generate sound effects, for example for use in
games. It was inspired by [bfxr](http://www.bfxr.net/), but aims to be more
powerful and more intuitive to use.

Status
------

Ready for use. Compared to bfxr, the only missing feature is the mixer (which
mixes multiple generated sounds together). Some filters also have a slightly
different meaning, most notably the bit crunch, which is a real bit crunch
rather than a downsample.

Developing
----------

Clone the repository and open `index.html` locally in your browser. This should
just work.

To produce production assets (minified JavaScript, CSS and images), you need
node.js installed. To run the Grunt tasks, you also need the `grunt`
command-line tool; if you don't have it:

    sudo npm install -g grunt-cli

To install the dependencies of the packaging system, just run:

    npm install

Finally, to build production assets:

    grunt

This produces output in the `dist` directory, which can be used locally or
copied to a webserver.

License
-------

Three-clause BSD license; see LICENSE for details.
