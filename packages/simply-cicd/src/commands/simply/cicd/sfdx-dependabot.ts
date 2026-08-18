/*
 * Copyright (c) 2026, Clay Chipps; Copyright (c) 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Messages } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { logger } from '../../../common/logger.js';
import { resolveBoolean, resolveOptionalString, resolveString } from '../../../common/flags/env.js';
import {
  applyMaxProjectsLimit,
  discoverEligibleProjects,
  processProject,
  resolvePackageDetails,
  type ResolvedOptions,
  type SfdxDependabotCounters,
  type SfdxDependabotSummary,
} from '../../../common/sfdxDependabot/dependabotRun.js';
import { getVcsProvider } from '../../../common/vcs/index.js';
import type { VcsProviderKind } from '../../../common/vcs/index.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.sfdx-dependabot');

/**
 * Discovers downstream repositories that depend on a just-released Salesforce 2GP package,
 * opens or updates a merge request bumping each opted-in repository to the new version.
 */
export default class SfdxDependabot extends SfCommand<SfdxDependabotSummary> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'gitlab-api-url': Flags.string({
      summary: messages.getMessage('flags.gitlab-api-url.summary'),
      description: messages.getMessage('flags.gitlab-api-url.description'),
      env: 'SIMPLY_CICD_GITLAB_API_URL',
    }),
    'gitlab-token': Flags.string({
      summary: messages.getMessage('flags.gitlab-token.summary'),
      env: 'SIMPLY_CICD_GITLAB_TOKEN',
    }),
    'root-group-id': Flags.string({
      summary: messages.getMessage('flags.root-group-id.summary'),
      env: 'SIMPLY_CICD_ROOT_GROUP_ID',
    }),
    'subscriber-package-version-id': Flags.string({
      summary: messages.getMessage('flags.subscriber-package-version-id.summary'),
    }),
    'devhub-username': Flags.string({
      summary: messages.getMessage('flags.devhub-username.summary'),
      env: 'SIMPLY_CICD_DEVHUB_USERNAME',
    }),
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
      env: 'SIMPLY_CICD_DRY_RUN',
    }),
    'project-allowlist': Flags.string({
      summary: messages.getMessage('flags.project-allowlist.summary'),
      env: 'SIMPLY_CICD_PROJECT_ALLOWLIST',
    }),
    'project-denylist': Flags.string({
      summary: messages.getMessage('flags.project-denylist.summary'),
      env: 'SIMPLY_CICD_PROJECT_DENYLIST',
    }),
    'skip-archived': Flags.boolean({
      summary: messages.getMessage('flags.skip-archived.summary'),
      allowNo: true,
      env: 'SIMPLY_CICD_SKIP_ARCHIVED',
    }),
    'skip-forks': Flags.boolean({
      summary: messages.getMessage('flags.skip-forks.summary'),
      allowNo: true,
      env: 'SIMPLY_CICD_SKIP_FORKS',
    }),
    'branch-prefix': Flags.string({
      summary: messages.getMessage('flags.branch-prefix.summary'),
      env: 'SIMPLY_CICD_BRANCH_PREFIX',
    }),
    'mr-labels': Flags.string({
      summary: messages.getMessage('flags.mr-labels.summary'),
      env: 'SIMPLY_CICD_MR_LABELS',
    }),
    'fail-on-error': Flags.boolean({
      summary: messages.getMessage('flags.fail-on-error.summary'),
      env: 'SIMPLY_CICD_FAIL_ON_ERROR',
    }),
    'max-projects': Flags.integer({
      summary: messages.getMessage('flags.max-projects.summary'),
      env: 'SIMPLY_CICD_MAX_PROJECTS',
    }),
    'vcs-provider': Flags.custom<VcsProviderKind>({ options: ['gitlab'] })({
      summary: messages.getMessage('flags.vcs-provider.summary'),
      default: 'gitlab',
      env: 'SIMPLY_CICD_VCS_PROVIDER',
    }),
  };

  public async run(): Promise<SfdxDependabotSummary> {
    const { flags } = await this.parse(SfdxDependabot);

    const gitlabApiUrl = resolveOptionalString(flags['gitlab-api-url'], [
      process.env.SFDX_DEPENDABOT_GITLAB_API_URL,
      process.env.CI_API_V4_URL,
    ]);
    const gitlabToken = resolveOptionalString(flags['gitlab-token'], [process.env.SFDX_DEPENDABOT_GITLAB_TOKEN]);
    const rootGroupId = resolveOptionalString(flags['root-group-id'], [process.env.SFDX_DEPENDABOT_ROOT_GROUP_ID]);
    const subscriberPackageVersionId = resolveOptionalString(flags['subscriber-package-version-id'], [
      process.env.SUBSCRIBER_PACKAGE_VERSION_ID,
    ]);
    const devhubUsername = resolveOptionalString(flags['devhub-username'], [process.env.DEVHUB_TOOLING_USERNAME]);

    if (!gitlabApiUrl) {
      throw messages.createError('error.missingGitlabApiUrl');
    }
    if (!gitlabToken) {
      throw new Error('Missing GitLab token. Provide --gitlab-token or set SFDX_DEPENDABOT_GITLAB_TOKEN.');
    }
    if (!rootGroupId) {
      throw new Error('Missing GitLab root group ID. Provide --root-group-id or set SFDX_DEPENDABOT_ROOT_GROUP_ID.');
    }
    if (!subscriberPackageVersionId) {
      throw new Error(
        'Missing subscriber package version ID. Provide --subscriber-package-version-id or set SUBSCRIBER_PACKAGE_VERSION_ID.',
      );
    }
    if (!devhubUsername) {
      throw new Error('Missing DevHub username/alias. Provide --devhub-username or set DEVHUB_TOOLING_USERNAME.');
    }

    const options: ResolvedOptions = {
      gitlabApiUrl,
      gitlabToken,
      rootGroupId,
      subscriberPackageVersionId,
      devhubUsername,
      dryRun: resolveBoolean(flags['dry-run'], process.env.SFDX_DEPENDABOT_DRY_RUN, false),
      projectAllowlist: resolveString(flags['project-allowlist'], [process.env.SFDX_DEPENDABOT_PROJECT_ALLOWLIST]),
      projectDenylist: resolveString(flags['project-denylist'], [process.env.SFDX_DEPENDABOT_PROJECT_DENYLIST]),
      skipArchived: resolveBoolean(flags['skip-archived'], process.env.SFDX_DEPENDABOT_SKIP_ARCHIVED, true),
      skipForks: resolveBoolean(flags['skip-forks'], process.env.SFDX_DEPENDABOT_SKIP_FORKS, true),
      branchPrefix: resolveString(
        flags['branch-prefix'],
        [process.env.SFDX_DEPENDABOT_BRANCH_PREFIX],
        'devops/dependabot',
      ),
      mrLabels: resolveString(flags['mr-labels'], [process.env.SFDX_DEPENDABOT_MR_LABELS]),
      failOnError: resolveBoolean(flags['fail-on-error'], process.env.SFDX_DEPENDABOT_FAIL_ON_ERROR, false),
      maxProjects:
        flags['max-projects'] ??
        (process.env.SFDX_DEPENDABOT_MAX_PROJECTS !== undefined
          ? Number(process.env.SFDX_DEPENDABOT_MAX_PROJECTS)
          : undefined),
    };

    logger.info(messages.getMessage('info.starting'));
    if (options.dryRun) {
      logger.info(messages.getMessage('info.dryRun'));
    }

    const { packageName, packageVersion } = await resolvePackageDetails(
      options.devhubUsername,
      options.subscriberPackageVersionId,
    );
    const vcsProvider = getVcsProvider(flags['vcs-provider'], options.gitlabApiUrl, options.gitlabToken);

    const { allProjects, filteredProjects, skippedCount } = await discoverEligibleProjects(
      vcsProvider,
      options.rootGroupId,
      options,
    );
    const { projectsToProcess, additionalSkipped } = applyMaxProjectsLimit(filteredProjects, options.maxProjects);

    const counters: SfdxDependabotCounters = {
      projectsUpdated: 0,
      mergeRequestsCreated: 0,
      mergeRequestsAlreadyOpen: 0,
      alreadyCurrent: 0,
      noDependencyFound: 0,
      missingSfdxProjectFile: 0,
      skipped: skippedCount + additionalSkipped,
      failed: 0,
    };

    for (const project of projectsToProcess) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await processProject(project, vcsProvider, options, packageName, packageVersion, counters);
      } catch (error) {
        logger.error(`Failed to process project ${project.pathWithNamespace}: ${(error as Error).message}`);
        counters.failed++;
      }
    }

    const summary: SfdxDependabotSummary = {
      packageName,
      packageVersion,
      subscriberPackageVersionId: options.subscriberPackageVersionId,
      projectsDiscovered: allProjects.length,
      projectsEligible: filteredProjects.length,
      projectsUpdated: counters.projectsUpdated,
      mergeRequestsCreated: counters.mergeRequestsCreated,
      mergeRequestsAlreadyOpen: counters.mergeRequestsAlreadyOpen,
      alreadyCurrent: counters.alreadyCurrent,
      noDependencyFound: counters.noDependencyFound,
      missingSfdxProjectFile: counters.missingSfdxProjectFile,
      skipped: counters.skipped,
      failed: counters.failed,
      dryRun: options.dryRun,
    };

    this.logSummary(summary);

    if (options.failOnError && counters.failed > 0) {
      throw new Error(`Dependabot run failed because ${counters.failed} per-project operation(s) failed.`);
    }

    return summary;
  }

  private logSummary(summary: SfdxDependabotSummary): void {
    this.styledHeader('SFDX Dependabot Summary');
    this.log(`Package: ${summary.packageName}`);
    this.log(`Version: ${summary.packageVersion}`);
    this.log(`Subscriber Package Version ID: ${summary.subscriberPackageVersionId}`);
    this.log('');
    this.log(`Projects discovered: ${summary.projectsDiscovered}`);
    this.log(`Projects eligible after filters: ${summary.projectsEligible}`);
    this.log(`Projects updated: ${summary.projectsUpdated}`);
    this.log(`Merge requests created: ${summary.mergeRequestsCreated}`);
    this.log(`Merge requests already open: ${summary.mergeRequestsAlreadyOpen}`);
    this.log(`Already current: ${summary.alreadyCurrent}`);
    this.log(`No dependency found: ${summary.noDependencyFound}`);
    this.log(`Missing sfdx-project.json: ${summary.missingSfdxProjectFile}`);
    this.log(`Skipped: ${summary.skipped}`);
    this.log(`Failed: ${summary.failed}`);
    this.log(`Dry run: ${summary.dryRun}`);
  }
}
