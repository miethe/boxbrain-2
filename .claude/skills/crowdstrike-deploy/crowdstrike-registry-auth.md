# CrowdStrike Registry Authentication

Token exchange flow for pulling sensor images directly from `registry.crowdstrike.com`.
Use this when Harbor is unavailable or you need a newer sensor version.

## Prerequisites

- CrowdStrike API credentials: `CLIENT_ID` and `CLIENT_SECRET`
- `curl`, `jq`

## Token Exchange

```bash
export CLIENT_ID="<your_client_id>"
export CLIENT_SECRET="<your_client_secret>"
export CID="20709802E00E4B4C9442CE5F8CA3E69D-9C"
export CID_LOWER=$(echo "${CID}" | cut -d'-' -f1 | tr '[:upper:]' '[:lower:]')
export ART_USERNAME="fc-${CID_LOWER}"

# 1. Get API bearer token
export BEARER=$(curl -s -X POST https://api.crowdstrike.com/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}" \
  | jq -cr '.access_token | values')

# 2. Get registry password
export ART_PASSWORD=$(curl -s -X GET \
  -H "Authorization: Bearer ${BEARER}" \
  "https://api.crowdstrike.com/container-security/entities/image-registry-credentials/v1" \
  | jq -cr '.resources[].token | values')

# 3. Get registry bearer token
export REGISTRY_BEARER=$(curl -s \
  -u "${ART_USERNAME}:${ART_PASSWORD}" \
  "https://registry.crowdstrike.com/v2/token?=${ART_USERNAME}&scope=repository:falcon-sensor/release/falcon-sensor:pull&service=registry.crowdstrike.com" \
  | jq -r '.token')
```

## List Available Versions

```bash
curl -s \
  -H "Authorization: Bearer ${REGISTRY_BEARER}" \
  "https://registry.crowdstrike.com/v2/falcon-sensor/release/falcon-sensor/tags/list" | jq -r '.tags[]'
```

Not all versions are compliant. Check the IBM CrowdStrike Sensor Status page for approved versions.

## Build Pull Secret for Helm

```bash
PARTIAL=$(printf "%s:%s" "${ART_USERNAME}" "${ART_PASSWORD}" | base64 -w 0)
PULL_TOKEN=$(printf '{"auths":{"registry.crowdstrike.com":{"auth":"%s"}}}' "${PARTIAL}" | base64 | tr -d '\n')
```

Then pass `--set node.image.registryConfigJSON="${PULL_TOKEN}"` to `helm upgrade --install`, with:
```
--set node.image.repository="registry.crowdstrike.com/falcon-sensor/release/falcon-sensor"
```
