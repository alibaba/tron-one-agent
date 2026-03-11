import sys

import requests
from urllib.parse import quote

resp = requests.get(
    f"https://uapis.cn/api/v1/misc/weather?city={quote(sys.argv[1])}"
)

resp.raise_for_status()
data = resp.json()
print(f"{data['city']}今天的天气{data['weather']}，当前气温为{data['temperature']}摄氏度")