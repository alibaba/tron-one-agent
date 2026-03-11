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

import com.aliyun.tam.x.tron.api.request.PatchAgentConfigRequest;
import com.aliyun.tam.x.tron.api.request.PatchKnowledgeBaseConfigRequest;
import com.aliyun.tam.x.tron.api.request.PatchMcpClientConfigRequest;
import com.aliyun.tam.x.tron.core.agents.AgentRegistry;
import com.aliyun.tam.x.tron.core.config.*;
import com.aliyun.tam.x.tron.core.domain.repository.*;
import com.aliyun.tam.x.tron.core.domain.service.SkillConfigService;
import com.aliyun.tam.x.tron.core.mcp.McpClientRegistry;
import com.aliyun.tam.x.tron.core.rag.KnowledgeRegistry;
import com.aliyun.tam.x.tron.core.tools.ToolRegistry;
import com.google.common.collect.ImmutableMap;
import io.agentscope.core.tool.Toolkit;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/control")
@RequiredArgsConstructor
public class ConfigController {
    @Getter
    @Setter
    @AllArgsConstructor
    public static class ControlResponse<T> {

        public static <T> ControlResponse<T> success(T data) {
            return new ControlResponse<>(HttpStatus.OK.value(), true, "success", data);
        }

        public static <T> ControlResponse<T> error(int code, String message) {
            return new ControlResponse<>(code, false, message, null);
        }

        public static <T> ControlResponse<T> notFound() {
            return ControlResponse.error(HttpStatus.NOT_FOUND.value(), "not found");
        }


        private int code;

        private boolean success;

        private String message;

        private T data;
    }

    private final AgentRegistry agentRegistry;

    private final AgentRepository agentRepository;

    private final ToolRegistry toolRegistry;

    private final McpClientRegistry mcpClientRegistry;

    private final McpClientRepository mcpClientRepository;

    private final KnowledgeRegistry knowledgeRegistry;

    private final KnowledgeBaseRepository knowledgeBaseRepository;

    private final SkillConfigService skillConfigService;

    private final SkillConfigRepository skillConfigRepository;

    private final FileRepository fileRepository;

