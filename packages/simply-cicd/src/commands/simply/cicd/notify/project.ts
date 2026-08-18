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
import { listAlmProviderKinds, type AlmProviderKind } from '../../../../common/alm/index.js';
import { logger } from '../../../../common/logger.js';
import {
  afterScript,
  beforeScript,
  type NotifyProjectOptions,
  type NotifyProjectResult,
} from '../../../../common/notify/projectNotification.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.notify.project');

/** Sends a project deployment notification to Microsoft Teams, with Jira story integration. */
export default class NotifyProject extends SfCommand<NotifyProjectResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'after-script': Flags.boolean({ summary: messages.getMessage('flags.after-script.summary') }),
    alias: Flags.string({ summary: messages.getMessage('flags.alias.summary'), env: 'SIMPLY_CICD_ALIAS' }),
    'before-script': Flags.boolean({ summary: messages.getMessage('flags.before-script.summary') }),
    'ci-commit-ref-name': Flags.string({
      summary: messages.getMessage('flags.ci-commit-ref-name.summary'),
      env: 'SIMPLY_CICD_CI_COMMIT_REF_NAME',
    }),
    'ci-environment-name': Flags.string({
      summary: messages.getMessage('flags.ci-environment-name.summary'),
      env: 'SIMPLY_CICD_CI_ENVIRONMENT_NAME',
    }),
    'ci-job-name': Flags.string({
      summary: messages.getMessage('flags.ci-job-name.summary'),
      env: 'SIMPLY_CICD_CI_JOB_NAME',
    }),
    'ci-job-stage': Flags.string({
      summary: messages.getMessage('flags.ci-job-stage.summary'),
      env: 'SIMPLY_CICD_CI_JOB_STAGE',
    }),
    'ci-job-status': Flags.string({
      summary: messages.getMessage('flags.ci-job-status.summary'),
      env: 'SIMPLY_CICD_CI_JOB_STATUS',
    }),
    'ci-pipeline-id': Flags.string({
      summary: messages.getMessage('flags.ci-pipeline-id.summary'),
      env: 'SIMPLY_CICD_CI_PIPELINE_ID',
    }),
    'ci-pipeline-url': Flags.string({
      summary: messages.getMessage('flags.ci-pipeline-url.summary'),
      env: 'SIMPLY_CICD_CI_PIPELINE_URL',
    }),
    'ci-project-title': Flags.string({
      summary: messages.getMessage('flags.ci-project-title.summary'),
      env: 'SIMPLY_CICD_CI_PROJECT_TITLE',
    }),
    'client-id': Flags.string({
      summary: messages.getMessage('flags.client-id.summary'),
      env: 'SIMPLY_CICD_CLIENT_ID',
    }),
    'devhub-tooling-client-id': Flags.string({
      summary: messages.getMessage('flags.devhub-tooling-client-id.summary'),
      env: 'SIMPLY_CICD_DEVHUB_TOOLING_CLIENT_ID',
    }),
    'devhub-tooling-instance-url': Flags.string({
      summary: messages.getMessage('flags.devhub-tooling-instance-url.summary'),
      env: 'SIMPLY_CICD_DEVHUB_TOOLING_INSTANCE_URL',
    }),
    'devhub-tooling-username': Flags.string({
      summary: messages.getMessage('flags.devhub-tooling-username.summary'),
      env: 'SIMPLY_CICD_DEVHUB_TOOLING_USERNAME',
    }),
    enabled: Flags.boolean({
      summary: messages.getMessage('flags.enabled.summary'),
      default: false,
      env: 'SIMPLY_CICD_ENABLED',
    }),
    'instance-url': Flags.string({
      summary: messages.getMessage('flags.instance-url.summary'),
      env: 'SIMPLY_CICD_INSTANCE_URL',
    }),
    'alm-base-url': Flags.string({
      summary: messages.getMessage('flags.alm-base-url.summary'),
      env: 'SIMPLY_CICD_ALM_BASE_URL',
    }),
    'alm-project-key': Flags.string({
      summary: messages.getMessage('flags.alm-project-key.summary'),
      env: 'SIMPLY_CICD_ALM_PROJECT_KEY',
    }),
    'alm-provider': Flags.custom<AlmProviderKind>({ options: listAlmProviderKinds() })({
      summary: messages.getMessage('flags.alm-provider.summary'),
      default: 'jira',
      env: 'SIMPLY_CICD_ALM_PROVIDER',
    }),
    'jwt-key-file': Flags.string({
      summary: messages.getMessage('flags.jwt-key-file.summary'),
      env: 'SIMPLY_CICD_JWT_KEY_FILE',
    }),
    'prev-installed-package-version': Flags.string({
      summary: messages.getMessage('flags.prev-installed-package-version.summary'),
    }),
    'subscriber-package-version-id': Flags.string({
      summary: messages.getMessage('flags.subscriber-package-version-id.summary'),
    }),
    'target-package-version': Flags.string({ summary: messages.getMessage('flags.target-package-version.summary') }),
    'teams-webhook-url': Flags.string({
      summary: messages.getMessage('flags.teams-webhook-url.summary'),
      multiple: true,
    }),
    username: Flags.string({ summary: messages.getMessage('flags.username.summary'), env: 'SIMPLY_CICD_USERNAME' }),
    debug: Flags.boolean({
      summary: messages.getMessage('flags.debug.summary'),
      default: false,
      env: 'SIMPLY_CICD_DEBUG',
    }),
  };

  public async run(): Promise<NotifyProjectResult> {
    const { flags } = await this.parse(NotifyProject);

    logger.raw('\n' + '='.repeat(80));
    logger.info('>>> Sending Teams Notification <<<');
    logger.raw('='.repeat(80) + '\n');

    if (flags.debug) {
      logger.debug('Incoming Parameters:', flags);
    }

    if (!flags.enabled) {
      logger.info('Teams notification is disabled. Skipping.');
      return { sent: false };
    }

    if (!flags['teams-webhook-url'] || flags['teams-webhook-url'].length === 0) {
      throw messages.createError('error.missingTeamsWebhookUrl');
    }

    const options: NotifyProjectOptions = {
      alias: flags.alias,
      ciCommitRefName: flags['ci-commit-ref-name'],
      ciEnvironmentName: flags['ci-environment-name'],
      ciJobName: flags['ci-job-name'],
      ciJobStage: flags['ci-job-stage'],
      ciJobStatus: flags['ci-job-status'],
      ciPipelineId: flags['ci-pipeline-id'],
      ciPipelineUrl: flags['ci-pipeline-url'],
      ciProjectTitle: flags['ci-project-title'],
      clientId: flags['client-id'],
      devhubToolingClientId: flags['devhub-tooling-client-id'],
      devhubToolingInstanceUrl: flags['devhub-tooling-instance-url'],
      devhubToolingUsername: flags['devhub-tooling-username'],
      instanceUrl: flags['instance-url'],
      almBaseUrl: flags['alm-base-url'],
      almProjectKey: flags['alm-project-key'],
      almProvider: flags['alm-provider'],
      jwtKeyFile: flags['jwt-key-file'],
      prevInstalledPackageVersion: flags['prev-installed-package-version'],
      subscriberPackageVersionId: flags['subscriber-package-version-id'],
      targetPackageVersion: flags['target-package-version'],
      teamsWebhookUrl: flags['teams-webhook-url'],
      username: flags.username,
      debug: flags.debug,
    };

    try {
      let result: NotifyProjectResult;
      if (flags['before-script']) {
        await beforeScript(options);
        result = { sent: false };
      } else if (flags['after-script']) {
        result = await afterScript(options);
      } else {
        throw messages.createError('error.missingScriptFlag');
      }

      logger.raw('\n' + '='.repeat(80));
      logger.success('Successfully sent notification');
      logger.raw('='.repeat(80) + '\n');

      return result;
    } catch (error) {
      logger.raw('\n' + '='.repeat(80));
      logger.error('Error sending notification');
      logger.raw((error as Error).message);
      logger.raw('='.repeat(80) + '\n');
      throw error;
    }
  }
}
