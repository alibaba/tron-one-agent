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


package com.aliyun.tam.x.tron.core.agents;

import com.aliyun.tam.x.tron.core.agents.one.A2ASubAgentHandler;
import com.aliyun.tam.x.tron.core.agents.one.LocalSubAgentHandler;
import com.aliyun.tam.x.tron.core.agents.one.OneAgentHandler;
import com.aliyun.tam.x.tron.core.agents.one.SubAgentHandler;
import com.aliyun.tam.x.tron.core.config.*;
import com.aliyun.tam.x.tron.core.domain.repository.AgentRepository;
import com.aliyun.tam.x.tron.core.domain.repository.SkillConfigRepository;
import com.aliyun.tam.x.tron.core.domain.service.SkillConfigService;
import com.aliyun.tam.x.tron.core.mcp.McpClientRegistry;
import com.aliyun.tam.x.tron.core.rag.KnowledgeRegistry;
import com.aliyun.tam.x.tron.core.tools.ToolRegistry;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.Lists;
import com.google.common.hash.Hasher;
import com.google.common.hash.Hashing;
import io.agentscope.core.ReActAgent;
import io.agentscope.core.memory.InMemoryMemory;
import io.agentscope.core.model.ChatModelBase;
import io.agentscope.core.model.DashScopeChatModel;
import io.agentscope.core.model.GenerateOptions;
import io.agentscope.core.model.OpenAIChatModel;
import io.agentscope.core.rag.Knowledge;
import io.agentscope.core.rag.RAGMode;
import io.agentscope.core.skill.AgentSkill;
import io.agentscope.core.skill.SkillBox;
import io.agentscope.core.skill.util.SkillUtil;
import io.agentscope.core.tool.Toolkit;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.AutowireCapableBeanFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Getter
@RequiredArgsConstructor(access = AccessLevel.PROTECTED)
public abstract class BaseAgentBuilder implements AgentBuilder {
    private static final Path WORKSPACE_BASEDIR = Path.of(".workspace");

    @Autowired
    private AutowireCapableBeanFactory autowireCapableBeanFactory;

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private AgentRepository agentRepository;

    @Autowired
    private ToolRegistry toolRegistry;

    @Autowired
    private McpClientRegistry mcpClientRegistry;

    @Autowired
    private KnowledgeRegistry knowledgeRegistry;

    @Autowired
    private SkillConfigRepository skillConfigRepository;

    @Autowired
    private SkillConfigService skillConfigService;

    @Autowired
    private ObjectMapper objectMapper;

    private final String agentId;

    protected abstract AgentConfig defaultConfig();

    @Override
    public AgentConfig getAgentConfig() {
        AgentConfig config = agentRepository.getConfig(agentId);
        if (config == null) {
            config = defaultConfig();
        } else {
            config = merge_config(defaultConfig(), config);
        }
        config.setId(agentId);
        return config;
    }

    @Override
    public AgentHandler build(String agentId, AgentConfig config) {
        if (!Objects.equals(agentId, this.agentId)) {
            return null;
        }

        return buildFromConfig(agentId, config);
    }

