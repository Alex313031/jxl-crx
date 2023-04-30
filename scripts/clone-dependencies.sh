#!/usr/bin/env bash
set -e

rm -rf emsdk libjxl

git clone https://github.com/emscripten-core/emsdk
(cd emsdk && git reset --hard dd8bbe5e8234f5db9692b5f107a14bfce3fcef34)

git clone --recursive https://github.com/libjxl/libjxl
(cd libjxl && git reset --hard 79946c2e12cc3e1e018a8411c75c32e02546baf8)
