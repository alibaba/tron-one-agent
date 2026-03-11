---
name: weather
description: 用于查询某地的今天天气
---

# 天气查询技能

执行以下Python代码以获取某个城市的天气信息，其中 <<city>> 为城市名称

```shell
python3 scripts/weather.py <<city>>
```

# Input Parameters
- city: 城市名称

# Examples
## Example 1: 查询北京的天气
```shell
python3 scripts/weather.py 北京
```

output: 
```shell
北京市今天的天气晴，当前气温为24摄氏度
```



# Scripts

- scripts/weather.py: 用于查询指定城市今天天气的Python脚本