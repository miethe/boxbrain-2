/* Storyboard Workspace V2 — uplifted with:
   - Left sidebar ContentUnit adder (draggable chips)
   - Draggable sections (with drag handles)
   - Insert Section buttons between sections
   - Right sidebar: selected-slide panel (Details/Notes/Metadata/Activity/AI tabs)
*/

function Sw2DragHandle({active}) {
  return (
    <span style={{width:14,height:28,display:"grid",placeItems:"center",cursor:"grab",color:active?"var(--primary)":"var(--ink-4)",flexShrink:0,borderRadius:4,background:active?"var(--primary-bg)":"transparent"}}>
      <Ico.Drag size={12}/>
    </span>
  );
}

function Sw2InsertSection({onClick}) {
  const [hover, setHover] = React.useState(false);
  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={onClick}
      style={{height:hover?32:14,transition:"height .15s",cursor:"pointer",display:"flex",alignItems:"center",gap:8,margin:"0 2px"}}>
      <div style={{flex:1,height:hover?2:1,background:hover?"var(--primary)":"var(--line-soft)",borderRadius:1,transition:"all .15s"}}/>
      <span style={{fontSize:11,fontWeight:600,color:hover?"var(--primary)":"var(--ink-4)",display:"flex",alignItems:"center",gap:4,opacity:hover?1:0,transition:"opacity .15s",whiteSpace:"nowrap"}}>
        <Ico.Plus size={12}/> Insert Section
      </span>
      <div style={{flex:1,height:hover?2:1,background:hover?"var(--primary)":"var(--line-soft)",borderRadius:1,transition:"all .15s"}}/>
    </div>
  );
}

function Sw2LibraryChip({title, kind, match, variant, dragMe=true}) {
  const iconMap = {Slide:Ico.Deck, Chart:Ico.Chart, Video:Ico.Preview, Diagram:Ico.Cube, Testimonial:Ico.Message, Document:Ico.FileText};
  const I = iconMap[kind] || Ico.File;
  return (
    <div className="card" style={{padding:6,cursor:dragMe?"grab":"pointer",border:"1px solid var(--line)"}}>
      <div className="flex items-center gap-1" style={{fontSize:10,color:"var(--ink-2)",fontWeight:600,marginBottom:3}}>
        <I size={10} color="var(--primary)"/>
        <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title}</span>
        {dragMe && <Ico.Drag size={9} color="var(--ink-4)"/>}
      </div>
      <div style={{borderRadius:3,overflow:"hidden"}}>
        <SlideThumb variant={variant||"light"} title={title}/>
      </div>
      <div className="flex items-center justify-between" style={{marginTop:3,fontSize:9}}>
        <span className="muted">{kind}</span>
        {match && <span style={{color:"var(--ok)",fontWeight:600}}>{match}</span>}
      </div>
    </div>
  );
}

