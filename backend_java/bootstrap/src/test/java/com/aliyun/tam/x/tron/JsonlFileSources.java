package com.aliyun.tam.x.tron;

import java.lang.annotation.*;

@Target({ElementType.ANNOTATION_TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface JsonlFileSources {
    JsonlFileSource[] value();
}
