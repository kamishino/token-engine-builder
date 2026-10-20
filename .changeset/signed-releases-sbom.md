---
'token-engine-builder': minor
---

Signed releases + CycloneDX SBOM (L7) shipped as X5: `package-release.mjs` generates a CycloneDX 1.5 JSON SBOM (`token-engine-builder-v<version>.cyclonedx.json`) covering inlined dependencies across all shipped skills, and signs `SHA256SUMS.txt` with an Ed25519 Minisign signature (`SHA256SUMS.txt.minisig`) verifiable using `release.pub`.
