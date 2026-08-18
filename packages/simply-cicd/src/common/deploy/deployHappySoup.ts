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

import { promises as fs } from 'node:fs';
import { execa } from 'execa';
import { runSf } from '../exec/sfCli.js';
import { addGitRemote } from '../git.js';
import { logger } from '../logger.js';
import { authenticateOrg } from '../sfAuth.js';
import { createVcsProvider } from '../vcs/index.js';
import type { VcsProviderKind } from '../vcs/index.js';
import { runDeployStage } from './runDeployStage.js';
import {
  determineDeployConfigFile,
  installPackageDependencies,
  printDeploymentSummary,
  runDeploymentSteps,
  type OrgAuthConfig,
  type RunDeploymentStepsConfig,
} from './deployCommon.js';

async function archiveOrRemoveDeployConfig(
  finalDeployConfigFile: string | undefined,
  remoteAlias: string,
): Promise<void> {
  if (finalDeployConfigFile) {
    try {
      await fs.access(finalDeployConfigFile);
      const newDeployPath = 'config/deploy.json';
      await fs.copyFile(finalDeployConfigFile, newDeployPath);
      await execa('git', ['add', newDeployPath]);
      await execa('git', ['commit', '-m', 'Archiving deploy.json [skip ci]', newDeployPath]);
      await execa('git', ['push', remoteAlias]);
      return;
    } catch {
      // Fall through and try to remove an obsolete config/deploy.json instead.
    }
  }

  try {
    await fs.access('config/deploy.json');
    await execa('git', ['rm', 'config/deploy.json']);
    await execa('git', ['commit', '-m', 'Removing obsolete config/deploy.json [skip ci]', 'config/deploy.json']);
    await execa('git', ['push', remoteAlias]);
  } catch {
    logger.warn('Unable to find a deploy.json to archive.');
  }
}

export type DeploymentCloseOutConfig = {
  projectAccessToken: string;
  ciPipelineId: string;
  ciProjectPath: string;
  ciCommitRefName: string;
  deployReleaseDate?: string;
  deployConfigFile?: string;
  vcsHost?: string;
  vcsProvider: VcsProviderKind;
};

/** Fetches/switches to the release branch, then archives (or removes an obsolete) `config/deploy.json`. */
async function deploymentCloseOut(config: DeploymentCloseOutConfig): Promise<void> {
  const {
    projectAccessToken,
    ciPipelineId,
    ciProjectPath,
    ciCommitRefName,
    deployReleaseDate,
    deployConfigFile,
    vcsHost,
    vcsProvider: vcsProviderKind,
  } = config;

  const vcsProvider = createVcsProvider(vcsProviderKind, { host: vcsHost, token: projectAccessToken });
  const remoteAlias = await addGitRemote(ciPipelineId, projectAccessToken, ciProjectPath, vcsProvider);
  await execa('git', ['fetch']);
  await execa('git', ['switch', ciCommitRefName]);

  const finalDeployConfigFile = deployReleaseDate ? `deployment-configs/${deployReleaseDate}.json` : deployConfigFile;
  await archiveOrRemoveDeployConfig(finalDeployConfigFile, remoteAlias);
}

