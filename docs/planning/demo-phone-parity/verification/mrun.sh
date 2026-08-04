#!/bin/bash
# mrun.sh <flowfile> -- run a maestro flow against the booted sim
export JAVA_HOME=/opt/homebrew/opt/openjdk
export PATH="$JAVA_HOME/bin:$HOME/.maestro/bin:$PATH"
maestro test "$1" 2>&1 | grep -vE "^\s*$" | tail -25
