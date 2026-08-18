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
import { GitLabProvider } from '../../../src/common/vcs/gitlab.js';

function jsonResponse(
  body: unknown,
  init: { ok?: boolean; status?: number; statusText?: string; headers?: Record<string, string> } = {},
): Response {
  const headers = new Headers(init.headers ?? {});
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    headers,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

describe('GitLabProvider', () => {
  const host = 'gitlab.example.com';
  const apiUrl = `https://${host}/api/v4`;
  const token = 'test-token';
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws if the token is missing', () => {
    expect(() => new GitLabProvider({ host, token: '' })).toThrow('GitLab access token is required.');
  });

  it('falls back to gitlab.com when no host is supplied', () => {
    expect(new GitLabProvider({ token }).host).toBe('gitlab.com');
  });

  it('derives the API URL from the host, and the host from an explicit API URL', () => {
    expect(new GitLabProvider({ host, token }).host).toBe(host);
    expect(new GitLabProvider({ token, apiUrl }).host).toBe(host);
  });

  it('paginates listProjects using the X-Next-Page header', async () => {
    /* eslint-disable camelcase -- GitLab API field names */
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse([{ id: 1, name: 'proj-1', path_with_namespace: 'group/proj-1' }], {
          headers: { 'X-Next-Page': '2' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse([{ id: 2, name: 'proj-2', path_with_namespace: 'group/proj-2' }], { headers: {} }),
      );
    /* eslint-enable camelcase */

    const provider = new GitLabProvider({ host, token });
    const projects = await provider.listProjects('123');

    expect(projects).toHaveLength(2);
    expect(projects[0]).toMatchObject({ id: 1, name: 'proj-1', pathWithNamespace: 'group/proj-1' });
    expect(projects[1]).toMatchObject({ id: 2, name: 'proj-2', pathWithNamespace: 'group/proj-2' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('stops pagination when a page returns no results', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    const provider = new GitLabProvider({ host, token });
    const projects = await provider.listProjects('123');

    expect(projects).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('branchExists returns false on a 404 and rethrows other errors', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse('Not Found', { ok: false, status: 404, statusText: 'Not Found' }))
      .mockResolvedValueOnce(jsonResponse('Server Error', { ok: false, status: 500, statusText: 'Server Error' }));

    const provider = new GitLabProvider({ host, token });

    await expect(provider.branchExists('123', 'missing-branch')).resolves.toBe(false);
    await expect(provider.branchExists('123', 'other-branch')).rejects.toThrow(/GitLab API error: 500/);
  });

  it('throws a formatted error on a non-OK response', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse('Unauthorized', { ok: false, status: 401, statusText: 'Unauthorized' }),
    );

    const provider = new GitLabProvider({ host, token });

    await expect(provider.getFileContent('123', 'sfdx-project.json', 'main')).rejects.toThrow(
      'GitLab API error: 401 Unauthorized - Unauthorized',
    );
  });

  it('getProjectVariables swallows errors and returns an empty array', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse('Forbidden', { ok: false, status: 403, statusText: 'Forbidden' }));

    const provider = new GitLabProvider({ host, token });
    const variables = await provider.getProjectVariables('123');

    expect(variables).toEqual([]);
  });

  it('getProjectVariables normalizes key/value pairs', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ key: 'FOO', value: 'bar' }]));

    const provider = new GitLabProvider({ host, token });
    const variables = await provider.getProjectVariables('123');

    expect(variables).toEqual([{ key: 'FOO', value: 'bar', raw: { key: 'FOO', value: 'bar' } }]);
  });

  it('builds authenticated remote URLs for push/tag and CI-job clone operations', () => {
    const provider = new GitLabProvider({ host, token });

    expect(provider.buildAuthenticatedRemoteUrl('access-token', 'group/project')).toBe(
      `https://oauth2:access-token@${host}/group/project.git`,
    );
    expect(provider.buildCiCloneUrl('ci-job-token', 'group/project')).toBe(
      `https://gitlab-ci-token:ci-job-token@${host}/group/project.git`,
    );
  });

  it('createMergeRequest includes labels only when provided', async () => {
    /* eslint-disable camelcase -- GitLab API field names */
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 1, iid: 1, title: 't', source_branch: 'a', target_branch: 'b' }),
    );
    /* eslint-enable camelcase */

    const provider = new GitLabProvider({ host, token });
    await provider.createMergeRequest('123', 'a', 'b', 't', 'd');

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as Record<string, unknown>;
    expect(body.labels).toBeUndefined();
  });

  it('findOpenMergeRequest returns undefined when none are open', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    const provider = new GitLabProvider({ host, token });
    const result = await provider.findOpenMergeRequest('123', 'a', 'b');

    expect(result).toBeUndefined();
  });
});
