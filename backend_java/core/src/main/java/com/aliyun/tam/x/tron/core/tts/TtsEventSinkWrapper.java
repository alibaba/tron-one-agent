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

import com.aliyun.tam.x.tron.core.domain.models.contents.ContentType;
import com.aliyun.tam.x.tron.core.domain.models.contents.TextContent;
import com.aliyun.tam.x.tron.core.domain.models.events.*;
import com.aliyun.tam.x.tron.core.domain.models.messages.SessionMessage;
import com.aliyun.tam.x.tron.core.domain.models.messages.SessionMessageStatus;
import com.aliyun.tam.x.tron.infra.sequence.SequenceService;
import lombok.RequiredArgsConstructor;

import java.util.regex.Pattern;

@RequiredArgsConstructor
public class TtsEventSinkWrapper extends EventSink {
    private static final String TEXT_SPITTER = "[!?，。\n！？]";
    private static final int MIN_SENTENCE_COUNT = 3;
    private final TtsService ttsService;

    private final EventSink eventSink;

    private final TtsService.TtsCallback ttsCallback;

    private volatile TtsSession ttsSession;

    private volatile boolean appendedText;

    private final StringBuilder textBuffer = new StringBuilder();

    private volatile int sentenceCount = 0;

    @Override
    public void newEvent(SessionEvent event) {
        eventSink.newEvent(event);

        if (event instanceof NewAgentMessageEvent e && e.getMsg().getStatus() == SessionMessageStatus.EXECUTING) {
            ttsSession = ttsService.newSession(ttsCallback, false);
            appendedText = false;
            textBuffer.setLength(0);
            sentenceCount = 0;
        } else if (ttsSession != null && event instanceof AgentMessageAppendContentEvent e) {
            for (var content : e.getNewContents()) {
                if (!(content instanceof TextContent text) || text.getType() != ContentType.TEXT) {
                    commit();
                    continue;
                }

                appendText(text.getText());
                appendedText = true;
            }
        } else if (ttsSession != null && event instanceof AgentMessageStatusChangedEvent e) {
            if (appendedText) {
                ttsSession.complete();
                appendedText = false;
            }
            ttsSession = null;
        }
    }

    @Override
    public void saveMessage(SessionMessage sessionMessage) {
        eventSink.saveMessage(sessionMessage);
    }

    private void appendText(String text) {
        if (text == null || text.isBlank()) {
            return;
        }

        for (String s : text.split(TEXT_SPITTER)) {
            if (!s.isBlank()) {
                textBuffer.append(s);
                sentenceCount++;
                appendedText = true;
            }
            if (sentenceCount >= MIN_SENTENCE_COUNT && appendedText) {
                flushBuffer();
            }
        }
    }

    private void flushBuffer() {
        if (textBuffer.length() == 0) {
            return;
        }
        ttsSession.appendText(textBuffer.toString());
        textBuffer.setLength(0);
        sentenceCount = 0;
        commit();
    }

    private void commit() {
        if (ttsSession == null || !appendedText) {
            return;
        }
        flushBuffer();
        ttsSession.commit();
        appendedText = false;
    }

    @Override
    public Long nextSequence(SequenceService.SequenceName sequenceName) {
        return eventSink.nextSequence(sequenceName);
    }

    @Override
    public void onComplete() {
        eventSink.onComplete();
    }

}
