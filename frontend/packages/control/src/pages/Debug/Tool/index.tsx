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
  Button,
  Spin,
  message,
  Row,
  Col,
  Typography,
} from "antd";
import { getAllTools } from "@/services/tools";
import { get, post } from "@/services/request";
import styles from "./index.module.less";
import validator from "@rjsf/validator-ajv8";
import Form from "@rjsf/antd/dist";

const { Title, Text } = Typography;
const { Option } = Select;

interface Tool {
  name: string;
  description?: string;
}

const ToolDebugger: React.FC = () => {
  const { t } = useTranslation(["debug", "common"]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<string>("");
  const [schema, setSchema] = useState<any>(null);
  const [schemaLoading, setSchemaLoading] = useState<boolean>(false);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState<boolean>(false);

  const fetchAllTools = async () => {
    setLoading(true);
    try {
      const result = await getAllTools();
      setTools(result.data || []);
    } catch (error) {
      console.error("获取工具列表失败:", error);
      message.error(t("debug:tool.errors.fetchToolsFailed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchToolSchema = async (toolName: string) => {
    if (!toolName) return;

    setSchemaLoading(true);
    setSchema(null);
    setDebugResult(null);

    try {
      const result = await get(`/api/debug/tools/${toolName}/schema`);
      setSchema(result);
    } catch (error) {
      console.error("获取工具Schema失败:", error);
      message.error(t("debug:tool.errors.fetchSchemaFailed"));
    } finally {
      setSchemaLoading(false);
    }
  };

  const debugTool = async (shcemaData: any) => {
    setDebugLoading(true);
    setDebugResult(null);

    try {
      const result = await post(`/api/debug/tools/${selectedTool}`, {
        ...shcemaData.formData,
      });
      setDebugResult(result);
    } catch (error) {
      message.error(t("debug:tool.errors.debugFailed"));
      setDebugResult({ error: (error as Error).message || t("debug:tool.errors.debugFailed") });
    } finally {
      setDebugLoading(false);
    }
  };

  const handleToolChange = (value: string) => {
    setSelectedTool(value);
    setSchema(null);
    setDebugResult(null);
    fetchToolSchema(value);
  };

  useEffect(() => {
    fetchAllTools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.container}>
      <Card
        title={t("debug:tool.title")}
        className={styles.pageCard}
        classNames={{
          body: styles.pageCardBody,
          header: styles.pageCardHeader,
        }}
      >
        <Row gutter={16} style={{ width: "100%" }}>
          {/* 左侧卡片：工具Schema和提示结果 */}
          <Col span={12}>
            <Card title={t("debug:tool.schemaTitle")}>
              <Spin spinning={schemaLoading}>
                {schema ? (
                  <Card size="small" className={styles.schemaCard}>
                    <pre className={styles.jsonDisplay}>
                      {JSON.stringify(schema, null, 2)}
                    </pre>
                  </Card>
                ) : (
                  <div style={{ textAlign: "center", padding: "24px" }}>
                    <Text type="secondary">{t("debug:tool.selectToolEmpty")}</Text>
                  </div>
                )}
              </Spin>

              {(debugResult || debugLoading) && (
                <div className={styles.section} style={{ marginTop: 24 }}>
                  <Title level={5}>{t("debug:tool.debugResult")}</Title>
                  <Spin spinning={debugLoading}>
                    <Card size="small" className={styles.resultCard}>
                      <pre className={styles.jsonDisplay}>
                        {debugResult
                          ? JSON.stringify(debugResult, null, 2)
                          : t("debug:tool.waitingResult")}
                      </pre>
                    </Card>
                  </Spin>
                </div>
              )}
            </Card>
          </Col>

          {/* 右侧卡片：选择工具、调试面板等 */}
          <Col span={12}>
            <Card title={t("debug:tool.panel")}>
              <div className={styles.section}>
                <Title level={5}>{t("debug:tool.selectTool")}</Title>
                <Select
                  showSearch
                  placeholder={t("debug:tool.selectToolPlaceholder")}
                  optionFilterProp="children"
                  onChange={handleToolChange}
                  value={selectedTool}
                  disabled={loading}
                  style={{ width: "100%" }}
                >
                  {tools.map((tool) => (
                    <Option key={tool.name} value={tool.name}>
                      {tool.name}
                    </Option>
                  ))}
                </Select>
              </div>
              {schema?.function?.parameters && (
                <div className={styles.parametersWrap}>
                  <Title level={5}>{t("debug:tool.debugParams")}</Title>
                  <div className={styles.parameters}>
                    <Form
                      schema={schema.function.parameters}
                      validator={validator}
                      showErrorList={false}
                      onSubmit={debugTool}
                      initialFormData={{}}
                    >
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={debugLoading}
                      >
                        {t("debug:tool.executeDebug")}
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

export default ToolDebugger;
