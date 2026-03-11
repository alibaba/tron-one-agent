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


package com.aliyun.tam.x.tron;

import ch.vorburger.mariadb4j.DB;
import ch.vorburger.mariadb4j.DBConfigurationBuilder;
import com.aliyun.tam.x.tron.core.agents.AgentHandler;
import com.aliyun.tam.x.tron.core.agents.AgentRegistry;
import com.aliyun.tam.x.tron.core.domain.models.Session;
import com.aliyun.tam.x.tron.core.domain.models.contents.ContentType;
import com.aliyun.tam.x.tron.core.domain.models.contents.TextContent;
import com.aliyun.tam.x.tron.core.domain.models.events.EventSink;
import com.aliyun.tam.x.tron.core.domain.models.messages.AgentSessionMessage;
import com.aliyun.tam.x.tron.core.domain.models.messages.SessionMessageStatus;
import com.aliyun.tam.x.tron.core.domain.models.messages.UserSessionMessage;
import com.aliyun.tam.x.tron.core.domain.repository.EventRepository;
import com.aliyun.tam.x.tron.core.domain.repository.SessionRepository;
import com.aliyun.tam.x.tron.core.domain.service.SequenceService;
import com.google.common.collect.Lists;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;

import javax.sql.DataSource;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.UUID;

@SpringBootTest(classes = TestApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Slf4j
public abstract class BaseFuncTest {

    @BeforeAll
    public static void beforeAll() throws Exception {
        DBConfigurationBuilder configBuilder = DBConfigurationBuilder.newBuilder();
        configBuilder.setPort(0);
        DB db = DB.newEmbeddedDB(configBuilder.build());
        db.start();
        db.createDB("tron_agent_java");

        System.setProperty("spring.datasource.url", String.format("jdbc:mysql://localhost:%d/tron_agent_java?serverTimezone=Asia/Shanghai&useUnicode=true&characterEncoding=utf-8&allowMultiQueries=true&useSSL=false", configBuilder.getPort()));
        System.setProperty("spring.datasource.username", "root");
        System.setProperty("spring.datasource.password", "");
    }

    @Autowired
    private AgentRegistry agentRegistry;

    @Autowired
    private SequenceService sequenceService;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private EventRepository eventRepository;


    @Autowired
    private DataSource dataSource;

    @Autowired
    private ResourcePatternResolver resourceLoader;

    private String userId = "test-user";

    private String userName = userId;

    private String sessionId;


    @BeforeEach
    public void prepare() throws Exception {
        prepareDbTables();
        prepareSession();
    }

    public void prepareDbTables() throws Exception {
        executeSql("classpath*:schema/init.sql");
    }

    public void prepareSession() {
        String agentId = agentId();
        if (agentId == null) {
            return;
        }
        sessionId = UUID.randomUUID().toString();

        Session session = Session.builder()
                .id(sessionId)
                .userId(userId)
                .agentId(agentId)
                .name("")
                .lastAppliedEventId(0L)
                .gmtCreated(LocalDateTime.now())
                .gmtModified(LocalDateTime.now())
                .build();
        sessionRepository.newSession(session);
    }

    protected String agentId() {
        return null;
    }

    protected void executeSql(String script) throws IOException, SQLException {
        InputStream schemaStream = BaseFuncTest.class.getResourceAsStream(script);
        if (schemaStream == null) {
            Resource[] resources = resourceLoader.getResources(script);
            if (resources.length < 1 || !resources[0].exists()) {
                throw new IllegalArgumentException("script file not found: " + script);
            }
            schemaStream = resources[0].getInputStream();
        }
        try (Reader reader = new InputStreamReader(schemaStream, StandardCharsets.UTF_8)) {
            StringWriter sw = new StringWriter();
            char[] buf = new char[1024];
            int len;
            while ((len = reader.read(buf)) >= 0) {
                if (len == 0) {
                    continue;
                }
                sw.write(buf, 0, len);
            }

            String sql = sw.toString();
            if (!sql.isEmpty()) {
                log.debug("executing initialize schema sql. sql={}", sql);
                try (Connection conn = dataSource.getConnection()) {
                    for (String stat : sql.split(";")) {
                        stat = stat.trim();
                        if (stat.isEmpty()) {
                            continue;
                        }
                        conn.prepareStatement(stat).execute();
                    }
                }
            }
        }
    }

    protected String callAgent(String input) {
        String agentId = agentId();

        UserSessionMessage userMessage = UserSessionMessage.builder()
                .id(sequenceService.nextSequence(SequenceService.SequenceName.MESSAGE))
                .agentId(agentId)
                .sessionId(sessionId)
                .userId(userId)
                .status(SessionMessageStatus.SUCCEED)
                .name(userName)
                .contents(Lists.newArrayList(
                        new TextContent(ContentType.TEXT, input)
                ))
                .gmtCreate(LocalDateTime.now())
                .gmtModified(LocalDateTime.now())
                .build();

        AgentSessionMessage agentMessage = AgentSessionMessage.builder()
                .id(sequenceService.nextSequence(SequenceService.SequenceName.MESSAGE))
                .agentId(agentId)
                .sessionId(sessionId)
                .userId(userId)
                .status(SessionMessageStatus.EXECUTING)
                .gmtCreate(LocalDateTime.now())
                .gmtModified(LocalDateTime.now())
                .gmtFinished(null)
                .build();

        EventSink eventSink = eventRepository.createEventSink(
                agentId,
                userId,
                sessionId,
                agentMessage.getId()
        );

        AgentHandler agentHandler = agentRegistry.getAgent(agentId, null);
        return agentHandler.handleInput(userMessage, eventSink);
    }
}
