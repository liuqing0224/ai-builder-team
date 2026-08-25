import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const DB_PATH = resolve(process.env.DATABASE_PATH || "data/vibehub.db");
mkdirSync(dirname(DB_PATH), { recursive: true });
export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS term_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(category_id, name)
  );
  CREATE TABLE IF NOT EXISTS terms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES term_groups(id) ON DELETE CASCADE,
    name_zh TEXT NOT NULL,
    name_en TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    visual_type TEXT NOT NULL DEFAULT 'generic',
    status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS survey_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_terms_category ON terms(category_id);
  CREATE INDEX IF NOT EXISTS idx_terms_group ON terms(group_id);
  CREATE INDEX IF NOT EXISTS idx_terms_status ON terms(status);
`);

const seedCatalog = {
  frontend: { label: "前端", title: "前端 VibeCoding 术语", groups: {
    "网页基础": [["前端","Frontend","老听人说前端、后端，这两个到底有什么区别？","browser"],["组件","Component","把这个重复出现的商品区做成组件，改一个地方就能同步更新。","component"],["状态","State","提交按钮点下去先显示保存中，成功或失败后再更新提示。","state"],["Markdown","","AI 写的文档里全是 # 和星号，这是什么？能变成好看的排版吗？","markdown"],["HTML","","AI 写出来的代码里一堆 < > 和英文单词，这些东西是干嘛的？","html"],["CSS","","按钮能点但颜色一直是灰色，帮我找出是哪条样式把主题色覆盖了。","generic"],["文档对象模型","DOM","确认运行时页面到底插入了什么节点。","generic"],["页面标题","Title Tag","让浏览器标签显示正确的页面名称。","generic"],["页面元数据","Page Metadata","检查搜索摘要和链接分享会显示什么。","generic"],["网站图标","Favicon","换掉标签页和书签里的品牌小图标。","generic"],["Open Graph","","为文章设置正确的分享卡片信息。","generic"],["Web 应用清单","Web App Manifest","检查应用名称、图标、启动地址和显示方式。","generic"],["撤销","Undo","这个改动不对，回到动手之前的样子。","generic"],["无障碍","Accessibility","检查图片说明、键盘操作和文字对比度。","generic"]],
    "按钮与链接": [["按钮","Button","帮我加个按钮，点了就能把内容存下来。","generic"],["链接","Link","这段文字要能让人点，点了跳到另一个页面。","generic"]],
    "表单": [["输入框","Input","页面上要有个填邮箱的地方。","generic"],["多行文本框","Textarea","要让用户写一大段话，一行肯定不够。","generic"],["复选框","Checkbox","这几个选项不冲突，用户想选几个都行。","generic"],["开关","Switch","像手机设置里那样，这个功能一拨就开、再拨就关。","generic"],["日期选择器","DatePicker","日期别让用户手输，给个日历直接挑。","generic"],["上传","Upload","用户要能把自己的图片传上来。","generic"]],
    "内容展示": [["表格","Table","订单数据堆在一起太乱了，帮我排成表格，一行一条。","table"],["卡片","Card","每个商品做成一张小卡片，图在上面，名字价格在下面。","generic"],["标签页","Tabs","内容太多了，帮我分几个页签，点一下就换一屏。","generic"],["空状态","Empty","没数据时别一片空白，告诉用户接下来怎么办。","generic"],["图表","Chart","用图表比较这六个月的订单变化。","chart"],["聊天界面","Chat UI","补全消息列表、输入区、发送中和失败重试。","generic"]]
  }},
  backend: { label:"后端", title:"后端 VibeCoding 术语", groups:{"接口与数据":[["接口","API","让前端通过一个稳定地址读取订单数据。","generic"],["数据库","Database","把用户资料持久保存，下次打开仍然能找到。","table"],["身份验证","Authentication","登录后确认这个请求到底是谁发来的。","generic"],["缓存","Cache","重复数据先从更快的地方读取，减少等待。","generic"],["队列","Queue","耗时任务先排队处理，不要堵住当前请求。","generic"],["日志","Log","记录运行过程，出错时能找到发生了什么。","generic"]]}},
  product: { label:"产品", title:"产品 VibeCoding 术语", groups:{"用户与需求":[["用户故事","User Story","写清楚是谁遇到了什么问题，解决以后有什么用。","generic"],["用户用例","Use Case","把用户怎么发起、系统怎么回应写完整。","generic"],["用户流程","User Flow","画出用户从进来到完成目标经过的步骤。","flow"],["用户旅程","User Journey","整理用户从了解到开始使用的完整过程。","flow"]],"产品规划":[["PRD","","把要做的东西、目标和验收标准写清楚。","generic"],["MVP","","先做最小的一版验证核心价值。","generic"],["产品待办列表","Product Backlog","把需求按重要程度整理成待办列表。","table"],["产品路线图","Roadmap","整理接下来几个阶段的重点目标。","flow"]]}},
  stack: { label:"技术栈", title:"技术栈 VibeCoding 术语", groups:{"开发工具":[["React","","用组件和状态组织交互式网页。","generic"],["Next.js","","为 React 补齐路由和全栈能力。","generic"],["TypeScript","","提前约束数据形状，减少错误。","generic"],["Vite","","快速启动现代前端项目并打包。","generic"],["Tailwind CSS","","用原子类快速组合界面样式。","generic"],["Node.js","","让 JavaScript 运行在服务器端。","generic"]]}},
  ai: { label:"AI", title:"AI VibeCoding 术语", groups:{"模型与提示":[["提示词","Prompt","把目标、背景、限制和输出格式说清楚。","generic"],["上下文","Context","提供模型完成任务所需的信息。","generic"],["智能体","Agent","让模型规划步骤、调用工具并检查结果。","generic"],["幻觉","Hallucination","模型说得像真的，但事实并不成立。","generic"],["检索增强","RAG","先检索资料，再让模型据此回答。","generic"],["多模态","Multimodal","同时理解文字、图片和声音。","generic"]]}},
  git: { label:"Git", title:"Git VibeCoding 术语", groups:{"版本管理":[["提交","Commit","把一组相关改动保存为版本节点。","generic"],["分支","Branch","在不影响主线的情况下开发功能。","generic"],["合并","Merge","把一个分支的改动整合到另一个分支。","generic"],["冲突","Conflict","两边改到同一处，需要决定保留什么。","generic"]]}},
  design: { label:"设计风格", title:"设计风格 VibeCoding 术语", groups:{"视觉方向":[["极简主义","Minimalism","减少非必要元素，突出核心内容。","generic"],["粗野主义","Brutalism","用直接且粗粝的视觉表达态度。","generic"],["玻璃拟态","Glassmorphism","用半透明和背景模糊营造层次。","generic"],["新拟态","Neumorphism","用柔和高光与阴影模拟表面。","generic"]]}}
};

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password, stored) {
  const [salt, key] = stored.split(":");
  return timingSafeEqual(Buffer.from(key, "hex"), scryptSync(password, salt, 64));
}

function seed() {
  db.exec("BEGIN");
  try {
  const addCategory = db.prepare("INSERT INTO categories (slug,label,title,sort_order) VALUES (?,?,?,?)");
  const addGroup = db.prepare("INSERT INTO term_groups (category_id,name,sort_order) VALUES (?,?,?)");
  const addTerm = db.prepare("INSERT INTO terms (category_id,group_id,name_zh,name_en,description,visual_type,sort_order) VALUES (?,?,?,?,?,?,?)");
  Object.entries(seedCatalog).forEach(([slug, category], categoryIndex) => {
    const categoryId = Number(addCategory.run(slug, category.label, category.title, categoryIndex).lastInsertRowid);
    Object.entries(category.groups).forEach(([name, terms], groupIndex) => {
      const groupId = Number(addGroup.run(categoryId, name, groupIndex).lastInsertRowid);
      terms.forEach((term, termIndex) => addTerm.run(categoryId, groupId, term[0], term[1], term[2], term[3], termIndex));
    });
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

if (db.prepare("SELECT COUNT(*) AS count FROM categories").get().count === 0) seed();
if (db.prepare("SELECT COUNT(*) AS count FROM admins").get().count === 0) {
  db.prepare("INSERT INTO admins (username,password_hash) VALUES (?,?)").run(process.env.ADMIN_USERNAME || "admin", hashPassword(process.env.ADMIN_PASSWORD || "change-me-now"));
}

export function publicCatalog() {
  const categories = db.prepare("SELECT * FROM categories WHERE is_visible=1 ORDER BY sort_order,id").all();
  const groups = db.prepare("SELECT * FROM term_groups ORDER BY sort_order,id").all();
  const terms = db.prepare("SELECT * FROM terms WHERE status='published' ORDER BY sort_order,id").all();
  return categories.map(category => ({ ...category, count: terms.filter(t => t.category_id === category.id).length, groups: groups.filter(g => g.category_id === category.id).map(group => ({ ...group, terms: terms.filter(t => t.group_id === group.id) })) }));
}

export { DB_PATH };
