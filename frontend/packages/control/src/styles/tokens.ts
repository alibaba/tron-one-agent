/*
 * Copyright 2026 the original author or authors.
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

import type React from 'react';

/**
 * Design tokens for use in TSX inline styles.
 * Must stay in sync with tokens.less / DESIGN.md.
 */

export const colors = {
  primary: '#1677ff',
  primaryFocus: '#4096ff',
  primaryOnDark: '#69b1ff',
  primaryHover: '#0958d9',

  ink: '#1a1a1a',
  body: '#1a1a1a',
  bodyOnDark: '#ffffff',
  bodyMuted: '#8c8c8c',
  inkMuted80: '#333333',
  inkMuted48: '#8c8c8c',

  dividerSoft: '#f0f0f0',
  hairline: '#e8e8e8',

  canvas: '#ffffff',
  canvasParchment: '#f5f7fa',
  surfacePearl: '#fafbfc',
  surfaceTile1: '#0a1628',
  surfaceBlack: '#000000',

  onPrimary: '#ffffff',
  onDark: '#ffffff',

  gradientCardPurple: '#f3e8ff',
  gradientCardBlue: '#e6f4ff',
  gradientCardTeal: '#e6fffb',
  gradientCardDark: '#141b2d',

  accentPurple: '#722ed1',
  accentPurpleLight: '#9254de',
  accentGold: '#faad14',
  accentOrange: '#fa8c16',

  statusDanger: '#ff4d4f',
  statusSuccess: '#52c41a',

  inkMuted60: '#595959',
  borderDefault: '#d9d9d9',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 80,
} as const;

export const radius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 9999,
} as const;

export const fontSize = {
  hero: 56,
  displayLg: 40,
  displayMd: 32,
  lead: 24,
  tagline: 20,
  bodyStrong: 16,
  body: 14,
  caption: 13,
  finePrint: 12,
  stat: 48,
} as const;

export const fontWeight = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/** Common inline style presets for Modal.confirm and similar contexts */
export const commonStyles = {
  confirmBox: {
    padding: `${spacing.sm}px`,
    background: colors.canvasParchment,
    borderRadius: `${radius.sm}px`,
    margin: `${spacing.sm}px 0`,
  } as React.CSSProperties,

  confirmWarning: {
    color: colors.accentPurple,
    fontWeight: fontWeight.medium,
  } as React.CSSProperties,

  codePreview: {
    maxHeight: '300px',
    overflow: 'auto' as const,
    padding: `${spacing.md}px`,
    background: colors.surfacePearl,
    border: `1px solid ${colors.dividerSoft}`,
    borderRadius: `${radius.md}px`,
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    fontSize: `${fontSize.finePrint}px`,
  } as React.CSSProperties,

  emptyState: {
    padding: '40px',
    textAlign: 'center' as const,
    background: colors.surfacePearl,
    border: `1px solid ${colors.dividerSoft}`,
    borderRadius: `${radius.md}px`,
  } as React.CSSProperties,

  listContainer: {
    border: `1px solid ${colors.dividerSoft}`,
    borderRadius: `${radius.sm}px`,
    padding: `${spacing.md}px`,
    minHeight: 200,
    maxHeight: 350,
    overflow: 'auto' as const,
    background: colors.surfacePearl,
  } as React.CSSProperties,

  infoBox: {
    padding: `${spacing.sm}px`,
    background: colors.gradientCardBlue,
    border: `1px solid ${colors.primaryFocus}`,
    borderRadius: `${radius.sm}px`,
  } as React.CSSProperties,

  descriptionText: {
    fontSize: `${fontSize.caption}px`,
    color: colors.inkMuted80,
    lineHeight: '1.4',
    marginTop: `${spacing.xxs}px`,
  } as React.CSSProperties,

  mutedText: {
    fontSize: `${fontSize.finePrint}px`,
    color: colors.bodyMuted,
    lineHeight: '1.4',
  } as React.CSSProperties,
} as const;
