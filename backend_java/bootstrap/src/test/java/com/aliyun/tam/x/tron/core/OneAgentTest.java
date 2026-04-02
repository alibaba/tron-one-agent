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


package com.aliyun.tam.x.tron.core;

import com.aliyun.tam.x.tron.BaseFuncTest;
import com.aliyun.tam.x.tron.ExcelResultWriter;
import com.aliyun.tam.x.tron.JsonlFileSource;
import com.aliyun.tam.x.tron.core.agents.AgentResult;
import com.aliyun.tam.x.tron.core.agents.examples.OneAgentBuilder;
import com.aliyun.tam.x.tron.core.domain.models.contents.Content;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvFileSource;
import org.springframework.util.CollectionUtils;

import java.io.IOException;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

public class OneAgentTest extends BaseFuncTest {

    private final ExcelResultWriter writer = new ExcelResultWriter(Paths.get("test-one-agent.xlsx"));

    @Override
    protected String agentId() {
        return OneAgentBuilder.AGENT_ID;
    }

    @ParameterizedTest
    @JsonlFileSource(
            resources = "/ddt/test-one-agent.jsonl"
    )
    public void cxtestOneAgent(List<Content> input, List<List<Content>> history, Map<String, Object> data) throws IOException, InvalidFormatException {
        if (!CollectionUtils.isEmpty(history)) {
            for (List<Content> h : history) {
                callAgent(h);
            }
        }
        AgentResult result = callAgent(input);
        writer.append(data, result);
        System.out.println(result);
    }
}
