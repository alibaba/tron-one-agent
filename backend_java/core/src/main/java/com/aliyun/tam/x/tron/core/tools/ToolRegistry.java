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

import com.aliyun.tam.x.tron.core.config.AgentToolConfig;
import io.agentscope.core.tool.Toolkit;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.ReflectionUtils;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ToolRegistry implements BeanPostProcessor {

    private final Map<String, Object> toolBeans = new ConcurrentHashMap<>();

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        Class<?> clazz = bean.getClass();
        ReflectionUtils.doWithMethods(clazz, method -> {
            io.agentscope.core.tool.Tool toolAnnotation = AnnotationUtils.findAnnotation(method, io.agentscope.core.tool.Tool.class);
            if (toolAnnotation != null) {
                toolBeans.put(beanName, bean);
            }
        });
        return bean;

    }

    public void registerToolsToToolkit(Toolkit toolkit, List<AgentToolConfig> toolConfigs) {
        if (CollectionUtils.isEmpty(toolConfigs)) {
            return;
        }

        for (AgentToolConfig toolConfig : toolConfigs) {
            if (!Objects.equals(Boolean.TRUE, toolConfig.getEnabled())) {
                continue;
            }

            Object toolBean = toolBeans.get(toolConfig.getName());
            if (toolBean != null) {
                toolkit.registerTool(toolBean);
            }
        }
    }

    public Toolkit getAllTools() {
        Toolkit toolkit = new Toolkit();
        for (Map.Entry<String, Object> entry : toolBeans.entrySet()) {
            toolkit.registerTool(entry.getValue());
        }
        return toolkit;
    }
}
