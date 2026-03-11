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


package com.aliyun.tam.x.tron.core.domain.repository;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

public interface FileRepository {
    Long upload(String fileName, InputStream is, long size) throws IOException;

    default Long upload(String fileName, Path path) throws IOException {
        try (InputStream is = Files.newInputStream(path)) {
            return upload(fileName, is, Files.size(path));
        }
    }

    InputStream download(Long id) throws IOException;

    default void download(Long id, OutputStream os) throws IOException {
        try (InputStream is = download(id)) {
            is.transferTo(os);
        }
    }

    default void download(Long id, Path path) throws IOException {
        try (OutputStream os = Files.newOutputStream(path)) {
            download(id, os);
        }
    }
}
