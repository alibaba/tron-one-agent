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

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RequiredArgsConstructor
public class TtsEventSinkWrapper extends EventSink {
    private static final Pattern TEXT_SPITTER = Pattern.compile("[!?.'\"\r\n！？。’”]");
    private final TtsService ttsService;

    private final EventSink eventSink;

    private final TtsService.TtsCallback ttsCallback;

    private volatile TtsSession ttsSession;

    private volatile boolean appendedText;

    private final StringBuilder textBuffer = new StringBuilder();

    @Override
    public void newEvent(SessionEvent event) {
        eventSink.newEvent(event);

        if (event instanceof NewAgentMessageEvent e && e.getMsg().getStatus() == SessionMessageStatus.EXECUTING) {
            ttsSession = ttsService.newSession(ttsCallback, false);
            appendedText = false;
            textBuffer.setLength(0);
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

    @Override
    public Long nextSequence(SequenceService.SequenceName sequenceName) {
        return eventSink.nextSequence(sequenceName);
    }

    @Override
    public void onComplete() {
        eventSink.onComplete();
    }

    private void appendText(String text) {
        if (text == null || text.isBlank()) {
            return;
        }

        textBuffer.append(text);
        Matcher matcher = TEXT_SPITTER.matcher(textBuffer.toString());
        while (matcher.find()) {
            StringBuilder sb = new StringBuilder();
            matcher.appendReplacement(sb, matcher.group(0));
            text = filterOutInvisibleCharsAndEmojis(sb.toString()).trim();
            if (text.isBlank()) {
                continue;
            }
            ttsSession.appendText(text);
            ttsSession.commit();
        }
        textBuffer.setLength(0);
        matcher.appendTail(textBuffer);
    }

    private void flushBuffer() {
        String text = textBuffer.toString();
        text = filterOutInvisibleCharsAndEmojis(text).trim();
        if (text.isBlank()) {
            return;
        }
        ttsSession.appendText(text);
        textBuffer.setLength(0);
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

    private String filterOutInvisibleCharsAndEmojis(String text) {
        if (text == null || text.isEmpty()) {
            return text;
        }

        return text.codePoints()
                .filter(codePoint -> {
                    if (Character.isISOControl(codePoint)) {
                        return false;
                    }
                    if (codePoint >= 0x1F600 && codePoint <= 0x1F64F) {
                        return false;
                    }
                    if (codePoint >= 0x1F300 && codePoint <= 0x1F5FF) {
                        return false;
                    }
                    if (codePoint >= 0x1F680 && codePoint <= 0x1F6FF) {
                        return false;
                    }
                    if (codePoint >= 0x1F900 && codePoint <= 0x1F9FF) {
                        return false;
                    }
                    if (codePoint >= 0x1FA00 && codePoint <= 0x1FA6F) {
                        return false;
                    }
                    if (codePoint >= 0x1FA70 && codePoint <= 0x1FAFF) {
                        return false;
                    }
                    if (codePoint >= 0x2600 && codePoint <= 0x26FF) {
                        return false;
                    }
                    if (codePoint >= 0x2700 && codePoint <= 0x27BF) {
                        return false;
                    }
                    if (codePoint >= 0xFE00 && codePoint <= 0xFE0F) {
                        return false;
                    }
                    if (codePoint >= 0x1F004 && codePoint <= 0x1F0CF) {
                        return false;
                    }
                    if (codePoint >= 0x1F170 && codePoint <= 0x1F1FF) {
                        return false;
                    }
                    return true;
                })
                .collect(StringBuilder::new, StringBuilder::appendCodePoint, StringBuilder::append)
                .toString();
    }


}
