-- Copyright 2026 the original author or authors.
--
-- Licensed under the Apache License, Version 2.0 (the "License");
-- you may not use this file except in compliance with the License.
-- You may obtain a copy of the License at
--
--     http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.


DROP TABLE IF EXISTS `sequences`;
CREATE TABLE `sequences`
(
    `id`            BIGINT UNSIGNED AUTO_INCREMENT,
    `name`          SMALLINT        NOT NULL,
    `current_value` BIGINT UNSIGNED NOT NULL,
    `gmt_modified`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP,
    `gmt_created`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_name` (`name`)
) AUTO_INCREMENT = 1
  CHARSET = utf8mb4;

DROP TABLE IF EXISTS `agents`;
CREATE TABLE `agents`
(
    `id`           BIGINT UNSIGNED AUTO_INCREMENT,
    `agent_id`     VARCHAR(32) CHARSET ascii    NOT NULL,
    `name`         VARCHAR(128) CHARSET utf8mb4 NOT NULL,
    `enabled`      TINYINT   DEFAULT 1          NOT NULL,
    `type`         SMALLINT                     NOT NULL,
    `config`       MEDIUMTEXT CHARSET utf8mb4,
    `gmt_modified` TIMESTAMP DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP,
    `gmt_created`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_agent` (`agent_id`)
) AUTO_INCREMENT = 1
  CHARSET = utf8mb4;

DROP TABLE IF EXISTS `agent_states`;
CREATE TABLE `agent_states`
(
    `id`           BIGINT UNSIGNED AUTO_INCREMENT,
    `agent_id`     VARCHAR(32) CHARSET ascii NOT NULL,
    `user_id`      VARCHAR(64) CHARSET ascii NOT NULL,
    `session_id`   VARCHAR(64) CHARSET ascii NOT NULL,
    `data`         MEDIUMTEXT,
    `gmt_modified` TIMESTAMP DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP,
    `gmt_created`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_session_agent` (`session_id`, `agent_id`)
) AUTO_INCREMENT = 1
  CHARSET = utf8mb4;

DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions`
(
    `id`                    BIGINT UNSIGNED AUTO_INCREMENT,
    `agent_id`              VARCHAR(32) CHARSET ascii NOT NULL,
    `user_id`               VARCHAR(64) CHARSET ascii NOT NULL,
    `session_id`            VARCHAR(64) CHARSET ascii NOT NULL,
    `name`                  VARCHAR(128) CHARSET utf8mb4 DEFAULT '',
    `last_applied_event_id` BIGINT UNSIGNED           NOT NULL,
    `gmt_modified`          TIMESTAMP                    DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP,
    `gmt_created`           TIMESTAMP                    DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_session` (`session_id`, `agent_id`),
    INDEX `idx_agent_user` (`agent_id`, `user_id`)
) AUTO_INCREMENT = 1
  CHARSET = utf8mb4;

DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages`
(
    `id`           BIGINT UNSIGNED,
    `agent_id`     VARCHAR(32) CHARSET ascii NOT NULL,
    `user_id`      VARCHAR(64) CHARSET ascii NOT NULL,
    `session_id`   VARCHAR(64) CHARSET ascii NOT NULL,
    `type`         SMALLINT                  NOT NULL,
    `status`       SMALLINT                  NOT NULL,
    `data`         MEDIUMTEXT,
    `gmt_modified` TIMESTAMP DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP,
    `gmt_created`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`id`),
    INDEX `idx_session_id` (`session_id`, `agent_id`)
) CHARSET = utf8mb4;


DROP TABLE IF EXISTS `session_events`;
CREATE TABLE `session_events`
(
    `id`           BIGINT UNSIGNED,
    `agent_id`     VARCHAR(32) CHARSET ascii NOT NULL,
    `user_id`      VARCHAR(64) CHARSET ascii NOT NULL,
    `session_id`   VARCHAR(64) CHARSET ascii NOT NULL,
    `message_id`   BIGINT UNSIGNED DEFAULT NULL,
    `type`         SMALLINT                  NOT NULL,
    `status`       SMALLINT        DEFAULT NULL,
    `data`         MEDIUMTEXT,
    `gmt_modified` TIMESTAMP       DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP,
    `gmt_created`  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`id`),
    INDEX `idx_session_id` (`session_id`, `agent_id`)
) CHARSET = utf8mb4;