    private AgentHandler buildFromConfig(String agentId, AgentConfig config) {
        if (config == null) {
            config = getAgentConfig();
            if (!Objects.equals(Boolean.TRUE, config.getEnabled())) {
                return null;
            }
        } else {
            config = merge_config(getAgentConfig(), config);
        }

        ChatModelBase chatModel = newChatModel(config.getChatModel());
        if (config.getType() == LocalAgentType.REACT) {
            List<Knowledge> knowledges = buildKnowledgeBases(config);

            Toolkit toolkit = buildToolkit(config);

            SkillBox skillBox = buildSkillBox(config, toolkit);

            String systemPrompt = StringUtils.hasText(config.getSystemPrompt()) ? config.getSystemPrompt() : "";
            if (skillBox != null) {
                Path workdir = skillBox.getCodeExecutionWorkDir();
                systemPrompt += "\n\n Your work directory is " + workdir + ", you can read/write files or execute commands in this directory.\n"
                        + "\nResources and Scripts of a specific skill can be found in " + skillBox.getUploadDir() + " /<skill_id>/ directory\n";
            }

            ReActAgent agent = ReActAgent.builder()
                    .name(config.getName())
                    .model(chatModel)
                    .sysPrompt(systemPrompt)
                    .toolkit(toolkit)
                    .skillBox(skillBox)
                    .memory(new InMemoryMemory())
                    .maxIters(config.getMaxIters())
                    .knowledges(knowledges)
                    .ragMode(RAGMode.valueOf(config.getRagMode().toUpperCase()))
                    .build();
            AgentHandler handler = new ReActAgentHandler(agentId, agent, config.getSupportInputTypes());
            autowireCapableBeanFactory.autowireBean(handler);
            return handler;
        } else if (config.getType() == LocalAgentType.ONE) {
            List<Knowledge> knowledges = buildKnowledgeBases(config);

            Toolkit toolkit = buildToolkit(config);

            SkillBox skillBox = buildSkillBox(config, toolkit);

            String systemPrompt = StringUtils.hasText(config.getSystemPrompt()) ? config.getSystemPrompt() : "";
            if (skillBox != null) {
                Path workdir = skillBox.getCodeExecutionWorkDir();
                systemPrompt += "\n\n Your work directory is " + workdir + ", you can read/write files in this directory";
            }

            ReActAgent.Builder mainAgentBuilder = ReActAgent.builder()
                    .name(config.getName())
                    .model(chatModel)
                    .sysPrompt(systemPrompt)
                    .memory(new InMemoryMemory())
                    .toolkit(toolkit)
                    .skillBox(skillBox)
                    .memory(new InMemoryMemory())
                    .maxIters(config.getMaxIters())
                    .knowledges(knowledges)
                    .ragMode(RAGMode.valueOf(config.getRagMode().toUpperCase()));

            List<SubAgentHandler> subAgents = Lists.newArrayList();
            for (SubAgentConfig subAgentConfig : config.getSubAgents()) {
                if (!Objects.equals(Boolean.TRUE, subAgentConfig.getEnabled())) {
                    continue;
                }

                if (subAgentConfig instanceof LocalSubAgentConfig c) {
                    AgentHandler agentHandler = applicationContext.getBean(AgentRegistry.class)
                            .getAgent(c.getAgentId(), null);

                    SubAgentHandler subAgentHandler = new LocalSubAgentHandler(c, agentHandler);
                    autowireCapableBeanFactory.autowireBean(subAgentHandler);
                    subAgents.add(subAgentHandler);
                } else if (subAgentConfig instanceof A2ASubAgentConfig c) {
                    SubAgentHandler subAgentHandler = new A2ASubAgentHandler(c);
                    autowireCapableBeanFactory.autowireBean(subAgentHandler);
                    subAgents.add(subAgentHandler);
                }
            }
            AgentHandler handler = new OneAgentHandler(config.getId(), mainAgentBuilder, subAgents, config.getSupportInputTypes());
            autowireCapableBeanFactory.autowireBean(handler);
            return handler;
        }
        throw new IllegalArgumentException("Unsupported agent type " + config.getType());
    }

    private ChatModelBase newChatModel(ChatModelConfig config) {
        if (Objects.equals(config.getType(), ChatModelType.DASHSCOPE)) {
            return DashScopeChatModel.builder()
                    .apiKey(config.getApiKey())
                    .modelName(config.getModelName())
                    .baseUrl(config.getBaseUrl())
                    .stream(config.getStream())
                    .enableThinking(config.getThinking())
                    .defaultOptions(buildGenerateOptions(config.getGenerateKwargs()))
                    .build();
        } else if (Objects.equals(config.getType(), ChatModelType.OPENAI_COMPATIBLE)) {
            return OpenAIChatModel.builder()
                    .apiKey(config.getApiKey())
                    .modelName(config.getModelName())
                    .baseUrl(config.getBaseUrl())
                    .stream(config.getStream())
                    .generateOptions(buildGenerateOptions(config.getGenerateKwargs()))
                    .build();
        } else {
            throw new IllegalArgumentException("unknown chat model type - " + config.getType());
        }
    }


