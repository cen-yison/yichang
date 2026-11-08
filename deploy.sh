#!/bin/bash
# 内容变更 → 构建 → 发布到 Netlify，全程不依赖 Netlify 的 Git 集成
# 由 cron 定期跑；Sanity 内容没变化时立即退出，不浪费构建时间。
#
# 凭据从 /root/.yichang-deploy.env 读取（权限 600），绝不写进本文件 —— 本文件会进公开 git 仓库。
set -uo pipefail

export PATH=/opt/node22/bin:$PATH
cd /root/sanity-astro || exit 1

STATE_FILE=/root/sanity-astro/.last-content-hash
LOG=/root/sanity-astro/deploy.log

# 日志超过 1MB 就轮转，只留上一份
if [ -f "$LOG" ] && [ "$(stat -c%s "$LOG")" -gt 1048576 ]; then
  mv -f "$LOG" "$LOG.1"
fi

log() { echo "[$(date '+%F %T')] $*" >> "$LOG"; }

# 并发锁：上一轮还在跑（构建 + 等部署最长约 6 分钟）就跳过，避免两轮重叠互相覆盖
LOCK=/var/lock/yichang-deploy.lock
if ! exec 9>"$LOCK" || ! flock -n 9; then
  exit 0
fi

SECRETS=/root/.yichang-deploy.env
if [ ! -f "$SECRETS" ]; then
  log "ERROR: 缺少 $SECRETS"
  exit 1
fi
# shellcheck disable=SC1090
. "$SECRETS"

if [ -z "${NFT:-}" ] || [ -z "${SITE_ID:-}" ]; then
  log "ERROR: $SECRETS 里缺少 NFT 或 SITE_ID"
  exit 1
fi
SITE_URL="${SITE_URL:-https://yichang-store.netlify.app}"

# 1. 取 Sanity 内容的指纹（所有文档的 _id+_rev 排序后哈希）
#    走 api.sanity.io 而不是 apicdn —— CDN 有分钟级缓存，会漏掉刚发布的修改
#    dataset 是 public，匿名读即可，不需要 token
#    注意：只能哈希 .result，不能哈希整个响应体 —— 响应里带 ms（查询耗时，每次不同），
#    整个响应哈希会导致每轮指纹都变，内容没改也会不停重新构建部署。
FINGERPRINT=$(curl -gsS --max-time 30 \
  --get --data-urlencode 'query=*[!(_id in path("drafts.**"))]|order(_id asc){_id,_rev}' \
  "https://vk38187i.api.sanity.io/v2024-01-01/data/query/production" \
  | jq -cS '.result' \
  | sha256sum | cut -d' ' -f1)

# 空结果 / jq 解析失败时上面的管道仍会产出「空串的哈希」，必须显式排除
if [ -z "$FINGERPRINT" ] || ! printf '%s' "$FINGERPRINT" | grep -qE '^[0-9a-f]{64}$'; then
  log "ERROR: 无法读取 Sanity 内容指纹，跳过本轮"
  exit 1
fi

if [ -f "$STATE_FILE" ] && [ "$(cat "$STATE_FILE")" = "$FINGERPRINT" ]; then
  exit 0   # 静默跳过，避免每轮刷日志
fi

log "检测到内容变化 $FINGERPRINT，开始构建"

# 2. 构建
if ! SITE_URL="$SITE_URL" npm run build >> "$LOG" 2>&1; then
  log "ERROR: 构建失败，保留旧指纹以便下轮重试"
  exit 1
fi

# 3. 打包并发布
rm -f site.zip
( cd dist && zip -qr ../site.zip . )

RESP=$(curl -sS -w '\n%{http_code}' --max-time 180 \
  -X POST \
  -H "Authorization: Bearer $NFT" \
  -H "Content-Type: application/zip" \
  --data-binary @site.zip \
  "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys")

CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')

if [ "$CODE" != "200" ] && [ "$CODE" != "201" ]; then
  log "ERROR: 部署失败 HTTP $CODE :: $(echo "$BODY" | head -c 300)"
  exit 1
fi

DEPLOY_ID=$(echo "$BODY" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])' 2>/dev/null)
log "部署已提交 deploy_id=$DEPLOY_ID"

# 4. 等部署 ready（最多 5 分钟）
for i in $(seq 1 30); do
  STATE=$(curl -sS --max-time 20 -H "Authorization: Bearer $NFT" \
    "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys/$DEPLOY_ID" \
    | python3 -c 'import sys,json;print(json.load(sys.stdin).get("state",""))' 2>/dev/null)
  if [ "$STATE" = "ready" ]; then
    log "部署 ready ✓"
    echo "$FINGERPRINT" > "$STATE_FILE"
    rm -f site.zip
    # 5. 冒烟测试
    FAIL=0
    for p in / /products/ /posts/ /product/clay-mug/ /en/; do
      C=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$SITE_URL$p")
      [ "$C" = "200" ] || { log "SMOKE FAIL $p -> $C"; FAIL=1; }
    done
    [ "$FAIL" = "0" ] && log "冒烟测试全部 200 ✓" || log "冒烟测试有失败"
    exit 0
  fi
  if [ "$STATE" = "error" ]; then
    log "ERROR: 部署状态 error"
    exit 1
  fi
  sleep 10
done

log "WARN: 部署超时未 ready（deploy_id=$DEPLOY_ID）"
exit 1
