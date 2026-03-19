package com.aliyun.tam.x.tron.core.mem;

import io.agentscope.core.memory.LongTermMemory;

public interface LongTermMemoryFactory {
    LongTermMemory create(String userId);
}
