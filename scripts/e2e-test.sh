#!/bin/bash
set -e # bail on errors

SRC_PATH=$1
CUSTOM_COMMAND="${2:-yarn test}"
GATSBY_PATH="${CIRCLE_WORKING_DIRECTORY:-../../}"
TMP_LOCATION=$(mktemp -d);

# cypress docker does not support sudo and does not need it, but the default node executor does
command -v gatsby-dev || command -v sudo && (sudo npm install -g gatsby-dev-cli@next) || npm install -g gatsby-dev-cli@next

echo "Copy $SRC_PATH into $TMP_LOCATION to isolate test"
cp -Rv $SRC_PATH/** $TMP_LOCATION

# setting up child integration test link to gatsby packages
cd "$TMP_LOCATION"
gatsby-dev --set-path-to-repo "$GATSBY_PATH"
gatsby-dev --force-install --scan-once  # install _all_ files in gatsby/packages
if test -f "./node_modules/.bin/gatsby"; then
  chmod +x ./node_modules/.bin/gatsby # this is sometimes necessary to ensure executable
  echo "Gatsby bin chmoded"
else
  echo "Gatsby bin doesn't exist. Skipping chmod."
fi
sh -c "$CUSTOM_COMMAND"
echo "e2e test run succeeded"
