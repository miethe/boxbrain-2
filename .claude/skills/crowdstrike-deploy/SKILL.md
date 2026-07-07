---
name: crowdstrike-deploy
description: Deploy CrowdStrike Falcon sensor on IBM-managed Linux hosts. Covers standalone RPM install on VMs and Helm DaemonSet on Kubernetes. Use when installing, configuring, or verifying CrowdStrike on any IBM Consulting host.
version: 1.0.0
---

# CrowdStrike Falcon Sensor Deployment

Deploy and configure CrowdStrike Falcon sensor on IBM-managed infrastructure.

## When to Use

- Installing CrowdStrike Falcon sensor on a new host
- Deciding between standalone (VM) vs DaemonSet (K8s) deployment
- Configuring CID, grouping tags, or trace level
- Verifying sensor registration and AID
- Upgrading or reinstalling the sensor

## Deployment Decision

| Infrastructure | Method | Image/Package |
|----------------|--------|---------------|
| Bare VM / EC2 / any non-K8s host | **Standalone RPM/DEB** | `.rpm` or `.deb` installer |
| Kubernetes cluster | **Helm DaemonSet** | Container image from Harbor or CrowdStrike registry |
| Single host running Docker Compose | **Standalone RPM/DEB** | The Harbor container image is NOT usable here |

The Helm DaemonSet requires a Kubernetes control plane (kubectl, helm). It deploys a privileged DaemonSet pod per node. If the host is a plain VM running containers via Docker/Podman Compose (no K8s), use the standalone RPM install.

## IBM Configuration Values

```yaml
falcon:
  cid: 20709802E00E4B4C9442CE5F8CA3E69D-9C
  tags: UT/10J00,CCODE/IBM_Consulting_ITSS,UPDATES/PROD,AV/YES,OWNER/655881897
  trace: none
```

Tag format: `UT/<unit>,CCODE/<charge_code>,UPDATES/<channel>,AV/<yes|no>,OWNER/<serial>`

Adjust `UT`, `CCODE`, and `OWNER` per engagement. `UPDATES/PROD` and `AV/YES` are standard.

### Harbor Image (for K8s DaemonSet only)

```
harbor.boxops.boxboat.io/crowdstrike/falcon-sensor/falcon-sensor:7.30.0-18306-1.falcon-linux.Release.US-1
```

This is an older image pinned until Jenkins pipeline is fixed for newer builds.

---

## Standalone Linux Install (VM / EC2)

### Prerequisites

- SSH access with sudo privileges
- Falcon sensor RPM (RHEL/AL2023/CentOS) or DEB (Ubuntu/Debian)
- GPG signing key: `Falcon_Linux_Sensor_RPM_Signing_GPG_Key_2025.gpg`
- Both available from EDR Tools Download site or internal artifact store

### Procedure

**1. Copy files to host**

```bash
scp -P <PORT> -i <KEY> \
  <sensor>.rpm \
  Falcon_Linux_Sensor_RPM_Signing_GPG_Key_2025.gpg \
  <user>@<host>:~/
```

**2. Import GPG key and install**

RHEL / Amazon Linux / CentOS:
```bash
sudo rpm --import ~/Falcon_Linux_Sensor_RPM_Signing_GPG_Key_2025.gpg
sudo dnf install -y ~/<sensor>.rpm
```

Ubuntu / Debian:
```bash
sudo dpkg -i ~/<sensor>.deb
```

SLES:
```bash
sudo zypper install ~/<sensor>.rpm
```

**3. Configure sensor**

```bash
sudo /opt/CrowdStrike/falconctl -s --cid=20709802E00E4B4C9442CE5F8CA3E69D-9C
sudo /opt/CrowdStrike/falconctl -s --tags="UT/10J00,CCODE/IBM_Consulting_ITSS,UPDATES/PROD,AV/YES,OWNER/655881897"
sudo /opt/CrowdStrike/falconctl -s --trace=none
```

**4. Start sensor**

```bash
sudo systemctl start falcon-sensor
sudo systemctl enable falcon-sensor
```

**5. Verify (~30s after start)**

```bash
sudo /opt/CrowdStrike/falconctl -g --version --aid --cid --tags
```

The `aid` value is the agent identifier. Paste it into the CrowdStrike Host Verification Tool to confirm console registration.

---

## Helm DaemonSet Install (Kubernetes)

### Prerequisites

- `kubectl` connected to target cluster
- `helm` v3+
- Access to Harbor registry or CrowdStrike registry credentials

### Deploy from Internal Registry (Harbor)

**1. Set variables**

```bash
export CID="20709802E00E4B4C9442CE5F8CA3E69D-9C"
export FALCON_TAGS="UT/10J00\,CCODE/IBM_Consulting_ITSS\,UPDATES/PROD\,AV/YES\,OWNER/655881897"
export SENSOR_REPO="harbor.boxops.boxboat.io/crowdstrike/falcon-sensor/falcon-sensor"
export SENSOR_TAG="7.30.0-18306-1.falcon-linux.Release.US-1"
```

Note: each comma in tags must be escaped with `\` for Helm.

**2. Create Harbor pull secret**

```bash
HARBOR_PARTIAL=$(printf "%s:%s" "<HARBOR_USER>" "<HARBOR_PASSWORD>" | base64 -w 0)
PULL_TOKEN=$(printf '{"auths":{"harbor.boxops.boxboat.io":{"auth":"%s"}}}' "${HARBOR_PARTIAL}" | base64 | tr -d '\n')
```

**3. Add Helm repo and create namespace**

```bash
helm repo add crowdstrike https://crowdstrike.github.io/falcon-helm
helm repo update

kubectl create namespace falcon-system
kubectl label --overwrite ns falcon-system \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/audit=privileged \
  pod-security.kubernetes.io/warn=privileged
```

**4. Deploy**

```bash
helm upgrade --install falcon-helm crowdstrike/falcon-sensor \
  -n falcon-system \
  --set falcon.cid="${CID}" \
  --set node.image.repository="${SENSOR_REPO}" \
  --set node.image.tag="${SENSOR_TAG}" \
  --set falcon.tags="${FALCON_TAGS}" \
  --set node.image.registryConfigJSON="${PULL_TOKEN}"
```

### Deploy from CrowdStrike Registry (Direct)

Requires CrowdStrike API credentials (`CLIENT_ID`, `CLIENT_SECRET`). See `crowdstrike-registry-auth.md` for the full token exchange flow.

### Verify

```bash
kubectl get pods -n falcon-system
kubectl logs -n falcon-system -l app=falcon-sensor --tail=20
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `falconctl -g --aid` returns empty | Sensor hasn't registered yet | Wait 30-60s; check `systemctl status falcon-sensor` |
| Sensor won't start | Missing CID configuration | Run `falconctl -s --cid=<CID>` before starting |
| Tags not showing in console | Tags set after sensor start | Stop sensor, set tags, restart |
| RPM install fails with signature error | GPG key not imported | `rpm --import <gpg_key>` first |
| DaemonSet pods in CrashLoopBackOff | Missing privileged namespace labels | Apply PSA labels to `falcon-system` namespace |

## Uninstall

Standalone:
```bash
sudo systemctl stop falcon-sensor
sudo dnf remove falcon-sensor   # or dpkg -r falcon-sensor
```

Helm:
```bash
helm uninstall falcon-helm -n falcon-system
kubectl delete namespace falcon-system
```
