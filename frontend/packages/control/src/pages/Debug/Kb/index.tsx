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
  InputNumber,
  Form,
} from "antd";
import { getAllKbs } from "@/services/kb";
import { post } from "@/services/request";
import styles from "./index.module.less";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 定义知识库接口
interface KnowledgeBase {
  id: string;
  name: string;
  enabled?: boolean;
}

const KbDebugger: React.FC = () => {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedKb, setSelectedKb] = useState<string>("");
  const [debugResult, setDebugResult] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState<boolean>(false);
  const [form] = Form.useForm();

  // 获取所有知识库
  const fetchAllKbs = async () => {
    setLoading(true);
    try {
      const result = await getAllKbs();
      setKnowledgeBases(result.data || []);
    } catch (error) {
      console.error("获取知识库列表失败:", error);
      message.error("获取知识库列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 调试知识库
  const debugKb = async () => {
    if (!selectedKb) {
      message.warning("请先选择知识库");
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
      message.success("调试成功");
    } catch (error: any) {
      message.error("调试知识库失败");
      setDebugResult({ error: error.message || "调试知识库失败" });
    } finally {
      setDebugLoading(false);
    }
  };

  // 处理知识库选择变化
  const handleKbChange = (value: string) => {
    setSelectedKb(value);
    setDebugResult(null);
  };

  // 初始化数据
  useEffect(() => {
    fetchAllKbs();
  }, []);

  return (
    <div className={styles.container}>
      <Card
        title="知识库调试"
        className={styles.pageCard}
        classNames={{
          body: styles.pageCardBody,
          header: styles.pageCardHeader,
        }}
      >
        <Row gutter={16} style={{ width: "100%" }}>
          {/* 左侧卡片：知识库信息和调试结果 */}
          <Col span={12}>
            <Card title="知识库信息">
              {selectedKb ? (
                <Card size="small" className={styles.schemaCard}>
                  <div style={{ padding: "16px" }}>
                    <Text strong>知识库ID: </Text>
                    <Text>{selectedKb}</Text>
                    <br />
                    <Text strong>知识库名称: </Text>
                    <Text>
                      {knowledgeBases.find((kb) => kb.id === selectedKb)
                        ?.name || "-"}
                    </Text>
                  </div>
                </Card>
              ) : (
                <div style={{ textAlign: "center", padding: "24px" }}>
                  <Text type="secondary">请先选择具体需要调试的知识库</Text>
                </div>
              )}

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

          {/* 右侧卡片：选择知识库、调试面板等 */}
          <Col span={12}>
            <Card title="调试面板">
              <div className={styles.section}>
                <Title level={5}>选择知识库</Title>
                <Select
                  showSearch
                  placeholder="请选择要调试的知识库"
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
                    {/* <TextArea
                      placeholder='输入调试参数（JSON格式），例如: {"query": "检索内容"}'
                      value={paramsInput}
                      onChange={(e) => setParamsInput(e.target.value)}
                      rows={10}
                      style={{ marginBottom: 16, fontFamily: "monospace" }}
                    /> */}
                    <Form form={form} layout="vertical" title="调试参数" onFinish={debugKb}>
                      <Form.Item
                        label="检索内容"
                        name="query"
                        rules={[{ required: true, message: "请输入检索内容" }]}
                      >
                        <Input placeholder="query" />
                      </Form.Item>

                      <Form.Item label="限制数量" name="limit" initialValue={5}>
                        <InputNumber
                          placeholder="limit"
                          min={1}
                          max={100}
                          step={1}
                        />
                      </Form.Item>

                      <Form.Item label="相似度阈值" name="scoreThreshold" initialValue={0.2}>
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
                        检索
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
