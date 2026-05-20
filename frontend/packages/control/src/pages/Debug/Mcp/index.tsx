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
import { getAllMcps } from "@/services/mcp";
import { get, post } from "@/services/request";
import styles from "./index.module.less";
import validator from "@rjsf/validator-ajv8";
import Form from "@rjsf/antd/dist";

const { Title, Text } = Typography;
const { Option } = Select;

interface Tool {
  name: string;
  description?: string;
  inputSchema?: any;
}
interface Mcp {
  name: string;
  id: string;
  description?: string;
}

const ToolDebugger: React.FC = () => {
  const { t } = useTranslation(["debug", "common"]);
  const [mcpList, setMcpList] = useState<Mcp[]>([]);
  const [toolList, setToolList] = useState<Tool[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedMcp, setselectedMcp] = useState<string>("");
  const [selectedTool, setselectedTool] = useState<string>("");
  const [schema, setSchema] = useState<any>(null);
  const [schemaLoading, setSchemaLoading] = useState<boolean>(false);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState<boolean>(false);

  const fetchAllMcpList = async () => {
    setLoading(true);
    try {
      const result = await getAllMcps();
      setMcpList(result.data || []);
    } catch (error) {
      console.error("获取MCP列表失败:", error);
      message.error(t("debug:mcp.errors.fetchMcpsFailed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchMcpToolList = async (mcpId: string) => {
    if (!mcpId) return;

    setSchemaLoading(true);
    setSchema(null);
    setDebugResult(null);

    try {
      const result = await get(`/api/debug/mcp/${mcpId}/tools`);
      setToolList(result || []);
    } catch (error) {
      console.error("获取工具Schema失败:", error);
      message.error(t("debug:mcp.errors.fetchToolsFailed"));
    } finally {
      setSchemaLoading(false);
    }
  };

  const debugTool = async (shcemaData: any) => {
    setDebugLoading(true);
    setDebugResult(null);

    try {
      const result = await post(
        `/api/debug/mcp/${selectedMcp}/tools/${selectedTool}`,
        {
          ...shcemaData.formData,
        }
      );
      setDebugResult(result);
    } catch (error) {
      message.error(t("debug:mcp.errors.debugFailed"));
      setDebugResult({ error: (error as Error).message || t("debug:mcp.errors.debugFailed") });
    } finally {
      setDebugLoading(false);
    }
  };

  const handleMcpChange = (value: string) => {
    setselectedMcp(value);
    setSchema(null);
    setDebugResult(null);
    fetchMcpToolList(value);
  };

  const handleToolChange = (value: string) => {
    setselectedTool(value);
    setDebugResult(null);
    const selectedTool = toolList.find((tool) => tool.name === value);
    if (selectedTool) {
      setSchema(selectedTool.inputSchema);
    }
  };

  useEffect(() => {
    fetchAllMcpList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.container}>
      <Card
        title={t("debug:mcp.title")}
        className={styles.pageCard}
        classNames={{
          body: styles.pageCardBody,
          header: styles.pageCardHeader,
        }}
      >
        <Row gutter={16} style={{ width: "100%" }}>
          {/* 左侧卡片：工具Schema和提示结果 */}
          <Col span={12}>
            <Card title={t("debug:mcp.schemaTitle")}>
              <Spin spinning={schemaLoading}>
                {schema ? (
                  <Card size="small" className={styles.schemaCard}>
                    <pre className={styles.jsonDisplay}>
                      {JSON.stringify(schema, null, 2)}
                    </pre>
                  </Card>
                ) : (
                  <div style={{ textAlign: "center", padding: "24px" }}>
                    <Text type="secondary">{t("debug:mcp.selectToolEmpty")}</Text>
                  </div>
                )}
              </Spin>

              {(debugResult || debugLoading) && (
                <div className={styles.section} style={{ marginTop: 24 }}>
                  <Title level={5}>{t("debug:mcp.debugResult")}</Title>
                  <Spin spinning={debugLoading}>
                    <Card size="small" className={styles.resultCard}>
                      <pre className={styles.jsonDisplay}>
                        {debugResult
                          ? JSON.stringify(debugResult, null, 2)
                          : t("debug:mcp.waitingResult")}
                      </pre>
                    </Card>
                  </Spin>
                </div>
              )}
            </Card>
          </Col>

          {/* 右侧卡片：选择工具、调试面板等 */}
          <Col span={12}>
            <Card title={t("debug:mcp.panel")}>
              <div className={styles.section}>
                <Title level={5}>{t("debug:mcp.selectMcp")}</Title>
                <Select
                  showSearch
                  placeholder={t("debug:mcp.selectMcpPlaceholder")}
                  onChange={handleMcpChange}
                  value={selectedMcp}
                  disabled={loading}
                  style={{ width: "100%" }}
                >
                  {mcpList.map((mcp) => (
                    <Option key={mcp.id} value={mcp.id}>
                      {mcp.name}
                    </Option>
                  ))}
                </Select>
              </div>
              <div className={styles.section}>
                <Title level={5}>{t("debug:mcp.selectTool")}</Title>
                <Select
                  showSearch
                  placeholder={t("debug:mcp.selectToolPlaceholder")}
                  onChange={handleToolChange}
                  value={selectedTool}
                  style={{ width: "100%" }}
                  popupMatchSelectWidth={false}
                  optionLabelProp="name"
                >
                  {toolList.map((tool) => (
                    <Option key={tool.name} value={tool.name} name={tool.name}>
                      <div>{tool.name}</div>
                      <div>{tool.description}</div>
                    </Option>
                  ))}
                </Select>
              </div>
              {schema && (
                <div className={styles.parametersWrap}>
                  <Title level={5}>{t("debug:mcp.debugParams")}</Title>
                  <div className={styles.parameters}>
                    <Form
                      schema={schema}
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
                        {t("debug:mcp.executeDebug")}
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
