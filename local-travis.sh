#!/bin/bash
BUILDID="build-$RANDOM"
# INSTANCE="travisci/ci-garnet:packer-1512502276-986baf0"
# INSTANCE="travis-ci-sardonyx-xenial-1553530528-f909ac5"
INSTANCE="travisci/ci-ubuntu-1804:packer-1566551110-e45a2919"
# INSTANCE="travisci/ubuntu-ruby:18.04"
docker run --name $BUILDID -dit $INSTANCE /sbin/init
# docker run -it -v "$PWD:/travis" $BUILDID /bin/bash
# docker exec $BUILDID /home/ar/xud/local-steps.sh
docker cp /home/ar/xud $BUILDID:/home/travis/builds
docker exec -it $BUILDID bash -l
