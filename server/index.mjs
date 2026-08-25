import express from "express";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { db, DB_PATH, publicCatalog, verifyPassword } from "./db.mjs";

const app = express();
const PORT = Number(process.env.PORT || 3001);
app.disable("x-powered-by");
app.use(express.json({ limit: "200kb" }));

const cookie = req => Object.fromEntries((req.headers.cookie || "").split(";").filter(Boolean).map(part => part.trim().split(/=(.*)/s).slice(0,2).map(decodeURIComponent)));
const sessionFor = req => {
  const token = cookie(req).vh_session;
  if (!token) return null;
  return db.prepare("SELECT admins.id,admins.username FROM sessions JOIN admins ON admins.id=sessions.admin_id WHERE token=? AND expires_at>CURRENT_TIMESTAMP").get(token);
};
const requireAdmin = (req,res,next) => { const admin = sessionFor(req); if (!admin) return res.status(401).json({ error:"请先登录" }); req.admin=admin; next(); };
const clean = value => typeof value === "string" ? value.trim() : value;
const required = (body, fields) => fields.every(field => clean(body[field]));

app.get("/api/health", (_req,res) => res.json({ ok:true, database:DB_PATH }));
app.get("/api/catalog", (_req,res) => res.json({ categories:publicCatalog() }));
app.post("/api/survey", (req,res) => { if (!clean(req.body.source)) return res.status(400).json({ error:"缺少渠道" }); db.prepare("INSERT INTO survey_responses (source) VALUES (?)").run(clean(req.body.source).slice(0,50)); res.status(201).json({ ok:true }); });

