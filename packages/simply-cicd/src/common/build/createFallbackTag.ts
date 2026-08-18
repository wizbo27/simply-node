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
import { getDefaultPackageDirectory, isSubscriberPackageVersionId, readSfdxProject } from '@simplysf/simply-core';
import { addGitRemote } from '../git.js';
import { logger } from '../logger.js';
import { createVcsProvider, type VcsProviderKind } from '../vcs/index.js';
import { buildTagMatchPattern } from './determinePackageChanges.js';

async function resolveTagMatchPattern(): Promise<string> {
  try {
    const defaultDir = getDefaultPackageDirectory(await readSfdxProject());
    return buildTagMatchPattern(defaultDir?.versionNumber);
  } catch {
    logger.info('Could not read version prefix from sfdx-project.json. Defaulting to match pattern v*');
    return 'v*';
  }
}

/**
 * Resolves the last tag to increment: the explicit `--last-tag`, if given, otherwise the closest
 * reachable tag matching the project's version prefix. Returns `''` (not a thrown error) when no
 * tag can be found, either because none exists yet or because `git describe` fails outright — a
 * fix from the original, where an unguarded `git describe` call meant "no tags yet" crashed the
 * whole job instead of soft-exiting the way "no valid package ID in the tag" already did.
 */
async function resolveLastTag(explicitLastTag: string | undefined): Promise<string> {
  if (explicitLastTag) {
    return explicitLastTag;
  }

  const tagMatchPattern = await resolveTagMatchPattern();
  try {
    const { stdout } = await execa('git', ['describe', '--tags', '--abbrev=0', '--match', tagMatchPattern]);
    return stdout.trim();
  } catch {
    return '';
  }
}

function extractPackageId(tagAnnotation: string): string {
  const parts = tagAnnotation.trim().split(/\s+/);
  return parts.find((part) => isSubscriberPackageVersionId(part) && (part.length === 15 || part.length === 18)) ?? '';
}

function computeNextTag(lastTag: string): string {
  const match = /^(?<baseVersion>v.*)-(?<suffix>\d+)$/.exec(lastTag);
  const baseVersion = match?.groups?.baseVersion ?? lastTag;
  const currentN = match?.groups?.suffix ? parseInt(match.groups.suffix, 10) : 0;
  return `${baseVersion}-${currentN + 1}`;
}

export type CreateFallbackTagOptions = {
  ciCommitRefName: string;
  ciProjectPath: string;
  projectAccessToken: string;
  ciPipelineId: string;
  lastTag?: string;
  out?: string;
  debug?: boolean;
  vcsHost?: string;
  vcsProvider: VcsProviderKind;
};

export type CreateFallbackTagResult = { created: boolean; tag?: string; packageId?: string };

/**
 * Creates and pushes a fallback git tag that increments the suffix of the last release tag and
 * annotates it with the previous package version's `04t` ID, for builds that didn't produce a new
 * package version. Soft no-ops (does not throw) when no last tag, or no valid package ID within
 * it, can be found — a build with nothing to fall back to just has nothing to do here.
 */
export async function createFallbackTag(options: CreateFallbackTagOptions): Promise<CreateFallbackTagResult> {
  logger.info('Starting fallback tagging process...');
  const outFile = options.out ?? 'subscriberPackageVersionId.env';

  const lastTag = await resolveLastTag(options.lastTag);
  if (!lastTag) {
    logger.warn('No previous tag found to increment.');
    return { created: false };
  }

  const { stdout: tagAnnotation } = await execa('git', ['tag', '-l', '-n1', lastTag]);
  const packageId = extractPackageId(tagAnnotation);
  if (!packageId) {
    logger.warn(`Could not find a valid 04t package ID in the annotation of last tag: ${lastTag}`);
    return { created: false };
  }

  logger.info(`Found last tag: ${lastTag} with package ID: ${packageId}`);
  const nextTag = computeNextTag(lastTag);
  logger.info(`Next fallback tag determined: ${nextTag}`);

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

  logger.info(`Tagging commit with tag: ${nextTag}`);
  await execa('git', ['tag', '-a', nextTag, '-m', packageId]);
  await execa('git', ['push', remoteAlias, nextTag]);
  logger.success(`Successfully created and pushed tag: ${nextTag}`);

  await fs.writeFile(outFile, `SUBSCRIBER_PACKAGE_VERSION_ID=${packageId}\n`, 'utf-8');
  logger.success(`Wrote package version ID to ${outFile}`);

  return { created: true, tag: nextTag, packageId };
}
