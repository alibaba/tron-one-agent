package com.aliyun.tam.x.tron.config;

import io.agentscope.core.tracing.TracerRegistry;
import io.agentscope.core.tracing.telemetry.TelemetryTracer;
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.common.AttributesBuilder;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.api.trace.TracerProvider;
import io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporter;
import io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporterBuilder;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationStartedEvent;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.CollectionUtils;

import java.util.Map;


@Slf4j
@Configuration
@EnableConfigurationProperties(OpenTelemetryConfig.OpenTelemetryProperties.class)
@ConditionalOnProperty(name = "opentelemetry.enabled", havingValue = "true")
public class OpenTelemetryConfig implements ApplicationListener<ApplicationStartedEvent> {


    @Data
    @ConfigurationProperties(prefix = "opentelemetry")
    public static class OpenTelemetryProperties {
        private boolean enabled = false;

        private boolean enableGlobalTracer = true;

        private boolean enableAgentScopeTracing = true;

        private String endpoint;

        private Map<String, Object> attributes;

        private Map<String, String> headers;

        private String licenseKey = "aj5f29uvje@22e528d0419549a";

        private String workspace = "default-cms-1069625264970794-cn-chengdu";

        private String project = "proj-xtrace-ec8de6d2925c1afb172ff15c7fdc4b23-cn-chengdu";
    }

    @Value("${spring.application.name:tron-one-agent}")
    private String applicationName;

    @Value("${spring.application.version:1.0.0}")
    private String applicationVersion;

    @Value("${spring.application.env:production}")
    private String applicationEnv;


    @Autowired
    private OpenTelemetryProperties properties;

    @Bean
    public SdkTracerProvider tracerProvider() {
        AttributesBuilder attributesBuilder = Attributes.builder()
                .put("service.name", applicationName)
                .put("service.version", applicationVersion)
                .put("service.environment", applicationEnv)
                .put("host.name", getHostName());
        if (!CollectionUtils.isEmpty(properties.getAttributes())) {
            for (Map.Entry<String, Object> entry : properties.getAttributes().entrySet()) {
                attributesBuilder.put(entry.getKey(), entry.getValue().toString());
            }
        }
        Resource resource = Resource.getDefault()
                .merge(Resource.create(attributesBuilder.build()));

        OtlpHttpSpanExporterBuilder exportBuilder = OtlpHttpSpanExporter.builder()
                .setEndpoint(properties.getEndpoint());
        if (!CollectionUtils.isEmpty(properties.getHeaders())) {
            for (Map.Entry<String, String> entry : properties.getHeaders().entrySet()) {
                exportBuilder.addHeader(entry.getKey(), entry.getValue());
            }
        }
        OtlpHttpSpanExporter exporter = exportBuilder
                .build();

        BatchSpanProcessor spanProcessor = BatchSpanProcessor
                .builder(exporter)
                .build();

        log.info("OpenTelemetry TracerProvider created");
        return SdkTracerProvider.builder()
                .addSpanProcessor(spanProcessor)
                .setResource(resource)
                .build();
    }

    private String getHostName() {
        try {
            return java.net.InetAddress.getLocalHost().getHostName();
        } catch (Exception e) {
            try {
                return java.net.InetAddress.getLocalHost().getHostAddress();
            } catch (Exception ex) {
                return "unknown";
            }
        }
    }

    @Bean
    public Tracer defaultTracer(TracerProvider provider) {
        return provider.get(applicationName, applicationVersion);
    }

    @Bean
    @ConditionalOnProperty(name = "opentelemetry.enableGlobalTracer", havingValue = "true")
    public OpenTelemetrySdk openTelemetrySdk(SdkTracerProvider sdkTracerProvider) {
        return OpenTelemetrySdk.builder()
                .setTracerProvider(sdkTracerProvider)
                .buildAndRegisterGlobal();
    }


    @Override
    public void onApplicationEvent(ApplicationStartedEvent event) {
        if (properties.isEnableAgentScopeTracing()) {
            Tracer defaultTracer = event.getApplicationContext().getBean(Tracer.class);
            TracerRegistry.register(new TelemetryTracer(defaultTracer));
            TracerRegistry.enableTracingHook();
            log.info("AgentScope tracing initialized");
        }
    }

}
