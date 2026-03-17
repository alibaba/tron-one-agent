package com.aliyun.tam.x.tron.core.asr;

public interface AsrSession {

    void appendData(String dataBase64);

    void complete();

    void close();
}
