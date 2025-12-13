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

# 3. 构建并启动服务
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

