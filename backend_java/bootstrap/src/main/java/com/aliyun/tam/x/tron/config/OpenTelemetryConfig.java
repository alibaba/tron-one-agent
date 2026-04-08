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

package com.aliyun.tam.x.tron.config;

import io.agentscope.core.tracing.TracerRegistry;
import io.agentscope.core.tracing.telemetry.TelemetryTracer;
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.common.AttributesBuilder;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.api.trace.TracerProvider;
import io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporter;
import io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporterBuilder;
import io.opentelemetry.instrumentation.jdbc.datasource.JdbcTelemetry;
import io.opentelemetry.instrumentation.spring.webmvc.v6_0.SpringWebMvcTelemetry;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.data.LinkData;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import io.opentelemetry.sdk.trace.samplers.Sampler;
import io.opentelemetry.sdk.trace.samplers.SamplingDecision;
import io.opentelemetry.sdk.trace.samplers.SamplingResult;
import jakarta.servlet.Filter;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationStartedEvent;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.CollectionUtils;

import java.util.List;
import java.util.Map;

import javax.sql.DataSource;


@Slf4j
@Configuration
@EnableConfigurationProperties(OpenTelemetryConfig.OpenTelemetryProperties.class)
@ConditionalOnProperty(name = "opentelemetry.enabled", havingValue = "true")
public class OpenTelemetryConfig implements ApplicationListener<ApplicationStartedEvent> {

    private static final Logger LOGGER = LoggerFactory.getLogger(OpenTelemetryConfig.class);

    @Data
    @ConfigurationProperties(prefix = "opentelemetry")
    public static class OpenTelemetryProperties {
        private boolean enabled = false;

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
                .setSampler(apiOnlySampler())
                .build();
    }

    private Sampler apiOnlySampler() {
        Sampler rootSampler = new Sampler() {
            @Override
            public SamplingResult shouldSample(io.opentelemetry.context.Context parentContext, String traceId, String name, SpanKind spanKind, Attributes attributes, List<LinkData> parentLinks) {
                if (spanKind == SpanKind.SERVER) {
                    return SamplingResult.create(SamplingDecision.RECORD_AND_SAMPLE);
                }
                return SamplingResult.create(SamplingDecision.DROP);
            }

            @Override
            public String getDescription() {
                return "ApiOnlyRootSampler";
            }
        };
        return Sampler.parentBasedBuilder(rootSampler)
                .setLocalParentSampled(Sampler.alwaysOn())
                .setLocalParentNotSampled(Sampler.alwaysOff())
                .setRemoteParentSampled(Sampler.alwaysOn())
                .setRemoteParentNotSampled(Sampler.alwaysOff())
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
    public OpenTelemetrySdk openTelemetrySdk(SdkTracerProvider sdkTracerProvider) {
        return OpenTelemetrySdk.builder()
                .setTracerProvider(sdkTracerProvider)
                .build();
    }

    @Bean
    public Filter webMvcTracingFilter(OpenTelemetry openTelemetry) {
        return SpringWebMvcTelemetry.create(openTelemetry).createServletFilter();
    }

    @Bean
    static BeanPostProcessor dataSourceTracingPostProcessor(ObjectProvider<OpenTelemetry> openTelemetryProvider) {
        return new BeanPostProcessor() {
            private volatile OpenTelemetry cachedOtel;

            private OpenTelemetry getOpenTelemetry() {
                if (cachedOtel == null) {
                    cachedOtel = openTelemetryProvider.getIfAvailable(GlobalOpenTelemetry::get);
                }
                return cachedOtel;
            }

            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
                if (bean instanceof DataSource ds) {
                    LOGGER.info("Wrapping DataSource [{}] with OpenTelemetry JDBC tracing", beanName);
                    return JdbcTelemetry.create(getOpenTelemetry()).wrap(ds);
                }
                return bean;
            }
        };
    }


    @Override
    public void onApplicationEvent(ApplicationStartedEvent event) {
        Tracer defaultTracer = event.getApplicationContext().getBean(Tracer.class);
        TracerRegistry.register(new TelemetryTracer(defaultTracer));
        TracerRegistry.enableTracingHook();
        log.info("AgentScope tracing initialized");
    }

}