function RouteStoryboardWorkspaceV2({go}) {
  const [libraryOpen, setLibraryOpen] = React.useState(true);
  const [selectedSlide, setSelectedSlide] = React.useState({secId:"s3", rowIdx:0});
  const [rightTab, setRightTab] = React.useState("details");
  const [libTab, setLibTab] = React.useState("recommended");
  const [libSearch, setLibSearch] = React.useState("");
  const [draggingSec, setDraggingSec] = React.useState(null);
  const [sectionOrder, setSectionOrder] = React.useState(["s1","s2","s3","s4","s5","s6"]);

  const sections = {
    s1: {id:"s1", title:"Market Context", desc:"Set the stage with market dynamics and customer challenges.", units:3, estMin:5,
      rows:[
        {t:"Market Landscape",k:"Chart",score:92,c:"light"},
        {t:"Customer Challenges",k:"Slide",score:94,c:"dark"},
        {t:"Trends & Drivers",k:"Slide",score:null,c:"light"},
      ], matching:5 },
    s2: {id:"s2", title:"Business Impact", desc:"Quantify the impact of inaction and the cost of delay.", units:4, estMin:6,
      rows:[
        {t:"Financial Impact",k:"Slide",score:90,c:"light"},
        {t:"Industry Benchmarks",k:"Chart",score:88,c:"light"},
        {t:"Cost of Inaction",k:"Slide",score:92,c:"light"},
        {t:"Impact Summary",k:"Slide",score:85,c:"dark"},
      ], matching:3 },
    s3: {id:"s3", title:"Our Solution", desc:"Introduce our solution and key differentiators.", units:5, estMin:8, highlight:true,
      rows:[
        {t:"Solution Overview",k:"Slide",score:90,c:"light"},
        {t:"Key Capabilities",k:"Slide",score:97,c:"light"},
        {t:"Platform Demo",k:"Video",score:null,c:"dark"},
        {t:"Differentiators",k:"Slide",score:92,c:"light"},
        {t:"Architecture",k:"Diagram",score:87,c:"light"},
      ], matching:7 },
    s4: {id:"s4", title:"Proof & Trust", desc:"Build confidence with proof points and validation.", units:4, estMin:6,
      rows:[
        {t:"Customer Success",k:"Testimonial",score:90,c:"dark"},
        {t:"ROI Summary",k:"Slide",score:92,c:"light"},
        {t:"Security & Compliance",k:"Slide",score:88,c:"light"},
      ], matching:2 },
    s5: {id:"s5", title:"Next Steps", desc:"Guide the buyer to the next engagement step.", units:3, estMin:4,
      rows:[
        {t:"Executive Next Steps",k:"Slide",score:92,c:"dark"},
      ], matching:4 },
    s6: {id:"s6", title:"Appendix", desc:"Additional resources and technical details.", units:2, estMin:0, appendix:true,
      rows:[
        {t:"Technical Deep Dive",k:"Slide",score:null,c:"dark"},
        {t:"Pricing Overview",k:"Slide",score:null,c:"light"},
      ], matching:3 },
  };

  const currentSlide = selectedSlide ? sections[selectedSlide.secId].rows[selectedSlide.rowIdx] : null;

  const libraryContent = {
    recommended: [
      {t:"Executive Summary", k:"Slide", match:"96%", c:"light"},
      {t:"ROI Calculator", k:"Chart", match:"94%", c:"light"},
      {t:"Customer Success — Acme", k:"Testimonial", match:"92%", c:"dark"},
      {t:"Platform Architecture", k:"Diagram", match:"90%", c:"light"},
      {t:"Pricing Tiers", k:"Slide", match:"88%", c:"light"},
      {t:"Security Posture", k:"Slide", match:"85%", c:"dark"},
    ],
    recent: [
      {t:"Q1 Review", k:"Slide", match:"", c:"dark"},
      {t:"Market Sizing", k:"Chart", match:"", c:"light"},
      {t:"Competitive Matrix", k:"Slide", match:"", c:"light"},
      {t:"Integration Demo", k:"Video", match:"", c:"dark"},
    ],
    collections: [
      {t:"Customer Logos", k:"Slide", match:"", c:"light"},
      {t:"Brand Template", k:"Slide", match:"", c:"dark"},
      {t:"Financial Charts", k:"Chart", match:"", c:"light"},
      {t:"Case Studies", k:"Testimonial", match:"", c:"dark"},
    ],
  };

  const onSectionDragStart = (id) => setDraggingSec(id);
  const onSectionDragOver = (e, overId) => {
    e.preventDefault();
    if (!draggingSec || draggingSec===overId) return;
    setSectionOrder(o => {
      const from = o.indexOf(draggingSec), to = o.indexOf(overId);
      if (from<0||to<0) return o;
      const next = [...o]; next.splice(from,1); next.splice(to,0,draggingSec);
      return next;
    });
  };
  const onSectionDragEnd = () => setDraggingSec(null);

  return (
    <div className="route-wrap">
      <Topbar crumbs={["WorkSpace","WorkProducts","Q2 Sales Enablement Deck","Storyboard Workspace"]}/>
      <div className="route-body" style={{paddingTop:12}}>

        {/* Title bar */}
        <div className="flex items-start justify-between" style={{marginBottom:12}}>
          <div>
            <div className="flex items-center gap-2">
              <h1 style={{fontSize:20,margin:0,letterSpacing:"-0.015em"}}>Q2 Sales Enablement Deck · Storyboard</h1>
              <span style={{fontSize:11,background:"var(--bg-2)",color:"var(--ink-3)",padding:"2px 7px",borderRadius:4,fontFamily:"var(--mono)",fontWeight:500}}>v3.2</span>
              <span className="badge info" style={{background:"var(--ai-bg)",color:"var(--ai)",borderColor:"var(--ai-border)",fontWeight:600}}><Ico.Eye size={11}/> Editing</span>
            </div>
            <div className="flex items-center gap-3 mt-1" style={{fontSize:11,color:"var(--ink-3)"}}>
              <span><Ico.Refresh size={10}/> Auto-saved 2m ago</span>
              <span>·</span>
              <span>6 sections · 22 units · 19 min</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="avatar-stack">
              <Avatar who="Sarah Chen" className="sm"/>
              <Avatar who="Michael Torres" className="sm"/>
              <Avatar who="Emily Davis" className="sm"/>
              <span className="more">+3</span>
            </div>
            <button className="btn btn-sm"><Ico.Compare size={13}/> Compare to v3.1</button>
            <button className="btn btn-sm"><Ico.Save size={13}/> Save Version</button>
            <button className="btn btn-primary btn-sm" onClick={()=>go("wpPublishPackage")}><Ico.Rocket size={13}/> Publish</button>
          </div>
        </div>

        {/* Three-panel layout: Library | Canvas | Inspector */}
        <div style={{display:"grid",gridTemplateColumns:`${libraryOpen?"260px":"44px"} 1fr ${selectedSlide?"320px":"0"}`,gap:12,alignItems:"start",transition:"grid-template-columns .2s"}}>

          {/* ============= LEFT: CONTENT LIBRARY ============= */}
          {libraryOpen ? (
            <aside className="card" style={{padding:0,position:"sticky",top:16,maxHeight:"calc(100vh - 40px)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <div className="flex items-center justify-between" style={{padding:"10px 12px",borderBottom:"1px solid var(--line)"}}>
                <div className="flex items-center gap-2">
                  <Ico.Library size={14} color="var(--primary)"/>
                  <b style={{fontSize:13}}>Content Library</b>
                </div>
                <button className="icon-btn borderless" style={{width:22,height:22}} onClick={()=>setLibraryOpen(false)} title="Collapse"><Ico.Left size={12}/></button>
              </div>

              {/* Search */}
              <div style={{padding:"8px 10px",borderBottom:"1px solid var(--line-soft)"}}>
                <div className="flex items-center gap-1" style={{padding:"5px 8px",background:"var(--bg)",border:"1px solid var(--line)",borderRadius:5}}>
                  <Ico.Search size={12} color="var(--ink-3)"/>
                  <input value={libSearch} onChange={e=>setLibSearch(e.target.value)} placeholder="Search content units…" style={{flex:1,border:0,outline:0,background:"transparent",fontSize:11.5}}/>
                  <span className="kbd" style={{fontSize:9}}>/</span>
                </div>
              </div>

              {/* Tabs */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",borderBottom:"1px solid var(--line-soft)",fontSize:11}}>
                {[
                  {k:"recommended",l:"Recommended",c:6},
                  {k:"recent",l:"Recent",c:4},
                  {k:"collections",l:"Library",c:128},
                ].map(t=>(
                  <div key={t.k} onClick={()=>setLibTab(t.k)} style={{padding:"7px 4px",textAlign:"center",cursor:"pointer",borderBottom:`2px solid ${libTab===t.k?"var(--primary)":"transparent"}`,color:libTab===t.k?"var(--primary)":"var(--ink-3)",fontWeight:libTab===t.k?600:500}}>
                    {t.l} <span style={{opacity:0.7,fontSize:10}}>{t.c}</span>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div style={{padding:"8px 10px",borderBottom:"1px solid var(--line-soft)"}}>
                <div className="flex items-center gap-1" style={{flexWrap:"wrap"}}>
                  <span className="chip active" style={{fontSize:10,padding:"2px 7px"}}>All</span>
                  <span className="chip" style={{fontSize:10,padding:"2px 7px"}}>Slides</span>
                  <span className="chip" style={{fontSize:10,padding:"2px 7px"}}>Charts</span>
                  <span className="chip" style={{fontSize:10,padding:"2px 7px"}}>+3</span>
                </div>
              </div>

              {/* AI Context hint */}
              {libTab==="recommended" && (
                <div style={{padding:"8px 10px",borderBottom:"1px solid var(--line-soft)",background:"var(--ai-bg)"}}>
                  <div className="flex items-start gap-2">
                    <Ico.Sparkle size={12} color="var(--ai)" style={{marginTop:2,flexShrink:0}}/>
                    <div style={{fontSize:10.5,lineHeight:1.35,color:"var(--ink-2)"}}>
                      Matched to <b>Our Solution</b> · CIO audience · Acme Corp.
                      <a className="link" style={{fontSize:10,display:"block",marginTop:2}}>Adjust context →</a>
                    </div>
                  </div>
                </div>
              )}

              {/* Chip grid — scrollable */}
              <div style={{flex:1,overflowY:"auto",padding:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,alignContent:"start"}}>
                {libraryContent[libTab].map((u,i)=>(
                  <Sw2LibraryChip key={i} title={u.t} kind={u.k} match={u.match} variant={u.c}/>
                ))}
                {libTab==="recommended" && (
                  <div style={{gridColumn:"1/-1",padding:"8px 4px",textAlign:"center"}}>
                    <a className="link" style={{fontSize:10.5}}>Load more recommendations</a>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{padding:"8px 10px",borderTop:"1px solid var(--line)",background:"var(--bg)"}}>
                <div className="muted" style={{fontSize:10,marginBottom:4}}>Drag to canvas, or</div>
                <div className="flex items-center gap-1">
                  <button className="btn btn-xs" style={{flex:1,justifyContent:"center"}}><Ico.Plus size={10}/> New Unit</button>
                  <button className="btn btn-xs" style={{flex:1,justifyContent:"center",background:"var(--ai)",color:"#fff",borderColor:"var(--ai)"}}><Ico.Sparkle size={10}/> AI Generate</button>
                </div>
              </div>
            </aside>
          ) : (
            <aside style={{position:"sticky",top:16}}>
              <button onClick={()=>setLibraryOpen(true)} className="card" style={{padding:"10px 6px",display:"flex",flexDirection:"column",alignItems:"center",gap:8,width:44,cursor:"pointer",border:"1px solid var(--line)"}}>
                <Ico.Library size={16} color="var(--primary)"/>
                <div style={{writingMode:"vertical-rl",transform:"rotate(180deg)",fontSize:11,fontWeight:600,color:"var(--ink-2)",letterSpacing:"0.02em"}}>Library</div>
                <Ico.Right size={11} color="var(--ink-3)"/>
              </button>
            </aside>
          )}

          {/* ============= CENTER: CANVAS ============= */}
          <div style={{minWidth:0}}>
            {/* Toolbar */}
            <div className="card" style={{padding:"8px 12px",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
              <b style={{fontSize:13}}>Storyboard</b>
              <span className="muted" style={{fontSize:11}}>{sectionOrder.length} sections</span>
              <span style={{flex:1}}/>
              <button className="btn btn-xs"><Ico.Drag size={11}/> Reorder</button>
              <button className="btn btn-xs"><Ico.Chart size={11}/> Metrics</button>
              <button className="btn btn-xs"><Ico.Filter size={11}/> Filters</button>
              <button className="btn btn-xs" style={{background:"var(--ai)",color:"#fff",borderColor:"var(--ai)"}}><Ico.Sparkle size={11}/> AI Rebalance</button>
              <div style={{width:1,height:18,background:"var(--line)",margin:"0 4px"}}/>
              <label className="flex items-center gap-1" style={{fontSize:11,color:"var(--ink-3)",cursor:"pointer"}}>
                <input type="checkbox" defaultChecked/> Track changes
              </label>
            </div>

            {/* Sections with drag + insert */}
            <div style={{display:"flex",flexDirection:"column"}}>
              <Sw2InsertSection/>
              {sectionOrder.map((sid, si)=>{
                const sec = sections[sid];
                const isDragging = draggingSec===sid;
                const highlighted = sec.highlight;
                return (
                  <React.Fragment key={sid}>
                    <div
                      draggable
                      onDragStart={()=>onSectionDragStart(sid)}
                      onDragOver={(e)=>onSectionDragOver(e, sid)}
                      onDragEnd={onSectionDragEnd}
                      className="card"
                      style={{
                        padding:0,
                        overflow:"visible",
                        borderColor:highlighted?"var(--primary-border)":"var(--line)",
                        opacity:isDragging?0.5:1,
                        boxShadow:isDragging?"0 8px 24px rgba(0,0,0,0.12)":"none",
                        transform:isDragging?"scale(0.995)":"none",
                        transition:"transform .1s, box-shadow .1s"
                      }}>
                      <div style={{display:"grid",gridTemplateColumns:"14px 220px 1fr 120px",gap:10,padding:"10px 12px",alignItems:"flex-start"}}>
                        {/* Drag handle */}
                        <Sw2DragHandle active={isDragging}/>

                        {/* Section meta */}
                        <div style={{paddingRight:8,borderRight:"1px solid var(--line-soft)"}}>
                          <div className="flex items-center gap-2" style={{marginBottom:4}}>
                            <span style={{width:22,height:22,background:sec.appendix?"var(--bg-2)":"var(--primary)",color:sec.appendix?"var(--ink-3)":"#fff",borderRadius:4,display:"grid",placeItems:"center",fontSize:11,fontWeight:700}}>{si+1}</span>
                            <b style={{fontSize:13}}>{sec.title}</b>
                            <button className="icon-btn borderless" style={{width:20,height:20,marginLeft:"auto"}}><Ico.Edit size={10}/></button>
                          </div>
                          <div className="muted" style={{fontSize:11,lineHeight:1.4}}>{sec.desc}</div>
                          <div className="flex items-center gap-3 mt-2" style={{fontSize:10,color:"var(--ink-3)"}}>
                            <span><b style={{color:"var(--ink-2)",fontWeight:600}}>{sec.units}</b> units</span>
                            {sec.estMin>0 && <span><b style={{color:"var(--ink-2)",fontWeight:600}}>{sec.estMin}</b> min</span>}
                          </div>
                        </div>

                        {/* Content unit chips */}
                        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignContent:"flex-start"}}>
                          {sec.rows.map((r,i)=>{
                            const isSel = selectedSlide && selectedSlide.secId===sid && selectedSlide.rowIdx===i;
                            return (
                              <div key={i} onClick={()=>setSelectedSlide({secId:sid,rowIdx:i})} style={{position:"relative",width:148,cursor:"pointer"}}>
                                <div className="card" style={{padding:7,border:`${isSel?"2px":"1px"} solid ${isSel?"var(--primary)":"var(--line)"}`,boxShadow:isSel?"0 0 0 3px color-mix(in oklab, var(--primary) 14%, transparent)":"none",transition:"all .12s"}}>
                                  <div className="flex items-center gap-1" style={{marginBottom:4,fontSize:10,color:"var(--ink-2)",fontWeight:600}}>
                                    <Ico.Drag size={9} color="var(--ink-4)"/>
                                    {r.k==="Chart" && <Ico.Chart size={10} color="var(--primary)"/>}
                                    {r.k==="Slide" && <Ico.Deck size={10} color="var(--primary)"/>}
                                    {r.k==="Video" && <Ico.Preview size={10} color="var(--ai)"/>}
                                    {r.k==="Diagram" && <Ico.Cube size={10} color="var(--primary)"/>}
                                    {r.k==="Testimonial" && <Ico.Message size={10} color="var(--ai)"/>}
                                    {r.k==="Document" && <Ico.FileText size={10} color="var(--primary)"/>}
                                    <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.t}</span>
                                  </div>
                                  <div style={{borderRadius:3,overflow:"hidden"}}>
                                    <SlideThumb variant={r.c} title={r.t}/>
                                  </div>
                                  <div className="flex items-center justify-between" style={{marginTop:4,fontSize:9}}>
                                    <span className="muted">{r.k}</span>
                                    {r.score && <span style={{color:r.score>=90?"var(--ok)":r.score>=80?"var(--primary)":"var(--warn)",fontWeight:600}}>{r.score}%</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {/* Drop zone */}
                          <div style={{width:118,border:"1.5px dashed var(--line-2)",borderRadius:6,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontSize:10.5,color:"var(--ink-3)",cursor:"pointer",background:"var(--bg)",minHeight:96,gap:3}}>
                            <Ico.Plus size={14}/>
                            <span>Add content unit</span>
                            <span style={{fontSize:9,color:"var(--ink-4)"}}>or drop from library</span>
                          </div>
                        </div>

                        {/* Matching work products */}
                        <div style={{paddingLeft:10,borderLeft:"1px solid var(--line-soft)",fontSize:10}}>
                          <div className="muted" style={{marginBottom:4,fontSize:10,fontWeight:500}}>Used in</div>
                          <div className="flex items-center gap-1">
                            <span style={{background:"var(--bg-2)",padding:"2px 6px",borderRadius:4,fontWeight:600,color:"var(--ink-2)",display:"inline-flex",alignItems:"center",gap:3}}><Ico.FileText size={9}/> {sec.matching}</span>
                            <Ico.Down size={11} color="var(--ink-4)"/>
                          </div>
                          <div className="muted" style={{marginTop:8,fontSize:9,fontWeight:600,letterSpacing:"0.04em",textTransform:"uppercase"}}>Health</div>
                          <div className="flex items-center gap-1 mt-1">
                            <div style={{flex:1,height:3,background:"var(--bg-2)",borderRadius:2,overflow:"hidden"}}>
                              <div style={{width:"82%",height:"100%",background:"var(--ok)"}}/>
                            </div>
                            <span style={{fontWeight:600,color:"var(--ok)"}}>82</span>
                          </div>
                          <button className="icon-btn borderless" style={{width:22,height:22,marginTop:6}}><Ico.More size={11}/></button>
                        </div>
                      </div>
                    </div>
                    <Sw2InsertSection/>
                  </React.Fragment>
                );
              })}

              {/* Add section at end */}
              <div style={{border:"1.5px dashed var(--line-2)",borderRadius:8,padding:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:12,color:"var(--ink-3)",cursor:"pointer",marginTop:6}}>
                <Ico.Plus size={13}/> Add section
                <span style={{width:1,height:14,background:"var(--line-2)",margin:"0 4px"}}/>
                <Ico.Sparkle size={13} color="var(--ai)"/> <span style={{color:"var(--ai)"}}>AI Suggest</span>
              </div>
            </div>
          </div>

          {/* ============= RIGHT: SELECTED SLIDE INSPECTOR ============= */}
          {selectedSlide && currentSlide && (
            <aside className="card" style={{padding:0,position:"sticky",top:16,maxHeight:"calc(100vh - 40px)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
              {/* Header */}
              <div style={{padding:"10px 12px",borderBottom:"1px solid var(--line)"}}>
                <div className="flex items-center justify-between" style={{marginBottom:6}}>
                  <div className="flex items-center gap-2" style={{flex:1,minWidth:0}}>
                    <Ico.Deck size={14} color="var(--primary)"/>
                    <b style={{fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentSlide.t}</b>
                  </div>
                  <button className="icon-btn borderless" style={{width:22,height:22}} onClick={()=>setSelectedSlide(null)}><Ico.X size={13}/></button>
                </div>
                <div className="flex items-center gap-2" style={{fontSize:10.5,color:"var(--ink-3)"}}>
                  <span>{sections[selectedSlide.secId].title}</span>
                  <span>·</span>
                  <span>{currentSlide.k}</span>
                  {currentSlide.score && <>
                    <span>·</span>
                    <span style={{color:currentSlide.score>=90?"var(--ok)":"var(--primary)",fontWeight:600}}>{currentSlide.score}% match</span>
                  </>}
                </div>
              </div>

              {/* Large preview */}
              <div style={{padding:12,borderBottom:"1px solid var(--line-soft)"}}>
                <div style={{borderRadius:6,overflow:"hidden",border:"1px solid var(--line)"}}>
                  <SlideThumb variant={currentSlide.c} title={currentSlide.t}/>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <button className="btn btn-xs" style={{flex:1,justifyContent:"center"}}><Ico.Edit size={10}/> Edit</button>
                  <button className="btn btn-xs" style={{flex:1,justifyContent:"center"}}><Ico.Regenerate size={10}/> Swap</button>
                  <button className="icon-btn" style={{width:26,height:26}}><Ico.External size={11}/></button>
                  <button className="icon-btn" style={{width:26,height:26}}><Ico.More size={11}/></button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",borderBottom:"1px solid var(--line-soft)",fontSize:10.5}}>
                {[
                  {k:"details",l:"Details"},
                  {k:"notes",l:"Notes"},
                  {k:"meta",l:"Meta"},
                  {k:"activity",l:"Activity"},
                  {k:"ai",l:"AI",ai:true},
                ].map(t=>(
                  <div key={t.k} onClick={()=>setRightTab(t.k)} style={{padding:"7px 2px",textAlign:"center",cursor:"pointer",borderBottom:`2px solid ${rightTab===t.k?"var(--primary)":"transparent"}`,color:rightTab===t.k?(t.ai?"var(--ai)":"var(--primary)"):"var(--ink-3)",fontWeight:rightTab===t.k?600:500,display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
                    {t.ai && <Ico.Sparkle size={10}/>}
                    {t.l}
                  </div>
                ))}
              </div>

              {/* Tab body */}
              <div style={{flex:1,overflowY:"auto",padding:12,fontSize:11.5}}>
                {rightTab==="details" && (
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:4}}>Content Unit</div>
                    <a className="link" style={{fontSize:12,fontWeight:500}}>Solution Overview — Board v2.1</a>
                    <div className="muted mono" style={{fontSize:10,marginTop:2}}>CU-10129</div>

                    <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"6px 10px",marginTop:12,fontSize:11}}>
                      <span className="muted">Owner</span><span>Sarah Chen</span>
                      <span className="muted">Last edited</span><span>May 21, 3:14 PM</span>
                      <span className="muted">Confidence</span><span style={{color:"var(--ok)",fontWeight:600}}>92%</span>
                      <span className="muted">Freshness</span><Badge kind="ok" style={{fontSize:9,width:"fit-content"}}>3 days</Badge>
                      <span className="muted">Used in</span><span>7 work products</span>
                      <span className="muted">Variants</span><span>4 available</span>
                    </div>

                    <div style={{fontSize:10,fontWeight:700,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.04em",marginTop:14,marginBottom:6}}>Tags</div>
                    <div className="flex items-center gap-1" style={{flexWrap:"wrap"}}>
                      <span className="chip" style={{fontSize:10}}>CIO</span>
                      <span className="chip" style={{fontSize:10}}>Enterprise</span>
                      <span className="chip" style={{fontSize:10}}>Platform</span>
                      <span className="chip" style={{fontSize:10}}>+2</span>
                    </div>

                    <div style={{fontSize:10,fontWeight:700,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.04em",marginTop:14,marginBottom:6}}>Audience Fit</div>
                    <div style={{display:"grid",gridTemplateColumns:"80px 1fr 30px",gap:6,fontSize:10.5,alignItems:"center"}}>
                      <span className="muted">CIO</span>
                      <div style={{height:4,background:"var(--bg-2)",borderRadius:2,overflow:"hidden"}}><div style={{width:"92%",height:"100%",background:"var(--ok)"}}/></div>
                      <span style={{textAlign:"right",fontWeight:600}}>92</span>
                      <span className="muted">CTO</span>
                      <div style={{height:4,background:"var(--bg-2)",borderRadius:2,overflow:"hidden"}}><div style={{width:"86%",height:"100%",background:"var(--primary)"}}/></div>
                      <span style={{textAlign:"right",fontWeight:600}}>86</span>
                      <span className="muted">CFO</span>
                      <div style={{height:4,background:"var(--bg-2)",borderRadius:2,overflow:"hidden"}}><div style={{width:"68%",height:"100%",background:"var(--warn)"}}/></div>
                      <span style={{textAlign:"right",fontWeight:600}}>68</span>
                    </div>

                    <div style={{fontSize:10,fontWeight:700,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.04em",marginTop:14,marginBottom:6}}>Variants (4)</div>
                    {[
                      {n:"Default (Current)",m:"100%",cur:true},
                      {n:"SaaS Buyer",m:"87%"},
                      {n:"Enterprise",m:"82%"},
                      {n:"Technical Deep-dive",m:"79%"},
                    ].map((v,i)=>(
                      <div key={i} className="flex items-center gap-2" style={{padding:"5px 0",borderBottom:i<3?"1px dashed var(--line-soft)":"none"}}>
                        <span style={{width:12,height:12,borderRadius:"50%",border:`1.5px solid ${v.cur?"var(--primary)":"var(--line-2)"}`,background:v.cur?"var(--primary)":"transparent",display:"grid",placeItems:"center",flexShrink:0}}>
                          {v.cur && <span style={{width:4,height:4,background:"#fff",borderRadius:"50%"}}/>}
                        </span>
                        <span style={{flex:1,fontSize:11,fontWeight:v.cur?600:400}}>{v.n}</span>
                        <span className="muted" style={{fontSize:10}}>{v.m}</span>
                      </div>
                    ))}
                  </div>
                )}

                {rightTab==="notes" && (
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6}}>Speaker Notes</div>
                    <div style={{padding:10,background:"var(--bg)",border:"1px solid var(--line)",borderRadius:6,fontSize:11.5,lineHeight:1.5,color:"var(--ink-2)"}}>
                      Open with the platform's unified content intelligence. Emphasize how this replaces 3 disparate tools
                      the CIO's team is currently using. Target speaking time: ~90 seconds.
                    </div>
                    <button className="btn btn-xs mt-2" style={{background:"var(--ai)",color:"#fff",borderColor:"var(--ai)"}}><Ico.Sparkle size={10}/> Regenerate with AI</button>

                    <div style={{fontSize:10,fontWeight:700,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.04em",marginTop:14,marginBottom:6}}>Comments (3)</div>
                    {[
                      {who:"Sarah Johnson",t:"10:24 AM",m:"Can we swap this with the SaaS variant for the app demo?"},
                      {who:"Michael Chen",t:"9:13 AM",m:"Update this logo and customer name to Acme."},
                    ].map((c,i)=>(
                      <div key={i} style={{padding:"7px 0",borderBottom:i<1?"1px dashed var(--line-soft)":"none"}}>
                        <div className="flex items-center gap-2" style={{marginBottom:2}}>
                          <Avatar who={c.who} className="sm"/>
                          <div style={{flex:1,minWidth:0,fontSize:11}}><b>{c.who}</b> <span className="muted">{c.t}</span></div>
                        </div>
                        <div style={{fontSize:11,color:"var(--ink-2)",lineHeight:1.4}}>{c.m}</div>
                      </div>
                    ))}
                    <div className="flex items-center gap-1 mt-3" style={{padding:"6px 8px",border:"1px solid var(--line)",borderRadius:6}}>
                      <input placeholder="Add a comment or @mention…" style={{flex:1,border:0,outline:0,background:"transparent",fontSize:11}}/>
                      <button className="icon-btn borderless" style={{width:20,height:20}}><Ico.Send size={11} color="var(--primary)"/></button>
                    </div>
                  </div>
                )}

                {rightTab==="meta" && (
                  <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"8px 10px",fontSize:11}}>
                    <span className="muted">ID</span><span className="mono">CU-10129</span>
                    <span className="muted">Type</span><span>Slide</span>
                    <span className="muted">Template</span><span>Board Pack v2</span>
                    <span className="muted">Dimensions</span><span>1920 × 1080</span>
                    <span className="muted">Layout</span><span>Title + Content</span>
                    <span className="muted">Created</span><span>Apr 8, 2025</span>
                    <span className="muted">Modified</span><span>May 21, 3:14 PM</span>
                    <span className="muted">Derived from</span><a className="link">Original Overview v1.0</a>
                    <span className="muted">Collection</span><a className="link">Solution Pack</a>
                    <span className="muted">Access</span><span>Organization</span>
                    <span className="muted">Approved by</span><span>Sarah Chen · May 21</span>
                    <span className="muted">Brand</span><Badge kind="ok" style={{fontSize:9,width:"fit-content"}}>In spec</Badge>
                    <span className="muted">Rights</span><Badge kind="ok" style={{fontSize:9,width:"fit-content"}}>Clear</Badge>
                    <span className="muted">A11y</span><Badge kind="ok" style={{fontSize:9,width:"fit-content"}}>WCAG AA</Badge>
                  </div>
                )}

                {rightTab==="activity" && (
                  <div>
                    {[
                      {who:"Sarah Chen",act:"edited content unit",dt:"3:14 PM today"},
                      {who:"Mark Thompson",act:"approved changes",dt:"11:02 AM today"},
                      {who:"AI",act:"ran freshness check · 92%",dt:"Yesterday",ai:true},
                      {who:"Sarah Chen",act:"updated tags",dt:"May 19"},
                      {who:"Priya Patel",act:"left a comment",dt:"May 18"},
                      {who:"Sarah Chen",act:"created this content unit",dt:"Apr 8"},
                    ].map((a,i,arr)=>(
                      <div key={i} className="flex items-start gap-2" style={{padding:"7px 0",borderBottom:i<arr.length-1?"1px dashed var(--line-soft)":"none"}}>
                        {a.ai ? <span style={{width:20,height:20,borderRadius:"50%",background:"var(--ai-bg)",display:"grid",placeItems:"center",flexShrink:0}}><Ico.Sparkle size={10} color="var(--ai)"/></span> : <Avatar who={a.who} className="sm"/>}
                        <div style={{flex:1,minWidth:0,fontSize:11}}>
                          <div><b>{a.who}</b> {a.act}</div>
                          <div className="muted" style={{fontSize:10.5}}>{a.dt}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {rightTab==="ai" && (
                  <div>
                    <div style={{padding:10,background:"var(--ai-bg)",border:"1px solid var(--ai-border)",borderRadius:6,fontSize:11,lineHeight:1.5,color:"var(--ink-2)",marginBottom:12}}>
                      This slide is a strong opener. Confidence is high (92%) and it's used in 7 other decks. One observation: the "differentiators" claim benefits from a proof point.
                    </div>
                    <div style={{fontSize:10,fontWeight:700,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6}}>Suggestions</div>
                    {[
                      {t:"Swap to SaaS variant",d:"Better CIO fit · +8 score",i:"Refresh"},
                      {t:"Add customer proof",d:"From Customer Success section",i:"Plus"},
                      {t:"Shorten for timing",d:"Audience has 20 min total",i:"Clock"},
                      {t:"Regenerate title",d:"Current title is generic",i:"Sparkle"},
                    ].map((s,i)=>{
                      const I = Ico[s.i];
                      return (
                        <div key={i} className="flex items-center gap-2" style={{padding:"8px 0",borderBottom:i<3?"1px dashed var(--line-soft)":"none"}}>
                          <span style={{width:22,height:22,borderRadius:4,background:"var(--ai-bg)",color:"var(--ai)",display:"grid",placeItems:"center",flexShrink:0}}><I size={11}/></span>
                          <div style={{flex:1,minWidth:0,fontSize:11}}>
                            <div style={{fontWeight:600}}>{s.t}</div>
                            <div className="muted" style={{fontSize:10}}>{s.d}</div>
                          </div>
                          <button className="btn btn-xs">Apply</button>
                        </div>
                      );
                    })}

                    <div className="flex items-center gap-1 mt-3" style={{padding:"7px 10px",border:"1px solid var(--ai-border)",borderRadius:6,background:"var(--paper)"}}>
                      <Ico.Sparkle size={12} color="var(--ai)"/>
                      <input placeholder="Ask about this slide…" style={{flex:1,border:0,outline:0,background:"transparent",fontSize:11}}/>
                      <button className="icon-btn borderless" style={{width:20,height:20}}><Ico.Send size={11} color="var(--ai)"/></button>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>

        {/* Bottom metrics strip */}
        <div className="card mt-3" style={{padding:12}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(6, 1fr)",gap:14,alignItems:"center"}}>
            {[
              {l:"Storyboard Health",v:"88",sub:"Excellent",c:"var(--ok)"},
              {l:"Coverage",v:"76%",sub:"17 / 23 topics",c:"var(--primary)"},
              {l:"Duplicates",v:"2",sub:"Review them",c:"var(--warn)"},
              {l:"Weak Transitions",v:"1",sub:"Needs work",c:"var(--warn)"},
              {l:"Read Time",v:"18m",sub:"Target 15–20",c:"var(--ink-2)"},
              {l:"Narrative",v:"82",sub:"Strong flow",c:"var(--ok)"},
            ].map((m,i)=>(
              <div key={i}>
                <div className="muted" style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",fontWeight:600,marginBottom:4}}>{m.l}</div>
                <div style={{fontSize:20,fontWeight:700,letterSpacing:"-0.02em",color:m.c,lineHeight:1}}>{m.v}</div>
                <div className="muted" style={{fontSize:10,marginTop:2}}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.RouteStoryboardWorkspaceV2 = RouteStoryboardWorkspaceV2;
