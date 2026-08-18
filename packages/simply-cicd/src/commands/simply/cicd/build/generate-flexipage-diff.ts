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

import { Messages } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { generateFlexipageDiff, type GenerateFlexipageDiffResult } from '../../../../common/build/flexipageDelta.js';
import { debugFlag, diffFlags, disabledFlag } from '../../../../common/build/flags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.build.generate-flexipage-diff');

/** Generates a FlexiPage delta between two commits and posts the results to the merge request. */
export default class BuildGenerateFlexipageDiff extends SfCommand<GenerateFlexipageDiffResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...diffFlags,
    ...debugFlag,
    ...disabledFlag,
  };

  public async run(): Promise<GenerateFlexipageDiffResult> {
    const { flags } = await this.parse(BuildGenerateFlexipageDiff);

    return generateFlexipageDiff({
      from: flags.from,
      to: flags.to,
      out: flags.out,
      projectAccessToken: flags['project-access-token'],
      vcsHost: flags['vcs-host'],
      vcsProvider: flags['vcs-provider'],
      commitSha: flags['ci-commit-sha'],
      ciProjectId: flags['ci-project-id'],
      ciMergeRequestIid: flags['ci-merge-request-iid'],
      ciRepository: flags['ci-repository'],
      ciPullRequestNumber: flags['ci-pull-request-number'],
      ciRunId: flags['ci-run-id'],
      ciServerUrl: flags['ci-server-url'],
      debug: flags.debug,
      disabled: flags.disabled,
    });
  }
}
