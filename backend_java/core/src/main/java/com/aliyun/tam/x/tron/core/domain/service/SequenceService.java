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


package com.aliyun.tam.x.tron.core.domain.service;

import com.aliyun.tam.x.tron.infra.dal.dataobject.SequenceDO;
import com.aliyun.tam.x.tron.infra.dal.mapper.SequenceMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 序列生成服务
 */
@Service
@RequiredArgsConstructor
public class SequenceService {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyMMddHHmmss");

    /**
     * 序列名称枚举
     */
    @Getter
    public enum SequenceName {
        MESSAGE(1),
        CONTENT(2),
        EVENT(3),
        TASK(4),
        ACTION(5),
        FILE(6);

        private final short value;

        SequenceName(int value) {
            this.value = (short) value;
        }
    }

    /**
     * 原子整数类，用于线程安全的序列递增
     */
    public static class Counter {
        private final AtomicLong current;
        private final long upperBound;

        private Counter(long upperBound, long initialValue) {
            this.upperBound = upperBound;
            this.current = new AtomicLong(initialValue);
        }

        /**
         * 获取并递增计数器
         *
         * @return 递增后的值，如果超过上限返回 null
         */
        public Long getAndIncrement() {
            long next = current.incrementAndGet();
            if (next > upperBound) {
                return null;
            }
            return next;
        }
    }

    private final SequenceMapper sequenceMapper;
    private final ApplicationContext applicationContext;
    /**
     * 序列缓存
     */
    private final Map<SequenceName, Counter> sequences = new ConcurrentHashMap<>();

    /**
     * 获取下一个序列值
     *
     * @param sequenceName  序列名称
     * @param defaultStep   默认步长
     * @param maxRetryTimes 最大重试次数
     * @return 格式化后的序列值
     */
    public long nextSequence(SequenceName sequenceName, int defaultStep, int maxRetryTimes) {


        for (int i = 0; i < maxRetryTimes; i++) {
            Counter sequence = sequences.computeIfAbsent(sequenceName, k -> {
                return applicationContext.getBean(this.getClass())
                        .allocateSequence(sequenceName, defaultStep);
            });
            Long seqValue = sequence.getAndIncrement();
            if (seqValue != null) {
                return formatSequence(seqValue);
            }
            sequences.remove(sequenceName);
        }

        throw new RuntimeException(String.format(
                "Failed to get next sequence for %s after %d attempts",
                sequenceName, maxRetryTimes));
    }

    /**
     * 获取下一个序列值（使用默认参数）
     *
     * @param sequenceName 序列名称
     * @return 格式化后的序列值
     */
    public long nextSequence(SequenceName sequenceName) {
        return nextSequence(sequenceName, 1000, 3);
    }

    /**
     * 从数据库分配序列段
     *
     * @param sequenceName 序列名称
     * @param step         步长
     * @return 分配的序列计数器
     */
    @Transactional(rollbackFor = Exception.class)
    protected Counter allocateSequence(SequenceName sequenceName, int step) {
        SequenceDO sequenceDO = sequenceMapper.selectOne(new LambdaQueryWrapper<SequenceDO>()
                .eq(SequenceDO::getName, sequenceName.getValue())
                .last("FOR UPDATE"));

        if (sequenceDO == null) {
            sequenceDO = new SequenceDO();
            sequenceDO.setName(sequenceName.getValue());
            sequenceDO.setCurrentValue((long) step);
            sequenceDO.setGmtCreated(LocalDateTime.now());
            sequenceDO.setGmtModified(sequenceDO.getGmtCreated());
            sequenceMapper.insert(sequenceDO);
            return new Counter(step, 0);
        } else {
            long oldValue = sequenceDO.getCurrentValue();
            long newValue = oldValue + step;
            sequenceDO.setCurrentValue(newValue);
            sequenceDO.setGmtModified(LocalDateTime.now());
            sequenceMapper.updateById(sequenceDO);
            return new Counter(newValue, oldValue);
        }
    }

    /**
     * 格式化序列值
     * 格式: YYMMDDHHMMSS + 序列号后4位
     *
     * @param seqValue 原始序列值
     * @return 格式化后的序列值
     */
    private long formatSequence(long seqValue) {
        LocalDateTime now = LocalDateTime.now();
        long timestamp = Long.parseLong(now.format(FORMATTER));
        return timestamp * 10000 + seqValue % 10000;
    }
}
