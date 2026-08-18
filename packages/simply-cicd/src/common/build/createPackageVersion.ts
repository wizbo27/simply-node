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
import { getDefaultPackageDirectory, getPluginConfig, readSfdxProject, type SfdxProject } from '@simplysf/simply-core';
import { runSf } from '../exec/sfCli.js';
import { addGitRemote } from '../git.js';
import { logger } from '../logger.js';
import { authenticateOrg } from '../sfAuth.js';
import { createVcsProvider, type VcsProviderKind } from '../vcs/index.js';

type PackageVersionCreateReport = { Status: string; Error?: string; SubscriberPackageVersionId?: string };

function refIncludesPrefix(ciCommitRefName: string, packageReleaseBranchPrefix?: string): boolean {
  return packageReleaseBranchPrefix !== undefined && ciCommitRefName.includes(packageReleaseBranchPrefix);
}

function determineBranchArgs(
  branchAttribute: string | undefined,
  ciCommitRefName: string,
  packageReleaseBranchPrefix?: string,
): string[] {
  if (branchAttribute) {
    return ['--branch', branchAttribute];
  }
  if (!refIncludesPrefix(ciCommitRefName, packageReleaseBranchPrefix)) {
    return ['--branch', ciCommitRefName];
  }
  return [];
}

function determineVersionTag(
  version: string,
  branchAttribute: string | undefined,
  ciCommitRefName: string,
  packageReleaseBranchPrefix?: string,
): string {
  const versionTag = `v${version}`;
  if (branchAttribute) {
    return `${versionTag}-${branchAttribute}`;
  }
  if (refIncludesPrefix(ciCommitRefName, packageReleaseBranchPrefix)) {
    return versionTag;
  }
  return `${versionTag}-${ciCommitRefName}`;
}

function resolveMinimumCoverage(codeCoverageMinimum: string | undefined, sfdxProjectJson: SfdxProject): number {
  let minCoverage = parseInt(codeCoverageMinimum ?? '75', 10);
  if (Number.isNaN(minCoverage)) {
    minCoverage = 75;
  }
  const projectMinCoverage = getPluginConfig<string>(
    sfdxProjectJson,
    'plugins.simply.coverageRequirement.minimumCoverageRequired',
  );
  if (projectMinCoverage) {
    const parsedProjectMin = parseInt(projectMinCoverage, 10);
    if (!Number.isNaN(parsedProjectMin)) {
      minCoverage = parsedProjectMin;
    }
  }
  return minCoverage;
}

async function pollPackageVersionCreation(createRequestId: string): Promise<string> {
  for (;;) {
    // eslint-disable-next-line no-await-in-loop -- each poll must wait for the previous one's result before deciding to continue
    const { stdout: reportStdout } = await runSf([
      'package',
      'version',
      'create',
      'report',
      '--package-create-request-id',
      createRequestId,
      '--json',
    ]);
    const report = (JSON.parse(reportStdout) as { result: PackageVersionCreateReport[] }).result[0];
    logger.info(`Polling package creation status: ${report.Status}`);
    if (report.Status === 'Error') {
      throw new Error(`Package creation failed: ${report.Error ?? 'unknown error'}`);
    }
    if (report.Status === 'Success') {
      const subscriberPackageVersionId = report.SubscriberPackageVersionId ?? '';
      logger.success(`Package version created successfully: ${subscriberPackageVersionId}`);
      return subscriberPackageVersionId;
    }
    // eslint-disable-next-line no-await-in-loop -- polling must space requests out; nothing else to do meanwhile
    await new Promise((resolve) => {
      setTimeout(resolve, 60_000);
    });
  }
}

export type CreatePackageVersionOptions = {
  ciCommitRefName: string;
  ciCommitSha: string;
  ciPipelineId: string;
  ciPipelineSource?: string;
  ciPipelineUrl: string;
  ciProjectPath: string;
  projectAccessToken: string;
  devhubToolingUsername: string;
  devhubToolingClientId: string;
  devhubToolingInstanceUrl: string;
  jwtKeyFile: string;
  debug?: boolean;
  alwaysCreatePackage?: boolean;
  packageReleaseBranchPrefix?: string;
  codeCoverageMinimum?: string;
  vcsHost?: string;
  vcsProvider: VcsProviderKind;
};

