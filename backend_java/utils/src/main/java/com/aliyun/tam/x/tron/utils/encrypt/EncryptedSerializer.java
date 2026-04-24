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


package com.aliyun.tam.x.tron.utils.encrypt;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;

import java.io.IOException;
import java.util.Map;

public class EncryptedSerializer extends JsonSerializer<Object> {

    static final String ENCRYPTED_PREFIX = "ENC:";

    @Override
    @SuppressWarnings("unchecked")
    public void serialize(Object value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        if (value == null) {
            gen.writeNull();
            return;
        }
        if (value instanceof String str) {
            gen.writeString(ENCRYPTED_PREFIX + EncryptUtils.encrypt(str));
        } else if (value instanceof Map<?, ?> map) {
            gen.writeStartObject();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                String key = String.valueOf(entry.getKey());
                Object v = entry.getValue();
                gen.writeFieldName(key);
                if (v instanceof String s) {
                    gen.writeString(ENCRYPTED_PREFIX + EncryptUtils.encrypt(s));
                } else if (v == null) {
                    gen.writeNull();
                } else {
                    gen.writeObject(v);
                }
            }
            gen.writeEndObject();
        } else {
            gen.writeObject(value);
        }
    }
}
