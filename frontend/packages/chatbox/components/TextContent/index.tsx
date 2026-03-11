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


import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "github-markdown-css/github-markdown-light.css";
import "katex/dist/katex.min.css";
import styles from "./index.module.less";

export interface TextContentProps {
  text: string;
  customTagMap?: Record<string, React.FC<any>>;
  markdownComponents?: Record<string, React.FC<any>>;
  isUser?: boolean;
  status?: string;
}
const TextContentRender: React.FC<TextContentProps> = ({
  text,
  markdownComponents,
  customTagMap,
  isUser = false,
}) => {
  if (!text) return null;

  const CustomLink = ({
    href,
    children,
  }: {
    href?: string;
    children: React.ReactNode;
  }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );

  // 自定义标签组件
  const CustomTag = ({
    type,
    placeholder,
    children,
  }: {
    type?: string;
    placeholder?: string;
    children: React.ReactNode;
  }) => {
    const parseState = useMemo(() => {
      try {
        return {
          isLoading: false,
          data: JSON.parse((children as string).trim()),
          error: null,
        };
      } catch (e) {
        return {
          isLoading: true,
          data: null,
          error: e,
        };
      }
    }, [children]);

    if (parseState.isLoading && placeholder) {
      return (
        <span>
          <i className="fas fa-spinner fa-spin"></i>
          <span>{placeholder || "正在加载..."}</span>
        </span>
      );
    }

    const CustomComponent = type && customTagMap?.[type];

    if (CustomComponent && parseState.data) {
      return (
        <CustomComponent
          data={parseState.data}
          raw={children}
          type={type}
        />
      );
    }

    return (
      <div
        className={`${styles.customTag} ${
          styles[`customTag${type || "default"}`]
        }`}
      >
        {parseState.data ? (
          <pre>{JSON.stringify(parseState.data, null, 2)}</pre>
        ) : (
          <div className={styles.parseError}>
            <div className={styles.errorMessage}>
              解析错误: {String(parseState.error)}
            </div>
            <div className={styles.rawContent}>{children}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`${styles.textContent} ${styles.markdownBody} ${
        isUser ? styles.userContent : styles.agentContent
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeHighlight, { ignoreMissing: true }],
          rehypeKatex,
          rehypeRaw,
        ]}
        skipHtml={false}
        components={{
          a: CustomLink,
          customtag: CustomTag,
          ...markdownComponents,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};

export default TextContentRender;
