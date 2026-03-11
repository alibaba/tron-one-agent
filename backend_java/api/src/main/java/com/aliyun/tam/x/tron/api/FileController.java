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


package com.aliyun.tam.x.tron.api;

import com.aliyun.tam.x.tron.core.utils.storage.StorageProvider;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Controller;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;

@Controller
@RequestMapping("/file")
@RequiredArgsConstructor
@Validated
public class FileController {
    private static final String ALL_HOSTS = "0.0.0.0";
    private static final String LOCALHOST = "127.0.0.1";

    @Value("${tron.file.server.base-url:}")
    private String serverBaseUrl;

    @Autowired(required = false)
    private StorageProvider storageProvider;

    @PostMapping(value = "", consumes = "multipart/form-data")
    public ResponseEntity<String> upload(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) throws IOException, URISyntaxException {
        if (storageProvider == null) {
            return ResponseEntity.notFound().build();
        }

        String fileName = file.getOriginalFilename();
        if (fileName == null || fileName.isEmpty()) {
            return ResponseEntity.badRequest().body("Invalid file name");
        }

        if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            return ResponseEntity.badRequest().body("Invalid file name");
        }

        String suffix;
        if (fileName.contains(".")) {
            suffix = fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
            List<String> allowedExtensions = List.of(
                    "jpg", "jpeg", "png"
            );
            if (!allowedExtensions.contains(suffix)) {
                return ResponseEntity.badRequest()
                        .body("File type not allowed");
            }
        } else {
            suffix = "";
        }

        long id = storageProvider.upload(userId, suffix, file.getInputStream());
        URI uri = URI.create(request.getRequestURL().toString());

        if (StringUtils.hasText(serverBaseUrl)) {
            return ResponseEntity.created(URI.create(serverBaseUrl + "/" + id)).build();
        } else {
            String host = uri.getHost();
            if (host.equals(ALL_HOSTS)) {
                host = LOCALHOST;
            }
            if (uri.getPort() > 0) {
                host += ":" + uri.getPort();
            }
            return ResponseEntity.created(new URI(
                    String.format("%s://%s%s/%d", uri.getScheme(), host, uri.getPath(), id)
            )).build();
        }
    }

    @GetMapping(value = "/{id}")
    public ResponseEntity<?> get(
            @PathVariable("id") Long id
    ) {
        if (storageProvider == null) {
            return ResponseEntity.notFound().build();
        }

        return storageProvider.get(null, id);
    }
}
