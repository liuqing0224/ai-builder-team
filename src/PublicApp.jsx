import { useEffect,useMemo,useState } from "react";
import { Bookmark,Check,ChevronDown,Code2,ExternalLink,GitBranch,Heart,Library,Moon,Search,Sun,X } from "lucide-react";
import { api } from "./api.js";
import "./public-redesign.css";

function Demo({type}){
  if(type==="browser")return <div className="demo browser-demo"><div className="browser-bar">my-app.com</div><b>NIMBUS</b><small>产品　定价　登录</small><strong>把想法变成网站</strong><span>输入一句描述，生成你的第一个页面。</span><button>免费开始</button><div className="tech-row"><i>HTML 内容结构</i><i>CSS 视觉样式</i><i>JS 交互逻辑</i></div></div>;
  if(type==="component")return <div className="demo flow-demo"><div className="node primary">共享组件<br/><b>ProductCard</b></div><span>→</span><div className="node">首页<br/><code>&lt;ProductCard /&gt;</code></div><span>→</span><div className="node">搜索结果</div></div>;
  if(type==="state")return <div className="demo state-demo"><div className="fake-input">昵称<br/><b>小林</b><em>已保存</em></div><div><span>尚未提交</span> → <span>保存中…</span> → <b>✓ 已保存</b></div></div>;
  if(type==="markdown")return <div className="demo split-demo"><pre>SOURCE · 源码{"\n"}# 周末计划{"\n"}**周六爬山**</pre><span>→</span><div><small>RENDERED · 渲染后</small><b>周末计划</b><p>周六爬山，早点出发</p></div></div>;
  if(type==="html")return <div className="demo split-demo"><pre>&lt;html&gt;{"\n"}&lt;head&gt; 元信息{"\n"}&lt;body&gt;{"\n"}&lt;h1&gt; 标题</pre><span>→</span><div><b>小狸的主页</b><p>我喜欢爬山和拍照。</p><a>看我的相册 →</a></div></div>;
  if(type==="chart")return <div className="demo bars"><i/><i/><i/><i/><i/><i/></div>;
  if(type==="flow")return <div className="demo step-demo"><span>进入</span><i>→</i><span>选择</span><i>→</i><span>确认</span><i>→</i><b>完成</b></div>;
  if(type==="table")return <div className="demo table-demo"><b>名称</b><b>状态</b><b>更新时间</b><span>AI Builder</span><span>进行中</span><span>今天</span><span>灵感库</span><span>已完成</span><span>昨天</span></div>;
  return <div className="demo generic-demo"><div className="generic-icon"><Code2 size={22}/></div><div><b>{type.toUpperCase()}</b><span>清晰的结构 · 可验证的结果</span></div><Check size={18}/></div>;
}

function TermCard({term,saved,onSave,featured,index}){return <article className={featured?"card featured":"card"} tabIndex="0"><div className="term-index">{String(index+1).padStart(2,"0")}</div><div className="card-copy"><div className="card-title"><h3>{term.name_zh} {term.name_en&&<span>{term.name_en}</span>}</h3><button className={saved?"save active":"save"} onClick={onSave} aria-label={saved?"取消收藏":"收藏术语"}><Bookmark size={18} fill={saved?"currentColor":"none"}/></button></div><p className="quote">{term.description}</p></div>{featured&&<Demo type={term.visual_type}/>}</article>}

function LoadingState(){return <div className="public-loading" aria-label="正在加载术语库"><div className="loading-top"/><div className="loading-tabs"><i/><i/><i/><i/></div><div className="loading-body"><aside><i/><i/><i/></aside><main><i className="loading-title"/><div className="loading-grid"><i/><i/><i/></div></main></div></div>}

