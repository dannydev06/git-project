---
name: ProfilePulse service paths
description: Repository-root path handling for the ProfilePulse API's local automation script.
---

When an API service invokes a repository-level automation script, do not assume the service's current working directory is the repository root. Resolve the root by checking candidate parent directories for the script before reading or executing local files.

**Why:** The managed API workflow starts from the API artifact directory, while ProfilePulse's logger and activity log live at the repository root.

**How to apply:** For future local-file automation endpoints, discover the root using a bounded list of parent candidates and verify the expected script or data file exists before invoking it.