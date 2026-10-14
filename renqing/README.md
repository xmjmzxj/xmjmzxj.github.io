# 人情世故段位 · 测评网站

一个可以直接上架售卖的轻量测评站点。**25 个真实社交场景题 → 五维能力画像 → 七档段位结果 → 一键生成分享海报。**

纯静态实现（HTML + CSS + 原生 JS，零依赖、零构建），可直接部署到 GitHub Pages / 任意静态托管。

---

## 一、目录结构

```
renqing-test/
├── index.html            # 主站（封面 → 密码 → 答题 → 结果）
├── admin.html            # 运营后台（生成密码 / 数据统计）
├── css/style.css         # 全部样式
├── js/
│   ├── config.js         # ★ 全局配置，部署前必改
│   ├── questions.js      # 题库（25 题 × 5 维度）
│   ├── results.js        # 段位体系 + 结果计算
│   ├── poster.js         # 海报绘制 + 保存到相册
│   ├── app.js            # 主流程
│   └── admin.js          # 后台逻辑
├── data/passwords.json   # 密码池
└── README.md
```

---

## 二、本地预览

必须用 HTTP 服务打开（`file://` 下 `fetch` 会被浏览器拦截）：

```bash
cd renqing-test
python -m http.server 8099
# 浏览器打开 http://localhost:8099/
```

**自己验收时**，网址后加 `?free=1` 可跳过密码：`http://localhost:8099/?free=1`

后台地址：`http://localhost:8099/admin.html`

---

## 三、部署到 GitHub Pages

1. 新建仓库（比如 `renqing-test`），把 `renqing-test` 目录里的**全部内容**推到仓库根目录。
2. 仓库 `Settings → Pages` → Source 选 `Deploy from a branch` → 分支 `main`、目录 `/ (root)` → Save。
3. 等 1–3 分钟，访问 `https://<你的用户名>.github.io/renqing-test/`。

> ⚠️ 所有资源引用都是**相对路径**，这样才能在 `/<仓库名>/` 子路径下正常工作，请不要改成 `/js/xxx` 这种绝对路径。

---

## 四、部署前必改（js/config.js）

| 字段 | 说明 |
|---|---|
| `siteUrl` | 改成你的真实网址。**海报上的二维码和分享链接都用它**，不改的话扫码会跳到错误地址。 |
| `adminKey` | 后台管理密钥，**务必改掉默认值**。 |
| `requirePassword` | `true` = 需密码才能开始（开店模式）；`false` = 免费开放。 |
| `baseUserCount` | 封面「已测人数」的展示基数，按需调整。 |

---

## 五、密码的两种玩法

### 玩法 A：纯静态（默认，零成本）

密码池放在 `data/passwords.json`，所有买家共用一份。
流程：后台生成密码 → 下载 `passwords.json` → 覆盖项目里的同名文件 → 提交更新。

**局限**：纯静态没有服务器，无法做到「一码一用」（无法跨设备记录使用状态），也无法统计全部用户的真实数据。

### 玩法 B：接 Supabase（推荐，免费额度足够）

能实现 **一码一用 + 后台看全量真实数据**。三步：

**第 1 步**：在 [supabase.com](https://supabase.com) 建项目，进 `SQL Editor` 执行：

```sql
create table rqdw_passwords (
  code    text primary key,
  used    boolean default false,
  used_at timestamptz,
  note    text
);

create table rqdw_results (
  id    bigserial primary key,
  ts    timestamptz default now(),
  total int,
  rank  text,
  dims  jsonb,
  code  text
);

alter table rqdw_passwords enable row level security;
alter table rqdw_results   enable row level security;

create policy "read pass"    on rqdw_passwords for select using (true);
create policy "insert result" on rqdw_results   for insert with check (true);
create policy "read result"   on rqdw_results   for select using (true);
```

**第 2 步**：把密码批量导进 `rqdw_passwords` 表（CSV 导入，字段就一列 `code`；后台「导出 CSV」可以直接用）。

**第 3 步**：把 Project URL 和 anon public key 填进 `js/config.js`：

```js
supabase: {
  url: 'https://xxxxxxxx.supabase.co',
  anonKey: 'eyJhbGciOi...',
  resultTable: 'rqdw_results',
  passTable: 'rqdw_passwords'
}
```

填完即自动启用，无需改其他代码。

---

## 六、后台能做什么

打开 `/admin.html`，输入 `config.js` 里的 `adminKey`：

- **密码管理**：批量生成（自定义数量 / 前缀 / 位数）、追加合并、读取现有池、复制 JSON、下载 `passwords.json`、导出 CSV
- **数据统计**：完成量、平均分、段位分布、各段位维度趋势、最近 30 条明细、导出全部记录 CSV
- **部署说明**：Supabase 建表 SQL 直接复制

---

## 七、想换选题怎么办

整站是数据驱动的，改选题基本只动两个文件：

1. **`js/questions.js`** — 改 `DIMENSIONS`（维度）和 `QUESTIONS`（题目）。
   每题结构：`{ id, dim, text, options:[{t:'选项文字', s:分值1-4}] }`
   保持「每题 4 个选项、分值 1~4 各一个」即可，总分区间会自动跟着变。
2. **`js/results.js`** — 改 `RANKS`（段位档位）。
   `min/max` 是按总分划分的区间，改题库后记得同步调整。
   `desc / strengths / advices / quote` 是结果页文案，也是海报上取用的内容。

改完刷新即可，不需要构建。可以拿一份竞品的好答案发给 AI，让它照这个结构批量出题。

---

## 八、免责声明

结果基于情境选项生成，仅供自我觉察与娱乐参考，不构成专业心理诊断。文案已在 `config.js` 的 `disclaimer` 字段中，可自行替换。
