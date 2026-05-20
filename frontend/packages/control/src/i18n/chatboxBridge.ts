/*
 * Copyright 2026 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { i18n as I18n } from 'i18next';
import { setChatboxLocale, setBackendLabelMapper, type ChatboxLocale } from 'chatbox/locale';
import { mapBackendLabel } from './backendMap';

/**
 * Push the current `chatbox` namespace translations into the chatbox
 * package's internal locale registry. Called on app startup and on
 * every `languageChanged` event.
 */
export const syncChatboxLocale = (i18n: I18n): void => {
  const dict = i18n.getResourceBundle(i18n.language, 'chatbox') as
    | Partial<ChatboxLocale>
    | undefined;
  if (dict) {
    setChatboxLocale(dict);
  }
  // Register the backend label mapper so chatbox components can
  // translate tool names without depending on i18next.
  setBackendLabelMapper(mapBackendLabel);
};
