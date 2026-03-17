package com.aliyun.tam.x.tron.core.asr;

import lombok.Data;

public interface AsrService {

    interface AsrCallback {
        void onText(String text);

        void onFinished();

        void onError(Throwable t);
    }

    AsrSession newSession(AsrCallback callback);
}
