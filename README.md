# 懂言懂语个人博客

从微信公众号九句图文工程同步生成的静态博客，部署到 Cloudflare Workers Static Assets。生成后的 `public/` 会提交到 GitHub，Cloudflare 可直接从仓库发布，无需访问本机文章目录。

## 使用

```bash
npm install
npm run sync
npm run preview
npm run deploy
```

默认源目录：`/home/heiyulong/AI/codex/blog/懂言懂语`。可用环境变量 `BLOG_SOURCE_DIR` 覆盖。

每次源工程新增文章后运行 `npm run sync`，再运行 `npm run deploy`。

## Cloudflare Git 构建配置

- 构建命令：留空
- 输出目录：`public`
- 生产分支：`main`
