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

import type { AlmIssueRef, AlmIssueRendering, AlmProvider } from './types.js';

/**
 * Matches GitLab's issue reference syntax: a bare `#123`, not preceded by a word character so that
 * a trailing `#` in something like `abc#1` is still caught but `C#1` is not treated as an issue.
 */
const ISSUE_PATTERN = /(?<![\w#])#(?<number>\d+)\b/g;

/**
 * An `AlmProvider` for GitLab Issues, which numbers issues per project rather than prefixing them
 * with a project key. `projectKeys` is therefore unused.
 */
export class GitLabIssuesProvider implements AlmProvider {
  public readonly kind = 'gitlab-issues' as const;

  public readonly issueNoun = 'issue';

  /* eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars --
     class-methods-use-this: part of the AlmProvider instance contract; matching needs no instance state.
     no-unused-vars: `projectKeys` is declared to match the interface, but GitLab numbers issues per
     project, so there are no key prefixes to filter on. */
  public extractIssues(commitLog: string, projectKeys: string[] = []): AlmIssueRef[] {
    const numbers = new Set<number>();
    for (const match of commitLog.matchAll(ISSUE_PATTERN)) {
      const parsed = Number(match.groups?.number);
      if (Number.isInteger(parsed)) {
        numbers.add(parsed);
      }
    }

    // Issue numbers sort numerically; a lexicographic sort would put #10 before #9.
    return [...numbers]
      .sort((a, b) => a - b)
      .map((number) => ({ key: `#${number}`, label: `#${number}`, urlSegment: String(number) }));
  }

  // eslint-disable-next-line class-methods-use-this -- part of the AlmProvider instance contract; rendering needs no instance state
  public render(issues: AlmIssueRef[], baseUrl?: string): AlmIssueRendering {
    const plain = issues.map((issue) => issue.label).join(', ');
    const html = baseUrl
      ? issues.map((issue) => `<a href='${baseUrl}/${issue.urlSegment}'>${issue.label}</a>`).join(', ')
      : plain;
    return { plain, html };
  }
}
