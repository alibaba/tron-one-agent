package com.aliyun.tam.x.tron;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.params.provider.AnnotationBasedArgumentsProvider;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.platform.commons.JUnitException;
import org.junit.platform.commons.util.Preconditions;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.lang.reflect.Type;
import java.nio.charset.Charset;
import java.util.Arrays;
import java.util.Iterator;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

/**
 * JSONL 文件参数提供器
 * <p>
 * 流式读取 JSONL 文件，将每行 JSON 根据测试方法的参数名称和类型反序列化为相应的 Java 对象。
 * </p>
 * <p>
 * 支持两种模式：
 * <ul>
 *   <li>单参数模式：JSON 直接反序列化为该参数类型</li>
 *   <li>多参数模式：JSON 对象的字段名与方法参数名匹配</li>
 * </ul>
 * </p>
 */
public class JsonlFileArgumentsProvider extends AnnotationBasedArgumentsProvider<JsonlFileSource> {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    @Override
    protected Stream<? extends Arguments> provideArguments(ExtensionContext context, JsonlFileSource annotation) {
        String[] resources = annotation.resources();
        Charset charset = Charset.forName(annotation.encoding());

        Preconditions.notEmpty(resources, "resources must not be empty");

        Method testMethod = context.getRequiredTestMethod();
        Parameter[] parameters = testMethod.getParameters();

        return Arrays.stream(resources)
                .flatMap(resource -> openResource(resource, charset, parameters));
    }

    private Stream<Arguments> openResource(String resource, Charset charset, Parameter[] parameters) {
        InputStream inputStream = getClass().getResourceAsStream(resource);
        if (inputStream == null) {
            throw new JUnitException("Classpath resource not found: " + resource);
        }

        BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, charset));

        // 使用 Iterator 实现流式读取，避免一次性加载整个文件
        Iterator<Arguments> iterator = new JsonlIterator(reader, parameters, resource);

        Spliterator<Arguments> spliterator = Spliterators.spliteratorUnknownSize(
                iterator, Spliterator.ORDERED | Spliterator.NONNULL);

        // onClose 时关闭 reader
        return StreamSupport.stream(spliterator, false)
                .onClose(() -> closeQuietly(reader));
    }

    private void closeQuietly(BufferedReader reader) {
        try {
            reader.close();
        } catch (IOException e) {
            // ignore
        }
    }

    /**
     * 流式迭代器，逐行读取 JSONL 文件
     */
    private class JsonlIterator implements Iterator<Arguments> {
        private final BufferedReader reader;
        private final Parameter[] parameters;
        private final String resource;
        private String nextLine;
        private int lineNumber = 0;

        JsonlIterator(BufferedReader reader, Parameter[] parameters, String resource) {
            this.reader = reader;
            this.parameters = parameters;
            this.resource = resource;
            advance();
        }

        private void advance() {
            try {
                // 跳过空行
                do {
                    nextLine = reader.readLine();
                    lineNumber++;
                } while (nextLine != null && nextLine.trim().isEmpty());
            } catch (IOException e) {
                throw new JUnitException("Error reading JSONL file: " + resource, e);
            }
        }

        @Override
        public boolean hasNext() {
            return nextLine != null;
        }

        @Override
        public Arguments next() {
            if (nextLine == null) {
                throw new IllegalStateException("No more elements");
            }

            String currentLine = nextLine;
            int currentLineNumber = lineNumber;
            advance();

            try {
                Object[] args = parseJsonLine(currentLine, parameters);
                return Arguments.of(args);
            } catch (Exception e) {
                throw new JUnitException(
                        String.format("Error parsing JSON at line %d in %s: %s",
                                currentLineNumber, resource, currentLine), e);
            }
        }
    }

    /**
     * 解析单行 JSON，根据方法参数进行反序列化
     */
    private Object[] parseJsonLine(String jsonLine, Parameter[] parameters) throws IOException {
        if (parameters.length == 0) {
            return new Object[0];
        }

        JsonNode rootNode = OBJECT_MAPPER.readTree(jsonLine);

        // 多参数模式：根据参数名从 JSON 对象中提取对应字段
        Object[] args = new Object[parameters.length];
        for (int i = 0; i < parameters.length; i++) {
            Parameter param = parameters[i];
            String paramName = param.getName();

            // 特殊处理：名为 data 且类型为 Map<String, Object> 的参数，将整行 JSON 反序列化给它
            if ("data".equals(paramName) && isMapStringObject(param)) {
                args[i] = deserializeValue(rootNode, param);
                continue;
            }

            JsonNode fieldNode = rootNode.get(paramName);
            if (fieldNode == null || fieldNode.isNull()) {
                args[i] = null;
            } else {
                args[i] = deserializeValue(fieldNode, param);
            }
        }
        return args;
    }

    /**
     * 检查参数类型是否为 Map<String, Object>
     */
    private boolean isMapStringObject(Parameter parameter) {
        Type genericType = parameter.getParameterizedType();
        if (!(genericType instanceof java.lang.reflect.ParameterizedType paramType)) {
            return false;
        }
        if (paramType.getRawType() != java.util.Map.class) {
            return false;
        }
        Type[] typeArgs = paramType.getActualTypeArguments();
        return typeArgs.length == 2 
                && typeArgs[0] == String.class 
                && typeArgs[1] == Object.class;
    }

    /**
     * 将 JsonNode 反序列化为指定参数类型
     */
    private Object deserializeValue(JsonNode node, Parameter parameter) throws IOException {
        Class<?> type = parameter.getType();

        // 处理基本类型和常用类型
        if (type == String.class) {
            return node.isTextual() ? node.asText() : node.toString();
        }
        if (type == int.class || type == Integer.class) {
            return node.asInt();
        }
        if (type == long.class || type == Long.class) {
            return node.asLong();
        }
        if (type == double.class || type == Double.class) {
            return node.asDouble();
        }
        if (type == boolean.class || type == Boolean.class) {
            return node.asBoolean();
        }
        if (type == JsonNode.class) {
            return node;
        }

        // 复杂类型使用 JavaType 保留泛型信息
        Type genericType = parameter.getParameterizedType();
        JavaType javaType = OBJECT_MAPPER.getTypeFactory().constructType(genericType);
        return OBJECT_MAPPER.readValue(OBJECT_MAPPER.treeAsTokens(node), javaType);
    }
}
