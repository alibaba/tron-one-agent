package com.aliyun.tam.x.tron;

import org.apiguardian.api.API;
import org.junit.jupiter.params.provider.ArgumentsSource;

import java.lang.annotation.*;

@Target({ElementType.ANNOTATION_TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Repeatable(JsonlFileSources.class)
@API(
        status = API.Status.STABLE,
        since = "5.7"
)
@ArgumentsSource(JsonlFileArgumentsProvider.class)
public @interface JsonlFileSource {
    String[] resources() default {};

    String encoding() default "UTF-8";
}
