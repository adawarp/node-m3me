#!/bin/sh

cp $1 ./sdk/
cd ./sdk/
./install-meme-lib.sh
mvn install
mvn compile
