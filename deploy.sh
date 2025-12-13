#!/bin/bash
# PaperHub 阿里云一键部署脚本

set -e

echo "=========================================="
echo "  PaperHub 部署脚本"
echo "=========================================="

# 检查必要参数
if [ -z "$SERVER_IP" ]; then
    echo "请设置服务器IP: export SERVER_IP=你的服务器IP"
    exit 1
fi

if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "警告: 未设置 OPENROUTER_API_KEY，智能问答功能将不可用"
    echo "设置方式: export OPENROUTER_API_KEY=你的API密钥"
fi

echo ""
echo "服务器 IP: $SERVER_IP"
echo ""

# 1. 安装 Docker（如果未安装）
if ! command -v docker &> /dev/null; then
    echo "正在安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
fi

# 2. 安装 Docker Compose（如果未安装）
if ! command -v docker-compose &> /dev/null; then
    echo "正在安装 Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# 3. 下载数据集（从 Hugging Face）
echo "正在下载数据集..."
mkdir -p papers

# 安装 huggingface_hub（如果未安装）
if ! pip show huggingface_hub &> /dev/null; then
    pip install huggingface_hub
fi

# 使用 Python 下载数据集
python3 << 'EOF'
from huggingface_hub import hf_hub_download, list_repo_files
import os

repo_id = "SkyyyyyMT/paperhub_data"
local_dir = "papers"

print(f"正在从 {repo_id} 下载数据集...")

# 列出仓库中的所有文件
files = list_repo_files(repo_id, repo_type="dataset")

for file in files:
    if file.endswith('.jsonl'):
        print(f"  下载: {file}")
        hf_hub_download(
            repo_id=repo_id,
            filename=file,
            repo_type="dataset",
            local_dir=local_dir
        )

print("数据集下载完成!")
EOF

# 4. 构建并启动服务
echo "正在构建并启动服务..."
docker-compose -f docker-compose.prod.yml up -d --build

# 4. 等待服务启动
echo "等待服务启动..."
sleep 30

# 5. 检查服务状态
echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "前端访问地址: http://$SERVER_IP:3000"
echo "后端API地址: http://$SERVER_IP:8000"
echo "API文档地址: http://$SERVER_IP:8000/docs"
echo "Neo4j浏览器: http://$SERVER_IP:7474"
echo ""
echo "查看日志: docker-compose -f docker-compose.prod.yml logs -f"
echo "停止服务: docker-compose -f docker-compose.prod.yml down"
echo ""

