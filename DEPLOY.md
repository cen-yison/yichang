# 已停用的手动部署脚本（历史备份）

站点已接入 **Netlify Git 集成**，push 即自动构建，不再需要这个脚本。

## 现在的发布链路

```
Studio 发布内容
  → Sanity webhook（document create/update/delete，排除 drafts.*）
  → Netlify Build Hook
  → Netlify 拉取 GitHub 仓库构建
  → 全球 CDN 上线
```

**服务器 186.244.201.7 完全不参与这个链路。**

## 原脚本做了什么

`deploy-api-fallback.sh.txt` 是旧方案，逻辑是：

1. 用 GROQ 匿名查 Sanity，把所有文档 `_id + _rev` 排序后哈希，得到内容指纹
2. 指纹与上次相同就退出（避免无谓构建）
3. 指纹变了 → `npm run build` → 打 zip → 上传到 Netlify REST API
4. 轮询部署状态到 `ready`，跑 5 个页面冒烟测试

## 什么情况下可能还用得上

- Netlify Git 集成故障，需要紧急发布
- 需要在没有 GitHub 的环境里部署

## 恢复步骤

1. 在 Netlify 后台新建 PAT
2. 写入 `/root/.yichang-deploy.env`：
   ```
   NFT="nfp_xxxxx"
   SITE_ID="e8d67507-e985-4c15-827e-cf31377b2318"
   SITE_URL="https://yichang-store.netlify.app"
   ```
3. `chmod 600 /root/.yichang-deploy.env`
4. `cp deploy-api-fallback.sh.txt deploy.sh && chmod +x deploy.sh`
5. `./deploy.sh`

**不要恢复 cron 定时任务** —— 会和 Git 构建互相覆盖，导致线上版本回退。

## 历史教训

- 旧版脚本把 Netlify PAT 明文写在脚本里并提交到了公开仓库，导致 token 泄露。凭据必须放在仓库外，且 `.gitignore` 要挡住。
- 内容指纹只能哈希 GROQ 响应的 `.result`，不能哈希整个响应体 —— 响应里带 `ms`（查询耗时），会导致每轮指纹都变，内容没改也在不停构建部署。
- 内容指纹必须走 `api.sanity.io` 而不是 `apicdn.sanity.io` —— CDN 有分钟级缓存，会漏掉刚发布的修改。
