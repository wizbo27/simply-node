---
title: simply-cicd
description: Commands for Salesforce CI/CD pipelines — orchestrating scratch-org builds, packaged and unpackaged deployments, and pipeline notifications.
---

`@simplysf/simply-cicd` is an [oclif](https://oclif.io/) plugin for the [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) that provides the building blocks for a Salesforce CI/CD pipeline: creating and tearing down scratch orgs, creating and validating 2GP package versions, running multi-stage deployments, and posting pipeline notifications to Microsoft Teams (with issue-tracker linking).

It's a successor to an internal tool (`coi-cicd`), rebuilt as a proper `sf` plugin under the `sf simply cicd` topic — same pipeline model, now installable via `sf plugins install` like any other Salesforce CLI plugin, with full `--help` output and JSON support on every command.

## Install

```sh
sf plugins install @simplysf/simply-cicd
```

## Where to start

- **New to the plugin?** Read [Happy Soup vs. Project deploys](/cicd/concepts/happy-soup-vs-project/) first — nearly everything else assumes you know which of the two deployment styles you're using.
- **Wiring up a pipeline?** [Deploy pipeline stages](/cicd/concepts/deploy-pipeline-stages/) explains how the stage commands (`validate`, `pre-destructive`, `deploy-unpackaged`/`install-packaged`, `post-destructive`, `post-deploy`) fit together, and the [GitLab CI pipeline guide](/cicd/guides/gitlab-ci-pipeline/) walks through a working `.gitlab-ci.yml`.
- **Just need a flag reference?** See [Command Reference](/cicd/reference/build/) for the full, auto-generated `--help` output of every command, grouped by topic.

## What it doesn't do (yet)

Every command that talks to source control goes through a small `VcsProvider` abstraction (see [VCS providers](/cicd/concepts/vcs-providers/)) — today only GitLab is implemented. The commands, flags, and concepts on this site are written from that GitLab-first reality; a GitHub provider is a planned addition, not a currently-supported one.
