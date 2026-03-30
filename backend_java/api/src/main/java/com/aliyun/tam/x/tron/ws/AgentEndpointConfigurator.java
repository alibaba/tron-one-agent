package com.aliyun.tam.x.tron.ws;

import jakarta.websocket.HandshakeResponse;
import jakarta.websocket.server.HandshakeRequest;
import jakarta.websocket.server.ServerEndpointConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.AutowireCapableBeanFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class AgentEndpointConfigurator extends ServerEndpointConfig.Configurator {

    private static ApplicationContext applicationContext;

    @Override
    public void modifyHandshake(ServerEndpointConfig config,
                                HandshakeRequest request,
                                HandshakeResponse response) {
        Map<String, List<String>> headers = request.getHeaders();
        config.getUserProperties().put("headers", headers);


        Map<String, List<String>> params = request.getParameterMap();
        config.getUserProperties().put("params", params);
    }

    @Override
    public <T> T getEndpointInstance(Class<T> clazz) throws InstantiationException {
        return applicationContext.getBean(clazz);
    }

    @Autowired
    public void setAutowireCapableBeanFactory(ApplicationContext applicationContext) {
        AgentEndpointConfigurator.applicationContext = applicationContext;
    }
}