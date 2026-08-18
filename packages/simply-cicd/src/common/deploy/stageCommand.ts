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
import type { DeployHappySoupOptions } from './deployHappySoup.js';
import type { DeployProjectOptions } from './deployProject.js';
import {
  ciJobTokenFlag,
  debugFlag,
  deployProgressFileFlag,
  deployRulesFileFlag,
  orgAuthFlags,
  startFromFlag,
  testFlags,
  vcsFlags,
} from './flags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.deploy');

/**
 * Flags for a "project" deployment stage command.
 *
 * Every one of `deploy-unpackaged`, `post-deploy`, `post-destructive` and `pre-destructive`
 * declares exactly this set — they differ only in which stage name they pass through.
 */
export const projectStageFlags = {
  ...ciJobTokenFlag,
  ...orgAuthFlags,
  ...debugFlag,
  'deploy-config-file': Flags.string({
    summary: messages.getMessage('flags.project-deploy-config-file.summary'),
    default: 'config/deploy.json',
    env: 'SIMPLY_CICD_DEPLOY_CONFIG_FILE',
  }),
  ...deployProgressFileFlag,
  ...deployRulesFileFlag,
  ...startFromFlag,
  ...testFlags,
  ...vcsFlags,
};

/**
 * Flags for a "happy-soup" deployment stage command.
 *
 * The same four stages as {@link projectStageFlags}, plus `--source-branch-name` — and its
 * `--deploy-config-file` has no default, because happy-soup derives one from the branch when it
 * isn't given.
 */
export const happySoupStageFlags = {
  ...ciJobTokenFlag,
  ...orgAuthFlags,
  ...debugFlag,
  'deploy-config-file': Flags.string({
    summary: messages.getMessage('flags.happy-soup-deploy-config-file.summary'),
    env: 'SIMPLY_CICD_DEPLOY_CONFIG_FILE',
  }),
  ...deployProgressFileFlag,
  ...deployRulesFileFlag,
  'source-branch-name': Flags.string({
    summary: messages.getMessage('flags.source-branch-name.summary'),
    env: 'SIMPLY_CICD_SOURCE_BRANCH_NAME',
  }),
  ...startFromFlag,
  ...testFlags,
  ...vcsFlags,
};

/** The parsed shape of {@link projectStageFlags}, as `this.parse()` returns it. */
export type ProjectStageFlagValues = {
  'ci-job-token': string;
  alias?: string;
  'auth-url'?: string;
  'client-id'?: string;
  'instance-url'?: string;
  'jwt-key-file'?: string;
  username?: string;
  debug: boolean;
  'deploy-config-file': string;
  'deploy-progress-file': string;
  'deploy-rules-file': string;
  'start-from'?: string;
  'test-level'?: string;
  'test-suite'?: string;
  tests?: string;
  'vcs-host'?: string;
  'vcs-provider': DeployProjectOptions['vcsProvider'];
};

/**
 * The parsed shape of {@link happySoupStageFlags}.
 *
 * `--deploy-config-file` is optional here where the project flags make it required, because
 * happy-soup falls back to deriving one from `--source-branch-name`.
 */
export type HappySoupStageFlagValues = Omit<ProjectStageFlagValues, 'deploy-config-file' | 'test-suite'> & {
  'deploy-config-file'?: string;
  'source-branch-name'?: string;
};

/**
 * Map a project stage command's parsed flags onto {@link DeployProjectOptions}.
 *
 * The kebab-case flag names and camelCase option names are a straight one-to-one rename, and it
 * was written out identically in every stage command.
 *
 * @param stage - The stage this command runs.
 * @param flags - The command's parsed flags.
 * @returns The options to hand to `deployProject()`.
 */
export function toProjectStageOptions(stage: string, flags: ProjectStageFlagValues): DeployProjectOptions {
  return {
    stage,
    ciJobToken: flags['ci-job-token'],
    alias: flags.alias,
    authUrl: flags['auth-url'],
    clientId: flags['client-id'],
    instanceUrl: flags['instance-url'],
    jwtKeyFile: flags['jwt-key-file'],
    username: flags.username,
    debug: flags.debug,
    deployConfigFile: flags['deploy-config-file'],
    deployProgressFile: flags['deploy-progress-file'],
    deployRulesFile: flags['deploy-rules-file'],
    startFrom: flags['start-from'],
    testLevel: flags['test-level'],
    testSuite: flags['test-suite'],
    tests: flags.tests,
    vcsHost: flags['vcs-host'],
    vcsProvider: flags['vcs-provider'],
  };
}

/**
 * Map a happy-soup stage command's parsed flags onto {@link DeployHappySoupOptions}.
 *
 * Same shape as {@link toProjectStageOptions}, trading `--test-suite` (which happy-soup stages
 * don't accept) for `--source-branch-name`.
 *
 * @param stage - The stage this command runs.
 * @param flags - The command's parsed flags.
 * @returns The options to hand to `deployHappySoup()`.
 */
export function toHappySoupStageOptions(stage: string, flags: HappySoupStageFlagValues): DeployHappySoupOptions {
  return {
    stage,
    ciJobToken: flags['ci-job-token'],
    alias: flags.alias,
    authUrl: flags['auth-url'],
    clientId: flags['client-id'],
    instanceUrl: flags['instance-url'],
    jwtKeyFile: flags['jwt-key-file'],
    username: flags.username,
    debug: flags.debug,
    deployConfigFile: flags['deploy-config-file'],
    deployProgressFile: flags['deploy-progress-file'],
    deployRulesFile: flags['deploy-rules-file'],
    sourceBranchName: flags['source-branch-name'],
    startFrom: flags['start-from'],
    testLevel: flags['test-level'],
    tests: flags.tests,
    vcsHost: flags['vcs-host'],
    vcsProvider: flags['vcs-provider'],
  };
}
