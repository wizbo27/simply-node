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
import { Flags } from '@salesforce/sf-plugins-core';
import { listVcsProviderKinds, type VcsProviderKind } from '../vcs/index.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.build');

/** Flags shared by every build command that authenticates against one or more Dev Hubs. */
export const devHubFlags = {
  'dev-hub-name': Flags.string({
    summary: messages.getMessage('flags.dev-hub-name.summary'),
    multiple: true,
    required: true,
  }),
  'dev-hub-username': Flags.string({
    summary: messages.getMessage('flags.dev-hub-username.summary'),
    multiple: true,
    required: true,
  }),
  'dev-hub-client-id': Flags.string({
    summary: messages.getMessage('flags.dev-hub-client-id.summary'),
    multiple: true,
    required: true,
  }),
  'dev-hub-instance-url': Flags.string({
    summary: messages.getMessage('flags.dev-hub-instance-url.summary'),
    multiple: true,
    required: true,
  }),
};

export const jwtKeyFileFlag = {
  'jwt-key-file': Flags.string({
    summary: messages.getMessage('flags.jwt-key-file.summary'),
    required: true,
    env: 'SIMPLY_CICD_JWT_KEY_FILE',
  }),
};

export const debugFlag = {
  debug: Flags.boolean({
    summary: messages.getMessage('flags.debug.summary'),
    default: false,
    env: 'SIMPLY_CICD_DEBUG',
  }),
};

export const disabledFlag = {
  disabled: Flags.boolean({
    summary: messages.getMessage('flags.disabled.summary'),
    default: false,
    env: 'SIMPLY_CICD_DISABLED',
  }),
};

/** Flags shared by every build command that adds a temporary authenticated git remote to tag or push. */
export const gitOpsFlags = {
  'ci-commit-ref-name': Flags.string({
    summary: messages.getMessage('flags.ci-commit-ref-name.summary'),
    required: true,
    env: 'SIMPLY_CICD_CI_COMMIT_REF_NAME',
  }),
  'ci-pipeline-id': Flags.string({
    summary: messages.getMessage('flags.ci-pipeline-id.summary'),
    required: true,
    env: 'SIMPLY_CICD_CI_PIPELINE_ID',
  }),
  'ci-project-path': Flags.string({
    summary: messages.getMessage('flags.ci-project-path.summary'),
    required: true,
    env: 'SIMPLY_CICD_CI_PROJECT_PATH',
  }),
  'project-access-token': Flags.string({
    summary: messages.getMessage('flags.project-access-token.summary'),
    required: true,
    env: 'SIMPLY_CICD_PROJECT_ACCESS_TOKEN',
  }),
};

export const vcsFlags = {
  'vcs-host': Flags.string({
    summary: messages.getMessage('flags.vcs-host.summary'),
    env: 'SIMPLY_CICD_VCS_HOST',
  }),
  'vcs-provider': Flags.custom<VcsProviderKind>({ options: listVcsProviderKinds() })({
    summary: messages.getMessage('flags.vcs-provider.summary'),
    default: 'gitlab',
    env: 'SIMPLY_CICD_VCS_PROVIDER',
  }),
};

/**
 * Flags shared by the `generate-flow-diff` and `generate-flexipage-diff` commands. The platform
 * context flags are optional and only meaningful for their own provider; each upstream reporter
 * falls back to its platform's CI environment variables for anything not passed.
 */
export const diffFlags = {
  ...vcsFlags,
  'ci-project-id': Flags.string({
    summary: messages.getMessage('flags.diff-ci-project-id.summary'),
    env: 'SIMPLY_CICD_CI_PROJECT_ID',
  }),
  'ci-merge-request-iid': Flags.string({
    summary: messages.getMessage('flags.diff-ci-merge-request-iid.summary'),
    env: 'SIMPLY_CICD_CI_MERGE_REQUEST_IID',
  }),
  'ci-repository': Flags.string({
    summary: messages.getMessage('flags.diff-ci-repository.summary'),
    env: 'SIMPLY_CICD_CI_REPOSITORY',
  }),
  'ci-pull-request-number': Flags.string({
    summary: messages.getMessage('flags.diff-ci-pull-request-number.summary'),
    env: 'SIMPLY_CICD_CI_PULL_REQUEST_NUMBER',
  }),
  'ci-run-id': Flags.string({
    summary: messages.getMessage('flags.diff-ci-run-id.summary'),
    env: 'SIMPLY_CICD_CI_RUN_ID',
  }),
  'ci-server-url': Flags.string({
    summary: messages.getMessage('flags.diff-ci-server-url.summary'),
    env: 'SIMPLY_CICD_CI_SERVER_URL',
  }),
  'ci-commit-sha': Flags.string({
    summary: messages.getMessage('flags.diff-ci-commit-sha.summary'),
    env: 'SIMPLY_CICD_CI_COMMIT_SHA',
  }),
  from: Flags.string({ summary: messages.getMessage('flags.diff-from.summary'), required: true }),
  to: Flags.string({ summary: messages.getMessage('flags.diff-to.summary'), required: true }),
  'project-access-token': Flags.string({
    summary: messages.getMessage('flags.diff-project-access-token.summary'),
    required: true,
    env: 'SIMPLY_CICD_PROJECT_ACCESS_TOKEN',
  }),
  out: Flags.string({ summary: messages.getMessage('flags.diff-out.summary') }),
};