export function PublicApp(){
  const [categories,setCategories]=useState([]),[active,setActive]=useState(""),[query,setQuery]=useState(""),[dark,setDark]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const [saved,setSaved]=useState(()=>new Set(JSON.parse(localStorage.getItem("saved-terms")||"[]")));
  const [survey,setSurvey]=useState(()=>sessionStorage.getItem("survey-seen")!=="1");
  const load=()=>{setLoading(true);api("/api/catalog").then(data=>{setCategories(data.categories);setActive(current=>current||data.categories[0]?.slug||"");setError("")}).catch(e=>setError(e.message)).finally(()=>setLoading(false))};
  useEffect(load,[]);
  const category=categories.find(item=>item.slug===active)||categories[0];
  const groups=useMemo(()=>category?.groups.map(group=>({...group,terms:group.terms.filter(term=>`${term.name_zh} ${term.name_en} ${term.description}`.toLowerCase().includes(query.toLowerCase()))})).filter(group=>group.terms.length)||[],[category,query]);
  const toggleSaved=id=>setSaved(previous=>{const next=new Set(previous);next.has(id)?next.delete(id):next.add(id);localStorage.setItem("saved-terms",JSON.stringify([...next]));return next});
  const answerSurvey=source=>{sessionStorage.setItem("survey-seen","1");setSurvey(false);if(source)api("/api/survey",{method:"POST",body:JSON.stringify({source})}).catch(()=>{})};
  if(loading)return <LoadingState/>;
  if(error)return <div className="page-state error-state"><h1>暂时无法连接术语库</h1><p>{error}</p><button onClick={load}>重新连接</button></div>;
  return <div className={dark?"app public-app dark":"app public-app"}>
    <aside className="site-rail"><a className="brand" href="#top"><img src="/assets/ai-builder-team-logo.svg" alt=""/><b>AI Builder <span>TEAM</span></b></a><div className="rail-label">工具</div><div className="tool-current"><Library size={16}/><span>术语库</span><small>ACTIVE</small></div><div className="rail-label category-label">内容分类</div><nav className="catalog-tabs" aria-label="术语类别">{categories.map(item=><button key={item.id} className={category?.id===item.id?"active":""} onClick={()=>{setActive(item.slug);setQuery("")}}><span>{item.label}</span><small>{item.count}</small></button>)}</nav><button className="saved-link"><Heart size={15}/><span>我的收藏</span><small>{saved.size}</small></button><div className="rail-meta"><span>BUILD WITH AI<br/>SHIP WITH TASTE</span></div></aside>
    <div className="workspace"><nav className="topbar"><div className="mobile-brand"><img src="/assets/ai-builder-team-logo.svg" alt=""/><b>AI Builder Team</b></div><span className="official-label">OFFICIAL SITE / TOOLS / TERMINOLOGY</span><label className="search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索术语、界面或操作" aria-label="搜索术语"/>{query&&<button onClick={()=>setQuery("")} aria-label="清空搜索"><X size={14}/></button>}</label><button className="language">中文 <ChevronDown size={13}/></button><button className="theme" onClick={()=>setDark(!dark)} aria-label={dark?"切换到浅色模式":"切换到深色模式"}>{dark?<Sun size={17}/>:<Moon size={17}/>}</button></nav>
    <main id="top"><section className="catalog-intro"><div><p>AI Builder Team / 工具 / 术语库 / {category?.label}</p><h1>{query?`“${query}” 的搜索结果`:category?.title}</h1><span>{query?"在当前分类中匹配名称与释义。":"AI Builder Team 整理的中文 AI 构建术语工具。"}</span></div><dl><div><dt>条目</dt><dd>{groups.reduce((sum,group)=>sum+group.terms.length,0)}</dd></div><div><dt>分组</dt><dd>{groups.length}</dd></div></dl></section><div className="catalog-layout"><aside className="sidebar"><span>本页目录</span>{category?.groups.map((group,index)=><a href={`#group-${index}`} key={group.id}><i>{String(index+1).padStart(2,"0")}</i>{group.name}</a>)}</aside><div className="content">{groups.length?groups.map((group,index)=><section className="group" id={`group-${index}`} key={group.id}><header><div><span>{String(index+1).padStart(2,"0")}</span><h2>{group.name}</h2></div><span>{group.terms.length} 个条目</span></header><div className="grid">{group.terms.map((term,termIndex)=><TermCard key={term.id} term={term} index={termIndex} featured={termIndex===0} saved={saved.has(term.id)} onSave={()=>toggleSaved(term.id)}/>)}</div></section>):<div className="empty"><Search size={30}/><h2>没有找到相关术语</h2><p>换一个更短的关键词试试。</p><button onClick={()=>setQuery("")}>清空搜索</button></div>}</div></div></main>
    <footer><div><img src="/assets/ai-builder-team-logo.svg" alt=""/><b>AI Builder Team</b><span>为 AI 创作者构建实用工具。</span></div><nav><a><GitBranch size={16}/> GitHub</a><a><ExternalLink size={16}/> 团队介绍</a><a href="/admin">管理端</a></nav></footer></div>
    {survey&&<div className="overlay" role="dialog" aria-modal="true"><div className="survey"><button className="survey-close" onClick={()=>answerSurvey("")}><X size={18}/></button><span>一个小问题</span><h2>你是在哪里了解到 AI Builder Team 的？</h2><p>选择最接近的渠道即可。</p><div className="channels">{["哔哩哔哩","抖音","小红书","X","GitHub","视频号","其他"].map(source=><button key={source} onClick={()=>answerSurvey(source)}>{source}</button>)}</div><button className="skip" onClick={()=>answerSurvey("")}>暂不回答</button></div></div>}
  </div>
}
