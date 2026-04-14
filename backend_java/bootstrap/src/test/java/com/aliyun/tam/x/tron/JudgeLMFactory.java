package com.aliyun.tam.x.tron;

import com.aliyun.tam.x.tron.core.agents.BaseAgentBuilder;
import com.aliyun.tam.x.tron.core.config.ChatModelConfig;
import com.aliyun.tam.x.tron.core.config.ChatModelType;
import com.google.common.collect.Lists;
import dev.dokimos.core.JudgeLM;
import io.agentscope.core.message.Msg;
import io.agentscope.core.message.MsgRole;
import io.agentscope.core.message.TextBlock;
import io.agentscope.core.model.ChatModelBase;
import io.agentscope.core.model.ChatResponse;
import io.agentscope.core.model.GenerateOptions;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

import java.util.List;

@Component
public class JudgeLMFactory {

    @Value("${tron.dashscope.api-key}")
    private String apiKey;

    private ChatModelConfig defaultConfig;

    @PostConstruct
    public void init() {
        defaultConfig = ChatModelConfig.builder()
                .type(ChatModelType.OPENAI_COMPATIBLE)
                .baseUrl("https://dashscope.aliyuncs.com/compatible-mode/v1")
                .apiKey(apiKey)
                .modelName("qwen3.6-plus")
                .build();
    }


    public JudgeLM create() {
        return create(null, null);
    }

    public JudgeLM create(String systemPrompt, ChatModelConfig config) {
        ChatModelConfig mergedConfig;
        if (config == null) {
            mergedConfig = ChatModelConfig.builder()
                    .type(defaultConfig.getType())
                    .baseUrl(defaultConfig.getBaseUrl())
                    .apiKey(defaultConfig.getApiKey())
                    .modelName(defaultConfig.getModelName())
                    .thinking(defaultConfig.getThinking())
                    .generateKwargs(defaultConfig.getGenerateKwargs())
                    .build();;
        } else {
            mergedConfig = ChatModelConfig.builder()
                    .type(config.getType() != null ? config.getType() : defaultConfig.getType())
                    .baseUrl(config.getBaseUrl() != null ? config.getBaseUrl() : defaultConfig.getBaseUrl())
                    .apiKey(config.getApiKey() != null ? config.getApiKey() : defaultConfig.getApiKey())
                    .modelName(config.getModelName() != null ? config.getModelName() : defaultConfig.getModelName())
                    .thinking(config.getThinking() != null ? config.getThinking() : defaultConfig.getThinking())
                    .generateKwargs(config.getGenerateKwargs() != null ? config.getGenerateKwargs() : defaultConfig.getGenerateKwargs())
                    .build();
        }
        ChatModelBase chatModel = BaseAgentBuilder.newChatModel(mergedConfig);
        return (prompt) -> {
            List<Msg> msgs = Lists.newArrayList();
            if (systemPrompt != null && !systemPrompt.isBlank()) {
                msgs.add(Msg.builder().role(MsgRole.SYSTEM).textContent(systemPrompt).build());
            }
            msgs.add(Msg.builder().role(MsgRole.USER).textContent(prompt).build());

            return chatModel.stream(
                            msgs,
                            Lists.newArrayList(),
                            GenerateOptions.builder()
                                    .temperature(0.0)
                                    .topP(0.0001)
                                    .build())
                    .map(ChatResponse::getContent)
                    .flatMap(Flux::fromIterable)
                    .filter(c -> c instanceof TextBlock)
                    .map(c -> (TextBlock) c)
                    .map(TextBlock::getText)
                    .reduce((s, s2) -> s + s2)
                    .block();
        };
    }
}
