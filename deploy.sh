#!/bin/bash

rsync -rv --delete --exclude=.* dist/ thomas@frozenfractal.com:/var/www/jfxr.frozenfractal.com/