    private GenerateOptions buildGenerateOptions(Map<String, Object> kwargs) {
        if (CollectionUtils.isEmpty(kwargs)) {
            return null;
        }
        GenerateOptions.Builder builder = GenerateOptions.builder();
        if (kwargs.containsKey("temperature")) {
            builder.temperature(((Number) kwargs.get("temperature")).doubleValue());
        }
        if (kwargs.containsKey("maxTokens")) {
            builder.maxTokens(((Number) kwargs.get("maxTokens")).intValue());
        }
        if (kwargs.containsKey("topP")) {
            builder.topP(((Number) kwargs.get("topP")).doubleValue());
        }
        if (kwargs.containsKey("topK")) {
            builder.topK(((Number) kwargs.get("topK")).intValue());
        }
        if (kwargs.containsKey("thinkingBudget")) {
            builder.thinkingBudget(((Number) kwargs.get("thinkingBudget")).intValue());
        }
        if (kwargs.containsKey("presencePenalty")) {
            builder.presencePenalty(((Number) kwargs.get("presencePenalty")).doubleValue());
        }
        if (kwargs.containsKey("frequencyPenalty")) {
            builder.frequencyPenalty(((Number) kwargs.get("frequencyPenalty")).doubleValue());
        }
        if (kwargs.containsKey("seed")) {
            builder.seed((Long) kwargs.get("seed"));
        }
        return builder.build();
    }

    private AgentConfig merge_config(AgentConfig original, AgentConfig newConfig) {
        try {
            Map<String, Object> originalJson = objectMapper.convertValue(original, Map.class);
            Map<String, Object> newConfigJson = objectMapper.convertValue(newConfig, Map.class);

            for (String key : newConfigJson.keySet()) {
                Object newValue = newConfigJson.get(key);
                if (newValue != null) {
                    originalJson.put(key, newValue);
                }
            }

            return objectMapper.convertValue(originalJson, AgentConfig.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to merge config", e);
        }
    }

    private Toolkit buildToolkit(AgentConfig config) {
        Toolkit toolkit = new Toolkit();
        toolRegistry.registerToolsToToolkit(toolkit, config.getTools());
        mcpClientRegistry.registerMcpClientsToToolkit(toolkit, config.getMcpClients());
        return toolkit;
    }

    private List<Knowledge> buildKnowledgeBases(AgentConfig config) {
        return knowledgeRegistry.buildKnowledgeBases(config.getKnowledgeBases());
    }

    private SkillBox buildSkillBox(AgentConfig config, Toolkit toolkit) {
        if (CollectionUtils.isEmpty(config.getSkills())) {
            return null;
        }

        List<SkillConfig> skillConfigs = skillConfigRepository.list();
        List<AgentSkill> builtinSkills = skillConfigService.getBuiltinSkills();

        Hasher hasher = Hashing.sha256().newHasher();
        List<AgentSkill> agentSkills = Lists.newArrayList();
        for (AgentSkillConfig agentSkillConfig : config.getSkills()) {
            if (!Objects.equals(Boolean.TRUE, agentSkillConfig.getEnabled())) {
                continue;
            }

            SkillConfig skillConfig = skillConfigs
                    .stream()
                    .filter(s -> Objects.equals(s.getName(), agentSkillConfig.getName()))
                    .findAny()
                    .orElse(null);
            if (skillConfig == null) {
                AgentSkill builtinSkill = builtinSkills.stream()
                        .filter(s -> Objects.equals(s.getName(), agentSkillConfig.getName()))
                        .findAny()
                        .orElse(null);
                if (builtinSkill == null) {
                    log.warn("Skill config not found for skill {}", agentSkillConfig.getName());
                } else {
                    agentSkills.add(builtinSkill);
                }
                continue;
            } else if (!Objects.equals(Boolean.TRUE, skillConfig.getEnabled())) {
                log.warn("Skill {} is disabled", agentSkillConfig.getName());
                continue;
            }

            Map<String, String> resources;
            try {
                resources = skillConfigService.syncSkill(skillConfig);
            } catch (IOException e) {
                log.error("Failed to sync skill {}", skillConfig.getName(), e);
                continue;
            }

            AgentSkill agentSkill = SkillUtil.createFrom(
                    skillConfig.getInstruction(),
                    resources
            );
            agentSkills.add(agentSkill);
            hasher.putString(skillConfig.getChecksum(), StandardCharsets.UTF_8);
        }


        if (agentSkills.isEmpty()) {
            return null;
        }
        Path workdir = WORKSPACE_BASEDIR.resolve(
                Paths.get(agentId, hasher.hash().toString())
        ).toAbsolutePath().normalize();
        SkillBox skillBox = new SkillBox(toolkit);
        skillBox.codeExecution()
                .workDir(workdir.toString())
                .withShell()
                .withRead()
                .withWrite()
                .enable();
        agentSkills.forEach(skillBox::registerSkill);
        return skillBox;
    }
}
