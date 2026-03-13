package com.aliyun.tam.x.tron.core.tts;

public interface TtsSession {

    void appendText(String text);

    void complete();
}
