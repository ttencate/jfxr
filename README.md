Jfxr is a browser-based tool to generate sound effects, for example for use in
games. It was inspired by [bfxr](http://www.bfxr.net/), but aims to be more
powerful and more intuitive to use.

**Start using it right now at
[jfxr.frozenfractal.com](http://jfxr.frozenfractal.com).**

FAQ
---

### Can I use these sounds commercially?

Yes! Any sound you create with jfxr is entirely yours, and you are free to use
it in any way you like, including commercial projects. If your project is
commercially successful, I would really appreciate a donation (see below).

### Is attribution required?

Attribution is not required, but I would really appreciate if you could link
back to jfxr in some way. I would also be delighted if you send me a link to
your creation!

### Can I send you money?

Thanks for asking! If you want to express your appreciation for this project,
you can send donations via the in-app donation button or [this PayPal link](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=ttencate%40gmail%2ecom&lc=US&item_name=jfxr&currency_code=EUR&bn=PP%2dDonationsBF%3abtn_donate_LG%2egif%3aNonHosted).

### How does it compare to sfxr/bfxr?

Compared to [bfxr](http://www.bfxr.net/), the only missing feature is the mixer
(which mixes multiple generated sounds together). There is [an open
issue](https://github.com/ttencate/jfxr/issues/11) to address that. Some
filters also have a slightly different meaning, most notably the bit crunch,
which is a real bit crunch rather than a downsample.

### What are the system requirements?

Jfxr has been tested on the latest Chrome and Firefox, on Linux and OS X. In
other modern browsers, I guarantee that the sliders will look broken, but
hopefully everything else will still work.

Reporting bugs
--------------

Please report any issues you find to the [issue tracker on
GitHub](https://github.com/ttencate/jfxr/issues).

Technical details
-----------------

Jfxr uses [Angular.js](https://angularjs.org/) for its UI and module dependency
management. It relies on several modern web technologies: WebAudio, canvas2d,
local storage and of course CSS3.

Developing
----------

To assemble the JavaScript files into a runnable whole, you need Node.js
installed.

To install the development dependencies, run:

    npm install

Then, to build the app:

    npm run build

This produces output in the `app/dist` directory, which can be used locally or
copied to a webserver.

License
-------

The code itself is under a three-clause BSD license; see LICENSE for details.

Any sound effects you make are entirely yours to do with as you please, without
any restrictions whatsoever.
