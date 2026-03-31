package com.aliyun.tam.x.tron.core.tts;

public interface TtsService {

    interface TtsCallback {
        void onData(String dataBase64);

        void onFinished();

        void onError(Throwable t);
    }

    TtsSession newSession(TtsCallback callback, boolean autoCommit);
}