/**
 * Creates a new package version for the default package directory, verifies it meets minimum code
 * coverage, and creates/pushes a version-tracking git tag. No-ops (without error) when the pipeline
 * was triggered by a merge request, or when this isn't a release-branch build and
 * `alwaysCreatePackage` wasn't requested.
 */
export async function createPackageVersion(options: CreatePackageVersionOptions): Promise<void> {
  if (options.ciPipelineSource === 'merge_request_event') {
    logger.info('Not a release branch build. Skipping package creation.');
    return;
  }
  if (!options.alwaysCreatePackage && !refIncludesPrefix(options.ciCommitRefName, options.packageReleaseBranchPrefix)) {
    logger.info('Not a release branch build and alwaysCreatePackage is not TRUE. Skipping package creation.');
    return;
  }

  logger.info('Creating new package version...');
  const vcsProvider = createVcsProvider(options.vcsProvider, {
    host: options.vcsHost,
    token: options.projectAccessToken,
  });
  const remoteAlias = await addGitRemote(
    options.ciPipelineId,
    options.projectAccessToken,
    options.ciProjectPath,
    vcsProvider,
  );

  await authenticateOrg({
    username: options.devhubToolingUsername,
    clientId: options.devhubToolingClientId,
    instanceUrl: options.devhubToolingInstanceUrl,
    jwtKeyFile: options.jwtKeyFile,
    setDefaultDevHub: true,
    debug: options.debug,
  });

  const sfdxProjectJson = await readSfdxProject();
  const defaultPackageDir = getDefaultPackageDirectory(sfdxProjectJson);
  const { definitionFile, package: packageAlias, branch: branchAttribute } = defaultPackageDir ?? {};
  if (!definitionFile || !packageAlias) {
    throw new Error(
      '`package` and `definitionFile` must be specified in the default package directory in sfdx-project.json',
    );
  }

  const branchArgs = determineBranchArgs(branchAttribute, options.ciCommitRefName, options.packageReleaseBranchPrefix);
  const { stdout: createStdout } = await runSf([
    'package',
    'version',
    'create',
    '--code-coverage',
    '--package',
    packageAlias,
    '--definition-file',
    definitionFile,
    '--version-description',
    options.ciPipelineUrl,
    '--tag',
    options.ciCommitSha,
    ...branchArgs,
    '--installation-key-bypass',
    '--wait',
    '0',
    '--json',
  ]);
  const createRequestId = (JSON.parse(createStdout) as { result: { Id: string } }).result.Id;
  logger.info(`Package version creation requested. Request ID: ${createRequestId}`);

  const subscriberPackageVersionId = await pollPackageVersionCreation(createRequestId);
  await fs.writeFile('subscriberPackageVersionId.env', `SUBSCRIBER_PACKAGE_VERSION_ID=${subscriberPackageVersionId}`);

  const { stdout: versionReportStdout } = await runSf([
    'package',
    'version',
    'report',
    '--package',
    subscriberPackageVersionId,
    '--json',
  ]);
  const versionReport = (
    JSON.parse(versionReportStdout) as {
      result: { Version: string; CodeCoverage: { apexCodeCoveragePercentage: number } };
    }
  ).result;
  const codeCoverage = versionReport.CodeCoverage.apexCodeCoveragePercentage;
  const minCoverage = resolveMinimumCoverage(options.codeCoverageMinimum, sfdxProjectJson);
  logger.info(`Actual code coverage: ${codeCoverage}%. Required minimum: ${minCoverage}%.`);
  if (codeCoverage < minCoverage) {
    throw new Error(`Code coverage of ${codeCoverage}% is less than the required minimum of ${minCoverage}%.`);
  }

  const versionTag = determineVersionTag(
    versionReport.Version,
    branchAttribute,
    options.ciCommitRefName,
    options.packageReleaseBranchPrefix,
  );
  await execa('git', ['tag', '-a', versionTag, '-m', subscriberPackageVersionId]);
  await execa('git', ['push', remoteAlias, versionTag]);
  logger.success(`Successfully created and pushed git tag: ${versionTag}`);
}
