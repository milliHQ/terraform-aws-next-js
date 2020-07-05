#!/bin/bash

SOURCE=$1
OUTPUT_PATH=$2

mkdir -p "$(dirname "${OUTPUT_PATH}")";
wget -q ${SOURCE} -O ${OUTPUT_PATH};

# https://stackoverflow.com/a/39122532/831465
if [[ $? -ne 0 ]]; then
  >&2 echo "Failed to download ${SOURCE}"
  exit 1;
fi

echo "{\"output\":\"${OUTPUT_PATH}\"}";
