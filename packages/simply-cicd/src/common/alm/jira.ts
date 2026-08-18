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

/** Escapes a configured project key so it can be embedded in the match pattern literally. */
function escapeKey(projectKey: string): string {
  return projectKey.replace(/[-/^$*+?.()|[\]{}]/g, '\\$&');
}

/** An `AlmProvider` for Jira, which keys issues as `PROJECT-123`. */
export class JiraProvider implements AlmProvider {
  public readonly kind = 'jira' as const;

  public readonly issueNoun = 'story';

  // eslint-disable-next-line class-methods-use-this -- part of the AlmProvider instance contract; matching needs no instance state
  public extractIssues(commitLog: string, projectKeys: string[]): AlmIssueRef[] {
    if (projectKeys.length === 0) {
      return [];
    }

    const pattern = new RegExp(`(?:${projectKeys.map(escapeKey).join('|')})-[0-9]+`, 'gi');
    // Matching against the upper-cased log normalizes keys written in mixed case.
    const matches = commitLog.toUpperCase().match(pattern) ?? [];

    return [...new Set(matches)].sort().map((key) => ({ key, label: key, urlSegment: key }));
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
