#!/bin/bash

# AI Ecommerce Operation Center - Service Health Check Script

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PORT=${PORT:-3000}
HOST=${HOST:-localhost}
HEALTH_URL="http://${HOST}:${PORT}/api/health"

echo -e "${YELLOW}[HealthCheck] 检查 AI Ecommerce Operation Center 健康状态 (${HEALTH_URL})...${NC}"

if command -v curl >/dev/null 2>&1; then
    HTTP_RESPONSE=$(curl -s -o /tmp/health_out.txt -w "%{http_code}" "${HEALTH_URL}" || echo "000")
else
    HTTP_RESPONSE=$(wget -q -O /tmp/health_out.txt --server-response "${HEALTH_URL}" 2>&1 | awk '/HTTP\// {print $2}' | tail -n1 || echo "000")
fi

if [ "$HTTP_RESPONSE" -eq 200 ]; then
    echo -e "${GREEN}✓ HTTP 健康检查通过 (Status: 200 OK)${NC}"
    if [ -f /tmp/health_out.txt ]; then
        cat /tmp/health_out.txt
        echo ""
    fi
    exit 0
else
    echo -e "${RED}✗ 服务健康检查失败！HTTP 返回状态码: ${HTTP_RESPONSE}${NC}"
    if [ -f /tmp/health_out.txt ]; then
        cat /tmp/health_out.txt
        echo ""
    fi
    exit 1
fi
