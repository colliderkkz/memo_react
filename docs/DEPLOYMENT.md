# 本地运行与部署

本项目定位为 **localhost 单用户应用**，无云端部署路径（无鉴权，切勿暴露公网）。

## 环境要求

- Node >= 24（内置 `node:sqlite`；自带 corepack）
- Windows / macOS / Linux 均可；Windows 用户可直接双击根目录的
  `start-memos.bat`（启动）与 `backup-memos.bat`（备份）

## 开发

```bash
corepack enable
corepack pnpm install   # 安装依赖
corepack pnpm dev       # http://localhost:3000
```

首次启动会自动创建 `data/` 并执行 `migrations/*.sql`（`_migrations` 表跟踪，无需手动迁移）。

## 生产模式（日常使用推荐）

```bash
corepack pnpm build     # 输出 .next/
corepack pnpm start     # http://localhost:3000（可用 PORT/HOST 环境变量覆盖）
```

注意：必须从项目根目录启动（`data/`、`migrations/`、OG 背景图都按 cwd 解析）。
数据目录可用 `MEMOS_DATA_DIR` 环境变量指到别处。

## 数据与备份

- 全部数据 = `data/` 一个文件夹（db.sqlite + r2/ 文件树）
- 备份：停服务后打包 `data/`（`backup-memos.bat` 自动做这件事）
- 恢复：停服务后把备份 zip 解压覆盖回 `data/`
- 不要在服务运行时复制 data/（SQLite WAL 写入中复制会得到损坏快照）

## 从旧版（Cloudflare/miniflare）迁移

旧数据在 `apps/memos/.wrangler/state/v3/` 的项目，跑一次性脚本：

```bash
node scripts/migrate-from-wrangler.mjs --dry-run   # 预览
node scripts/migrate-from-wrangler.mjs             # 迁移（目标库非空时需 --force）
```

脚本只读旧数据（复制副本后打开），可反复执行；迁移后自行核对备忘录条数。

## 验证

```bash
corepack pnpm test                     # vitest 单元测试
corepack pnpm typecheck                # tsc
node scripts/check-bindings.mjs        # 存储层自检（不碰真实数据）
corepack pnpm dev &                    # 起服务后：
node scripts/check-api.mjs             # API 冒烟矩阵（会临时改动 profile 名并恢复）
```
