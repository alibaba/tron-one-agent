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
                Object[] args = parseJsonLine(currentLine, parameters, resource);
                return Arguments.of(args);
            } catch (Exception e) {
                throw new JUnitException(
                        String.format("Error parsing JSON at line %d in %s: %s",
                                currentLineNumber, resource, currentLine), e);
            }
        }
    }

    private Object[] parseJsonLine(String jsonLine, Parameter[] parameters, String resource) throws IOException {
        if (parameters.length == 0) {
            return new Object[0];
        }

        JsonNode rootNode = OBJECT_MAPPER.readTree(jsonLine);

        // 多参数模式：根据参数名从 JSON 对象中提取对应字段
        Object[] args = new Object[parameters.length];
        for (int i = 0; i < parameters.length; i++) {
            Parameter param = parameters[i];

            JsonlFileSource.FileName fileNameAnnotation = param.getAnnotation(JsonlFileSource.FileName.class);
            if (fileNameAnnotation != null) {
                if (param.getType() != String.class) {
                    throw new JUnitException("@FileName annotated parameter must be of type String");
                }
                args[i] = extractFileName(resource, fileNameAnnotation.keepSuffix());
                continue;
            }

            JsonlFileSource.AllData allDataAnnotation = param.getAnnotation(JsonlFileSource.AllData.class);
            if (allDataAnnotation != null) {
                if (!isMapStringObject(param)) {
                    throw new JUnitException("@AllData annotated parameter must be of type Map<String, Object>");
                }
                args[i] = deserializeValue(rootNode, param);
                continue;
            }

            String paramName = param.getName();
            JsonNode fieldNode = rootNode.get(paramName);
            if (fieldNode == null || fieldNode.isNull()) {
                args[i] = null;
            } else {
                args[i] = deserializeValue(fieldNode, param);
            }
        }
        return args;
    }

    private String extractFileName(String resource, boolean keepSuffix) {
        String fileName = resource;
        int lastSlash = fileName.lastIndexOf('/');
        if (lastSlash >= 0) {
            fileName = fileName.substring(lastSlash + 1);
        }
        if (!keepSuffix) {
            int lastDot = fileName.lastIndexOf('.');
            if (lastDot > 0) {
                fileName = fileName.substring(0, lastDot);
            }
        }
        return fileName;
    }

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

    private Object deserializeValue(JsonNode node, Parameter parameter) throws IOException {
        Class<?> type = parameter.getType();

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

        Type genericType = parameter.getParameterizedType();
        JavaType javaType = OBJECT_MAPPER.getTypeFactory().constructType(genericType);
        return OBJECT_MAPPER.readValue(OBJECT_MAPPER.treeAsTokens(node), javaType);
    }
}