    @ExceptionHandler
    public ControlResponse<?> handleException(Exception e) {
        if (e instanceof IllegalArgumentException) {
            return ControlResponse.error(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
        log.error("Internal server error", e);
        return ControlResponse.error(HttpStatus.INTERNAL_SERVER_ERROR.value(), "Internal server error");
    }

    @GetMapping("/agents")
    public ControlResponse<?> getAgentConfigs() {
        return ControlResponse.success(agentRegistry.getAgentConfigs());
    }

    @GetMapping("/agents/{agent_id}")
    public ControlResponse<?> getAgentConfig(
            @PathVariable("agent_id") String agentId
    ) {
        AgentConfig agentConfig = agentRegistry.getAgentConfigById(agentId);
        if (agentConfig == null) {
            return ControlResponse.notFound();
        }
        return ControlResponse.success(agentConfig);
    }

    @PatchMapping("/agents/{agent_id}")
    public ControlResponse<?> patchAgentConfig(
            @PathVariable("agent_id") String agentId,
            @RequestBody PatchAgentConfigRequest patchAgentConfig
    ) {
        AgentConfig agentConfig = agentRegistry.getAgentConfigById(agentId);
        if (agentConfig == null) {
            return ControlResponse.notFound();
        }
        if (patchAgentConfig.getName() != null) {
            agentConfig.setName(patchAgentConfig.getName());
        }
        if (patchAgentConfig.getEnabled() != null) {
            agentConfig.setEnabled(patchAgentConfig.getEnabled());
        }
        if (patchAgentConfig.getChatModel() != null) {
            agentConfig.setChatModel(patchAgentConfig.getChatModel());
        }
        if (patchAgentConfig.getSystemPrompt() != null) {
            agentConfig.setSystemPrompt(patchAgentConfig.getSystemPrompt());
        }
        if (patchAgentConfig.getMaxIters() != null) {
            agentConfig.setMaxIters(patchAgentConfig.getMaxIters());
        }
        if (patchAgentConfig.getTools() != null) {
            agentConfig.setTools(patchAgentConfig.getTools());
        }
        if (patchAgentConfig.getMcpClients() != null) {
            agentConfig.setMcpClients(patchAgentConfig.getMcpClients());
        }
        if (patchAgentConfig.getRagMode() != null) {
            agentConfig.setRagMode(patchAgentConfig.getRagMode());
        }
        if (patchAgentConfig.getKnowledgeBases() != null) {
            agentConfig.setKnowledgeBases(patchAgentConfig.getKnowledgeBases());
        }
        if (patchAgentConfig.getSubAgents() != null) {
            agentConfig.setSubAgents(patchAgentConfig.getSubAgents());
        }
        if (patchAgentConfig.getSkills() != null) {
            agentConfig.setSkills(patchAgentConfig.getSkills());
        }
        agentRepository.saveConfig(agentId, agentConfig);
        return ControlResponse.success(agentConfig);
    }

    @GetMapping("/tools")
    public ControlResponse<?> getTools() {
        Toolkit toolkit = toolRegistry.getAllTools();
        List<ImmutableMap<String, String>> tools = toolkit.getToolSchemas()
                .stream()
                .map(schema -> {
                    return ImmutableMap.of(
                            "name", schema.getName(),
                            "description", schema.getDescription()
                    );
                }).toList();
        return ControlResponse.success(tools);
    }

    @GetMapping("/mcps")
    public ControlResponse<?> getMcpConfigs() {
        return ControlResponse.success(mcpClientRegistry.getClientConfigs());
    }

    @GetMapping("/mcps/{mcp_id}")
    public ControlResponse<?> getMcpConfig(
            @PathVariable("mcp_id") String mcpId
    ) {
        McpClientConfig config = mcpClientRegistry.getClientConfigById(mcpId);
        if (config == null) {
            return ControlResponse.notFound();
        }
        return ControlResponse.success(config);
    }

    @PostMapping("/mcps")
    public ControlResponse<?> createMcpConfig(
            @RequestBody McpClientConfig mcpClientConfig
    ) {
        mcpClientRepository.saveConfig(mcpClientConfig);
        return ControlResponse.success("success");
    }

    @PatchMapping("/mcps/{mcp_id}")
    public ControlResponse<?> patchMcpConfig(
            @PathVariable("mcp_id") String mcpId,
            @RequestBody PatchMcpClientConfigRequest patchMcpClientConfig
    ) {
        McpClientConfig mcpClientConfig = mcpClientRegistry.getClientConfigById(mcpId);
        if (mcpClientConfig == null) {
            return ControlResponse.notFound();
        }
        if (patchMcpClientConfig.getEnabled() != null) {
            mcpClientConfig.setEnabled(patchMcpClientConfig.getEnabled());
        }
        if (patchMcpClientConfig.getName() != null) {
            mcpClientConfig.setName(patchMcpClientConfig.getName());
        }
        if (patchMcpClientConfig.getDescription() != null) {
            mcpClientConfig.setDescription(patchMcpClientConfig.getDescription());
        }
        if (patchMcpClientConfig.getTransport() != null) {
            mcpClientConfig.setTransport(patchMcpClientConfig.getTransport());
        }
        if (patchMcpClientConfig.getUrl() != null) {
            mcpClientConfig.setUrl(patchMcpClientConfig.getUrl());
        }
        if (patchMcpClientConfig.getTimeout() != null) {
            mcpClientConfig.setTimeout(patchMcpClientConfig.getTimeout());
        }
        if (patchMcpClientConfig.getSseReadTimeout() != null) {
            mcpClientConfig.setSseReadTimeout(patchMcpClientConfig.getSseReadTimeout());
        }
        if (patchMcpClientConfig.getHeaders() != null) {
            mcpClientConfig.setHeaders(patchMcpClientConfig.getHeaders());
        }
        mcpClientRepository.saveConfig(mcpClientConfig);
        return ControlResponse.success("success");
    }

    @DeleteMapping("/mcps/{mcp_id}")
    public ControlResponse<?> deleteMcpConfig(
            @PathVariable("mcp_id") String mcpId
    ) {
        mcpClientRepository.deleteConfigById(mcpId);
        return ControlResponse.success("success");
    }

    @GetMapping("/kb")
    public ControlResponse<?> getKbConfigs() {
        return ControlResponse.success(knowledgeRegistry.getConfigs());
    }

    @GetMapping("/kb/{kb_id}")
    public ControlResponse<?> getKbConfig(
            @PathVariable("kb_id") String kbId
    ) {
        KnowledgeBaseConfig config = knowledgeRegistry.getConfig(kbId);
        if (config == null) {
            return ControlResponse.notFound();
        }
        return ControlResponse.success(config);
    }

    @PostMapping("/kb")
    public ControlResponse<?> createKbConfig(
            @RequestBody KnowledgeBaseConfig knowledgeBaseConfig
    ) {
        knowledgeBaseRepository.saveKnowledgeConfig(knowledgeBaseConfig);
        return ControlResponse.success("success");
    }

    @PatchMapping("/kb/{kb_id}")
    public ControlResponse<?> patchKbConfig(
            @PathVariable("kb_id") String kbId,
            @RequestBody PatchKnowledgeBaseConfigRequest patchKbConfig
    ) {
        KnowledgeBaseConfig config = knowledgeRegistry.getConfig(kbId);
        if (config == null) {
            return ControlResponse.notFound();
        }
        if (patchKbConfig.getEnabled() != null) {
            config.setEnabled(patchKbConfig.getEnabled());
        }
        if (patchKbConfig.getName() != null) {
            config.setName(patchKbConfig.getName());
        }
        if (config instanceof BailianKnowledgeBaseConfig bailianConfig) {
            if (patchKbConfig.getWorkspaceId() != null) {
                bailianConfig.setWorkspaceId(patchKbConfig.getWorkspaceId());
            }
            if (patchKbConfig.getIndexId() != null) {
                bailianConfig.setIndexId(patchKbConfig.getIndexId());
            }
            if (patchKbConfig.getEnableRewrite() != null) {
                bailianConfig.setEnableRewrite(patchKbConfig.getEnableRewrite());
            }
            if (patchKbConfig.getEnableRerank() != null) {
                bailianConfig.setEnableRerank(patchKbConfig.getEnableRerank());
            }
        }
        knowledgeBaseRepository.saveKnowledgeConfig(config);
        return ControlResponse.success("success");
    }

    @DeleteMapping("/kb/{kb_id}")
    public ControlResponse<?> deleteKbConfig(
            @PathVariable("kb_id") String kbId
    ) {
        knowledgeBaseRepository.deleteKnowledgeById(kbId);
        return ControlResponse.success("success");
    }

    @GetMapping("/skills")
    public ControlResponse<?> getSkills() {
        return ControlResponse.success(skillConfigRepository.list());
    }

    @GetMapping("/skills/{skill_id}")
    public ControlResponse<?> getSkill(
            @PathVariable("skill_id") Long skillId
    ) {
        SkillConfig skillConfig = skillConfigRepository.get(skillId);
        if (skillConfig == null) {
            return ControlResponse.notFound();
        }
        return ControlResponse.success(skillConfig);
    }

    @GetMapping("/skills/{skill_id}/download")
    public ResponseEntity<?> downloadSkill(
            @PathVariable("skill_id") Long skillId
    ) throws IOException {
        SkillConfig skillConfig = skillConfigRepository.get(skillId);
        if (skillConfig == null) {
            return ResponseEntity.notFound().build();
        }
        InputStream inputStream = fileRepository.download(skillConfig.getFileId());
        InputStreamResource resource = new InputStreamResource(inputStream);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + skillConfig.getName() + ".zip\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    @PostMapping(value = "/skills", consumes = "multipart/form-data")
    public ControlResponse<?> uploadSkill(
            @RequestParam(value = "id", required = false) Long id,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        Path tempFile = Files.createTempFile("skill", file.getOriginalFilename());
        try {
            Files.copy(file.getInputStream(), tempFile, StandardCopyOption.REPLACE_EXISTING);
            SkillConfig skillConfig = skillConfigService.upload(file.getOriginalFilename(), tempFile);
            if (id != null) {
                skillConfig.setId(id);
                skillConfigRepository.update(skillConfig);
            } else {
                skillConfig.setEnabled(true);
                skillConfigRepository.add(skillConfig);
            }
            return ControlResponse.success(skillConfig.getId());
        } finally {
            Files.deleteIfExists(tempFile);
        }
    }

    @PatchMapping("/skills/{skill_id}")
    public ControlResponse<?> patchSkill(
            @PathVariable("skill_id") Long skillId,
            @RequestBody SkillConfig skillConfig
    ) {
        skillConfig = SkillConfig.builder()
                .id(skillId)
                .enabled(skillConfig.getEnabled())
                .build();
        skillConfigRepository.update(skillConfig);
        return ControlResponse.success("success");
    }

    @DeleteMapping("/skills/{skill_id}")
    public ControlResponse<?> deleteSkill(
            @PathVariable("skill_id") Long skillId
    ) {
        skillConfigRepository.delete(skillId);
        return ControlResponse.success("success");
    }

}
