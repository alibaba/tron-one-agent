#!/bin/bash

# 构建和部署前端应用的脚本
# 用法:
#   ./build.sh -prod        使用 package.json 中的版本号
#   ./build.sh -tag <tag>   使用 版本号_tag 作为镜像标签

set -e  # 遇到错误时退出

# 解析参数
MODE=""
TAG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -prod)
      MODE="prod"
      shift
      ;;
    -tag)
      MODE="tag"
      TAG="$2"
      shift 2
      ;;
    *)
      echo "未知参数: $1"
      echo "用法: ./build.sh -prod | -tag <tag>"
      exit 1
      ;;
  esac
done

if [ -z "$MODE" ]; then
  echo "错误: 请指定 -prod 或 -tag <tag>"
  echo "用法: ./build.sh -prod | -tag <tag>"
  exit 1
fi

echo "开始构建前端应用..."

# 检查是否已安装yarn
if ! command -v yarn &> /dev/null; then
    echo "错误: 未找到yarn，请先安装yarn"
    exit 1
fi

# 检查package.json是否存在
if [ ! -f "package.json" ]; then
    echo "错误: 未找到package.json文件"
    exit 1
fi

# 安装依赖
echo "安装依赖..."
yarn install

# 构建client应用
echo "构建client应用..."
yarn build:client

# 构建control应用
echo "构建control应用..."
yarn build:control

echo "前端应用构建完成!"

# 从 package.json 获取版本号
BASE_VERSION=$(node -p "require('./package.json').version")

# 确定镜像标签
if [ "$MODE" = "prod" ]; then
  IMAGE_TAG="$BASE_VERSION"
else
  IMAGE_TAG="${BASE_VERSION}_${TAG}"
fi

IMAGE_NAME="one-agent-frontend:${IMAGE_TAG}"

# 构建 Docker 镜像
echo "开始构建 Docker 镜像: ${IMAGE_NAME}..."
docker build -t "$IMAGE_NAME" .

echo "Docker镜像构建完成!"
echo "镜像名称: ${IMAGE_NAME}"
echo "可以使用 'docker run -p 80:80 -e END_POINT=<backend-host:port> ${IMAGE_NAME}' 启动容器"