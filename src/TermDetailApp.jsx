import { useEffect,useState } from "react";
import { ArrowLeft,BookOpen,Check,ChevronLeft,ChevronRight,Clipboard,Copy,Moon,Sun,Wrench } from "lucide-react";
import { api } from "./api.js";
import "./public-redesign.css";

function DetailLoading(){return <div className="term-detail-loading" aria-label="正在加载实施指南"><header/><main><i/><i/><i/><i/></main></div>}

export function TermDetailApp(){
  const id=location.pathname.split("/").filter(Boolean)[1];
  const [term,setTerm]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[copied,setCopied]=useState(false),[copyError,setCopyError]=useState(""),[dark,setDark]=useState(false);
  useEffect(()=>{let active=true;setLoading(true);api(`/api/terms/${id}`).then(data=>{if(!active)return;setTerm(data.term);setError("");document.title=`${data.term.name_zh} - AI Builder Team`}).catch(err=>{if(active)setError(err.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[id]);
  const copyTask=async()=>{try{await navigator.clipboard.writeText(term.details.codex_task);setCopyError("");setCopied(true);setTimeout(()=>setCopied(false),1800)}catch{setCopyError("复制失败，请手动选择任务内容")}};
  if(loading)return <DetailLoading/>;
  if(error||!term)return <div className="term-not-found"><BookOpen size={32}/><h1>没有找到这个术语</h1><p>{error||"它可能尚未发布或已经被移除。"}</p><a href="/">返回术语库</a></div>;
  const details=term.details||{};
  return <div className={dark?"app public-app term-detail-app dark":"app public-app term-detail-app"}>
    <header className="detail-topbar"><a className="detail-brand" href="/"><img src="/assets/ai-builder-team-logo.svg" alt=""/><b>AI Builder Team</b></a><a className="detail-back" href={`/?category=${term.category_slug}`}><ArrowLeft size={16}/>返回术语库</a><button className="theme" onClick={()=>setDark(!dark)} aria-label={dark?"切换到浅色模式":"切换到深色模式"}>{dark?<Sun size={17}/>:<Moon size={17}/>}</button></header>
    <main className="term-detail-main">
      <nav className="detail-breadcrumb" aria-label="面包屑"><a href="/">术语库</a><span>/</span><a href={`/?category=${term.category_slug}`}>{term.category_label}</a><span>/</span><span>{term.group_name}</span></nav>
      <section className="detail-hero"><div><span className="detail-category">{term.category_label} / {term.group_name}</span><h1>{term.name_zh}{term.name_en&&<small>{term.name_en}</small>}</h1><p>{term.description}</p></div><dl><div><dt>阅读重点</dt><dd>理解意义并完成实施</dd></div><div><dt>交付方式</dt><dd>可直接交给 Codex</dd></div></dl></section>
      <div className="detail-layout">
        <aside className="detail-index"><span>本页内容</span><a href="#definition">是什么</a><a href="#value">为什么重要</a><a href="#implementation">如何实施</a><a href="#tools">工具与组件库</a><a href="#codex-task">Codex 任务单</a></aside>
        <article className="detail-content">
          <section id="definition"><header><BookOpen size={20}/><h2>是什么</h2></header><p>{details.definition}</p></section>
          <section id="value"><header><Check size={20}/><h2>为什么重要</h2></header><p>{details.why_it_matters}</p></section>
          <section id="implementation"><header><Wrench size={20}/><h2>如何具体实施</h2></header><div className="implementation-list">{details.implementation_steps?.map(step=><div key={step}><Check size={17}/><p>{step}</p></div>)}</div></section>
          <section id="tools"><header><Wrench size={20}/><h2>推荐工具或组件库</h2></header><div className="tool-grid">{details.recommended_tools?.map((item,index)=><article key={`${item.name}-${index}`}><span>{index===0?"主推荐":"适用替代"}</span><h3>{item.name}</h3><p>{item.role}</p><dl><dt>适合场景</dt><dd>{item.use_when}</dd></dl></article>)}</div></section>
          <section id="codex-task" className="codex-section"><header><Clipboard size={20}/><h2>交给 Codex 的任务单</h2><button onClick={copyTask}>{copied?<Check size={16}/>:<Copy size={16}/>} {copied?"已复制":"复制任务单"}</button></header>{copyError&&<p className="copy-error" role="status">{copyError}</p>}<pre>{details.codex_task}</pre></section>
        </article>
      </div>
      <nav className="term-pagination" aria-label="相邻术语">{term.previous?<a href={`/terms/${term.previous.id}`}><ChevronLeft size={18}/><span><small>上一篇</small>{term.previous.name_zh}</span></a>:<span/>}{term.next?<a href={`/terms/${term.next.id}`}><span><small>下一篇</small>{term.next.name_zh}</span><ChevronRight size={18}/></a>:<span/>}</nav>
    </main>
  </div>
}
