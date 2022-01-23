#!/usr/bin/env bash
#
# Common functions for s3-bash4 commands
# (c) 2015 Chi Vinh Le <cvl@winged.kiwi>

# Constants
readonly VERSION="0.0.2"

# Exit codes
readonly INVALID_USAGE_EXIT_CODE=1
readonly INVALID_USER_DATA_EXIT_CODE=2
readonly INVALID_ENVIRONMENT_EXIT_CODE=3

##
# Write error to stderr
# Arguments:
#   $1 string to output
##
err() {
  echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] Error: $@" >&2
}


##
# Display version and exit
##
showVersionAndExit() {
  printf "$VERSION\n"
  exit
}

##
# Helper for parsing the command line.
##
assertArgument() {
  if [[ $# -lt 2 ]]; then
    err "Option $1 needs an argument."
    exit $INVALID_USAGE_EXIT_CODE
  fi
}

##
# Asserts given resource path
# Arguments:
#   $1 string resource path
##
assertResourcePath() {
  if [[ $1 =~ !(/*) ]]; then
    err "Resource should start with / e.g. /bucket/file.ext"
    exit $INVALID_USAGE_EXIT_CODE
  fi
}

##
# Asserts given file exists.
# Arguments:
#   $1 string file path
##
assertFileExists() {
  if [[ ! -f $1 ]]; then
    err "$1 file doesn't exists"
    exit $INVALID_USER_DATA_EXIT_CODE
  fi
}

##
# Check for valid environment. Exit if invalid.
##
checkEnvironment()
{
  programs=(openssl curl printf echo sed awk od date pwd dirname)
  for program in "${programs[@]}"; do
    if [ ! -x "$(which $program)" ]; then
      err "$program is required to run"
      exit $INVALID_ENVIRONMENT_EXIT_CODE
    fi
  done
  if [ ! -x "$(which sha256sum)" ]; then
    if [ ! -x "$(which shasum)" ]; then
      err "sha256sum or shasum is required to run"
      exit $INVALID_ENVIRONMENT_EXIT_CODE
    else
      SHACMD="shasum -a 256 "
    fi
  else
    SHACMD="sha256sum "
  fi
}

##
# Reads, validates and return aws secret stored in a file
# Arguments:
#   $1 path to secret file
# Output:
#   string AWS secret
##
processAWSSecretFile() {
  local errStr="The Amazon AWS secret key must be 40 bytes long. Make sure that there is no carriage return at the end of line."
  if ! [[ -f $1 ]]; then
    err "The file $1 does not exist."
    exit $INVALID_USER_DATA_EXIT_CODE
  fi

  # limit file size to max 41 characters. 40 + potential null terminating character.
  local fileSize="$(ls -l "$1" | awk '{ print $5 }')"
  if [[ $fileSize -gt 41 ]]; then
    err $errStr
    exit $INVALID_USER_DATA_EXIT_CODE
  fi

  secret=$(<$1)
  # exact string size should be 40.
  if [[ ${#secret} != 40 ]]; then
    err $errStr
    exit $INVALID_USER_DATA_EXIT_CODE
  fi
  echo $secret
}

##
# Calculate sha256 hash
# Arguments:
#   $1 string to hash
# Returns:
#   string hash
##
sha256Hash() {
  local output=$(printf "$1" | $SHACMD)
  echo "${output%% *}"
}

##
# Calculate sha256 hash of file
# Arguments:
#   $1 file path
# Returns:
#   string hash
##
sha256HashFile() {
  local output=$($SHACMD $1)
  echo "${output%% *}"
}

##
# Generate HMAC signature using SHA256
# Arguments:
#   $1 signing key in hex
#   $2 string data to sign
# Returns:
#   string signature
##
hmac_sha256() {
  printf "${2}" | openssl dgst -binary -hex -sha256 -mac HMAC -macopt "${1}" | sed 's/^.* //'
}

##
# Sign data using AWS Signature Version 4
# Arguments:
#   $1 AWS Secret Access Key
#   $2 yyyymmdd
#   $3 AWS Region
#   $4 AWS Service
#   $5 string data to sign
# Returns:
#   signature
# Source:
#   https://gist.github.com/mmaday/c82743b1683ce4d27bfa6615b3ba2332
##
sign() {
  local kSigning=$5
  local dateKey=$(hmac_sha256 key:"AWS4${1}" "${2}")
  local regionKey=$(hmac_sha256 hexkey:"${dateKey}" "${3}")
  local serviceKey=$(hmac_sha256 hexkey:"${regionKey}" "${4}")
  local signingKey=$(hmac_sha256 hexkey:"${serviceKey}" "aws4_request")

  printf "${kSigning}" | openssl dgst -sha256 -mac HMAC -macopt hexkey:"${signingKey}" | sed 's/(stdin)= //'
}

##
# Get endpoint of specified region
# Arguments:
#   $1 region
# Returns:
#   amazon andpoint
##
convS3RegionToEndpoint() {
  case "$1" in
    us-east-1) echo "s3.amazonaws.com"
      ;;
    *) echo s3.${1}.amazonaws.com
      ;;
    esac
}

##
# Perform request to S3
# Uses the following Globals:
#   METHOD                string
#   AWS_ACCESS_KEY_ID     string
#   AWS_SECRET_ACCESS_KEY string
#   AWS_REGION            string
#   RESOURCE_PATH         string
#   FILE_TO_UPLOAD        string
#   CONTENT_TYPE          string
#   PUBLISH               bool
#   DEBUG                 bool
#   VERBOSE               bool
#   INSECURE              bool
##
performRequest() {
  local isoTimestamp=${isoTimestamp-$(date -u +"%Y%m%dT%H%M%SZ")}
  local dateScope=${dateScope-$(date -u +"%Y%m%d")}
  local host=$(convS3RegionToEndpoint "${AWS_REGION}")

  # Generate payload hash
  if [[ $METHOD == "PUT" ]]; then
    local payloadHash=$(sha256HashFile $FILE_TO_UPLOAD)
  else
    local payloadHash=$(sha256Hash "")
  fi

  local cmd=("curl")
  local headers=
  local headerList=

  if [[ ${DEBUG} != true ]]; then
    cmd+=("--fail")
  fi

  if [[ ${VERBOSE} == true ]]; then
    cmd+=("--verbose")
  fi

  if [[ ${METHOD} == "PUT" ]]; then
    cmd+=("-T" "${FILE_TO_UPLOAD}")
  fi
  cmd+=("-X" "${METHOD}")

  if [[ ${METHOD} == "PUT" && ! -z "${CONTENT_TYPE}" ]]; then
    cmd+=("-H" "Content-Type: ${CONTENT_TYPE}")
    headers+="content-type:${CONTENT_TYPE}\n"
    headerList+="content-type;"
  fi

  cmd+=("-H" "Host: ${host}")
  headers+="host:${host}\n"
  headerList+="host;"

  if [[ ${METHOD} == "PUT" && "${PUBLISH}" == true ]]; then
    cmd+=("-H" "x-amz-acl: public-read")
    headers+="x-amz-acl:public-read\n"
    headerList+="x-amz-acl;"
  fi

  cmd+=("-H" "x-amz-content-sha256: ${payloadHash}")
  headers+="x-amz-content-sha256:${payloadHash}\n"
  headerList+="x-amz-content-sha256;"

  cmd+=("-H" "x-amz-date: ${isoTimestamp}")
  headers+="x-amz-date:${isoTimestamp}"
  headerList+="x-amz-date"

  if [[ -n "${AWS_SECURITY_TOKEN}" ]]; then
    cmd+=("-H" "x-amz-security-token: ${AWS_SECURITY_TOKEN}")
    headers+="\nx-amz-security-token:${AWS_SECURITY_TOKEN}"
    headerList+=";x-amz-security-token"
  fi

  # Generate canonical request
  local canonicalRequest="${METHOD}
${RESOURCE_PATH}

${headers}

${headerList}
${payloadHash}"

  # Generated request hash
  local hashedRequest=$(sha256Hash "${canonicalRequest}")

  # Generate signing data
  local stringToSign="AWS4-HMAC-SHA256
${isoTimestamp}
${dateScope}/${AWS_REGION}/s3/aws4_request
${hashedRequest}"

  # Sign data
  local signature=$(sign "${AWS_SECRET_ACCESS_KEY}" "${dateScope}" "${AWS_REGION}" \
                   "s3" "${stringToSign}")

  local authorizationHeader="AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/${dateScope}/${AWS_REGION}/s3/aws4_request, SignedHeaders=${headerList}, Signature=${signature}"
  cmd+=("-H" "Authorization: ${authorizationHeader}")

  local protocol="https"
  if [[ $INSECURE == true ]]; then
    protocol="http"
  fi
  cmd+=("${protocol}://${host}${RESOURCE_PATH}")

  # Curl
  "${cmd[@]}"
}
