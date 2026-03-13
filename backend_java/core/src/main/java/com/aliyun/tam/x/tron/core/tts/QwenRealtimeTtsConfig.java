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

        private String mode = "server_commit";

        private QwenTtsRealtimeAudioFormat format = QwenTtsRealtimeAudioFormat.PCM_24000HZ_MONO_16BIT;

        private String instructions = "";

        private Boolean optimizeInstructions = Boolean.FALSE;


    }

    @Bean
    public TtsService qwenRealtimeTtsService(QwenRealtimeTtsProperties properties) {
        return new QwenRealtimeTtsService(properties);
    }
}
