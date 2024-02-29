#!/usr/bin/env bash
set -e

rm -rf emsdk libjxl

git clone https://github.com/emscripten-core/emsdk
(cd emsdk && git reset --hard 9347bc393b94a17b93450bbc98bc3f66cef2aeb0)

git clone --recursive https://github.com/libjxl/libjxl
(cd libjxl && git reset --hard c51cffd7587d27fdd73f0be856db3b730314f03c)
