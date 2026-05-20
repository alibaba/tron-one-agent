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
import { ContentType, SessionMessageStatus } from "../../types/enums";
import styles from "./index.module.less";
import { t } from "../../locale";

export interface HitlSubmitPayload {
  type: ContentType.HITL;
  id: string;
  status?: number;
  result: string;
  agentMessageId: number;
}

export interface HitlContentRenderProps {
  content: HitlContentType;
  agentMessageId?: number;
  messageStatus?: SessionMessageStatus;
  onSubmit?: (payload: HitlSubmitPayload) => void;
}

type AnswerValue = string[];

const OTHER_LABEL = "\u5176\u5b83";

const HitlContentRender: React.FC<HitlContentRenderProps> = ({ content, agentMessageId, messageStatus, onSubmit }) => {
  const { properties, status, method } = content;
  const questions = properties?.questions || [];
  const total = questions.length;

  const messageCompleted = messageStatus === SessionMessageStatus.SUCCEED;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [otherTexts, setOtherTexts] = useState<Record<number, string>>({});
  const [skipped, setSkipped] = useState<Record<number, boolean>>({});
  const [submittedResult, setSubmittedResult] = useState<string | null>(null);

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
      return (answer && answer.length > 0) || skipped[idx];
    });
  }, [questions, answers, skipped]);

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

  const handleSkip = useCallback(() => {
    setSkipped((prev) => ({ ...prev, [currentIndex]: true }));
    setCurrentIndex((i) => Math.min(total - 1, i + 1));
  }, [currentIndex, total]);

  const buildResult = useCallback(() => {
    return questions.map((q: HitlQuestion, idx: number) => {
      const selectedLabels = answers[idx] || [];
      if (selectedLabels.length === 0 && skipped[idx]) {
        return {
          header: q.header || "",
          question: q.question,
          values: [{ label: "skip", description: "user skipped this question" }],
        };
      }
      const values = q.options
        .filter((opt) => selectedLabels.includes(opt.label))
        .map((opt) => ({ label: opt.label, description: opt.description }));
      if (selectedLabels.includes(OTHER_LABEL)) {
        values.push({ label: OTHER_LABEL, description: otherTexts[idx] || "" });
      }
      return {
        header: q.header || "",
        question: q.question,
        values,
      };
    });
  }, [questions, answers, otherTexts]);

  const handleSubmit = useCallback(() => {
    if (!allAnswered || !onSubmit) return;
    const result = buildResult();
    const resultJson = JSON.stringify(result);
    onSubmit({
      type: ContentType.HITL,
      id: content.id,
      result: resultJson,
      agentMessageId: agentMessageId!,
    });
    setSubmittedResult(resultJson);
  }, [allAnswered, onSubmit, buildResult, content.id]);

  const resultToRender = (status === 2 && content.result) ? content.result : submittedResult;

  if (resultToRender) {
    let resultData: Array<{ header?: string; question: string; values: Array<{ label: string; description?: string }> }> = [];
    try {
      resultData = JSON.parse(resultToRender);
    } catch {
      return null;
    }
    if (!resultData.length) return null;

    return (
      <div className={styles.hitlContainer}>
        <div className={styles.tabHeader}>
          <div className={styles.tabHeaderLeft}>
            <span className={styles.approvedBadge}>
              <i className="fas fa-check-circle"></i>
              {t('hitl.completed')}
            </span>
          </div>
        </div>
        <div className={styles.questionBody}>
          {resultData.map((item, idx) => (
            <div key={idx} className={styles.resultBlock}>
              <div className={styles.questionText}>
                {item.header && (
                  <span className={styles.resultHeader}>{item.header}</span>
                )}
                {item.question}
              </div>
              <div className={styles.optionsList}>
                {item.values.map((v, vIdx) => (
                  <div key={vIdx} className={`${styles.optionRow} ${styles.optionRowSelected} ${styles.readonlyRow}`}>
                    <span className={styles.optionIndicator}>
                      <span className={`${styles.checkbox} ${styles.checked}`}>
                        <i className="fas fa-check"></i>
                      </span>
                    </span>
                    <div className={styles.optionContent}>
                      <span className={styles.optionLabel}>{v.label}</span>
                      {v.description && (
                        <span className={styles.optionDesc}>{v.description}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (status === 3 && method === "question" && total > 0) {
    return (
      <div className={styles.hitlContainer}>
        <div className={styles.tabHeader}>
          <div className={styles.tabHeaderLeft}>
            <span className={styles.rejectedBadge}>
              <i className="fas fa-times-circle"></i>
              {t('hitl.userRejected')}
            </span>
          </div>
        </div>
        <div className={styles.questionBody}>
          {questions.map((q: HitlQuestion, idx: number) => (
            <div key={idx} className={styles.resultBlock}>
              <div className={styles.questionText}>
                {q.header && (
                  <span className={styles.resultHeader}>{q.header}</span>
                )}
                {q.question}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (status !== 1 || method !== "question" || total === 0) {
    return null;
  }

  const q = questions[currentIndex];
  const selected = answers[currentIndex] || [];
  const isLast = currentIndex === total - 1;

  return (
    <div className={`${styles.hitlContainer}${!messageCompleted ? ` ${styles.hitlDisabled}` : ''}`}>
      {/* Tab header */}
      <div className={styles.tabHeader}>
        <div className={styles.tabHeaderLeft}>
          {q.header && (
            <span className={styles.headerLabel}>{q.header}</span>
          )}
          <span className={styles.headerDot}>·</span>
          <span className={styles.headerType}>
            {q.multiSelect ? t('hitl.multiSelect') : t('hitl.singleSelect')}
          </span>
        </div>
        <div className={styles.tabHeaderRight}>
          <button
            className={styles.navArrow}
            disabled={currentIndex === 0}
            onClick={goPrev}
            type="button"
            title={t('hitl.prevQuestion')}
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
            title={t('hitl.nextQuestion')}
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
                  messageCompleted && handleOptionToggle(currentIndex, opt.label, q.multiSelect)
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
          {/* "Other" option */}
          {(() => {
            const isOtherSelected = selected.includes(OTHER_LABEL);
            return (
              <div
                className={`${styles.optionRow}${
                  isOtherSelected ? ` ${styles.optionRowSelected}` : ""
                }`}
                onClick={() =>
                  messageCompleted && handleOptionToggle(currentIndex, OTHER_LABEL, q.multiSelect)
                }
              >
                <span className={styles.optionIndicator}>
                  {q.multiSelect ? (
                    <span
                      className={`${styles.checkbox}${
                        isOtherSelected ? ` ${styles.checked}` : ""
                      }`}
                    >
                      {isOtherSelected && <i className="fas fa-check"></i>}
                    </span>
                  ) : (
                    <span
                      className={`${styles.radio}${
                        isOtherSelected ? ` ${styles.checked}` : ""
                      }`}
                    />
                  )}
                </span>
                <div className={styles.optionContent}>
                  <span className={styles.optionLabel}>{OTHER_LABEL}</span>
                  {isOtherSelected && (
                    <input
                      className={styles.otherInput}
                      type="text"
                      placeholder={t('hitl.inputPlaceholder')}
                      value={otherTexts[currentIndex] || ""}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOtherTexts((prev) => ({ ...prev, [currentIndex]: val }));
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footerBar}>
        {!messageCompleted ? (
          <div className={styles.footerWaiting}>
            <i className="fas fa-spinner fa-spin"></i>
            <span>{t('hitl.waitingMessage')}</span>
          </div>
        ) : (
        <div className={styles.footerRight}>
          {!isLast && (
            <button
              className={styles.skipBtn}
              onClick={handleSkip}
              type="button"
            >
              {t('hitl.skip')}
            </button>
          )}
          {isLast && allAnswered ? (
            <button className={styles.submitBtn} type="button" onClick={handleSubmit}>
              {t('hitl.submit')}
              <i className="fas fa-level-down-alt fa-rotate-90"></i>
            </button>
          ) : (
            <button
              className={styles.continueBtn}
              disabled={!currentAnswered}
              onClick={goNext}
              type="button"
            >
              {t('hitl.continue')}
              <i className="fas fa-level-down-alt fa-rotate-90"></i>
            </button>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default HitlContentRender;
