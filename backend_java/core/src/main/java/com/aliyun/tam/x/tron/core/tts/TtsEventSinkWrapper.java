package com.aliyun.tam.x.tron.core.tts;

import com.aliyun.tam.x.tron.core.domain.models.contents.ContentType;
import com.aliyun.tam.x.tron.core.domain.models.contents.TextContent;
import com.aliyun.tam.x.tron.core.domain.models.events.*;
import com.aliyun.tam.x.tron.core.domain.models.messages.SessionMessageStatus;
import com.aliyun.tam.x.tron.core.domain.service.SequenceService;
import lombok.RequiredArgsConstructor;

import java.util.regex.Pattern;

@RequiredArgsConstructor
public class TtsEventSinkWrapper extends EventSink {
    private static final String TEXT_SPITTER = "[!?，。\n！？]";
    private final TtsService ttsService;

    private final EventSink eventSink;

    private final TtsService.TtsCallback ttsCallback;

    private volatile TtsSession ttsSession;

    private volatile boolean appendedText;

    @Override
    public void newEvent(SessionEvent event) {
        eventSink.newEvent(event);

        if (event instanceof NewAgentMessageEvent e && e.getMsg().getStatus() == SessionMessageStatus.EXECUTING) {
            ttsSession = ttsService.newSession(ttsCallback, false);
            appendedText = false;
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

    private void appendText(String text) {
        int index = 0;
        for (String s : text.split(TEXT_SPITTER)) {
            if (!s.isBlank()) {
                ttsSession.appendText(s);
            }
            if (index > 0) {
                commit();
            }
            index++;
        }
    }

    private void commit() {
        if (ttsSession == null || !appendedText) {
            return;
        }
        ttsSession.commit();
        appendedText = false;
    }


    @Override
    public Long nextSequence(SequenceService.SequenceName sequenceName) {
        return eventSink.nextSequence(sequenceName);
    }

    @Override
    public void onComplete() {
    }

}
