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


package com.aliyun.tam.x.tron.core.tts;

import com.alibaba.dashscope.audio.qwen_tts_realtime.QwenTtsRealtimeAudioFormat;
import lombok.Data;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(value = "tts.type", havingValue = "qwen", matchIfMissing = true)
@EnableConfigurationProperties(QwenRealtimeTtsConfig.QwenRealtimeTtsProperties.class)
public class QwenRealtimeTtsConfig {
    @Data
    @ConfigurationProperties("tts.qwen")
    public static class QwenRealtimeTtsProperties {
        private String model = "qwen3-tts-flash-realtime";

        private String url = "wss://dashscope.aliyuncs.com/api-ws/v1/realtime";

        private String apiKey = System.getenv("DASHSCOPE_API_KEY");

        private String voice = "Cherry";

        private String languageType = "Auto";

        private QwenTtsRealtimeAudioFormat format = QwenTtsRealtimeAudioFormat.PCM_24000HZ_MONO_16BIT;

        private String instructions = "";

        private Boolean optimizeInstructions = Boolean.FALSE;

        private Integer maxChunkSize = 50;

        private Long chunkIntervalInMills = 100L;

        private Long sessionCreateTimeoutInMills = 10_000L;
    }

    @Bean
    public TtsService qwenRealtimeTtsService(QwenRealtimeTtsProperties properties) {
        return new QwenRealtimeTtsService(properties);
    }
}
