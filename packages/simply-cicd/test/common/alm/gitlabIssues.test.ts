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

import { describe, expect, it } from 'vitest';
import { GitLabIssuesProvider } from '../../../src/common/alm/gitlabIssues.js';
import { createAlmProvider, listAlmProviderKinds } from '../../../src/common/alm/index.js';

describe('GitLabIssuesProvider', () => {
  const provider = new GitLabIssuesProvider();

  it('finds bare issue references, deduplicated', () => {
    const issues = provider.extractIssues('a1 closes #12\nb2 refs #7\nc3 also #12', []);

    expect(issues.map((issue) => issue.key)).toEqual(['#7', '#12']);
  });

  it('sorts numerically rather than lexicographically', () => {
    const issues = provider.extractIssues('#10 #9 #100 #1', []);

    expect(issues.map((issue) => issue.key)).toEqual(['#1', '#9', '#10', '#100']);
  });

  it('ignores project keys, which it has no use for', () => {
    expect(provider.extractIssues('closes #3', ['PROJ'])).toEqual([{ key: '#3', label: '#3', urlSegment: '3' }]);
  });

  it('does not treat a word-attached hash as an issue reference', () => {
    expect(provider.extractIssues('bump C#1 and sha abc#5', [])).toEqual([]);
  });

  it('returns nothing when the log has no references', () => {
    expect(provider.extractIssues('a1 no references here', [])).toEqual([]);
  });

  it('links the number while displaying the hash form', () => {
    const issues = provider.extractIssues('closes #42', []);

    expect(provider.render(issues, 'https://gitlab.com/group/project/-/issues')).toEqual({
      plain: '#42',
      html: "<a href='https://gitlab.com/group/project/-/issues/42'>#42</a>",
    });
  });

  it('exposes its kind and noun', () => {
    expect(provider.kind).toBe('gitlab-issues');
    expect(provider.issueNoun).toBe('issue');
  });
});

describe('alm registry', () => {
  it('registers both built-in providers', () => {
    expect(listAlmProviderKinds()).toEqual(['gitlab-issues', 'jira']);
  });

  it('builds a provider by kind', () => {
    expect(createAlmProvider('jira').kind).toBe('jira');
    expect(createAlmProvider('gitlab-issues').kind).toBe('gitlab-issues');
  });

  it('names the registered providers when asked for an unknown one', () => {
    expect(() => createAlmProvider('bugzilla' as never)).toThrow(
      'ALM provider "bugzilla" is not supported. Registered providers: gitlab-issues, jira.',
    );
  });
});