function formatDeploymentTimestamp(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${partMap.year}${partMap.month}${partMap.day}.${partMap.hour}${partMap.minute}`;
}

export type TagDeploymentConfig = OrgAuthConfig & {
  projectAccessToken: string;
  ciPipelineId: string;
  ciProjectPath: string;
  ciPipelineUrl?: string;
  ciMergeRequestProjectUrl?: string;
  ciMergeRequestIid?: string;
  debug?: boolean;
  vcsHost?: string;
  vcsProvider: VcsProviderKind;
};

function buildDeploymentTagMessage(orgDomainPrefix: string, currentTime: string, config: TagDeploymentConfig): string {
  let message = `deployed to org ${orgDomainPrefix} at ${currentTime}`;
  if (config.ciPipelineUrl) {
    message += ` Associated pipeline - ${config.ciPipelineUrl}`;
  }
  if (config.ciMergeRequestProjectUrl && config.ciMergeRequestIid) {
    message += ` Associated merge request - ${config.ciMergeRequestProjectUrl}/-/merge_requests/${config.ciMergeRequestIid}`;
  }
  return message;
}

/** Tags the current commit with deployment details (org, timestamp, pipeline/MR links) and pushes the tag. */
async function tagDeployment(config: TagDeploymentConfig): Promise<void> {
  const {
    alias,
    authUrl,
    clientId,
    instanceUrl,
    jwtKeyFile,
    username,
    projectAccessToken,
    ciPipelineId,
    ciProjectPath,
    debug,
    vcsHost,
    vcsProvider: vcsProviderKind,
  } = config;

  const vcsProvider = createVcsProvider(vcsProviderKind, { host: vcsHost, token: projectAccessToken });
  const remoteAlias = await addGitRemote(ciPipelineId, projectAccessToken, ciProjectPath, vcsProvider);
  await authenticateOrg({ alias, authUrl, clientId, instanceUrl, jwtKeyFile, username, debug });

  const { stdout: orgDisplay } = await runSf(['org', 'display', '--target-org', alias ?? '', '--json']);
  const instanceUrlResult = (JSON.parse(orgDisplay) as { result: { instanceUrl: string } }).result.instanceUrl;
  const instanceSlug = instanceUrlResult.split('.')[0];
  const orgDomainPrefix = instanceSlug.replace('https://', '');
  if (!orgDomainPrefix) {
    throw new Error('Unable to determine org domain prefix.');
  }

  const currentTime = formatDeploymentTimestamp(new Date());
  const gitMessage = buildDeploymentTagMessage(orgDomainPrefix, currentTime, config);
  const tagName = `deployed--${orgDomainPrefix}-${currentTime}`;

  await execa('git', ['tag', '-m', gitMessage, tagName]);
  await execa('git', ['push', remoteAlias, '--tags']);
  logger.log(`Deployment tagged as ${tagName}`);
}

export type DeployHappySoupOptions = OrgAuthConfig & {
  stage: string;
  sourceBranchName?: string;
  deployConfigFile?: string;
  deployRulesFile?: string;
  deployProgressFile?: string;
  startFrom?: string;
  debug?: boolean;
  testLevel?: string;
  tests?: string;
  ciJobToken?: string;
  vcsHost?: string;
  vcsProvider: VcsProviderKind;
  installType?: 'All' | 'Delta' | 'Upgrade';
  wait?: string;
  projectAccessToken?: string;
  ciPipelineId?: string;
  ciProjectPath?: string;
  ciPipelineUrl?: string;
  ciMergeRequestProjectUrl?: string;
  ciMergeRequestIid?: string;
  ciCommitRefName?: string;
  deployReleaseDate?: string;
};

async function runHappySoupStage(
  stage: string,
  config: Omit<DeployHappySoupOptions, 'stage'>,
  deployConfigFile: string | undefined,
): Promise<void> {
  if (stage === 'install-packaged') {
    await installPackageDependencies(config);
  } else if (stage === 'tag-deployment') {
    // The CLI layer requires projectAccessToken/ciPipelineId/ciProjectPath for this stage.
    await tagDeployment(config as TagDeploymentConfig);
  } else if (stage === 'deployment-close-out') {
    // The CLI layer requires projectAccessToken/ciPipelineId/ciProjectPath/ciCommitRefName for this stage.
    await deploymentCloseOut({ ...(config as DeploymentCloseOutConfig), deployConfigFile });
  } else {
    // The CLI layer requires ciJobToken for every other stage.
    const stepsConfig: RunDeploymentStepsConfig = {
      ...config,
      ciJobToken: config.ciJobToken ?? '',
      stage,
      deployConfigFile: deployConfigFile ?? '',
      deployProgressFile: config.deployProgressFile ?? 'DEPLOY_PROGRESS.json',
      deployRulesFile: config.deployRulesFile ?? 'config/deploy-rules.json',
    };
    const { deployProgress } = await runDeploymentSteps(stepsConfig);
    printDeploymentSummary(deployProgress, stage);
  }
}

/**
 * Runs a "happy-soup" (multi-repo, unlocked-package) deployment stage. `install-packaged` installs
 * dependencies only; `tag-deployment` and `deployment-close-out` have their own git-native logic;
 * every other stage runs through the resumable deployment-steps loop against the branch-derived
 * (or explicit) deploy config file.
 */
export async function deployHappySoup(options: DeployHappySoupOptions): Promise<void> {
  const { stage, ...config } = options;

  await runDeployStage(stage, options, async () => {
    const deployConfigFile = determineDeployConfigFile(config.sourceBranchName, config.deployConfigFile);
    await runHappySoupStage(stage, config, deployConfigFile);
  });
}
