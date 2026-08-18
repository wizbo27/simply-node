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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFallbackTag } from '../../../../../src/common/build/createFallbackTag.js';
import BuildCreateFallbackTag from '../../../../../src/commands/simply/cicd/build/create-fallback-tag.js';

vi.mock('../../../../../src/common/build/createFallbackTag.js', () => ({ createFallbackTag: vi.fn() }));

const baseArgs = [
  '--ci-commit-ref-name',
  'main',
  '--ci-project-path',
  'bems/my-project',
  '--project-access-token',
  'secret-token',
  '--ci-pipeline-id',
  '999',
];

describe('build create-fallback-tag', () => {
  const originalPackageChanged = process.env.PACKAGE_CHANGED;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PACKAGE_CHANGED;
    vi.mocked(createFallbackTag).mockResolvedValue({ created: true, tag: 'v1.1.0-1', packageId: '04t123456789012' });
  });

  afterEach(() => {
    process.env.PACKAGE_CHANGED = originalPackageChanged;
  });

  it('parses flags and delegates to createFallbackTag, defaulting --out and vcs-provider', async () => {
    const result = await BuildCreateFallbackTag.run(baseArgs);

    expect(result).toEqual({ skipped: false, created: true, tag: 'v1.1.0-1', packageId: '04t123456789012' });
    expect(createFallbackTag).toHaveBeenCalledWith(
      expect.objectContaining({
        ciCommitRefName: 'main',
        ciProjectPath: 'bems/my-project',
        projectAccessToken: 'secret-token',
        ciPipelineId: '999',
        out: 'subscriberPackageVersionId.env',
        vcsHost: undefined,
        vcsProvider: 'gitlab',
      }),
    );
  });

  it('passes --last-tag through', async () => {
    await BuildCreateFallbackTag.run([...baseArgs, '--last-tag', 'v2.0.0']);

    expect(createFallbackTag).toHaveBeenCalledWith(expect.objectContaining({ lastTag: 'v2.0.0' }));
  });

  it('skips when --disabled is passed', async () => {
    const result = await BuildCreateFallbackTag.run([...baseArgs, '--disabled']);

    expect(result.skipped).toBe(true);
    expect(createFallbackTag).not.toHaveBeenCalled();
  });

  it('should skip create-fallback-tag if PACKAGE_CHANGED is TRUE', async () => {
    process.env.PACKAGE_CHANGED = 'TRUE';

    const result = await BuildCreateFallbackTag.run(baseArgs);

    expect(result.skipped).toBe(true);
    expect(createFallbackTag).not.toHaveBeenCalled();
  });
});
