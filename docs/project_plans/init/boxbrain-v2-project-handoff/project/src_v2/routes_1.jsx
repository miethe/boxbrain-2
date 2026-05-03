/* Ask BoxBrain route (screen 8) + Library route (screen 4) */

function RouteAskBoxBrain({go}) {
  const [query,setQuery] = React.useState("Show me our latest financial services pitch decks");
  const examples = ["Q2 earnings materials","Cybersecurity case studies","ROI metrics by industry","Competitive differentiators"];
  return (
    <div className="route-wrap">
      <Topbar crumbs={["Ask BoxBrain"]}/>
      <div className="route-body">
        <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:24,alignItems:"start"}}>
          <div>
            <div className="page-head-row">
              <div>
                <h1 style={{fontSize:28,margin:0,letterSpacing:"-0.02em"}}>Ask BoxBrain <Ico.Sparkle size={20} color="var(--ai)"/></h1>
                <div className="muted" style={{marginTop:4}}>AI-powered search across your content universe.</div>
              </div>
              <a className="link flex items-center gap-1" style={{color:"var(--ai)"}}><Ico.Info size={14}/> How it works</a>
            </div>

            <div className="ai-panel" style={{marginTop:18}}>
              <div style={{position:"relative"}}>
                <textarea className="input" rows="2" style={{fontSize:16,border:"none",background:"transparent",padding:"8px 60px 8px 0",resize:"none"}}
                  value={query} onChange={e=>setQuery(e.target.value)}
                  placeholder="Ask BoxBrain anything…"/>
                <button className="ai-btn" style={{position:"absolute",right:4,top:4}}><Ico.Send size={16}/></button>
                <button className="icon-btn borderless" style={{position:"absolute",right:56,top:8}}><Ico.Mic size={16}/></button>
              </div>
              <div className="flex gap-2 mt-3" style={{flexWrap:"wrap"}}>
                <span className="chip"><Ico.FileText size={12}/> Content type <Ico.Down size={10}/></span>
                <span className="chip active"><Ico.Building size={12}/> Industry: Financial Services <Ico.X size={10}/></span>
                <span className="chip"><Ico.Clock size={12}/> Date <Ico.Down size={10}/></span>
                <span className="chip"><Ico.Plus size={12}/> More filters</span>
              </div>
              <div className="muted mt-3" style={{fontSize:12}}>Try an example</div>
              <div className="flex gap-2 mt-1" style={{flexWrap:"wrap"}}>
                {examples.map(e=><span key={e} className="chip" onClick={()=>setQuery(e)} style={{cursor:"pointer"}}>{e}</span>)}
              </div>
            </div>

            <div className="page-head-row" style={{marginTop:24}}>
              <div className="flex items-baseline gap-3">
                <h2 style={{fontSize:18,margin:0}}>Top results</h2>
                <span className="muted" style={{fontSize:13}}>128 results</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="muted" style={{fontSize:13}}>Sort by: <b style={{color:"var(--ink)"}}>Relevance</b></span>
                <span className="muted" style={{fontSize:13}}>View</span>
                <button className="icon-btn"><Ico.Grid size={14}/></button>
                <button className="icon-btn"><Ico.List size={14}/></button>
              </div>
            </div>

            <div className="tabs" style={{marginTop:12}}>
              <div className="tab active">All <span className="count-inline">128</span></div>
              <div className="tab">Slides <span className="count-inline">48</span></div>
              <div className="tab">Work Products <span className="count-inline">41</span></div>
              <div className="tab">Plays <span className="count-inline">39</span></div>
            </div>

            <div className="section-head" style={{marginTop:20}}>
              <div className="flex items-center gap-2"><Ico.Deck size={14} color="var(--primary)"/> <b>SLIDES</b></div>
              <a className="link">See all 48</a>
            </div>
            <div className="grid grid-3" style={{marginTop:12}}>
              {V2_ASK_SLIDES.map((s,i)=>(
                <div key={s.id} className="card card-hoverable" onClick={()=>go("contentunit")} style={{cursor:"pointer"}}>
                  <div style={{position:"relative"}}>
                    <SlideThumb variant={s.thumbColor} title={s.title} brand="ACME"/>
                    {i===0 && <span style={{position:"absolute",top:8,left:8,background:"var(--primary)",color:"#fff",borderRadius:6,fontSize:11,padding:"2px 7px",fontWeight:600}}>1</span>}
                    <span style={{position:"absolute",bottom:8,right:8,background:"rgba(15,23,42,0.8)",color:"#fff",borderRadius:6,fontSize:11,padding:"2px 7px"}}>{s.pages} slides</span>
                  </div>
                  <div className="card-body">
                    <div style={{fontSize:14,fontWeight:600}}>{s.title}</div>
                    <div className="muted" style={{fontSize:12,marginTop:2}}>{s.sub}</div>
                    <div className="flex gap-1 mt-3" style={{flexWrap:"wrap"}}>
                      {s.badges.map(b=><Badge key={b} kind={b==="Approved"?"ok":b==="Fresh"?"info":"primary"}>{b}</Badge>)}
                    </div>
                    <div className="flex gap-1 mt-2" style={{flexWrap:"wrap"}}>
                      {s.signals.map(sig=><span key={sig} className="tag ai">{sig}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="section-head" style={{marginTop:24}}>
              <div className="flex items-center gap-2"><Ico.FileText size={14} color="var(--primary)"/> <b>WORK PRODUCTS</b></div>
              <a className="link">See all 41</a>
            </div>
            <div className="card mt-3" style={{overflow:"hidden"}}>
              {[
                {t:"Northwind Bank — RFP Response",k:"RFP Response",d:"May 9, 2024",m:"96% match"},
                {t:"AI ROI Framework (Financial Services)",k:"Whitepaper",d:"Apr 30, 2024",m:"92% match"},
                {t:"Morgan Hill — Case Study",k:"Case Study",d:"Apr 12, 2024",m:"88% match"},
              ].map((r,i)=>(
                <div key={i} className="list-row" onClick={()=>go("workproduct")}>
                  <span className="file-icon doc"><Ico.FileText size={14}/></span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:500}}>{r.t}</div>
                    <div className="muted" style={{fontSize:12}}>{r.k} · {r.d}</div>
                  </div>
                  <Avatar who="Taylor Morgan" className="sm"/>
                  <Badge kind="ok">Approved</Badge>
                  <Badge kind="info">Fresh</Badge>
                  <span className="match-bar"><span className="bar" style={{"--v":96}}/>{r.m}</span>
                  <button className="icon-btn borderless"><Ico.More size={14}/></button>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3" style={{padding:"0 4px"}}>
              <button className="btn btn-ghost btn-sm"><Ico.Down size={14}/> Show more</button>
            </div>
          </div>

          {/* Selection tray */}
          <aside className="tray">
            <div className="tray-tab">
              <b>My selection</b>
              <span className="count">6</span>
              <span style={{flex:1}}/>
              <button className="icon-btn borderless"><Ico.X size={14}/></button>
            </div>
            <div className="tray-body">
              <div className="palette-group-label">SAVED ITEMS</div>
              {[
                {t:"Financial Services Pitch Deck",m:"Slides · May 7, 2024",b:["Approved","Fresh"]},
                {t:"Northwind Bank — RFP Response",m:"Word Doc · May 9, 2024",b:["Approved","Fresh"]},
                {t:"AI Insights for Modern Banking",m:"Whitepaper · Apr 30, 2024",b:["Approved","Fresh"]},
              ].map((x,i)=>(
                <div key={i} className="tray-item">
                  <div className="tray-item-thumb"><SlideThumb variant={["dark","light","teal"][i]} title={x.t}/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:500,fontSize:13}}>{x.t}</div>
                    <div className="muted" style={{fontSize:11}}>{x.m}</div>
                    <div className="flex gap-1 mt-1">
                      {x.b.map(tag=><span key={tag} className="tag sm">{tag}</span>)}
                    </div>
                  </div>
                  <button className="icon-btn borderless"><Ico.X size={12}/></button>
                </div>
              ))}
              <div className="palette-group-label mt-3">GENERATED BY BOXBRAIN</div>
              <div className="tray-item">
                <div className="tray-item-thumb ai"><Ico.Sparkle size={16} color="var(--ai)"/></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:500,fontSize:13}}>Financial Services Executive Summary</div>
                  <div className="muted" style={{fontSize:11}}>Generated · Just now</div>
                  <div className="flex gap-1 mt-1"><span className="tag ai sm">Generated</span></div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm mt-3" style={{width:"100%"}}><Ico.Plus size={12}/> Add custom content</button>

              <div className="palette-group-label mt-4">QUICK ACTIONS</div>
              <div className="grid" style={{gridTemplateColumns:"1fr 1fr",gap:8}}>
                <button className="btn btn-ghost btn-sm"><Ico.Compare size={12}/> Compare</button>
                <button className="btn btn-ghost btn-sm"><Ico.FileText size={12}/> Create brief</button>
                <button className="btn btn-ghost btn-sm"><Ico.Download size={12}/> Export to PPT</button>
                <button className="btn btn-ghost btn-sm"><Ico.Share size={12}/> Share collection</button>
              </div>

              <button className="btn btn-primary mt-3" style={{width:"100%"}}><Ico.Sparkle size={14}/> Start a new chat</button>
              <div className="muted mt-2" style={{fontSize:11,textAlign:"center"}}>Selections are saved to this session</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function RouteLibrary({go}) {
  const [view,setView] = React.useState("grid");
  const [activeTab,setActiveTab] = React.useState("contentUnits");
  const [familyMode,setFamilyMode] = React.useState("families");
  const [expandedFamily,setExpandedFamily] = React.useState("fam1");
  const [selected,setSelected] = React.useState(["sel1","sel2","sel3"]);
  return (
    <div className="route-wrap">
      <Topbar crumbs={["Library", activeTab==="contentUnits"?"Content Units":""]}/>
      <div className="route-body">
        <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:24,alignItems:"start"}}>
          <div>
            <div className="page-head-row">
              <div>
                <h1 style={{fontSize:28,margin:0,letterSpacing:"-0.02em"}}>{activeTab==="contentUnits"?"Content Unit Library":"Library"}</h1>
                {activeTab==="contentUnits" && <div className="muted" style={{fontSize:13,marginTop:4}}>Find the right content—organized by family, variant, and version.</div>}
              </div>
              {activeTab!=="contentUnits" && (
                <div className="flex items-center gap-2">
                  <button className="btn btn-ghost btn-sm" onClick={()=>go("storyboardWorkspace")}>
                    <Ico.Layers size={13}/> New Storyboard
                  </button>
                  <button className="btn btn-primary btn-sm">
                    <Ico.Plus size={13}/> New Work Product
                  </button>
                </div>
              )}
            </div>

            <div className="tabs" style={{marginTop:16}}>
              <div className={`tab ${activeTab==="all"?"active":""}`} onClick={()=>setActiveTab("all")}>All</div>
              <div className={`tab ${activeTab==="workProducts"?"active":""}`} onClick={()=>setActiveTab("workProducts")}>Work Products</div>
              <div className={`tab ${activeTab==="contentUnits"?"active":""}`} onClick={()=>setActiveTab("contentUnits")}>Content Units</div>
              <div className={`tab ${activeTab==="plays"?"active":""}`} onClick={()=>setActiveTab("plays")}>Plays</div>
              <div className={`tab ${activeTab==="collections"?"active":""}`} onClick={()=>setActiveTab("collections")}>Collections</div>
            </div>

            {activeTab==="contentUnits" ? (
              <ContentUnitLibraryView
                familyMode={familyMode} setFamilyMode={setFamilyMode}
                expandedFamily={expandedFamily} setExpandedFamily={setExpandedFamily}
                selected={selected} setSelected={setSelected}
                view={view} setView={setView}
                go={go}
              />
            ) : (
            <><div className="flex items-center gap-2 mt-3" style={{flexWrap:"wrap"}}>
              <span className="chip active"><Ico.Filter size={12}/> All Filters <span className="count-inline">1</span></span>
              <span className="chip">Content Type <Ico.Down size={10}/></span>
              <span className="chip">Industry <Ico.Down size={10}/></span>
              <span className="chip">Use Case <Ico.Down size={10}/></span>
              <span className="chip">Persona <Ico.Down size={10}/></span>
              <span className="chip">Tags <Ico.Down size={10}/></span>
              <span className="chip">More Filters <Ico.Down size={10}/></span>
              <a className="link" style={{marginLeft:4}}>Clear all</a>
              <span style={{flex:1}}/>
              <a className="link flex items-center gap-1"><Ico.Save size={12}/> Save view</a>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <b style={{fontSize:15}}>1,248 results</b>
                <span className="chip active" style={{fontSize:11}}>Content Type: All <Ico.X size={10}/></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="muted" style={{fontSize:13}}>Sort: <b style={{color:"var(--ink)"}}>Relevance</b> <Ico.Down size={10}/></span>
                <div className="flex" style={{border:"1px solid var(--line)",borderRadius:8,overflow:"hidden"}}>
                  <button className={`icon-btn borderless ${view==="grid"?"active":""}`} onClick={()=>setView("grid")}><Ico.Grid size={14}/></button>
                  <button className={`icon-btn borderless ${view==="list"?"active":""}`} onClick={()=>setView("list")}><Ico.List size={14}/></button>
                  <button className="icon-btn borderless"><Ico.Table size={14}/></button>
                </div>
              </div>
            </div>

            <div className="grid grid-4 mt-4">
              {V2_LIBRARY_CARDS.map((c,i)=>(
                <div key={c.id} className="card card-hoverable" onClick={()=>go("workproduct")} style={{cursor:"pointer"}}>
                  <div style={{position:"relative"}}>
                    <SlideThumb variant={c.thumbColor} title={c.thumbTitle||c.title} brand="ACME"/>
                    <span className="file-icon-badge">
                      {c.type==="ppt" && <span className="file-icon ppt"><Ico.Deck size={10}/></span>}
                      {c.type==="doc" && <span className="file-icon doc"><Ico.FileText size={10}/></span>}
                      {c.type==="img" && <span className="file-icon img"><Ico.Image size={10}/></span>}
                    </span>
                    <button className="icon-btn borderless" style={{position:"absolute",top:6,right:6,background:"rgba(255,255,255,0.9)"}}>
                      <Ico.Star size={14} color={c.starred?"#f59e0b":undefined}/>
                    </button>
                    <button
                      onClick={(e)=>{e.stopPropagation(); go("storyboardWorkspace");}}
                      className="card-hover-show"
                      style={{position:"absolute",bottom:8,right:8,background:"var(--ai)",color:"#fff",border:"none",fontSize:11,padding:"5px 9px",borderRadius:6,fontWeight:600,display:"inline-flex",alignItems:"center",gap:4,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.25)"}}
                    >
                      <Ico.Layers size={11}/> Edit as Storyboard
                    </button>
                    {c.trusted && <Badge kind="ok" style={{position:"absolute",bottom:8,left:8}}>Trusted</Badge>}
                  </div>
                  <div className="card-body">
                    <div style={{fontSize:13,fontWeight:600,lineHeight:1.35}}>{c.title}</div>
                    <div className="flex gap-1 mt-1" style={{flexWrap:"wrap"}}>
                      {c.tag.map(t=><span key={t} className="tag sm">{t}</span>)}
                    </div>
                    {c.desc && <div className="muted" style={{fontSize:11,marginTop:6,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{c.desc}</div>}
                    {c.owner && c.owner !== "—" && (
                      <div className="flex items-center gap-2 mt-3">
                        <Avatar who={c.owner} className="sm"/>
                        <div style={{flex:1,minWidth:0,fontSize:11}}>
                          <div style={{fontWeight:500,color:"var(--ink-2)"}}>{c.owner}</div>
                          <div className="muted">Updated {c.updated}</div>
                        </div>
                      </div>
                    )}
                    {c.relevance && (
                      <div className="flex items-center gap-2 mt-2" style={{fontSize:11,color:"var(--ink-3)"}}>
                        <Ico.Eye size={11}/> {c.views}
                        <Ico.Download size={11}/> {c.downloads}
                        <span style={{flex:1}}/>
                        <span className="match-score good">{c.relevance} AI Relevance</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div></>)}
          </div>

          {/* Right rail — similarity preview for content units, insights otherwise */}
          {activeTab==="contentUnits" ? (
          <aside className="card" style={{position:"sticky",top:16,padding:16}}>
            <div className="flex items-center justify-between" style={{marginBottom:4}}>
              <div className="flex items-center gap-2"><b style={{fontSize:13}}>Similarity Preview</b> <Ico.Info size={12} color="var(--ink-4)"/></div>
              <button className="icon-btn borderless"><Ico.X size={13}/></button>
            </div>
            <div className="muted" style={{fontSize:11}}>Based on: <b style={{color:"var(--ink-2)"}}>Revenue Growth Momentum</b> (Executive)</div>
            <div className="palette-group-label" style={{paddingLeft:0,marginTop:14}}>Top similar families</div>
            {[
              {n:"Financial Performance Highlights",s:92,meta:"3 variants · 9 versions",tags:["Financial","Quarterly"],c:"dark"},
              {n:"Q2 2025 Board Update",s:86,meta:"4 variants · 11 versions",tags:["Board","Results"],c:"light"},
              {n:"Investor Update Q2 2025",s:79,meta:"3 variants · 9 versions",tags:["Investor","Financial"],c:"purple"},
              {n:"FY24 Annual Results",s:81,meta:"5 variants · 12 versions",tags:["Annual","Financial"],c:"teal"},
              {n:"Market Growth Overview",s:77,meta:"4 variants · 8 versions",tags:["Market","Strategy"],c:"light"},
            ].map((f,i)=>(
              <div key={i} className="flex items-center gap-2" style={{padding:"8px 0",borderBottom:"1px dashed var(--line-soft)"}}>
                <div style={{width:54,height:36,borderRadius:4,overflow:"hidden",flexShrink:0}}><SlideThumb variant={f.c} title={f.n} brand="ACME"/></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.n}</div>
                  <div className="muted" style={{fontSize:10}}>{f.meta}</div>
                  <div className="flex gap-1 mt-1">{f.tags.map(t=><span key={t} className="tag sm">{t}</span>)}</div>
                </div>
                <span className={`score-circle sm ${f.s>=85?"good":f.s>=75?"mid":"low"}`}>{f.s}</span>
              </div>
            ))}
            <a className="link flex items-center justify-center mt-3" style={{background:"var(--bg-2)",padding:"8px",borderRadius:8}}>View all similar (32)</a>
          </aside>
          ) : (
          <aside className="card" style={{position:"sticky",top:16,padding:16}}>
            <div className="flex items-center gap-2" style={{marginBottom:12}}>
              <Ico.Sparkle size={14} color="var(--ai)"/> <b style={{fontSize:13}}>Insights</b>
              <span style={{flex:1}}/>
              <button className="icon-btn borderless"><Ico.Up size={14}/></button>
            </div>
            <div>
              <div className="palette-group-label">Top Content <span className="muted" style={{fontSize:10,fontWeight:400}}>By views in last 30 days</span></div>
              {[
                {n:"Enterprise AI Platform Overview",v:342},
                {n:"Competitive Battlecard Play",v:512},
                {n:"AI-Powered Contract Intelligence",v:276},
                {n:"Financial Services Solution Deck",v:189},
                {n:"The Total Economic Impact of BoxBrain",v:165},
              ].map((x,i)=>(
                <div key={i} className="flex items-center gap-2" style={{padding:"6px 0"}}>
                  <div style={{width:18,height:18,background:"var(--bg-2)",color:"var(--ink-3)",fontSize:11,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:4}}>{i+1}</div>
                  <div style={{flex:1,fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.n}</div>
                  <div className="muted" style={{fontSize:11}}>{x.v}</div>
                </div>
              ))}
              <a className="link" style={{display:"block",marginTop:8}}>View all top content</a>

              <div className="palette-group-label mt-4">Content Health</div>
              <div style={{fontSize:12,color:"var(--ink-3)"}}>Overall library health is strong</div>
              <div className="flex items-center gap-3 mt-2">
                <div className="meter good" style={{"--v":92}}><span>92</span></div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:"var(--ok)"}}>Healthy</div>
                </div>
              </div>
              <div style={{marginTop:10,fontSize:11}}>
                <div className="flex items-center gap-2" style={{padding:"2px 0"}}><span className="dot" style={{background:"var(--ok)"}}/>Trusted <span style={{marginLeft:"auto",fontWeight:600}}>82%</span></div>
                <div className="flex items-center gap-2" style={{padding:"2px 0"}}><span className="dot" style={{background:"var(--warn)"}}/>Needs Review <span style={{marginLeft:"auto",fontWeight:600}}>11%</span></div>
                <div className="flex items-center gap-2" style={{padding:"2px 0"}}><span className="dot" style={{background:"var(--danger)"}}/>Outdated <span style={{marginLeft:"auto",fontWeight:600}}>7%</span></div>
              </div>
              <button className="btn btn-ghost btn-sm mt-3" style={{width:"100%"}}>Review flagged content (23)</button>

              <div className="palette-group-label mt-4">Freshness</div>
              <div className="muted" style={{fontSize:11}}>Content updated in the last 30 days</div>
              <div className="flex items-baseline gap-2 mt-1">
                <div style={{fontSize:26,fontWeight:700,letterSpacing:"-0.02em"}}>68%</div>
                <div style={{color:"var(--ok)",fontSize:12,fontWeight:600}}><Ico.ArrowUp size={10}/> 12% vs prior 30 days</div>
              </div>

              <div className="palette-group-label mt-4">Recommendations</div>
              <div className="muted" style={{fontSize:11}}>AI-suggested for you</div>
              <div className="card mt-2" style={{padding:12,fontSize:12}}>
                <b>New competitor content</b>
                <div className="muted" style={{fontSize:11,marginTop:2}}>available for review · 3 items</div>
                <button className="btn btn-ghost btn-xs mt-2">Review now →</button>
              </div>
            </div>
          </aside>
          )}
        </div>
      </div>
    </div>
  );
}

function ContentUnitLibraryView({familyMode, setFamilyMode, expandedFamily, setExpandedFamily, selected, setSelected, view, setView, go}) {
  const families = [
    {id:"fam1", title:"Revenue Growth Momentum", trusted:true, desc:"Q2 2025 performance and momentum narrative for executive and board audiences.",
      tags:["Presentation","Financial Performance","Board Update"], extra:2,
      owner:"Sarah Chen", updated:"May 12, 2025", created:"Apr 8, 2024", locale:"Global (EN)",
      thumb:"light", variants:4, versions:12,
      variantList:[
        {n:"Executive", badge:"Canonical", aud:"C-Suite, Exec Team", linked:"AI-Link", conf:92, confLevel:"High", v:3, date:"May 12, 2025"},
        {n:"Technical Deep Dive", aud:"Technical Leaders", linked:"AI-Link", conf:86, confLevel:"High", v:3, date:"May 10, 2025"},
        {n:"Board Summary", aud:"Board of Directors", linked:"Manual-Link", conf:78, confLevel:"Medium", v:3, date:"May 9, 2025"},
        {n:"EMEA Localization", aud:"EMEA Stakeholders", linked:"Manual-Link", conf:74, confLevel:"Medium", v:3, date:"May 6, 2025"},
      ]},
    {id:"fam2", title:"AI-Powered Contract Intelligence", trusted:true, desc:"How our AI platform automates contract review and risk detection.",
      tags:["Presentation","Product","AI & Automation"], extra:2, thumb:"purple", variants:5, versions:14},
    {id:"fam3", title:"Financial Performance Highlights", trusted:true, desc:"Quarterly financial results and key performance indicators.",
      tags:["Presentation","Financial Performance","Quarterly Results"], extra:1, thumb:"teal", variants:3, versions:9},
  ];
  return (
    <div>
      <div className="flex items-center gap-2 mt-3" style={{flexWrap:"wrap"}}>
        <span className="chip active"><Ico.Filter size={12}/> Filters <span className="count-inline">2</span> <Ico.Down size={10}/></span>
        <div className="flex" style={{border:"1px solid var(--line)",borderRadius:6,overflow:"hidden"}}>
          <button className={`btn btn-sm ${familyMode==="families"?"btn-primary":""}`} style={{borderRadius:0,border:0}} onClick={()=>setFamilyMode("families")}>Show families</button>
          <button className={`btn btn-sm ${familyMode==="variants"?"btn-primary":""}`} style={{borderRadius:0,border:0}} onClick={()=>setFamilyMode("variants")}>Show all variants</button>
        </div>
        <span className="chip">Sort: Relevance <Ico.Down size={10}/></span>
        <span style={{flex:1}}/>
        <div className="flex" style={{border:"1px solid var(--line)",borderRadius:8,overflow:"hidden"}}>
          <button className={`icon-btn borderless ${view==="grid"?"active":""}`} onClick={()=>setView("grid")} style={{background:view==="grid"?"var(--primary-bg)":undefined,color:view==="grid"?"var(--primary)":undefined}}><Ico.Grid size={14}/></button>
          <button className={`icon-btn borderless ${view==="list"?"active":""}`} onClick={()=>setView("list")}><Ico.List size={14}/></button>
        </div>
        <span className="muted" style={{fontSize:13}}><b style={{color:"var(--ink)"}}>134</b> families <b style={{color:"var(--ink)",marginLeft:6}}>856</b> variants</span>
        <a className="link">Clear all</a>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:20,marginTop:16}}>
        {/* Filter sidebar */}
        <aside className="card" style={{padding:14,alignSelf:"start"}}>
          <div className="flex items-center justify-between" style={{marginBottom:10}}>
            <b style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.05em",color:"var(--ink-3)"}}>Filter by</b>
            <a className="link" style={{fontSize:11}}>Clear</a>
          </div>
          {[
            {l:"Content Type",v:"All"},
            {l:"Use Case",v:"Board Update, Investor...", chips:2},
            {l:"Industry",v:"All"},
            {l:"Persona",v:"Board Member, Investor", chips:2},
            {l:"Tags",v:"Select tags"},
            {l:"Content Owner",v:"All"},
            {l:"Locale / Region",v:"All"},
          ].map((f,i)=>(
            <div key={i} style={{marginBottom:10}}>
              <div style={{fontSize:11,color:"var(--ink-3)",fontWeight:500,marginBottom:4}}>{f.l}</div>
              <div style={{padding:"6px 10px",border:"1px solid var(--line)",borderRadius:6,fontSize:12,display:"flex",alignItems:"center",gap:6,color:f.chips?"var(--primary-ink)":"var(--ink-2)",background:f.chips?"var(--primary-bg)":"var(--paper)",borderColor:f.chips?"var(--primary-border)":"var(--line)"}}>
                <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.v}</span>
                {f.chips && <span className="count-inline" style={{background:"var(--primary)",color:"#fff"}}>{f.chips}</span>}
                <Ico.Down size={10}/>
              </div>
            </div>
          ))}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,color:"var(--ink-3)",fontWeight:500,marginBottom:6}}>Trust & Quality</div>
            {[
              {l:"Trusted",n:642,c:"var(--ok)",on:true},
              {l:"Needs Review",n:186,c:"var(--warn)"},
              {l:"Draft",n:28,c:"var(--danger)"},
            ].map((t,i)=>(
              <div key={i} className="flex items-center gap-2" style={{padding:"3px 0",fontSize:12}}>
                <span style={{width:14,height:14,borderRadius:3,border:`1.5px solid ${t.on?"var(--primary)":"var(--line-2)"}`,background:t.on?"var(--primary)":"transparent",display:"grid",placeItems:"center",color:"#fff"}}>{t.on && <Ico.Check size={10}/>}</span>
                <span className="dot" style={{width:6,height:6,borderRadius:"50%",background:t.c,display:"inline-block"}}/>
                <span style={{flex:1}}>{t.l}</span>
                <span className="muted" style={{fontSize:11}}>{t.n}</span>
              </div>
            ))}
          </div>
          <a className="link" style={{fontSize:12,display:"block",paddingTop:8,borderTop:"1px solid var(--line-soft)"}}>Save as view</a>
        </aside>

        {/* Families list */}
        <div>
          {families.map(f=>(
            <div key={f.id} className={`card mt-3 ${f.id===expandedFamily?"":""}`} style={{overflow:"hidden",borderColor:f.id===expandedFamily?"var(--primary-border)":"var(--line)"}}>
              <div style={{display:"grid",gridTemplateColumns:"220px 1fr auto",gap:20,padding:16,cursor:"pointer"}} onClick={()=>setExpandedFamily(f.id===expandedFamily?null:f.id)}>
                <div style={{borderRadius:6,overflow:"hidden"}}><SlideThumb variant={f.thumb} title={f.title} brand="ACME" chart={f.thumb==="light"}/></div>
                <div>
                  <div className="flex items-center gap-2">
                    <Ico.Chart size={14} color="var(--primary)"/>
                    <b style={{fontSize:15}}>{f.title}</b>
                    {f.trusted && <BadgeCheck>Trusted</BadgeCheck>}
                  </div>
                  <div className="muted" style={{fontSize:12,marginTop:4,maxWidth:"60ch"}}>{f.desc}</div>
                  <div className="flex gap-1 mt-2" style={{flexWrap:"wrap"}}>
                    {f.tags.map(t=><span key={t} className="tag blue sm">{t}</span>)}
                    <span className="tag sm">+{f.extra}</span>
                  </div>
                  {f.owner && (
                  <div className="flex items-center gap-3 mt-2" style={{fontSize:11,color:"var(--ink-3)"}}>
                    <span className="flex items-center gap-1"><Avatar who={f.owner} className="xs"/> {f.owner}</span>
                    <span>Updated <b style={{color:"var(--ink-2)",fontWeight:500}}>{f.updated}</b></span>
                    <span>First created <b style={{color:"var(--ink-2)",fontWeight:500}}>{f.created}</b></span>
                    <span>Locale <b style={{color:"var(--ink-2)",fontWeight:500}}>{f.locale}</b></span>
                  </div>)}
                </div>
                <div className="flex items-start gap-6" style={{paddingLeft:12,borderLeft:"1px solid var(--line-soft)"}}>
                  <div style={{textAlign:"center"}}>
                    <div className="muted" style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.05em"}}>Variants</div>
                    <div style={{fontSize:22,fontWeight:700,letterSpacing:"-0.02em"}}>{f.variants}</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div className="muted" style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.05em"}}>Versions</div>
                    <div style={{fontSize:22,fontWeight:700,letterSpacing:"-0.02em"}}>{f.versions}</div>
                  </div>
                  <Ico.Down size={16} color="var(--ink-3)" style={{transform:f.id===expandedFamily?"rotate(180deg)":"none"}}/>
                </div>
              </div>
              {f.id===expandedFamily && f.variantList && (
                <div style={{borderTop:"1px solid var(--line-soft)",background:"var(--bg)"}}>
                  <div className="flex items-center justify-between" style={{padding:"10px 16px"}}>
                    <b style={{fontSize:13}}>Variants in this family <span className="count-inline">{f.variants}</span></b>
                  </div>
                  <table className="tbl" style={{background:"var(--paper)"}}>
                    <thead>
                      <tr>
                        <th>Variant</th><th>Audience</th><th>Linked By</th><th>AI Confidence</th><th>Versions</th><th>Updated</th><th style={{textAlign:"right"}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.variantList.map((v,i)=>(
                        <tr key={i} onClick={()=>go("contentunit")} style={{cursor:"pointer"}}>
                          <td><div className="flex items-center gap-2"><b style={{color:"var(--ink)"}}>{v.n}</b>{v.badge && <Badge kind="info">{v.badge}</Badge>}</div></td>
                          <td>{v.aud}</td>
                          <td><span className="flex items-center gap-1" style={{fontSize:12}}><Ico.Link size={11} color={v.linked==="AI-Link"?"var(--ai)":"var(--ink-3)"}/> {v.linked}</span></td>
                          <td>
                            <div className="flex items-center gap-2">
                              <b>{v.conf}%</b>
                              <span style={{display:"flex",gap:2}}>{[...Array(5)].map((_,j)=><span key={j} style={{width:5,height:5,borderRadius:"50%",background:j<Math.round(v.conf/20)?(v.conf>=85?"var(--ok)":v.conf>=75?"var(--warn)":"var(--ink-4)"):"var(--line-2)"}}/>)}</span>
                              <span className="muted" style={{fontSize:11}}>{v.confLevel}</span>
                            </div>
                          </td>
                          <td>{v.v}</td>
                          <td>{v.date}</td>
                          <td style={{textAlign:"right"}}>
                            <span className="flex items-center gap-2 justify-end">
                              <a className="link flex items-center gap-1" style={{fontSize:11}}><Ico.Compare size={11}/> Compare</a>
                              <a className="link flex items-center gap-1" style={{fontSize:11}} onClick={(e)=>{e.stopPropagation();go("variationExplorer");}}><Ico.Sparkle size={11}/> Similar</a>
                              <a className="link flex items-center gap-1" style={{fontSize:11}}><Ico.Plus size={11}/> Add</a>
                              <button className="icon-btn borderless"><Ico.More size={12}/></button>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Selection dock */}
      {selected.length>0 && (
        <div style={{position:"fixed",left:272,right:360,bottom:16,background:"var(--paper)",border:"1px solid var(--line)",borderRadius:10,boxShadow:"var(--shadow-lg)",padding:10,display:"flex",alignItems:"center",gap:10,zIndex:30}}>
          <b style={{fontSize:12}}>{selected.length} selected</b>
          {[
            {t:"Revenue Growth Momentum",sub:"Executive v3.0 · May 12, 2025",c:"light"},
            {t:"Financial Performance Highlights",sub:"Canonical v2.1 · May 11, 2025",c:"teal"},
            {t:"AI-Powered Contract Intelligence",sub:"Executive v1.4 · May 10, 2025",c:"purple"},
          ].map((x,i)=>(
            <div key={i} className="flex items-center gap-2" style={{padding:"4px 8px",background:"var(--bg-2)",borderRadius:6,fontSize:11}}>
              <div style={{width:28,height:18,borderRadius:2,overflow:"hidden",flexShrink:0}}><SlideThumb variant={x.c} title={x.t}/></div>
              <div style={{maxWidth:150}}>
                <div style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.t}</div>
                <div className="muted" style={{fontSize:10}}>{x.sub}</div>
              </div>
              <Ico.X size={12} color="var(--ink-4)"/>
            </div>
          ))}
          <span style={{flex:1}}/>
          <button className="btn btn-sm"><Ico.Compare size={12}/> Compare ({selected.length})</button>
          <button className="btn btn-primary btn-sm"><Ico.Plus size={12}/> Add to Storyboard</button>
          <button className="icon-btn borderless"><Ico.More size={14}/></button>
        </div>
      )}
    </div>
  );
}

window.RouteAskBoxBrain = RouteAskBoxBrain;
window.RouteLibrary = RouteLibrary;
window.ContentUnitLibraryView = ContentUnitLibraryView;
