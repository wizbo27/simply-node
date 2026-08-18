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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateFlexipageDiff } from '../../../../../src/common/build/flexipageDelta.js';
import BuildGenerateFlexipageDiff from '../../../../../src/commands/simply/cicd/build/generate-flexipage-diff.js';

vi.mock('../../../../../src/common/build/flexipageDelta.js', () => ({ generateFlexipageDiff: vi.fn() }));

const baseArgs = [
  '--ci-project-id',
  '123',
  '--ci-merge-request-iid',
  '45',
  '--from',
  'abc123',
  '--to',
  'def456',
  '--project-access-token',
  'glpat-secret',
];

describe('build generate-flexipage-diff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateFlexipageDiff).mockResolvedValue({ skipped: false, success: true });
  });

  it('parses flags and delegates to generateFlexipageDiff', async () => {
    const result = await BuildGenerateFlexipageDiff.run(baseArgs);

    expect(result).toEqual({ skipped: false, success: true });
    expect(generateFlexipageDiff).toHaveBeenCalledWith({
      from: 'abc123',
      to: 'def456',
      out: undefined,
      projectAccessToken: 'glpat-secret',
      vcsHost: undefined,
      vcsProvider: 'gitlab',
      commitSha: undefined,
      ciProjectId: '123',
      ciMergeRequestIid: '45',
      ciRepository: undefined,
      ciPullRequestNumber: undefined,
      ciRunId: undefined,
      ciServerUrl: undefined,
      debug: false,
      disabled: false,
    });
  });

  it('passes --disabled through to generateFlexipageDiff', async () => {
    await BuildGenerateFlexipageDiff.run([...baseArgs, '--disabled']);

    expect(generateFlexipageDiff).toHaveBeenCalledWith(expect.objectContaining({ disabled: true }));
  });
});
