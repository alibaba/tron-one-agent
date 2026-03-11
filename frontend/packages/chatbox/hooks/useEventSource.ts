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


// hooks/useEventSource.ts
import { useRef, useEffect, useMemo } from "react";
import { EventSourceService } from "../eventSource/EventSource";

export interface UseEventSourceOptions {
  // 是否自动启动 EventSource
  autoStart?: boolean;
}

export function useEventSource<T extends EventSourceService>(
  factory: () => T,
  deps: React.DependencyList = [],
  options: UseEventSourceOptions = {}
): T {
  const { autoStart = false } = options;
  const eventSourceRef = useRef<T | null>(null);

  // 只在依赖项变化时重新创建 EventSource 实例
  const eventSource = useMemo(() => {
    const newInstance = factory();
    eventSourceRef.current = newInstance;
    return newInstance;
  }, deps);

  // 处理自动启动逻辑
  useEffect(() => {
    if (autoStart && eventSource) {
      eventSource.start();
    }

    // 清理函数，在组件卸载时销毁 EventSource
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.stop();
        eventSourceRef.current = null;
      }
    };
  }, [eventSource, autoStart]);

  return eventSource;
}
