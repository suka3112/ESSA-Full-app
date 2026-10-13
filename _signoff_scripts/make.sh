#!/bin/bash
# make.sh <section>  -> run_<section>.js  (lib + section body wrapped as a Playwright function)
s="$1"; { echo "async (page) => {"; cat lib.js; echo "try {"; cat "sec_$s.js"; echo "} catch (e) { log.push('ERROR: ' + e.message) }"; echo "await ctx2.close(); return log.join('\n');"; echo "}"; } > "run_$s.js"