app.post("/api/admin/login", (req,res) => {
  const admin = db.prepare("SELECT * FROM admins WHERE username=?").get(clean(req.body.username));
  if (!admin || !verifyPassword(String(req.body.password || ""), admin.password_hash)) return res.status(401).json({ error:"用户名或密码错误" });
  const token = randomBytes(32).toString("hex");
  db.prepare("DELETE FROM sessions WHERE expires_at<=CURRENT_TIMESTAMP").run();
  db.prepare("INSERT INTO sessions (token,admin_id,expires_at) VALUES (?,?,datetime('now','+7 days'))").run(token, admin.id);
  res.setHeader("Set-Cookie", `vh_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  res.json({ user:{ id:admin.id, username:admin.username } });
});
app.post("/api/admin/logout", (req,res) => { const token=cookie(req).vh_session; if(token) db.prepare("DELETE FROM sessions WHERE token=?").run(token); res.setHeader("Set-Cookie","vh_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"); res.json({ok:true}); });
app.get("/api/admin/me", requireAdmin, (req,res) => res.json({ user:req.admin }));
app.get("/api/admin/dashboard", requireAdmin, (_req,res) => res.json({
  stats:{ categories:db.prepare("SELECT COUNT(*) count FROM categories").get().count, groups:db.prepare("SELECT COUNT(*) count FROM term_groups").get().count, terms:db.prepare("SELECT COUNT(*) count FROM terms").get().count, drafts:db.prepare("SELECT COUNT(*) count FROM terms WHERE status='draft'").get().count, surveyResponses:db.prepare("SELECT COUNT(*) count FROM survey_responses").get().count },
  sources:db.prepare("SELECT source,COUNT(*) count FROM survey_responses GROUP BY source ORDER BY count DESC").all(),
  recent:db.prepare("SELECT terms.id,terms.name_zh,terms.status,terms.updated_at,categories.label category FROM terms JOIN categories ON categories.id=terms.category_id ORDER BY terms.updated_at DESC LIMIT 8").all()
}));

app.get("/api/admin/categories", requireAdmin, (_req,res) => res.json({ categories:db.prepare("SELECT categories.*,COUNT(terms.id) term_count FROM categories LEFT JOIN terms ON terms.category_id=categories.id GROUP BY categories.id ORDER BY categories.sort_order,categories.id").all() }));
app.post("/api/admin/categories", requireAdmin, (req,res) => { if(!required(req.body,["slug","label","title"])) return res.status(400).json({error:"请填写完整"}); try{const result=db.prepare("INSERT INTO categories (slug,label,title,sort_order,is_visible) VALUES (?,?,?,?,?)").run(clean(req.body.slug),clean(req.body.label),clean(req.body.title),Number(req.body.sort_order)||0,req.body.is_visible===false?0:1);res.status(201).json({id:Number(result.lastInsertRowid)});}catch(e){res.status(409).json({error:"分类标识已存在"});} });
app.put("/api/admin/categories/:id", requireAdmin, (req,res) => { if(!required(req.body,["slug","label","title"])) return res.status(400).json({error:"请填写完整"}); db.prepare("UPDATE categories SET slug=?,label=?,title=?,sort_order=?,is_visible=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(clean(req.body.slug),clean(req.body.label),clean(req.body.title),Number(req.body.sort_order)||0,req.body.is_visible===false?0:1,req.params.id);res.json({ok:true}); });
app.delete("/api/admin/categories/:id", requireAdmin, (req,res) => { db.prepare("DELETE FROM categories WHERE id=?").run(req.params.id);res.json({ok:true}); });

app.get("/api/admin/groups", requireAdmin, (req,res) => { const rows=req.query.category_id?db.prepare("SELECT * FROM term_groups WHERE category_id=? ORDER BY sort_order,id").all(req.query.category_id):db.prepare("SELECT * FROM term_groups ORDER BY category_id,sort_order,id").all();res.json({groups:rows}); });
app.post("/api/admin/groups", requireAdmin, (req,res) => { if(!required(req.body,["category_id","name"])) return res.status(400).json({error:"请填写完整"});const result=db.prepare("INSERT INTO term_groups (category_id,name,sort_order) VALUES (?,?,?)").run(req.body.category_id,clean(req.body.name),Number(req.body.sort_order)||0);res.status(201).json({id:Number(result.lastInsertRowid)}); });
app.put("/api/admin/groups/:id", requireAdmin, (req,res) => { db.prepare("UPDATE term_groups SET category_id=?,name=?,sort_order=? WHERE id=?").run(req.body.category_id,clean(req.body.name),Number(req.body.sort_order)||0,req.params.id);res.json({ok:true}); });
app.delete("/api/admin/groups/:id", requireAdmin, (req,res) => { db.prepare("DELETE FROM term_groups WHERE id=?").run(req.params.id);res.json({ok:true}); });

app.get("/api/admin/terms", requireAdmin, (req,res) => { const q=`%${clean(req.query.q || "")}%`; const category=req.query.category_id || null; const rows=db.prepare("SELECT terms.*,categories.label category,term_groups.name group_name FROM terms JOIN categories ON categories.id=terms.category_id JOIN term_groups ON term_groups.id=terms.group_id WHERE (? IS NULL OR terms.category_id=?) AND (terms.name_zh LIKE ? OR terms.name_en LIKE ? OR terms.description LIKE ?) ORDER BY terms.updated_at DESC,terms.id DESC").all(category,category,q,q,q);res.json({terms:rows}); });
app.post("/api/admin/terms", requireAdmin, (req,res) => { if(!required(req.body,["category_id","group_id","name_zh","description"])) return res.status(400).json({error:"请填写完整"});const result=db.prepare("INSERT INTO terms (category_id,group_id,name_zh,name_en,description,visual_type,status,sort_order) VALUES (?,?,?,?,?,?,?,?)").run(req.body.category_id,req.body.group_id,clean(req.body.name_zh),clean(req.body.name_en||""),clean(req.body.description),clean(req.body.visual_type||"generic"),req.body.status==="draft"?"draft":"published",Number(req.body.sort_order)||0);res.status(201).json({id:Number(result.lastInsertRowid)}); });
app.put("/api/admin/terms/:id", requireAdmin, (req,res) => { if(!required(req.body,["category_id","group_id","name_zh","description"])) return res.status(400).json({error:"请填写完整"});db.prepare("UPDATE terms SET category_id=?,group_id=?,name_zh=?,name_en=?,description=?,visual_type=?,status=?,sort_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(req.body.category_id,req.body.group_id,clean(req.body.name_zh),clean(req.body.name_en||""),clean(req.body.description),clean(req.body.visual_type||"generic"),req.body.status==="draft"?"draft":"published",Number(req.body.sort_order)||0,req.params.id);res.json({ok:true}); });
app.delete("/api/admin/terms/:id", requireAdmin, (req,res) => { db.prepare("DELETE FROM terms WHERE id=?").run(req.params.id);res.json({ok:true}); });

const clientDir=resolve("dist/client");
if(existsSync(clientDir)){app.use(express.static(clientDir));app.use((req,res,next)=>req.method==="GET"&&!req.path.startsWith("/api/")?res.sendFile(resolve(clientDir,"index.html")):next());}
app.use((error,_req,res,_next)=>{console.error(error);res.status(500).json({error:"服务器内部错误"});});
app.listen(PORT,()=>console.log(`AI Builder Team API running at http://localhost:${PORT}`));
