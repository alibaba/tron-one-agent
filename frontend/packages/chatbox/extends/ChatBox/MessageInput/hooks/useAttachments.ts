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


import { useState, useCallback, useRef } from 'react';
import { AttachmentItem } from '../types';
import { ContentType } from '../../../../types/enums';
import { uploadFile } from '../../../service';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function useAttachments(allowedTypes?: ContentType[]) {
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const newAttachments: AttachmentItem[] = [];
      const oversizedNames: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.size > MAX_FILE_SIZE) {
          oversizedNames.push(file.name);
          continue;
        }

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const isAudio = file.type.startsWith('audio/');

        let type: AttachmentItem['type'] | null = null;
        if (isImage && (!allowedTypes || allowedTypes.includes(ContentType.IMAGE))) {
          type = 'image';
        } else if (isVideo && (!allowedTypes || allowedTypes.includes(ContentType.VIDEO))) {
          type = 'video';
        } else if (isAudio && (!allowedTypes || allowedTypes.includes(ContentType.AUDIO))) {
          type = 'audio';
        }

        if (type) {
          newAttachments.push({
            file,
            previewUrl: URL.createObjectURL(file),
            type,
            uploading: true,
          });
        }
      }

      if (oversizedNames.length > 0) {
        const names = oversizedNames.join('、');
        alert(`以下文件超过 10MB 限制，已跳过：${names}`);
      }

      if (newAttachments.length > 0) {
        setAttachments((prev) => [...prev, ...newAttachments]);

        // 立即上传每个文件
        newAttachments.forEach((att) => {
          const { previewUrl } = att;
          uploadFile(att.file)
            .then((serverUrl) => {
              setAttachments((prev) =>
                prev.map((item) =>
                  item.previewUrl === previewUrl
                    ? { ...item, serverUrl, uploading: false }
                    : item
                )
              );
            })
            .catch(() => {
              setAttachments((prev) =>
                prev.map((item) =>
                  item.previewUrl === previewUrl
                    ? { ...item, uploading: false, uploadError: true }
                    : item
                )
              );
            });
        });
      }
      e.target.value = '';
    },
    [allowedTypes]
  );

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearAttachments = useCallback(() => {
    attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
    setAttachments([]);
  }, [attachments]);

  return {
    attachments,
    fileInputRef,
    handleFileSelect,
    handleFileChange,
    handleRemoveAttachment,
    clearAttachments,
  };
}