DROP TABLE IF EXISTS `mcp_clients`;
CREATE TABLE `mcp_clients`
(
    `id`           BIGINT UNSIGNED AUTO_INCREMENT,
    `mcp_id`       VARCHAR(32) CHARSET ascii    NOT NULL,
    `name`         VARCHAR(128) CHARSET utf8mb4 NOT NULL,
    `enabled`      TINYINT   DEFAULT 1          NOT NULL,
    `config`       MEDIUMTEXT CHARSET utf8mb4,
    `gmt_modified` TIMESTAMP DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP,
    `gmt_created`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_mcp_id` (`mcp_id`)
) AUTO_INCREMENT = 1
  CHARSET = utf8mb4;

DROP TABLE IF EXISTS `knowledge_base_configs`;
CREATE TABLE `knowledge_base_configs`
(
    `id`                BIGINT UNSIGNED AUTO_INCREMENT,
    `knowledge_base_id` VARCHAR(32) CHARSET ascii    NOT NULL,
    `name`              VARCHAR(128) CHARSET utf8mb4 NOT NULL,
    `enabled`           TINYINT   DEFAULT 1          NOT NULL,
    `config`            MEDIUMTEXT CHARSET utf8mb4,
    `gmt_modified`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP,
    `gmt_created`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_knowledge_base_id` (`knowledge_base_id`)
) AUTO_INCREMENT = 1
  CHARSET = utf8mb4;

DROP TABLE IF EXISTS `skill_configs`;
CREATE TABLE `skill_configs`
(
    `id`           BIGINT UNSIGNED AUTO_INCREMENT,
    `name`         VARCHAR(32) CHARSET ascii               NOT NULL,
    `enabled`      TINYINT                       DEFAULT 1 NOT NULL,
    `description`  VARCHAR(1024) CHARSET utf8mb4 DEFAULT '',
    `instruction`  MEDIUMTEXT CHARSET utf8mb4,
    `base_dir`     VARCHAR(1024) CHARSET utf8mb4 DEFAULT '',
    `files`        MEDIUMTEXT CHARSET utf8mb4,
    `file_id`      BIGINT UNSIGNED               DEFAULT NULL,
    `checksum`     VARCHAR(1024) CHARSET ascii   DEFAULT '',
    `gmt_modified` TIMESTAMP                     DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP,
    `gmt_created`  TIMESTAMP                     DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_name` (`name`)
) AUTO_INCREMENT = 1
  CHARSET = utf8mb4;


DROP TABLE IF EXISTS `files`;
CREATE TABLE `files`
(
    `id`           BIGINT UNSIGNED AUTO_INCREMENT,
    `name`         VARCHAR(1024) CHARSET utf8mb4 NOT NULL,
    `size`         BIGINT                        NOT NULL,
    `content`      LONGBLOB                      NOT NULL,
    `gmt_modified` TIMESTAMP DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP,
    `gmt_created`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`id`),
    INDEX `idx_name` (`name`(512))
) AUTO_INCREMENT = 1
  CHARSET = utf8mb4;

DROP TABLE IF EXISTS `oss_files`;
CREATE TABLE `oss_files`
(
    `id`           BIGINT UNSIGNED               NOT NULL,
    `user_id`      VARCHAR(64) CHARSET ascii     NOT NULL,
    `oss_region`   VARCHAR(32) CHARSET ascii     NOT NULL,
    `oss_bucket`   VARCHAR(32) CHARSET ascii     NOT NULL,
    `oss_file_key` VARCHAR(1024) CHARSET utf8mb4 NOT NULL,
    `gmt_modified` TIMESTAMP DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP,
    `gmt_created`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    PRIMARY KEY (`id`),
    INDEX `idx_user` (`user_id`),
    UNIQUE `uk_oss_bucket_file_key` (`oss_region`, `oss_bucket`, `oss_file_key`(256))
) AUTO_INCREMENT = 1
  CHARSET = utf8mb4;

