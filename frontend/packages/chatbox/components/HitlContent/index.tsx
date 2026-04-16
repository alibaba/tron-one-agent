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


import React, { useState, useCallback, useMemo } from "react";
import type { HitlContent as HitlContentType, HitlQuestion } from "../../types";
import { ContentType } from "../../types/enums";
import styles from "./index.module.less";

export interface HitlSubmitPayload {
  type: ContentType.HITL;
  id: string;
  status?: number;
  result: string;
}

export interface HitlContentRenderProps {
  content: HitlContentType;
  onSubmit?: (payload: HitlSubmitPayload) => void;
}

type AnswerValue = string[];

const HitlContentRender: React.FC<HitlContentRenderProps> = ({ content, onSubmit }) => {
  const { properties, status, method } = content;
  const questions = properties?.questions || [];
  const total = questions.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});

  const handleOptionToggle = useCallback(
    (qIndex: number, label: string, multiSelect?: boolean) => {
      setAnswers((prev) => {
        const current = prev[qIndex] || [];
        if (multiSelect) {
          const next = current.includes(label)
            ? current.filter((l) => l !== label)
            : [...current, label];
          return { ...prev, [qIndex]: next };
        }
        return { ...prev, [qIndex]: [label] };
      });
    },
    []
  );

  const allAnswered = useMemo(() => {
    return questions.every((_, idx) => {
      const answer = answers[idx];
      return answer && answer.length > 0;
    });
  }, [questions, answers]);

  const currentAnswered = useMemo(() => {
    const answer = answers[currentIndex];
    return answer && answer.length > 0;
  }, [answers, currentIndex]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(total - 1, i + 1));
  }, [total]);

  const buildResult = useCallback(() => {
    return questions.map((q: HitlQuestion, idx: number) => {
      const selectedLabels = answers[idx] || [];
      const values = q.options
        .filter((opt) => selectedLabels.includes(opt.label))
        .map((opt) => ({ label: opt.label, description: opt.description }));
      return {
        header: q.header || "",
        question: q.question,
        values,
      };
    });
  }, [questions, answers]);

  const handleSubmit = useCallback(() => {
    if (!allAnswered || !onSubmit) return;
    const result = buildResult();
    onSubmit({
      type: ContentType.HITL,
      id: content.id,
      result: JSON.stringify(result),
    });
  }, [allAnswered, onSubmit, buildResult, content.id]);

  if (status !== 1 || method !== "question" || total === 0) {
    return null;
  }

  const q = questions[currentIndex];
  const selected = answers[currentIndex] || [];
  const isLast = currentIndex === total - 1;

  return (
    <div className={styles.hitlContainer}>
      {/* Tab header */}
      <div className={styles.tabHeader}>
        <div className={styles.tabHeaderLeft}>
          {q.header && (
            <span className={styles.headerLabel}>{q.header}</span>
          )}
          <span className={styles.headerDot}>·</span>
          <span className={styles.headerType}>
            {q.multiSelect ? "多选" : "单选"}
          </span>
        </div>
        <div className={styles.tabHeaderRight}>
          <button
            className={styles.navArrow}
            disabled={currentIndex === 0}
            onClick={goPrev}
            type="button"
            title="上一题"
          >
            <i className="fas fa-chevron-up"></i>
          </button>
          <span className={styles.pageIndicator}>
            {currentIndex + 1} / {total}
          </span>
          <button
            className={styles.navArrow}
            disabled={isLast}
            onClick={goNext}
            type="button"
            title="下一题"
          >
            <i className="fas fa-chevron-down"></i>
          </button>
        </div>
      </div>

      {/* Question body */}
      <div className={styles.questionBody}>
        <div className={styles.questionText}>
          {currentIndex + 1}. {q.question}
        </div>

        <div className={styles.optionsList}>
          {q.options.map((opt, oIndex) => {
            const isSelected = selected.includes(opt.label);
            return (
              <div
                key={oIndex}
                className={`${styles.optionRow}${
                  isSelected ? ` ${styles.optionRowSelected}` : ""
                }`}
                onClick={() =>
                  handleOptionToggle(currentIndex, opt.label, q.multiSelect)
                }
              >
                <span className={styles.optionIndicator}>
                  {q.multiSelect ? (
                    <span
                      className={`${styles.checkbox}${
                        isSelected ? ` ${styles.checked}` : ""
                      }`}
                    >
                      {isSelected && <i className="fas fa-check"></i>}
                    </span>
                  ) : (
                    <span
                      className={`${styles.radio}${
                        isSelected ? ` ${styles.checked}` : ""
                      }`}
                    />
                  )}
                </span>
                <div className={styles.optionContent}>
                  <span className={styles.optionLabel}>{opt.label}</span>
                  {opt.description && (
                    <span className={styles.optionDesc}>{opt.description}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footerBar}>
        <div className={styles.footerRight}>
          {!isLast && (
            <button
              className={styles.skipBtn}
              onClick={goNext}
              type="button"
            >
              跳过
            </button>
          )}
          {isLast && allAnswered ? (
            <button className={styles.submitBtn} type="button" onClick={handleSubmit}>
              提交
              <i className="fas fa-level-down-alt fa-rotate-90"></i>
            </button>
          ) : (
            <button
              className={styles.continueBtn}
              disabled={!currentAnswered}
              onClick={goNext}
              type="button"
            >
              继续
              <i className="fas fa-level-down-alt fa-rotate-90"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HitlContentRender;
