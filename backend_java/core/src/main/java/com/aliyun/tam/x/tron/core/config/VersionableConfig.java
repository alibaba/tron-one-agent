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

package com.aliyun.tam.x.tron.core.config;

import com.aliyun.tam.x.tron.utils.JsonUtils;

import java.util.Map;

public interface VersionableConfig<T extends VersionableConfig<T>> {

    Long getVersion();

    default int compareVersion(T other) {
        if (other == null) {
            return 1;
        }
        if (this == other) {
            return 0;
        }
        if (getVersion() == null && other.getVersion() == null) {
            return 0;
        } else if (getVersion() == null) {
            return -1;
        } else if (other.getVersion() == null) {
            return 1;
        }
        return getVersion().compareTo(other.getVersion());
    }

    @SuppressWarnings("unchecked")
    default T merge(T other) {
        if (other == null) {
            return (T) this;
        }
        int compareResult = compareVersion(other);
        if (compareResult <= 0) {
            return other;
        }
        Map<String, Object> thisMap = JsonUtils.toMap(this);
        Map<String, Object> otherMap = JsonUtils.toMap(other);
        mergeNullFields(thisMap, otherMap);
        return (T) JsonUtils.fromMap(thisMap, other.getClass());
    }

    @SuppressWarnings("unchecked")
    private static void mergeNullFields(Map<String, Object> target, Map<String, Object> source) {
        if (target == null || source == null) {
            return;
        }
        for (Map.Entry<String, Object> entry : source.entrySet()) {
            String key = entry.getKey();
            Object sourceValue = entry.getValue();
            Object targetValue = target.get(key);
            if (targetValue == null && sourceValue != null) {
                target.put(key, sourceValue);
            } else if (targetValue instanceof Map && sourceValue instanceof Map) {
                mergeNullFields((Map<String, Object>) targetValue, (Map<String, Object>) sourceValue);
            }
        }
    }
}
