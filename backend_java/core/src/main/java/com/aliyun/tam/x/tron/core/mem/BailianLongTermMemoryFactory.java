package com.aliyun.tam.x.tron.core.mem;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import io.agentscope.core.memory.LongTermMemory;
import io.agentscope.core.message.Msg;
import io.agentscope.core.message.MsgRole;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Component
public class BailianLongTermMemoryFactory implements LongTermMemoryFactory {


    @Value("${tron.dashscope.api-key}")
    private String apiKey;

    @Value("${memory.long.bailian.memory_library_id:}")
    private String memoryLibraryId;

    @Value("${memory.long.bailian.project_id:}")
    private String projectId;

    @Value("${memory.long.bailian.profile_schema:}")
    private String profileSchema;


    private final RestClient restClient;

    public BailianLongTermMemoryFactory(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.build();
    }

    @Override
    public LongTermMemory create(String userId) {
        return new LongTermMemory() {
            @Override
            public Mono<Void> record(List<Msg> msgs) {
                return Mono.fromRunnable(() -> {
                    Void result = restClient.post()
                            .uri("https://dashscope.aliyuncs.com/api/v2/apps/memory/add")
                            .header("Authorization", "Bearer " + apiKey)
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(toAddMemoryRequest(userId, msgs))
                            .retrieve()
                            .body(Void.class);
                });
            }

            @Override
            public Mono<String> retrieve(Msg msg) {
                return Mono.fromCallable(() -> {
                    return restClient.post()
                            .uri("https://dashscope.aliyuncs.com/api/v2/apps/memory/memory_nodes/search")
                            .header("Authorization", "Bearer " + apiKey)
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(toSearchMemoryRequest(userId, msg))
                            .retrieve()
                            .body(String.class);
                });
            }
        };
    }

    private Map<String, Object> toSearchMemoryRequest(String userId, Msg msg) {
        ImmutableMap.Builder<String, Object> request = ImmutableMap.builder();
        request.put("user_id", userId);

        if (StringUtils.hasText(memoryLibraryId)) {
            request.put("memory_library_id", memoryLibraryId);
        }
        if (StringUtils.hasText(projectId)) {
            request.put("project_id", projectId);
        }

        ImmutableList.Builder<Map<String, Object>> messages = ImmutableList.builder();
        if (msg.getRole() == MsgRole.USER && msg.getTextContent() != null) {
            messages.add(ImmutableMap.of("role", "user", "content", msg.getTextContent()));
        } else if (msg.getRole() == MsgRole.ASSISTANT && msg.getTextContent() != null) {
            messages.add(ImmutableMap.of("role", "assistant", "content", msg.getTextContent()));
        }
        request.put("messages", messages.build());
        return request.build();
    }

    private Map<String, Object> toAddMemoryRequest(String userId, List<Msg> msgs) {
        ImmutableMap.Builder<String, Object> request = ImmutableMap.builder();
        request.put("user_id", userId);

        if (StringUtils.hasText(memoryLibraryId)) {
            request.put("memory_library_id", memoryLibraryId);
        }
        if (StringUtils.hasText(profileSchema)) {
            request.put("profile_schema", profileSchema);
        }
        if (StringUtils.hasText(projectId)) {
            request.put("project_id", projectId);
        }

        ImmutableList.Builder<Map<String, Object>> messages = ImmutableList.builder();
        for (Msg msg : msgs) {
            if (msg.getRole() == MsgRole.USER && msg.getTextContent() != null) {
                messages.add(ImmutableMap.of("role", "user", "content", msg.getTextContent()));
            } else if (msg.getRole() == MsgRole.ASSISTANT && msg.getTextContent() != null) {
                messages.add(ImmutableMap.of("role", "assistant", "content", msg.getTextContent()));
            }
        }
        request.put("memory_library_id", messages.build());
        return request.build();
    }

}
