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


package com.aliyun.tam.x.tron.core.tools;

import io.agentscope.core.tool.Tool;
import io.agentscope.core.tool.ToolParam;
import org.springframework.expression.EvaluationContext;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.SimpleEvaluationContext;
import org.springframework.stereotype.Component;

@Component("calculator")
public class CalculatorTool {
    @Tool(description = "计算器工具，输入一个数学表达式，返回计算结果")
    public String calculator(
            @ToolParam(name = "expression", description = "数学表达式") String expression) {
        try {
            ExpressionParser parser =
                    new SpelExpressionParser();
            EvaluationContext context =
                    SimpleEvaluationContext.forReadOnlyDataBinding()
                            .withInstanceMethods()
                            .build();

            Expression exp = parser.parseExpression(expression);
            Object result = exp.getValue(context);
            return String.valueOf(result);
        } catch (Exception e) {
            return "计算错误: " + e.getMessage();
        }
    }
}
