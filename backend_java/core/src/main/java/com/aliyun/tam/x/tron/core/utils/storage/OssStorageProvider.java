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


package com.aliyun.tam.x.tron.core.utils.storage;

import com.aliyun.oss.ClientBuilderConfiguration;
import com.aliyun.oss.HttpMethod;
import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.common.auth.DefaultCredentialProvider;
import com.aliyun.oss.common.comm.Protocol;
import com.aliyun.oss.common.comm.SignVersion;
import com.aliyun.oss.model.GeneratePresignedUrlRequest;
import com.aliyun.tam.x.tron.core.domain.service.SequenceService;
import com.aliyun.tam.x.tron.infra.dal.dataobject.OssFileDO;
import com.aliyun.tam.x.tron.infra.dal.mapper.OssFileMapper;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.Objects;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@ConditionalOnClass(name = "com.aliyun.oss.OSS")
@ConditionalOnProperty(name = "tron.file.provider.type", havingValue = "oss", matchIfMissing = false)
@RequiredArgsConstructor
@Slf4j
public class OssStorageProvider implements StorageProvider, InitializingBean {

    private static final Pattern FILE_ID_PATTERN = Pattern.compile("/file/(\\d+)$");

    @Value("${tron.oss.bucket}")
    private String bucket;

    @Value("${tron.oss.region}")
    private String region;

    @Value("${tron.oss.endpoint}")
    private String endpoint;

    @Value("${tron.oss.access-key-id}")
    private String accessKeyId;

    @Value("${tron.oss.access-key-secret}")
    private String accessKeySecret;

    private String ossHost;

    private OSS ossClient;

    private final OssFileMapper ossFileMapper;

    private final SequenceService sequenceService;

    private final Cache<Long, String> publicUrlCache = CacheBuilder.newBuilder()
            .expireAfterWrite(60, TimeUnit.MINUTES)
            .maximumSize(10000)
            .build();

    @Override
    public Long upload(String userId, String suffix, InputStream is) throws IOException {
        long id = sequenceService.nextSequence(SequenceService.SequenceName.FILE);
        String fileKey = String.format("tron/%s/%s.%s", userId, id, suffix);
        ossClient.putObject(bucket, fileKey, is);

        LocalDateTime now = LocalDateTime.now();
        ossFileMapper.insert(
                new OssFileDO()
                        .setId(id)
                        .setUserId(userId)
                        .setOssRegion(region)
                        .setOssBucket(bucket)
                        .setOssFileKey(fileKey)
                        .setGmtCreated(now)
                        .setGmtModified(now)
        );
        log.info("Uploaded file {} to OSS, id={}", fileKey, id);
        return id;
    }

    @Override
    public ResponseEntity<?> get(String userId, Long id) {
        try {
            OssFileDO file = ossFileMapper.selectById(id);
            if (file == null) {
                return ResponseEntity.notFound().build();
            }
            if (userId != null && !Objects.equals(userId, file.getUserId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            String publicUrl = publicUrlCache.get(id, () -> {
                GeneratePresignedUrlRequest request = new GeneratePresignedUrlRequest(file.getOssBucket(), file.getOssFileKey(), HttpMethod.GET);
                request.setExpiration(new Date(System.currentTimeMillis() + 7200_000));
                return ossClient.generatePresignedUrl(request).toString();
            });
            return ResponseEntity.status(HttpStatus.TEMPORARY_REDIRECT)
                    .header("Location", publicUrl)
                    .build();
        } catch (Exception e) {
            log.warn("Invalid file id {}", id, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @Override
    public String toPublicUrl(String userId, String url) {
        try {
            Matcher m = FILE_ID_PATTERN.matcher(url);
            if (m.find()) {
                long id = Long.parseLong(m.group(1));
                OssFileDO file = ossFileMapper.selectById(id);
                if (file == null) {
                    return url;
                }
                if (!Objects.equals(userId, file.getUserId())) {
                    return url;
                }

                return publicUrlCache.get(id, () -> {
                    GeneratePresignedUrlRequest request = new GeneratePresignedUrlRequest(file.getOssBucket(), file.getOssFileKey(), HttpMethod.GET);
                    request.setExpiration(new Date(System.currentTimeMillis() + 7200_000));
                    return ossClient.generatePresignedUrl(request).toString();
                });
            } else if (url.startsWith(ossHost) && url.contains("x-oss-signature")) {
                URI uri = new URI(url);
                String fileKey = uri.getPath();
                if (fileKey.startsWith("/")) {
                    fileKey = fileKey.substring(1);
                }

                if (publicUrlCache.asMap().containsValue(url)) {
                    return url;
                }
                GeneratePresignedUrlRequest request = new GeneratePresignedUrlRequest(bucket, fileKey, HttpMethod.GET);
                request.setExpiration(new Date(System.currentTimeMillis() + 7200_000));
                return ossClient.generatePresignedUrl(request).toString();
            } else {
                return url;
            }
        } catch (Exception e) {
            log.warn("Invalid file id {}", url, e);
            return url;
        }
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        DefaultCredentialProvider provider = new DefaultCredentialProvider(accessKeyId, accessKeySecret);

        ClientBuilderConfiguration configuration = new ClientBuilderConfiguration();
        configuration.setSignatureVersion(SignVersion.V4);
        configuration.setProtocol(Protocol.HTTPS);
        configuration.setSocketTimeout(60_000);
        configuration.setConnectionTimeout(3_000);
        configuration.setConnectionRequestTimeout(60 * 60 * 24 * 1000);
        configuration.setIdleConnectionTime(60_000);
        configuration.setMaxErrorRetry(5);

        ossClient = OSSClientBuilder.create()
                .credentialsProvider(provider)
                .clientConfiguration(configuration)
                .region(region)
                .endpoint(endpoint)
                .build();

        ossHost = String.format("https://%s.oss-%s.aliyuncs.com/", bucket, region);
    }
}
