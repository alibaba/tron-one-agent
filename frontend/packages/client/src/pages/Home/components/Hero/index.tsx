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


import React, { useState } from "react";
import styles from "./index.less";

function Hero({
  onQuestionSelect,
}: {
  onQuestionSelect: (question: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"custom1" | "custom2" | "custom3">(
    "custom1"
  );

  const expertTabs = [
    {
      id: "custom1",
      name: "custom1",
      icon: "fas fa-microchip",
      color: "#8b5cf6",
    },
    {
      id: "custom2",
      name: "custom2",
      icon: "fas fa-graduation-cap",
      color: "#8b5cf6",
    },
    {
      id: "custom3",
      name: "custom3",
      icon: "fas fa-rocket",
      color: "#8b5cf6",
    },
  ];

  const quickQuestions = {
    custom1: [
      "custom1 - 推荐问题aaaa",
      "custom1 - 推荐问题bbbb",
      "custom1 - 推荐问题cccc",
    ],
    custom2: [
      "custom2 - 推荐问题aaaa",
      "custom2 - 推荐问题bbbb",
      "custom2 - 推荐问题cccc",
    ],
    custom3: [
      "custom3 - 推荐问题aaaa",
      "custom3 - 推荐问题bbbb",
      "custom3 - 推荐问题cccc",
    ],
  };

  const handleQuestionClick = (question: string) => {
    if (onQuestionSelect) {
      onQuestionSelect(question);
    }
  };

  return (
    <section className={styles.hero}>
      <div className={styles.heroContainer}>
        <h1 className={styles.heroTitle}>Custom·AI专家</h1>
        <p className={styles.heroSubtitle}>
          Custom1 · Custom2 · Custom3，三大专家助您从零到一构建AI解决方案
        </p>

        <div className={styles.expertTabs}>
          {expertTabs.map((tab) => (
            <button
              key={tab.id}
              className={[styles.expertTab, styles.active].join(" ")}
              onClick={() => setActiveTab(tab.id)}
              style={{ "--tab-color": tab.color }}
            >
              <i className={tab.icon}></i>
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        <div className={styles.questionsGrid}>
          {quickQuestions[activeTab].map((question, index) => (
            <button
              key={index}
              className={styles.questionCard}
              onClick={() => handleQuestionClick(question)}
            >
              <i className="fas fa-comment-dots"></i>
              <span>{question}</span>
              <i className="fas fa-arrow-right"></i>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Hero;
