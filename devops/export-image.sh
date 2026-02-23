#!/bin/bash

# 导出 Docker 镜像脚本
# 使用方法: ./export-image.sh

set -e

echo "开始构建 Docker 镜像..."

# 构建镜像
docker build -f devops/Dockerfile -t ai-run-nextjs:latest ..

echo "镜像构建完成，开始导出..."

# 导出镜像到 tar 文件
docker save ai-run-nextjs:latest -o ai-run-nextjs.tar

echo "镜像导出完成: ai-run-nextjs.tar"
echo "文件大小: $(du -h ai-run-nextjs.tar | cut -f1)"

echo "你可以将 ai-run-nextjs.tar 文件传输到服务器，然后使用以下命令加载:"
echo "docker load -i ai-run-nextjs.tar" 