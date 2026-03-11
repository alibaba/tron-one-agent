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
} from "antd";
import { getAllTools } from "@/services/tools";
import { get, post } from "@/services/request";
import styles from "./index.module.less";
import validator from "@rjsf/validator-ajv8";
import Form from "@rjsf/antd/dist";
// import { ExclamationCircleOutlined } from '@ant-design/icons';
import ExclamationCircleOutlined from "@ant-design/icons/ExclamationCircleOutlined";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 定义工具接口
interface Tool {
  name: string;
  description?: string;
}

// 定义 Schema 接口
interface SchemaParameter {
  type: string;
  description?: string;
  default?: any;
  enum?: any[];
}

interface SchemaParameters {
  type: string;
  properties: Record<string, SchemaParameter>;
  required?: string[];
}

interface ToolFunction {
  name: string;
  description?: string;
  parameters: SchemaParameters;
}

interface ToolSchema {
  type: string;
  function: ToolFunction;
}

const ToolDebugger: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<string>("");
  const [schema, setSchema] = useState<any>(null);
  const [schemaLoading, setSchemaLoading] = useState<boolean>(false);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState<boolean>(false);

  // 获取所有工具
  const fetchAllTools = async () => {
    setLoading(true);
    try {
      const result = await getAllTools();
      setTools(result.data || []);
    } catch (error) {
      console.error("获取工具列表失败:", error);
      message.error("获取工具列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 获取工具 Schema
  const fetchToolSchema = async (toolName: string) => {
    if (!toolName) return;

    setSchemaLoading(true);
    setSchema(null);
    setDebugResult(null);

    try {
      const result = await get(`/api/debug/tools/${toolName}/schema`);
      setSchema(result);

      // 根据 schema 生成默认参数
    } catch (error) {
      console.error("获取工具Schema失败:", error);
      message.error("获取工具Schema失败");
    } finally {
      setSchemaLoading(false);
    }
  };

  // 调试工具
  const debugTool = async (shcemaData) => {
    setDebugLoading(true);
    setDebugResult(null);

    try {
      const result = await post(`/api/debug/tools/${selectedTool}`, {
        ...shcemaData.formData,
      });
      setDebugResult(result);
    } catch (error) {
      message.error("调试工具失败");
      setDebugResult({ error: error.message || "调试工具失败" });
    } finally {
      setDebugLoading(false);
    }
  };

  // 处理工具选择变化
  const handleToolChange = (value: string) => {
    setSelectedTool(value);
    setSchema(null);
    setDebugResult(null);
    fetchToolSchema(value);
  };

  // 初始化数据
  useEffect(() => {
    fetchAllTools();
  }, []);

  return (
    <div className={styles.container}>
      <Card
        title="Tool调试"
        className={styles.pageCard}
        classNames={{
          body: styles.pageCardBody,
          header: styles.pageCardHeader,
        }}
      >
        <Row gutter={16} style={{ width: "100%" }}>
          {/* 左侧卡片：工具Schema和提示结果 */}
          <Col span={12}>
            <Card title="工具 Schema">
              <Spin spinning={schemaLoading}>
                {schema ? (
                  <Card size="small" className={styles.schemaCard}>
                    <pre className={styles.jsonDisplay}>
                      {JSON.stringify(schema, null, 2)}
                    </pre>
                  </Card>
                ) : (
                  <div style={{ textAlign: "center", padding: "24px" }}>
                    <Text type="secondary">请先选择具体需要调试的工具</Text>
                  </div>
                )}
              </Spin>

              {(debugResult || debugLoading) && (
                <div className={styles.section} style={{ marginTop: 24 }}>
                  <Title level={5}>调试结果</Title>
                  <Spin spinning={debugLoading}>
                    <Card size="small" className={styles.resultCard}>
                      <pre className={styles.jsonDisplay}>
                        {debugResult
                          ? JSON.stringify(debugResult, null, 2)
                          : "等待调试结果..."}
                      </pre>
                    </Card>
                  </Spin>
                </div>
              )}
            </Card>
          </Col>

          {/* 右侧卡片：选择工具、调试面板等 */}
          <Col span={12}>
            <Card title="调试面板">
              <div className={styles.section}>
                <Title level={5}>选择工具</Title>
                <Select
                  showSearch
                  placeholder="请选择要调试的工具"
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
                  <Title level={5}>调试参数</Title>
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
                        执行调试
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
