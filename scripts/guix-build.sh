#!/usr/bin/env bash
set -e

guix shell -CFN -e '(list (@@ (gnu packages commencement) gcc) "lib")' coreutils bash cmake make python-wrapper pkgconf zlib zip git nss-certs tar xz bzip2 sed -- env C{,PLUS}_INCLUDE_PATH= scripts/build.sh
