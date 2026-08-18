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

import { GitLabIssuesProvider } from './gitlabIssues.js';
import { JiraProvider } from './jira.js';
import { registerAlmProvider } from './registry.js';

registerAlmProvider('jira', () => new JiraProvider());
registerAlmProvider('gitlab-issues', () => new GitLabIssuesProvider());

export { createAlmProvider, listAlmProviderKinds, registerAlmProvider } from './registry.js';

export { GitLabIssuesProvider } from './gitlabIssues.js';
export { JiraProvider } from './jira.js';

export type { AlmIssueRef, AlmIssueRendering, AlmProvider, AlmProviderFactory, AlmProviderKind } from './types.js';
