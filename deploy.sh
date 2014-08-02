#!/bin/bash

rsync -rv --delete --exclude=.* . thomas@frozenfractal.com:/var/www/jfxr.frozenfractal.com/
