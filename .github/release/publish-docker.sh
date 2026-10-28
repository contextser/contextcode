#!/usr/bin/env bash
# publish-docker.sh <build-docker dir>: pushes the multi-arch OCI image to ghcr.io/contextser/contextcode:<version>
# without building anything (GH_TOKEN with packages: write).
. "$(dirname "$0")/lib.sh"

image="$1/contextcode-image.tar"
skopeo inspect --raw "oci-archive:$image" | jq .
if dry_run; then exit 0; fi
printf '%s' "$GH_TOKEN" | skopeo login ghcr.io --username "$GITHUB_ACTOR" --password-stdin
skopeo copy --all "oci-archive:$image" "docker://ghcr.io/contextser/contextcode:$CONTEXTCODE_VERSION"
