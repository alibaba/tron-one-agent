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


package com.aliyun.tam.x.tron.api.dto;

import com.aliyun.tam.x.tron.core.domain.models.PageResult;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.function.Function;

/**
 * Generic page result model
 *
 * @param <T> the type of items in the page
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResultDTO<T> {

    public static <T, F> PageResultDTO<T> from(PageResult<F> pageResult, Function<F, T> converter) {
        return PageResultDTO.<T>builder()
                .totalRecords(pageResult.getTotalRecords())
                .records(pageResult.getRecords().stream().map(converter).toList())
                .pageNum(pageResult.getPageNum())
                .pageSize(pageResult.getPageSize())
                .totalPages(pageResult.getTotalPages())
                .build();
    }

    /**
     * Total count of items
     */
    private Long totalRecords;

    /**
     * List of items in current page
     */
    private List<T> records;

    /**
     * Current page number
     */
    private Integer pageNum;

    /**
     * Page size
     */
    private Integer pageSize;

    /**
     * Total pages
     */
    private Integer totalPages;

}
