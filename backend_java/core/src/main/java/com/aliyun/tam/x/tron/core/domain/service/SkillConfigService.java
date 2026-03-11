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

import com.aliyun.tam.x.tron.core.config.SkillConfig;
import com.aliyun.tam.x.tron.core.domain.repository.FileRepository;
import com.aliyun.tam.x.tron.core.domain.repository.SkillConfigRepository;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.google.common.hash.Hasher;
import com.google.common.hash.Hashing;
import io.agentscope.core.skill.AgentSkill;
import io.agentscope.core.skill.repository.ClasspathSkillRepository;
import io.agentscope.core.skill.repository.FileSystemSkillRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ResourceLoader;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Slf4j
@Service
public class SkillConfigService {
    private static final String SKILL_MD = "skill.md";
    private static final String METADATA_SEPARATOR = "---";
    private static final String SKILL_NAME = "name";
    private static final String SKILL_DESCRIPTION = "description";

    private static final Path BUILTINT_SKILL_DIR_PATH = Paths.get("./skills");

    private final SkillConfigRepository skillConfigRepository;

    private final FileRepository fileRepository;

    private final Map<String, String> skillCheckSumCache = Maps.newConcurrentMap();

    private final Map<String, Map<String, String>> skillFilesCache = Maps.newConcurrentMap();

    private volatile FileSystemSkillRepository builtinSkillRepository;

    public SkillConfigService(SkillConfigRepository skillConfigRepository, FileRepository fileRepository) {
        this.skillConfigRepository = skillConfigRepository;
        this.fileRepository = fileRepository;
    }

    public SkillConfig upload(String originalFileName, Path zipPath) throws IOException {
        SkillConfig.SkillConfigBuilder builder = SkillConfig.builder();
        String skillName = null;
        Path baseDir = null;

        List<String> files = Lists.newArrayList();
        try (ZipInputStream zis = new ZipInputStream(Files.newInputStream(zipPath))) {
            ZipEntry zipEntry;
            while ((zipEntry = zis.getNextEntry()) != null) {
                if (!zipEntry.isDirectory()) {
                    String name = zipEntry.getName();
                    if (SKILL_MD.equalsIgnoreCase(name) || name.toLowerCase().endsWith("/" + SKILL_MD)) {
                        if (skillName != null) {
                            throw new IllegalArgumentException(String.format("duplicated %s found", SKILL_MD));
                        }

                        Path path = Paths.get(name);
                        baseDir = path.getParent();

                        String content = new String(zis.readAllBytes());
                        skillName = parseSkill(builder, name, content);
                    }
                    files.add(name);
                }
                zis.closeEntry();
            }
        }

        if (skillName == null) {
            throw new IllegalArgumentException(String.format("there is no %s found", SKILL_MD));
        }

        if (baseDir != null) {
            builder.baseDir(baseDir.toString());
            Path finalBaseDir = baseDir;
            files = files.stream()
                    .map(Paths::get)
                    .filter(p -> p.startsWith(finalBaseDir))
                    .map(baseDir::relativize)
                    .map(Path::toString)
                    .toList();
        } else {
            builder.baseDir("");
        }

        Hasher hasher = Hashing.sha256().newHasher();
        try (InputStream is = Files.newInputStream(zipPath)) {
            byte[] buffer = new byte[8192];
            int len;
            while ((len = is.read(buffer)) != -1) {
                hasher.putBytes(buffer, 0, len);
            }
        }

        Long fileId = fileRepository.upload(originalFileName, zipPath);

        return builder
                .enabled(null)
                .fileId(fileId)
                .files(files)
                .checksum(hasher.hash().toString())
                .build();
    }

    @Scheduled(fixedDelay = 3_000)
    public void syncSkills() {
        for (SkillConfig skillConfig : skillConfigRepository.list()) {
            try {
                syncSkill(skillConfig);
            } catch (IOException e) {
                log.error("sync skill {} error", skillConfig.getName(), e);
            }
        }
    }

