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


package com.aliyun.tam.x.tron.core.agents;

import com.aliyun.tam.x.tron.core.domain.models.contents.ContentType;
import com.aliyun.tam.x.tron.core.utils.storage.StorageProvider;
import com.google.common.collect.Lists;
import io.agentscope.core.memory.Memory;
import io.agentscope.core.message.*;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Collection;
import java.util.List;
import java.util.Objects;

public abstract class AbstractAgentHandler implements AgentHandler {
    @Autowired(required = false)
    private StorageProvider storageProvider;

    private final Collection<ContentType> supportedInputTypes;

    protected AbstractAgentHandler(Collection<ContentType> supportedInputTypes) {
        this.supportedInputTypes = supportedInputTypes;
    }

    @Override
    public boolean supportInputType(ContentType contentType) {
        return supportedInputTypes.contains(contentType);
    }

    protected void processMediaContentOfMemory(String userId, Memory memory) {
        if (storageProvider == null) {
            return;
        }

        boolean modified = false;
        List<Msg> msgs = Lists.newArrayList();
        for (Msg msg : memory.getMessages()) {
            Msg newMsg = processMediaContentOfMessage(userId, msg);
            if (newMsg != null) {
                modified = true;
                msgs.add(newMsg);
            } else {
                msgs.add(msg);
            }
        }
        if (modified) {
            memory.clear();
            msgs.forEach(memory::addMessage);
        }
    }

    protected Msg processMediaContentOfMessage(String userId, Msg msg) {
        if (storageProvider == null) {
            return null;
        }

        if (msg.getRole() != MsgRole.USER) {
            return null;
        }

        boolean modified = false;
        List<ContentBlock> newContentBlocks = Lists.newArrayList();
        for (ContentBlock content : msg.getContent()) {
            if (content instanceof ImageBlock imageBlock) {
                Source newSource = processMediaContentOfSource(userId, imageBlock.getSource());
                if (newSource != null) {
                    modified = true;
                    newContentBlocks.add(new ImageBlock(newSource));
                } else {
                    newContentBlocks.add(content);
                }
            } else if (content instanceof VideoBlock videoBlock) {
                Source newSource = processMediaContentOfSource(userId, videoBlock.getSource());
                if (newSource != null) {
                    modified = true;
                    newContentBlocks.add(new VideoBlock(newSource));
                } else {
                    newContentBlocks.add(content);
                }
            } else if (content instanceof AudioBlock audioBlock) {
                Source newSource = processMediaContentOfSource(userId, audioBlock.getSource());
                if (newSource != null) {
                    modified = true;
                    newContentBlocks.add(new AudioBlock(newSource));
                } else {
                    newContentBlocks.add(content);
                }
            } else {
                newContentBlocks.add(content);
            }
        }

        if (!modified) {
            return null;
        }

        return Msg.builder()
                .id(msg.getId())
                .role(msg.getRole())
                .content(newContentBlocks)
                .build();
    }

    private Source processMediaContentOfSource(String userId, Source source) {
        if (source instanceof URLSource urlSource) {
            String originalUrl = urlSource.getUrl();
            String newUrl = storageProvider.toPublicUrl(userId, originalUrl);
            if (!Objects.equals(originalUrl, newUrl)) {
                return new URLSource(newUrl);
            }
        }
        return null;
    }
}
