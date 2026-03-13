package com.aliyun.tam.x.tron.core.tts;

public interface TtsService {

    interface TtsCallback {
        void onData(String dataBase64);
    }
    TtsSession newSession(TtsCallback callback);
}