    public synchronized Map<String, String> syncSkill(SkillConfig skillConfig) throws IOException {
        Map<String, String> skillFiles = null;
        if (isSkillConfigUpToDate(skillConfig)) {
            skillFiles = skillFilesCache.get(skillConfig.getName());
        }

        if (skillFiles != null) {
            return skillFiles;
        }

        log.info("syncing skill {}", skillConfig.getName());
        ImmutableMap.Builder<String, String> builder = ImmutableMap.builder();
        Path baseDir = Paths.get(skillConfig.getBaseDir());
        try (ZipInputStream zis = new ZipInputStream(fileRepository.download(skillConfig.getFileId()))) {
            ZipEntry zipEntry;
            while ((zipEntry = zis.getNextEntry()) != null) {
                if (!zipEntry.isDirectory()) {
                    Path path = Paths.get(zipEntry.getName());
                    if (!path.startsWith(baseDir)) {
                        continue;
                    }
                    path = baseDir.relativize(path);
                    String content = new String(zis.readAllBytes());
                    builder.put(path.toString(), content);
                }
                zis.closeEntry();
            }
        }
        skillFiles = builder.build();
        skillFilesCache.put(skillConfig.getName(), skillFiles);
        skillCheckSumCache.put(skillConfig.getName(), skillConfig.getChecksum());
        log.info("sync skill {} success", skillConfig.getName());
        return skillFiles;
    }

    private boolean isSkillConfigUpToDate(SkillConfig skillConfig) throws IOException {
        String cachedChecksum = skillCheckSumCache.get(skillConfig.getName());
        return Objects.equals(cachedChecksum, skillConfig.getChecksum());
    }

    private String parseSkill(SkillConfig.SkillConfigBuilder builder, String fileName, String content) {
        StringBuilder metadataContent = new StringBuilder();
        Map<String, Object> metadata = Maps.newHashMap();
        String[] lines = content.split("\n");
        int lineNo = 0;
        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty()) {
                continue;
            }

            if (lineNo == 0) {
                if (!METADATA_SEPARATOR.equalsIgnoreCase(line)) {
                    throw new IllegalArgumentException(String.format("invalid %s format, must be started with %s", fileName, METADATA_SEPARATOR));
                }
                metadataContent = new StringBuilder();

            } else if (METADATA_SEPARATOR.equalsIgnoreCase(line)) {
                Yaml yaml = new Yaml();
                try {
                    metadata = yaml.load(metadataContent.toString());

                    String name = (String) metadata.get(SKILL_NAME);
                    if (!StringUtils.hasText(name)) {
                        throw new IllegalArgumentException(String.format("invalid %s metadata, must contain %s", fileName, SKILL_NAME));
                    }
                    String description = (String) metadata.get(SKILL_DESCRIPTION);
                    if (!StringUtils.hasText(description)) {
                        throw new IllegalArgumentException(String.format("invalid %s metadata, must contain %s", fileName, SKILL_DESCRIPTION));
                    }

                    builder
                            .name(name)
                            .description(description)
                            .instruction(content);
                    return name;
                } catch (Exception e) {
                    throw new IllegalArgumentException(String.format("invalid %s metadata format, must be valid yaml", fileName), e);
                }
            } else {
                metadataContent.append(line).append("\n");
            }
            lineNo++;
        }

        throw new IllegalArgumentException(String.format("invalid %s format, no end %s found", fileName, METADATA_SEPARATOR));
    }


    public List<AgentSkill> getBuiltinSkills() {
        if (!Files.exists(BUILTINT_SKILL_DIR_PATH)) {
            builtinSkillRepository = null;
            return Lists.newArrayList();
        }
        if (builtinSkillRepository == null) {
            synchronized (this) {
                if (builtinSkillRepository == null) {
                    builtinSkillRepository = new FileSystemSkillRepository(BUILTINT_SKILL_DIR_PATH);
                }
            }
        }
        return builtinSkillRepository.getAllSkills();
    }
}
