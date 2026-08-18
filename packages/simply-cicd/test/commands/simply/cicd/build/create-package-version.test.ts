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
import { createPackageVersion } from '../../../../../src/common/build/createPackageVersion.js';
import BuildCreatePackageVersion from '../../../../../src/commands/simply/cicd/build/create-package-version.js';

vi.mock('../../../../../src/common/build/createPackageVersion.js', () => ({ createPackageVersion: vi.fn() }));

const baseArgs = [
  '--ci-commit-ref-name',
  'main',
  '--ci-commit-sha',
  'abc123',
  '--ci-pipeline-id',
  '999',
  '--ci-pipeline-url',
  'https://gitlab.example.com/pipelines/999',
  '--ci-project-path',
  'group/project',
  '--project-access-token',
  'secret-token',
  '--devhub-tooling-username',
  'devhub-tooling@example.com',
  '--devhub-tooling-client-id',
  'tooling-id',
  '--devhub-tooling-instance-url',
  'https://login.salesforce.com',
  '--jwt-key-file',
  'key.file',
];

describe('build create-package-version', () => {
  const originalPackageChanged = process.env.PACKAGE_CHANGED;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PACKAGE_CHANGED;
    vi.mocked(createPackageVersion).mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.PACKAGE_CHANGED = originalPackageChanged;
  });

  it('parses flags and delegates to createPackageVersion, defaulting vcs-provider/code-coverage-minimum', async () => {
    const result = await BuildCreatePackageVersion.run(baseArgs);

    expect(result.skipped).toBe(false);
    expect(createPackageVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        ciCommitRefName: 'main',
        ciCommitSha: 'abc123',
        ciPipelineId: '999',
        vcsHost: undefined,
        vcsProvider: 'gitlab',
        codeCoverageMinimum: '75',
        alwaysCreatePackage: false,
      }),
    );
  });

  it('passes --ci-pipeline-source through', async () => {
    await BuildCreatePackageVersion.run([...baseArgs, '--ci-pipeline-source', 'merge_request_event']);

    expect(createPackageVersion).toHaveBeenCalledWith(
      expect.objectContaining({ ciPipelineSource: 'merge_request_event' }),
    );
  });

  it('skips when --disabled is passed', async () => {
    const result = await BuildCreatePackageVersion.run([...baseArgs, '--disabled']);

    expect(result.skipped).toBe(true);
    expect(createPackageVersion).not.toHaveBeenCalled();
  });

  it('skips when PACKAGE_CHANGED is FALSE', async () => {
    process.env.PACKAGE_CHANGED = 'FALSE';

    const result = await BuildCreatePackageVersion.run(baseArgs);

    expect(result.skipped).toBe(true);
    expect(createPackageVersion).not.toHaveBeenCalled();
  });
});
