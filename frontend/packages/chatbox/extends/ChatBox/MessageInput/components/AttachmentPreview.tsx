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


import React from 'react';
import { AttachmentItem } from '../types';
import styles from '../index.module.less';

interface AttachmentPreviewProps {
  attachments: AttachmentItem[];
  onRemove: (index: number) => void;
}

export function AttachmentPreview({ attachments, onRemove }: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <div className={styles.attachmentPreview}>
      {attachments.map((attachment, index) => (
        <div key={index} className={styles.attachmentItem}>
          {attachment.type === 'image' ? (
            <img src={attachment.previewUrl} alt={attachment.file.name} />
          ) : (
            <div className={styles.videoPreview}>
              <video src={attachment.previewUrl} />
              <i className="fas fa-play-circle"></i>
            </div>
          )}
          {/* 上传中 覆盖层 */}
          {attachment.uploading && (
            <div className={styles.attachmentOverlay}>
              <i className="fas fa-spinner fa-spin"></i>
            </div>
          )}
          {/* 上传失败 覆盖层 */}
          {attachment.uploadError && (
            <div className={`${styles.attachmentOverlay} ${styles.attachmentOverlayError}`}>
              <i className="fas fa-exclamation-circle"></i>
              <span>上传失败</span>
            </div>
          )}
          <button
            className={styles.removeAttachment}
            onClick={() => onRemove(index)}
            title="移除"
          >
            <i className="fas fa-times"></i>
          </button>
          <div className={styles.attachmentName}>{attachment.file.name}</div>
        </div>
      ))}
    </div>
  );
}
