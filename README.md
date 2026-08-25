# AI Builder Team

AI Builder Team 官方站点。当前包含中文 AI 构建术语库、SQLite API、问卷统计与管理后台。

## Local development

```bash
npm install
npm run dev
```

- Public site: `http://localhost:4173/`
- Admin console: `http://localhost:4173/admin`
- API health: `http://localhost:3001/api/health`

The development-only default administrator is `admin` / `change-me-now`.

## Configuration

Copy `.env.example` values into the deployment environment. Always set a strong `ADMIN_PASSWORD` before the database is created. The first run creates `data/vibehub.db` and seeds the initial catalog.

## Production

```bash
npm run build
ADMIN_PASSWORD='replace-this' npm start
```

The Node service exposes `/api`, serves `dist/client`, and supports SPA routes such as `/admin`.

## Verification

```bash
npm run test:api
npm run test:sites
```

The API test runs against an isolated temporary SQLite database and covers login, create, update, publish, public catalog visibility, and delete.
