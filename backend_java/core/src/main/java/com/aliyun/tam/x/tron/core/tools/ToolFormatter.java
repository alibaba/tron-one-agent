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


package com.aliyun.tam.x.tron.core.tools;

import com.aliyun.tam.x.tron.core.domain.models.contents.Content;
import com.aliyun.tam.x.tron.core.domain.models.contents.ContentType;
import com.aliyun.tam.x.tron.core.domain.models.contents.TextContent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.agentscope.core.message.ContentBlock;
import io.agentscope.core.message.TextBlock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.aliyun.tam.x.tron.core.utils.AgentHelper.convertFromBlocks;

@Slf4j
@Component
@RequiredArgsConstructor
public class ToolFormatter {
    private static final String LOAD_SKILL_TOOL_NAME = "load_skill_through_path";
    private static final String BAILIAN_WEBSEARCH_TOOL_NAME = "bailian_web_search";
    private static final String KNOWLEDGE_RETRIEVAL_TOOL_NAME = "retrieve_knowledge";
    private static final String EXECUTE_SHELL_COMMAND_TOOL_NAME = "execute_shell_command";
    private static final String WRITE_TEXT_FILE_TOOL_NAME = "write_text_file";
    private static final String INSERT_TEXT_FILE_TOOL_NAME = "insert_text_file";
    private static final String VIEW_TEXT_FILE_TOOL_NAME = "view_text_file";
    private static final String LIST_DIR_TOOL_NAME = "list_directory";
    private static final String DATE_TIME_TOOL_NAME = "dateTime";

    private final ObjectMapper objectMapper;

    public String formatToolName(String name) {
        if (DATE_TIME_TOOL_NAME.equals(name)) {
            return null;
        }
        if (LOAD_SKILL_TOOL_NAME.equals(name)) {
            return "加载技能";
        }
        if (BAILIAN_WEBSEARCH_TOOL_NAME.equals(name)) {
            return "网络搜索";
        }
        if (KNOWLEDGE_RETRIEVAL_TOOL_NAME.equals(name)) {
            return "知识检索";
        }
        if (EXECUTE_SHELL_COMMAND_TOOL_NAME.equals(name)) {
            return "执行命令";
        }
        if (WRITE_TEXT_FILE_TOOL_NAME.equals(name) || INSERT_TEXT_FILE_TOOL_NAME.equals(name)) {
            return "更新文件";
        }
        if (VIEW_TEXT_FILE_TOOL_NAME.equals(name)) {
            return "读取文件";
        }
        if (LIST_DIR_TOOL_NAME.equals(name)) {
            return "读取目录";
        }
        return name;
    }

    public String formatToolArguments(Map<String, Object> arguments, String name) {
        try {
            if (LOAD_SKILL_TOOL_NAME.equals(name)) {
                String skillId = (String) arguments.get("skillId");
                return "技能ID: " + skillId;
            }
            if (BAILIAN_WEBSEARCH_TOOL_NAME.equals(name)) {
                String query = (String) arguments.get("query");
                return "查询: " + query + "\n\n";
            }
            if (KNOWLEDGE_RETRIEVAL_TOOL_NAME.equals(name)) {
                String query = (String) arguments.get("query");
                return "查询: " + query + "\n\n";
            }
            if (EXECUTE_SHELL_COMMAND_TOOL_NAME.equals(name)) {
                String command = (String) arguments.get("command");
                return "命令: " + command + "\n\n";
            }
            return objectMapper.writeValueAsString(arguments);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }

    public List<Content> formatToolResult(List<ContentBlock> result, String name) {
        if (BAILIAN_WEBSEARCH_TOOL_NAME.equals(name)) {
            String searchResult = result.stream()
                    .filter(b -> b instanceof TextBlock)
                    .map(b -> (TextBlock) b)
                    .map(TextBlock::getText)
                    .collect(Collectors.joining(""));
            Map<String, Object> resultJson = null;
            try {
                resultJson = objectMapper.readValue(searchResult, Map.class);
            } catch (JsonProcessingException e) {
                log.error("parse search result error", e);
                return convertFromBlocks(result);
            }
            List<Map<String, Object>> pages = (List<Map<String, Object>>) resultJson.get("pages");
            String content = pages.stream()
                    .map(page -> {
                        String hostname = (String) page.get("hostname");
                        String url = (String) page.get("url");
                        String title = (String) page.get("title");
                        String snippet = (String) page.get("snippet");
                        if (StringUtils.hasText(hostname)) {
                            return String.format("- [%s - %s](%s): %s\n", hostname, title, url, snippet);
                        }
                        return String.format("- [%s](%s): %s\n", title, url, snippet);
                    })
                    .collect(Collectors.joining("\n\n"));
            return List.of(TextContent.builder().text(content).type(ContentType.TEXT).build());
        } else if (KNOWLEDGE_RETRIEVAL_TOOL_NAME.equals(name)) {
            String content = result.stream()
                    .filter(b -> b instanceof TextBlock)
                    .map(b -> (TextBlock) b)
                    .map(TextBlock::getText)
                    .map(t -> t.replaceAll("\\\\n", "\n"))
                    .collect(Collectors.joining("\n\n"));
            return List.of(TextContent.builder().text(content).type(ContentType.TEXT).build());
        } else if (EXECUTE_SHELL_COMMAND_TOOL_NAME.equals(name)) {
            String content = "执行结果:\n" + result.stream()
                    .filter(b -> b instanceof TextBlock)
                    .map(b -> (TextBlock) b)
                    .map(TextBlock::getText)
                    .collect(Collectors.joining("\n\n"));
            return List.of(TextContent.builder().text(content).type(ContentType.TEXT).build());
        }
        return convertFromBlocks(result);
    }
}
