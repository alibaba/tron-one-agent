package com.aliyun.tam.x.tron.core.asr;

import lombok.Data;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(value = "asr.type", havingValue = "qwen", matchIfMissing = true)
@EnableConfigurationProperties(QwenRealtimeAsrConfig.QwenRealtimeAsrProperties.class)
public class QwenRealtimeAsrConfig {

    @Data
    @ConfigurationProperties("asr.qwen")
    public static class QwenRealtimeAsrProperties {
        private String model = "qwen3-asr-flash-realtime";

        private String url = "wss://dashscope.aliyuncs.com/api-ws/v1/realtime";

        private String apiKey = System.getenv("DASHSCOPE_API_KEY");

        private String language = "zh";

        private Integer inputSampleRate = 16000;

        private String inputAudioFormat = "pcm";

        private Long sessionCreateTimeoutInMills = 10_000L;
    }

    @Bean
    public QwenRealtimeAsrService qwenRealtimeAsrService(QwenRealtimeAsrProperties properties) {
        return new QwenRealtimeAsrService(properties);
    }
}
