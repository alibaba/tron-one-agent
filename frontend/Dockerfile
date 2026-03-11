# 使用本地nginx镜像作为基础镜像
FROM --platform=linux/amd64 repository.dayu.work/public-images/nginx:1.17.5-alpine AS production

# 为 client 应用创建目录并复制构建产物
RUN mkdir -p /usr/share/nginx/html/client
COPY packages/client/dist /usr/share/nginx/html/client

# 为 control 应用创建目录并复制构建产物
RUN mkdir -p /usr/share/nginx/html/control
COPY packages/control/dist /usr/share/nginx/html/control

# 复制默认 nginx 配置（模板）
COPY nginx.conf /etc/nginx/nginx.conf.template

# 暴露端口
EXPOSE 80

# 启动时用 envsubst 替换环境变量后启动 nginx
CMD ["sh", "-c", "envsubst '${END_POINT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]