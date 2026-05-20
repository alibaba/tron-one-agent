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


import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  Select,
  Input,
  Button,
  Spin,
  message,
  Row,
  Col,
  Typography,
  InputNumber,
  Form,
} from "antd";
import { getAllKbs } from "@/services/kb";
import { post } from "@/services/request";
import styles from "./index.module.less";

const { Title, Text } = Typography;
const { Option } = Select;

interface KnowledgeBase {
  id: string;
  name: string;
  enabled?: boolean;
}

const KbDebugger: React.FC = () => {
  const { t } = useTranslation(["debug", "common"]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKb, setSelectedKb] = useState<string>("");
  const [debugResult, setDebugResult] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState<boolean>(false);
  const [form] = Form.useForm();

  const fetchAllKbs = async () => {
    setLoading(true);
    try {
      const result = await getAllKbs();
      setKnowledgeBases(result.data || []);
    } catch (error) {
      console.error("获取知识库列表失败:", error);
      message.error(t("debug:kb.errors.fetchKbsFailed"));
    } finally {
      setLoading(false);
    }
  };

  const debugKb = async () => {
    if (!selectedKb) {
      message.warning(t("debug:kb.errors.kbRequired"));
      return;
    }

    setDebugLoading(true);
    setDebugResult(null);

    try {
      const result = await post(
        `/api/debug/knowledge_base/${selectedKb}`,
        form.getFieldsValue()
      );
      setDebugResult(result);
      message.success(t("debug:kb.debugSuccess"));
    } catch (error: any) {
      message.error(t("debug:kb.errors.debugFailed"));
      setDebugResult({ error: error.message || t("debug:kb.errors.debugFailed") });
    } finally {
      setDebugLoading(false);
    }
  };

  const handleKbChange = (value: string) => {
    setSelectedKb(value);
    setDebugResult(null);
  };

  useEffect(() => {
    fetchAllKbs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.container}>
      <Card
        title={t("debug:kb.title")}
        className={styles.pageCard}
        classNames={{
          body: styles.pageCardBody,
          header: styles.pageCardHeader,
        }}
      >
        <Row gutter={16} style={{ width: "100%" }}>
          <Col span={12}>
            <Card title={t("debug:kb.info")}>
              {selectedKb ? (
                <Card size="small" className={styles.schemaCard}>
                  <div style={{ padding: "16px" }}>
                    <Text strong>{t("debug:kb.idLabel")} </Text>
                    <Text>{selectedKb}</Text>
                    <br />
                    <Text strong>{t("debug:kb.nameLabel")} </Text>
                    <Text>
                      {knowledgeBases.find((kb) => kb.id === selectedKb)
                        ?.name || "-"}
                    </Text>
                  </div>
                </Card>
              ) : (
                <div style={{ textAlign: "center", padding: "24px" }}>
                  <Text type="secondary">{t("debug:kb.selectKbEmpty")}</Text>
                </div>
              )}

              {(debugResult || debugLoading) && (
                <div className={styles.section} style={{ marginTop: 24 }}>
                  <Title level={5}>{t("debug:kb.debugResult")}</Title>
                  <Spin spinning={debugLoading}>
                    <Card size="small" className={styles.resultCard}>
                      <pre className={styles.jsonDisplay}>
                        {debugResult
                          ? JSON.stringify(debugResult, null, 2)
                          : t("debug:kb.waitingResult")}
                      </pre>
                    </Card>
                  </Spin>
                </div>
              )}
            </Card>
          </Col>

          {/* 右侧卡片：选择知识库、调试面板等 */}
          <Col span={12}>
            <Card title={t("debug:kb.panel")}>
              <div className={styles.section}>
                <Title level={5}>{t("debug:kb.selectKb")}</Title>
                <Select
                  showSearch
                  placeholder={t("debug:kb.selectKbPlaceholder")}
                  optionFilterProp="children"
                  onChange={handleKbChange}
                  value={selectedKb}
                  disabled={loading}
                  style={{ width: "100%" }}
                  filterOption={(input, option) =>
                    String(option?.children || "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                >
                  {knowledgeBases
                    .filter((kb) => kb.enabled !== false)
                    .map((kb) => (
                      <Option key={kb.id} value={kb.id}>
                        {kb.name} ({kb.id})
                      </Option>
                    ))}
                </Select>
              </div>

              {selectedKb && (
                <div className={styles.parametersWrap}>
                  <div className={styles.parameters}>
                    <Form form={form} layout="vertical" title={t("debug:kb.debugParams")} onFinish={debugKb}>
                      <Form.Item
                        label={t("debug:kb.queryLabel")}
                        name="query"
                        rules={[{ required: true, message: t("debug:kb.queryPlaceholder") }]}
                      >
                        <Input placeholder="query" />
                      </Form.Item>

                      <Form.Item label={t("debug:kb.limitLabel")} name="limit" initialValue={5}>
                        <InputNumber
                          placeholder="limit"
                          min={1}
                          max={100}
                          step={1}
                        />
                      </Form.Item>

                      <Form.Item label={t("debug:kb.scoreLabel")} name="scoreThreshold" initialValue={0.2}>
                        <InputNumber
                          placeholder="scoreThreshold"
                          min={0.05}
                          max={1.0}
                          step={0.05}
                        />
                      </Form.Item>

                      <Button
                        type="primary"
                        block
                        htmlType="submit"
                      >
                        {t("debug:kb.searchBtn")}
                      </Button>
                    </Form>
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default KbDebugger;
