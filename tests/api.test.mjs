import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const waitFor = async url => {
  for (let attempt=0;attempt<40;attempt++) {
    try { const response=await fetch(url); if(response.ok)return; } catch {}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error("API did not start");
};

test("catalog and authenticated CRUD work end to end", async t => {
  const directory=await mkdtemp(join(tmpdir(),"vibehub-api-"));
  const port=3199;
  const server=spawn(process.execPath,["server/index.mjs"],{cwd:process.cwd(),env:{...process.env,PORT:String(port),DATABASE_PATH:join(directory,"test.db"),ADMIN_PASSWORD:"test-password"},stdio:"ignore"});
  t.after(async()=>{server.kill("SIGTERM");await rm(directory,{recursive:true,force:true})});
  await waitFor(`http://127.0.0.1:${port}/api/health`);
  const catalog=await fetch(`http://127.0.0.1:${port}/api/catalog`).then(r=>r.json());
  assert.equal(catalog.categories.length,7);
  const login=await fetch(`http://127.0.0.1:${port}/api/admin/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:"admin",password:"test-password"})});
  assert.equal(login.status,200);
  const session=login.headers.get("set-cookie").split(";")[0];
  const headers={"Content-Type":"application/json",Cookie:session};
  const categoryId=catalog.categories[0].id;
  const groupId=catalog.categories[0].groups[0].id;
  const created=await fetch(`http://127.0.0.1:${port}/api/admin/terms`,{method:"POST",headers,body:JSON.stringify({category_id:categoryId,group_id:groupId,name_zh:"测试术语",name_en:"Test",description:"API 自动化测试",status:"draft"})});
  assert.equal(created.status,201);
  const {id}=await created.json();
  const updated=await fetch(`http://127.0.0.1:${port}/api/admin/terms/${id}`,{method:"PUT",headers,body:JSON.stringify({category_id:categoryId,group_id:groupId,name_zh:"测试术语",name_en:"Test",description:"已发布",status:"published"})});
  assert.equal(updated.status,200);
  const published=await fetch(`http://127.0.0.1:${port}/api/catalog`).then(r=>r.json());
  assert.ok(published.categories[0].groups[0].terms.some(term=>term.id===id&&term.description==="已发布"));
  const removed=await fetch(`http://127.0.0.1:${port}/api/admin/terms/${id}`,{method:"DELETE",headers});
  assert.equal(removed.status,200);
});
