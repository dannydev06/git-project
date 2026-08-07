# ProfilePulse

ProfilePulse is a lightweight Node.js automation project that records each
automation run in `activity_log.txt` and syncs the update back to GitHub.

## Run locally

Requirements:

- Node.js 20 or newer

Run the logger with:

```bash
npm start
```

Each run appends a line containing an ISO 8601 timestamp and the run status to
`activity_log.txt`.

## GitHub Actions setup

The workflow at `.github/workflows/pulse.yml` runs automatically once daily at
09:00 UTC and can also be started manually from the **Actions** tab.

### 1. Allow the workflow to write repository contents

The workflow requests the required permission with:

```yaml
permissions:
  contents: write
```

If repository or organization settings override workflow permissions, open
**Settings → Actions → General → Workflow permissions** and select
**Read and write permissions**. The workflow uses GitHub's built-in
`GITHUB_TOKEN`; no personal access token is required.

### 2. Configure the Git identity

The workflow currently uses these values in its **Configure Git identity** step:

```yaml
USER_EMAIL: "github-actions[bot]@users.noreply.github.com"
USER_NAME: "github-actions[bot]"
```

Update `USER_EMAIL` and `USER_NAME` in `.github/workflows/pulse.yml` if you
want commits to use a different Git identity. Keep the values as environment
variables so the `git config` commands continue to use the configured
parameters.

### 3. Run or verify the workflow

1. Commit and push the workflow and project files to GitHub.
2. Open **Actions → ProfilePulse**.
3. Use **Run workflow** to trigger a manual run.
4. Confirm that the run appends a new entry to `activity_log.txt` and creates
   the commit:
   `chore(pulse): automated sync check [skip ci]`

Scheduled runs use the repository's default branch and execute at 09:00 UTC.