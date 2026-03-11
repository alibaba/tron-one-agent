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


package com.aliyun.tam.x.tron.api;

import com.aliyun.tam.x.tron.core.mcp.McpClientRegistry;
import com.aliyun.tam.x.tron.core.rag.KnowledgeRegistry;
import com.aliyun.tam.x.tron.core.tools.ToolRegistry;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.agentscope.core.message.ToolResultBlock;
import io.agentscope.core.model.ToolSchema;
import io.agentscope.core.rag.Knowledge;
import io.agentscope.core.rag.model.Document;
import io.agentscope.core.rag.model.RetrieveConfig;
import io.agentscope.core.tool.AgentTool;
import io.agentscope.core.tool.ToolCallParam;
import io.agentscope.core.tool.Toolkit;
import io.agentscope.core.tool.mcp.McpClientWrapper;
import io.modelcontextprotocol.spec.McpSchema;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/debug")
@RequiredArgsConstructor
public class DebugController {
    private final ToolRegistry toolRegistry;

    private final McpClientRegistry mcpClientRegistry;

    private final KnowledgeRegistry knowledgeRegistry;

    private final ObjectMapper objectMapper;

    @GetMapping("/tools/{tool_name}/schema")
    public ResponseEntity<?> getSchema(
            @PathVariable("tool_name") String toolName
    ) {
        Toolkit toolkit = toolRegistry.getAllTools();
        ToolSchema schema = toolkit.getToolSchemas()
                .stream()
                .filter(t -> t.getName().equals(toolName))
                .findFirst()
                .orElse(null);
        if (schema == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            ObjectNode function = objectMapper.createObjectNode();
            function.put("name", schema.getName());
            function.put("description", schema.getDescription());
            function.set("parameters", objectMapper.valueToTree(schema.getParameters()));

            ObjectNode output = objectMapper.createObjectNode();
            output.put("type", "function");
            output.set("function", function);
            return ResponseEntity.ok(output);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @PostMapping("/tools/{tool_name}")
    public ResponseEntity<?> debugTool(
            @PathVariable("tool_name") String toolName,
            InputStream requestBody
    ) {
        Toolkit toolkit = toolRegistry.getAllTools();
        AgentTool tool = toolkit.getTool(toolName);
        if (tool == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            Map<String, Object> inputMap = objectMapper.readValue(requestBody, Map.class);
            ToolCallParam param = ToolCallParam.builder()
                    .input(inputMap)
                    .build();
            ToolResultBlock result = tool.callAsync(param).block();
            return ResponseEntity.ok(
                    result.getOutput()
            );
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/mcp/{client_id}/tools/{func_name}")
    public ResponseEntity<?> debugMcpTool(
            @PathVariable("client_id") String clientId,
            @PathVariable("func_name") String funcName,
            InputStream requestBody
    ) {
        McpClientWrapper client = mcpClientRegistry.getClient(clientId);
        if (client == null) {
            return ResponseEntity.notFound().build();
        }
        try {
            Map<String, Object> inputMap = objectMapper.readValue(requestBody, Map.class);
            McpSchema.CallToolResult result = client.callTool(funcName, inputMap).block();
            return ResponseEntity.ok(result.content());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/mcp/{client_id}/tools")
    public ResponseEntity<?> getMcpTools(
            @PathVariable("client_id") String clientId
    ) {
        McpClientWrapper client = mcpClientRegistry.getClient(clientId);
        if (client == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(client.listTools().block());
    }

    @PostMapping("/knowledge_base/{knowledge_base_id}")
    public ResponseEntity<?> debugKnowledgeBase(
            @PathVariable("knowledge_base_id") String knowledgeBaseId,
            InputStream inputStream
    ) {
        Knowledge knowledgeBase = knowledgeRegistry.getKnowledgeBase(knowledgeBaseId);
        if (knowledgeBase == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            Map<String, Object> obj = objectMapper.readValue(inputStream, Map.class);
            String query = (String) obj.get("query");
            Integer limit = Optional.ofNullable((Integer) obj.get("limit")).orElse(5);
            Double scoreThreshold = Optional.ofNullable((Double) obj.get("score_threshold")).orElse(0.2);
            List<Document> docs = knowledgeBase.retrieve(query, RetrieveConfig.builder()
                    .limit(limit)
                    .scoreThreshold(scoreThreshold)
                    .build()).block();
            return ResponseEntity.ok(docs);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
