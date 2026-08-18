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

import type { AlmProvider, AlmProviderFactory, AlmProviderKind } from './types.js';

const factories = new Map<AlmProviderKind, AlmProviderFactory>();

/**
 * Registers an ALM implementation. Built-in providers register themselves when `./index.js` is
 * imported; call this directly to add a tracker without modifying this package.
 */
export function registerAlmProvider(kind: AlmProviderKind, factory: AlmProviderFactory): void {
  factories.set(kind, factory);
}

/** The trackers currently registered, for flag options and error messages. */
export function listAlmProviderKinds(): AlmProviderKind[] {
  return [...factories.keys()].sort();
}

/** Builds a provider for the given ALM tool. */
export function createAlmProvider(kind: AlmProviderKind): AlmProvider {
  const factory = factories.get(kind);
  if (!factory) {
    const known = listAlmProviderKinds().join(', ');
    throw new Error(`ALM provider "${kind as string}" is not supported. Registered providers: ${known}.`);
  }
  return factory();
}
