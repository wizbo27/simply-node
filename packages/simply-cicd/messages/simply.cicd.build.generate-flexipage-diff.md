# summary

Generate a Flexipage delta between two commits and post the results to the change request.

# description

Runs the upstream `flexipage-delta` binary to diff `**/*.flexipage-meta.xml` files between `--from` and `--to`, then the reporter binary for the platform `--vcs-provider` selects — `flexipage-delta-gitlab` or `flexipage-delta-github` — to post the results back to the merge or pull request. Failures are logged, not thrown — a diff-posting step shouldn't fail the build.

# examples

- <%= config.bin %> <%= command.id %> --ci-project-id 123 --ci-merge-request-iid 45 --from abc123 --to def456 --project-access-token glpat-...

- <%= config.bin %> <%= command.id %> --vcs-provider github --ci-repository my-org/my-repo --ci-pull-request-number 45 --ci-run-id 987 --from abc123 --to def456 --project-access-token ghp-...
