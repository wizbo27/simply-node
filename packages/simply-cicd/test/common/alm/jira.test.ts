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
import { JiraProvider } from '../../../src/common/alm/jira.js';

describe('JiraProvider', () => {
  const provider = new JiraProvider();

  it('returns nothing when no project keys are configured', () => {
    expect(provider.extractIssues('abc123 PROJ-1 fix things', [])).toEqual([]);
  });

  it('finds keys for the configured projects, deduplicated and sorted', () => {
    const issues = provider.extractIssues(
      'a1 PROJ-2 first\nb2 PLAT-9 second\nc3 PROJ-2 duplicate\nd4 OTHER-1 ignored',
      ['PROJ', 'PLAT'],
    );

    expect(issues.map((issue) => issue.key)).toEqual(['PLAT-9', 'PROJ-2']);
  });

  it('matches case-insensitively and normalizes to upper case', () => {
    const issues = provider.extractIssues('fix proj-7 and Proj-8', ['PROJ']);

    expect(issues.map((issue) => issue.key)).toEqual(['PROJ-7', 'PROJ-8']);
  });

  it('treats regex metacharacters in a project key literally', () => {
    const issues = provider.extractIssues('a1 A.B-1 and AXB-2', ['A.B']);

    expect(issues.map((issue) => issue.key)).toEqual(['A.B-1']);
  });

  it('renders plain text when no base URL is given', () => {
    const issues = provider.extractIssues('a1 PROJ-1 b2 PROJ-2', ['PROJ']);

    expect(provider.render(issues)).toEqual({
      plain: 'PROJ-1, PROJ-2',
      html: 'PROJ-1, PROJ-2',
    });
  });

  it('renders links against the base URL, preserving the original markup shape', () => {
    const issues = provider.extractIssues('a1 PROJ-1', ['PROJ']);

    expect(provider.render(issues, 'https://jira.example.com/browse').html).toBe(
      "<a href='https://jira.example.com/browse/PROJ-1'>PROJ-1</a>",
    );
  });

  it('exposes its kind and noun', () => {
    expect(provider.kind).toBe('jira');
    expect(provider.issueNoun).toBe('story');
  });
});
