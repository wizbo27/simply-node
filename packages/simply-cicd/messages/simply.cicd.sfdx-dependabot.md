# summary

Automatically update downstream projects with a newly released Salesforce 2GP package version.

# description

Discovers repositories under a group or organization, reads each one's `sfdx-project.json`, and for any repository that both depends on the released package and has opted in via the `SFDX_DEPENDABOT_ENABLED=TRUE` repository-level CI variable, opens (or updates) a change request bumping the dependency to the newly released version.

Each eligible repository must explicitly opt in — this command never touches a downstream repository's dependencies without that variable set.

# flags.vcs-host.summary

Hostname of the VCS instance hosting the downstream projects.

# flags.vcs-host.description

Defaults to the selected provider's public instance if not provided.

# flags.vcs-api-url.summary

Base URL of the VCS platform's API.

# flags.vcs-api-url.description

Only needed for self-hosted instances whose API is not at the provider's usual location. Falls back to the SFDX_DEPENDABOT_VCS_API_URL or CI_API_V4_URL environment variables if not provided.

# flags.vcs-token.summary

VCS access token with file-writing and change request privileges.

# flags.root-group-id.summary

Group or organization ID, or URL-encoded path, to scan for downstream projects.

# flags.subscriber-package-version-id.summary

The newly released Salesforce subscriber package version ID (04t...).

# flags.devhub-username.summary

Salesforce DevHub username or alias used to resolve the package's name and version.

# flags.dry-run.summary

Run discovery and parsing, but perform zero write, commit, or change request operations.

# flags.project-allowlist.summary

Comma-separated list of repository paths to include in the scan. If specified, only matching repositories are scanned.

# flags.project-denylist.summary

Comma-separated list of repository paths to exclude from scanning.

# flags.skip-archived.summary

Skip archived repositories.

# flags.skip-forks.summary

Skip forked repositories.

# flags.branch-prefix.summary

Prefix used for generated branch names.

# flags.change-request-labels.summary

Comma-separated labels to apply to created or updated change requests (merge requests on GitLab, pull requests on GitHub).

# flags.fail-on-error.summary

Return a non-zero exit code if one or more per-project operations fail.

# flags.max-projects.summary

Optional safety limit restricting the maximum number of eligible projects to scan.

# flags.vcs-provider.summary

The source-control-hosting platform to talk to.

# examples

- <%= config.bin %> <%= command.id %> --root-group-id 12345 --subscriber-package-version-id 04tXXXXXXXXXXXXXXX --devhub-username hub@example.com --dry-run

- <%= config.bin %> <%= command.id %> --root-group-id 12345 --subscriber-package-version-id 04tXXXXXXXXXXXXXXX --devhub-username hub@example.com --branch-prefix devops/dependabot --change-request-labels dependencies

- <%= config.bin %> <%= command.id %> --vcs-provider github --root-group-id my-org --subscriber-package-version-id 04tXXXXXXXXXXXXXXX --devhub-username hub@example.com

# error.missingVcsToken

Missing VCS access token. Provide --vcs-token or set SFDX_DEPENDABOT_VCS_TOKEN.

# error.missingRootGroupId

Missing root group or organization ID. Provide --root-group-id or set SFDX_DEPENDABOT_ROOT_GROUP_ID.

# error.missingSubscriberPackageVersionId

Missing subscriber package version ID. Provide --subscriber-package-version-id or set SUBSCRIBER_PACKAGE_VERSION_ID.

# error.missingDevhubUsername

Missing DevHub username/alias. Provide --devhub-username or set DEVHUB_TOOLING_USERNAME.

# info.starting

Starting SFDX Project Dependabot execution...

# info.dryRun

Executing in DRY-RUN mode. No changes will be written or committed.
