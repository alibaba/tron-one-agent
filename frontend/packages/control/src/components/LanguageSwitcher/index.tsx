/*
 * Copyright 2026 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import React, { useMemo } from 'react';
import { Button, Dropdown, type MenuProps } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { LANG_STORAGE_KEY, SUPPORTED_LANGS } from '@/i18n';

interface Props {
  /** When true, render only the icon button without surrounding spacing. */
  compact?: boolean;
}

const LanguageSwitcher: React.FC<Props> = ({ compact }) => {
  const { i18n, t } = useTranslation('layout');

  const currentLang = useMemo(() => {
    const lng = (i18n.language || '').toLowerCase();
    return lng.startsWith('en') ? 'en-US' : 'zh-CN';
  }, [i18n.language]);

  const items: MenuProps['items'] = SUPPORTED_LANGS.map((lng) => ({
    key: lng,
    label: lng === 'en-US' ? t('languageEn') : t('languageZh'),
  }));

  const onClick: MenuProps['onClick'] = ({ key }) => {
    if (key === currentLang) return;
    i18n.changeLanguage(key);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, key);
    } catch {
      /* ignore quota or privacy errors */
    }
  };

  return (
    <Dropdown
      menu={{ items, onClick, selectedKeys: [currentLang] }}
      placement="bottomRight"
      trigger={['click']}
    >
      <Button
        type="text"
        icon={<GlobalOutlined />}
        style={compact ? undefined : { marginRight: 4 }}
      >
        {currentLang === 'en-US' ? t('languageEn') : t('languageZh')}
      </Button>
    </Dropdown>
  );
};

export default LanguageSwitcher;
