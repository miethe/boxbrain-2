/* Work Product detail (screen 3) + Content Unit detail (screen 2) */

function RouteWorkProduct({go}) {
  const wp = V2_WORKPRODUCTS[0];
  return (
    <div className="route-wrap">
      <Topbar crumbs={["Work Products","Client Engagements","Acme Corporation","Q1 Strategy Whitepaper"]}/>
      <div className="route-body">
        <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:20,alignItems:"start"}}>
          <div>
            <div className="page-head-row">
              <div className="flex items-center gap-3">
                <span className="file-icon ppt lg"><Ico.Deck size={18}/></span>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 style={{fontSize:22,margin:0,letterSpacing:"-0.01em"}}>{wp.title}</h1>
                    <Ico.Star size={16} color="var(--ink-4)"/>
                    <button className="icon-btn borderless"><Ico.More size={14}/></button>
                  </div>
                  <div className="muted" style={{fontSize:13,marginTop:2}}>
                    {wp.type} · {wp.v} · Updated {wp.updated}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BadgeCheck>Approved</BadgeCheck>
                <Badge kind="info">Fresh <span className="muted" style={{fontWeight:400,marginLeft:4}}>Updated May 7, 2025</span></Badge>
                <button className="btn btn-ghost btn-sm"><Ico.Compare size={14}/> Compare</button>
                <button className="btn btn-ghost btn-sm"><Ico.Search size={14}/> Find similar</button>
                <button className="btn btn-primary btn-split">
                  <Ico.Check size={14}/> Approve <span className="sep"/><Ico.Down size={12}/>
                </button>
              </div>
            </div>

            {/* Preview + meta */}
            <div className="card mt-4" style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:0,overflow:"hidden"}}>
              <div style={{padding:20,borderRight:"1px solid var(--line)"}}>
                <SlideThumb variant="mountain" title="Q1 2025" sub="Go-to-Market Strategy" brand="ACME" big/>
                <div className="flex items-center justify-between mt-3" style={{fontSize:12,color:"var(--ink-3)"}}>
                  <span>1 / 24</span>
                  <div className="flex items-center gap-2">
                    <button className="icon-btn"><Ico.Left size={12}/></button>
                    <button className="icon-btn"><Ico.Right size={12}/></button>
                    <button className="icon-btn"><Ico.External size={12}/></button>
                  </div>
                </div>
              </div>
              <div style={{padding:20}}>
                <div className="card-head" style={{border:"none",padding:0,marginBottom:8}}>
                  <b style={{fontSize:15}}>Description</b>
                </div>
                <div style={{fontSize:13,color:"var(--ink-2)",lineHeight:1.55}}>
                  {wp.desc} <a className="link">Show more</a>
                </div>
                <div style={{borderTop:"1px dashed var(--line)",marginTop:14,paddingTop:14,display:"grid",gridTemplateColumns:"120px 1fr",gap:"10px 12px",fontSize:13}}>
                  <div className="muted">Type</div><div>{wp.type}</div>
                  <div className="muted">File</div><div className="flex items-center gap-2"><span className="file-icon ppt sm"><Ico.Deck size={10}/></span><a className="link">{wp.file}</a> <span className="muted" style={{fontSize:12}}>({wp.size})</span></div>
                  <div className="muted">Owner</div><div className="flex items-center gap-2"><Avatar who={wp.owner} className="sm"/>{wp.owner}</div>
                  <div className="muted">Team</div><div>{wp.team}</div>
                  <div className="muted">Created</div><div>{wp.created}</div>
                  <div className="muted">Last Updated</div><div>{wp.updated}</div>
                  <div className="muted">Classification</div><div><Badge>{wp.classification}</Badge></div>
                  <div className="muted">Sensitivity</div><div><Badge kind="danger">{wp.sensitivity}</Badge></div>
                  <div className="muted">Languages</div><div>{wp.languages}</div>
                  <div className="muted">Tags</div>
                  <div className="flex gap-1" style={{flexWrap:"wrap"}}>
                    {wp.tags.map(t=><span key={t} className="tag blue">{t}</span>)}
                    <span className="tag">+{wp.extra}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-5 mt-4">
              <Stat label="Reusability" value={<span><b>{wp.stats.reuse}</b><span className="muted" style={{fontSize:13,marginLeft:4}}>/100</span></span>} hint={<Badge kind="ok">High</Badge>} spark="M0 16 L15 14 L30 12 L45 10 L60 9 L75 7 L90 5 L100 4" up/>
              <Stat label="Usage" value={<span><b>{wp.stats.usage}</b><span className="muted" style={{fontSize:13,marginLeft:4}}>times</span></span>} hint={<span className="up-hint"><Ico.ArrowUp size={10}/> 6 vs last 30 days</span>} spark="M0 18 L12 16 L28 14 L40 11 L55 13 L70 8 L85 6 L100 5" up/>
              <Stat label="Saves to Collections" value={<span><b>{wp.stats.saves}</b><span className="muted" style={{fontSize:13,marginLeft:4}}>total</span></span>} hint={<span className="up-hint"><Ico.ArrowUp size={10}/> 4 vs last 30 days</span>} spark="M0 14 L20 12 L40 14 L60 8 L80 7 L100 4" up/>
              <Stat label="Included in Plays" value={<span><b>{wp.stats.plays}</b><span className="muted" style={{fontSize:13,marginLeft:4}}>plays</span></span>} hint={<span className="up-hint"><Ico.ArrowUp size={10}/> 3 vs last 30 days</span>} spark="M0 16 L15 12 L35 10 L55 12 L75 6 L100 4" up/>
              <Stat label="Feedback Rating" value={<span><b>{wp.stats.rating}</b><Stars n={5}/></span>} hint={<span className="muted" style={{fontSize:12}}>{wp.stats.reviews} reviews</span>}/>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{marginTop:18}}>
              <div className="tab active">Provenance</div>
              <div className="tab">Content Units <span className="count-inline">18</span></div>
              <div className="tab" onClick={()=>go("wpStoryboard")} style={{cursor:"pointer"}}>
                Storyboard <span className="count-inline" style={{background:"var(--ai-bg)",color:"var(--ai)"}}>New</span>
              </div>
              <div className="tab">Related <span className="count-inline">12</span></div>
              <div className="tab">Activity</div>
              <div className="tab">Reviews <span className="count-inline">23</span></div>
              <div className="tab">Play Usage <span className="count-inline">9</span></div>
            </div>

            {/* Provenance timeline */}
            <div className="card mt-3" style={{padding:18}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 20px 1fr 20px 1fr 20px 1fr",gap:12,alignItems:"center"}}>
                {[
                  {who:"Sarah Chen",act:"Created by",d:"Apr 10, 2025"},
                  {who:"David Morgan",act:"Reviewed by",d:"Apr 28, 2025"},
                  {who:"Lisa Thompson",act:"Approved by",d:"May 7, 2025"},
                  {who:"v3.2",act:"Current version",d:"May 7, 2025",icon:"file"},
                ].map((p,i)=>(
                  <React.Fragment key={i}>
                    <div className="flex items-center gap-3" style={{padding:"8px 12px",background:"var(--bg)",border:"1px solid var(--line)",borderRadius:10}}>
                      {p.icon==="file" ? <span className="file-icon ppt sm"><Ico.Deck size={10}/></span> : <Avatar who={p.who} className="sm"/>}
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600}}>{p.who}</div>
                        <div className="muted" style={{fontSize:11}}>{p.act}</div>
                        <div className="muted" style={{fontSize:10}}>{p.d}</div>
                      </div>
                    </div>
                    {i<3 && <Ico.Right size={14} color="var(--ink-4)"/>}
                  </React.Fragment>
                ))}
              </div>
              <div className="section-head" style={{marginTop:20,paddingBottom:0}}>
                <b>Activity</b>
                <a className="link" style={{fontSize:13}}>View all activity</a>
              </div>
              <div className="mt-2">
                {[
                  {i:"check",c:"var(--ok)",t:"Approved version 3.2",s:"Lisa Thompson approved this version",d:"May 7, 2025 at 10:42 AM"},
                  {i:"upload",c:"var(--primary)",t:"Uploaded new version 3.2",s:"Sarah Chen uploaded a new version",d:"May 7, 2025 at 9:15 AM"},
                  {i:"edit",c:"var(--ai)",t:"Updated 4 content units",s:"Sarah Chen updated 4 content units",d:"May 6, 2025 at 4:33 PM"},
                ].map((e,i)=>(
                  <div key={i} className="flex items-start gap-3" style={{padding:"10px 0",borderBottom:i<2?"1px solid var(--line-soft)":"none"}}>
                    <span style={{width:24,height:24,borderRadius:"50%",background:"color-mix(in oklab, "+e.c+" 12%, white)",color:e.c,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {e.i==="check"?<Ico.Check size={12}/>:e.i==="upload"?<Ico.Upload size={12}/>:<Ico.Edit size={12}/>}
                    </span>
                    <div style={{flex:1,fontSize:13}}>
                      <div style={{fontWeight:500}}>{e.t}</div>
                      <div className="muted" style={{fontSize:12}}>{e.s}</div>
                    </div>
                    <div className="muted" style={{fontSize:11}}>{e.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right rail */}
          <aside style={{display:"flex",flexDirection:"column",gap:12,position:"sticky",top:16}}>
            <div className="ai-panel" style={{padding:16}}>
              <div className="flex items-center justify-between" style={{marginBottom:8}}>
                <div className="flex items-center gap-2"><Ico.Sparkle size={14} color="var(--ai)"/> <b style={{fontSize:13}}>AI Summary</b></div>
                <button className="btn btn-ghost btn-xs"><Ico.Refresh size={12}/> Regenerate</button>
              </div>
              <div style={{fontSize:12,color:"var(--ink-2)",lineHeight:1.55}}>
                This deck outlines the Q1 2025 go-to-market strategy focused on enterprise segment expansion, product-led growth motions, and strategic partnerships. Includes market analysis, target personas, value propositions, channel strategy, and a 90-day execution plan with clear KPIs.
              </div>
              <button className="btn ai mt-3" style={{width:"100%",justifyContent:"space-between"}}>
                <span className="flex items-center gap-2"><Ico.Sparkle size={12}/> Ask follow-up</span>
                <Ico.Send size={12}/>
              </button>
            </div>

            <div className="card" style={{padding:16}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <b style={{fontSize:13}}>Taxonomy</b>
                <a className="link flex items-center gap-1" style={{fontSize:12}}><Ico.Edit size={11}/> Edit</a>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"110px 1fr",gap:"8px 12px",fontSize:12}}>
                {Object.entries(wp.taxonomy).map(([k,v])=>(
                  <React.Fragment key={k}>
                    <div className="muted" style={{textTransform:"capitalize"}}>{k.replace(/([A-Z])/g," $1")}</div>
                    <div>{v}</div>
                  </React.Fragment>
                ))}
              </div>
              <a className="link mt-2" style={{fontSize:12}}>Show 2 more</a>
            </div>

            <div className="card" style={{padding:16}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <b style={{fontSize:13}}>Compliance</b>
                <a className="link" style={{fontSize:12}}>View details</a>
              </div>
              <div style={{fontSize:12}}>
                {[
                  {l:"Approved",d:"May 7, 2025",ok:true},
                  {l:"Confidential",d:"Access restricted",ok:true},
                  {l:"Expiry",d:"May 7, 2026",ok:true},
                  {l:"Legal Review",d:"Completed Apr 30, 2025",ok:true},
                ].map((c,i)=>(
                  <div key={i} className="flex items-center gap-2" style={{padding:"6px 0",borderBottom:i<3?"1px dashed var(--line-soft)":"none"}}>
                    <Ico.CheckCircle size={14} color="var(--ok)"/>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:500}}>{c.l}</div>
                      <div className="muted" style={{fontSize:11}}>{c.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{padding:16}}>
              <div className="flex items-center gap-2" style={{marginBottom:10}}>
                <Ico.Sparkle size={14} color="var(--ai)"/> <b style={{fontSize:13}}>AI Recommendations</b>
              </div>
              <div style={{fontSize:12}}>
                <div style={{padding:"10px 0",borderBottom:"1px dashed var(--line-soft)"}}>
                  <div style={{fontWeight:500}}>2025 Pricing Strategy Framework</div>
                  <div className="muted" style={{fontSize:11}}>98% similar · Used in 7 plays</div>
                </div>
                <div style={{padding:"10px 0"}}>
                  <div style={{fontWeight:500}}>Enterprise Value Prop Messaging</div>
                  <div className="muted" style={{fontSize:11}}>95% similar · Used in 5 plays</div>
                </div>
                <a className="link flex items-center gap-1 mt-2" style={{fontSize:12}}>View more recommendations <Ico.Right size={10}/></a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function RouteContentUnit({go}) {
  const [tab,setTab] = React.useState("variants");
  return (
    <div className="route-wrap">
      <Topbar crumbs={["Content Library","Presentations","Q2 2025 Board Update","Content Unit"]}/>
      <div className="route-body">
        <div className="page-head-row">
          <div style={{flex:1}}>
            <div className="flex items-center gap-2">
              <h1 style={{fontSize:26,margin:0,letterSpacing:"-0.015em"}}>Revenue Growth Momentum</h1>
              <Badge kind="info">Canonical</Badge>
              <Badge kind="ok">Approved</Badge>
              <span className="flex items-center gap-1" style={{fontSize:12,color:"var(--ink-2)"}}><Ico.Star size={12} color="#f59e0b"/> <b>4.7</b> <span className="muted">(24)</span></span>
              <span className="badge ai" style={{background:"var(--ai-bg)",color:"var(--ai)",border:"1px solid var(--ai-border)"}}><Ico.Link size={10}/> AI-linked</span>
            </div>
            <div className="muted flex items-center gap-2" style={{fontSize:12,marginTop:6}}>
              <span className="kbd">Slide ID: cu_8f3a7d2e</span>
              <span>·</span>
              <span>Slide 8 of 32 in Q2 2025 Board Update</span>
              <span>·</span>
              <span>Last modified May 12, 2025 by Sarah Chen</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm"><Ico.Share size={14}/> Share</button>
            <button className="btn btn-sm"><Ico.Plus size={14}/> Add to Collection</button>
            <button className="btn btn-primary btn-sm"><Ico.Plus size={14}/> Add to Deck</button>
            <button className="icon-btn"><Ico.More size={14}/></button>
          </div>
        </div>

        <div className="tabs" style={{marginTop:16}}>
          {[
            {k:"overview",l:"Overview"},
            {k:"variants",l:"Variants"},
            {k:"versions",l:"Versions"},
            {k:"similar",l:"Similar"},
            {k:"comments",l:"Comments",c:4},
            {k:"notes",l:"Notes",c:2},
            {k:"activity",l:"Activity"},
          ].map(t=>(
            <div key={t.k} className={`tab ${tab===t.k?"active":""}`} onClick={()=>setTab(t.k)}>{t.l}{t.c && <span className="count-inline">{t.c}</span>}</div>
          ))}
        </div>

        {tab==="variants" ? <ContentUnitVariantsTab go={go}/> : <ContentUnitOverviewTab/>}
      </div>
    </div>
  );
}

function ContentUnitOverviewTab() {
  return (
    <React.Fragment>
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:20,marginTop:20}}>
          <div className="card" style={{padding:18}}>
            <SlideThumb variant="light" title="Revenue Growth Momentum" sub="Sustained performance across all customer segments" brand="ACME" chart big/>
            <div className="flex items-center justify-end mt-2">
              <button className="icon-btn"><Ico.External size={12}/></button>
            </div>
          </div>

          <div>
            <div className="tabs" style={{marginTop:0}}>
              <div className="tab active">Overview</div>
              <div className="tab">Text</div>
              <div className="tab">Provenance</div>
              <div className="tab">Relationships</div>
              <div className="tab">Activity</div>
            </div>

            <div className="card mt-3" style={{padding:18}}>
              <div className="flex items-center gap-2" style={{marginBottom:8}}>
                <Ico.Sparkle size={14} color="var(--ai)"/> <b style={{fontSize:13}}>Summary</b>
              </div>
              <div style={{fontSize:13,color:"var(--ink-2)",lineHeight:1.55}}>
                This slide highlights strong year-over-year revenue growth of 55%, increasing from $72.1M in Q2 2024 to $112.6M in Q2 2025. Growth is consistent across all quarters with acceleration in the most recent period. <a className="link">Show more</a>
              </div>

              <div className="flex items-center gap-2 mt-4" style={{marginBottom:8}}>
                <Ico.Tag size={14} color="var(--ink-3)"/> <b style={{fontSize:13}}>Tags</b>
              </div>
              <div className="flex gap-1" style={{flexWrap:"wrap"}}>
                {["revenue","growth","financial performance","quarterly results","trend"].map(t=><span key={t} className="tag blue">{t}</span>)}
                <span className="tag">+</span>
              </div>

              <div className="flex items-center gap-2 mt-4" style={{marginBottom:8}}>
                <Ico.Shield size={14} color="var(--ok)"/> <b style={{fontSize:13}}>Trust & Quality</b>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{fontSize:12}}>
                  {["Source verified","Data consistent","Recently updated","Owner validated"].map(x=>(
                    <div key={x} className="flex items-center gap-2" style={{padding:"3px 0"}}>
                      <Ico.CheckCircle size={12} color="var(--ok)"/> <span>{x}</span>
                      {x==="Recently updated" && <span className="muted" style={{marginLeft:"auto",fontSize:11}}>May 12, 2025</span>}
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <ScorePillRow v={92} label="Quality score" desc="Excellent"/>
                  <ScorePillRow v={94} label="Relevance score" desc="Highly relevant"/>
                  <ScorePillRow v={87} label="Usage score" desc="High"/>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Variants */}
        <div className="card mt-4" style={{padding:18}}>
          <div className="flex items-center justify-between" style={{marginBottom:10}}>
            <div>
              <div className="flex items-center gap-2"><Ico.Layers size={14} color="var(--ink-2)"/> <b>Slide variants & similar versions</b> <span className="count-inline">8</span> <Ico.Info size={12} color="var(--ink-4)"/></div>
              <div className="muted" style={{fontSize:12,marginTop:2}}>Explore alternate designs and related slides with similar content.</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="muted" style={{fontSize:12}}>Sort by: <b style={{color:"var(--ink)"}}>Relevance</b></span>
              <button className="icon-btn"><Ico.Grid size={14}/></button>
              <button className="icon-btn active"><Ico.List size={14}/></button>
            </div>
          </div>
          <div className="flex items-center gap-2" style={{position:"relative"}}>
            <button className="icon-btn" style={{borderRadius:"50%"}}><Ico.Left size={14}/></button>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,flex:1}}>
              {V2_CONTENT_UNITS.map((cu,i)=>(
                <div key={cu.id} className={`compare-card ${cu.current?"current":""}`}>
                  <div style={{position:"relative"}}>
                    <SlideThumb variant={cu.thumbColor==="dark"?"dark":"light"} title={cu.title} brand="ACME" chart/>
                    <span className={`match-score sm ${cu.score>=85?"good":cu.score>=70?"mid":"low"}`} style={{position:"absolute",top:6,left:6}}>{cu.score}</span>
                  </div>
                  <div style={{padding:"8px 10px",fontSize:12}}>
                    <div style={{fontWeight:600}}>{cu.status}</div>
                    <div className="flex items-center gap-2 mt-1" style={{fontSize:11,color:"var(--ink-3)"}}>
                      <span>{cu.current?"Current":cu.score>=85?"Variant":cu.score>=80?"Similar":"Similar"}</span>
                      <span style={{flex:1}}/>
                      <Ico.Eye size={11}/> <Ico.Bookmark size={11}/> <Ico.More size={11}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="icon-btn" style={{borderRadius:"50%"}}><Ico.Right size={14}/></button>
          </div>
          <div className="flex items-center gap-1 justify-center mt-3">
            {[0,1,2,3,4,5].map(i=><span key={i} style={{width:6,height:6,borderRadius:"50%",background:i===2?"var(--primary)":"var(--line-2)"}}/>)}
          </div>
        </div>

        {/* Included in */}
        <div className="card mt-3" style={{padding:18}}>
          <div className="flex items-center justify-between" style={{marginBottom:10}}>
            <b>Included in <span className="count-inline">5</span></b>
            <a className="link" style={{fontSize:13}}>View all relationships <Ico.Right size={10}/></a>
          </div>
          <div className="grid grid-5" style={{gap:12}}>
            {[
              {t:"Q2 2025 Board Update",k:"Presentation",d:"May 12, 2025",c:"var(--primary)"},
              {t:"Investor Presentation",k:"Presentation",d:"Apr 28, 2025",c:"var(--ai)"},
              {t:"Executive Summary Deck",k:"Presentation",d:"Apr 15, 2025",c:"var(--ok)"},
              {t:"FY24 Annual Report",k:"Document",d:"Mar 10, 2025",c:"var(--warn)"},
              {t:"Acme Corp All Hands",k:"Presentation",d:"Feb 20, 2025",c:"var(--info)"},
            ].map((x,i)=>(
              <div key={i} className="card" style={{padding:10,fontSize:12}}>
                <div className="flex items-center gap-2">
                  <span style={{width:24,height:24,borderRadius:6,background:"color-mix(in oklab,"+x.c+" 14%, white)",color:x.c,display:"flex",alignItems:"center",justifyContent:"center"}}><Ico.Deck size={12}/></span>
                  <b style={{fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.t}</b>
                </div>
                <div className="muted mt-2" style={{fontSize:11}}>{x.k} · {x.d}</div>
              </div>
            ))}
          </div>
        </div>
    </React.Fragment>
  );
}


function ContentUnitVariantsTab({go}) {
  const versions = [
    {v:"v5.0",label:"Canonical",current:true,date:"May 12, 2025",who:"Sarah Chen",c:"light"},
    {v:"v4.1",label:"Approved",date:"May 8, 2025",who:"Sarah Chen",c:"light"},
    {v:"v4.0",label:"Generated",date:"May 6, 2025",who:"BoxBrain AI",c:"light"},
    {v:"v3.1",label:"Manual-link",date:"Apr 28, 2025",who:"Michael Torres",c:"dark"},
    {v:"v3.1",label:"AI-link",date:"Apr 24, 2025",who:"Sarah Chen",c:"light"},
  ];
  const variantsExplorer = [
    {t:"Growth Momentum",s:92,tags:["Canonical","Variant","Alternative","Contextual","Simplified","+2"],c:"light"},
    {t:"Revenue Growth Momentum",s:88,current:true,tags:["Canonical","Variant","Alt Chart","Contextual","Simplified","+3"],c:"light"},
    {t:"Financial Performance Highlights",s:85,tags:["Variant","Simplified","Alt Chart","+2"],c:"teal"},
    {t:"Top-line Growth Trend",s:85,tags:["Variant","Simplified","Alt Chart","+2"],c:"light"},
    {t:"Quarterly Revenue Overview",s:78,tags:["Variant","Simplified","+3"],c:"dark"},
  ];
  return (
    <div style={{display:"grid",gridTemplateColumns:"170px 1fr 340px 220px",gap:16,marginTop:16,alignItems:"start"}}>
      {/* Versions / History */}
      <div>
        <div className="palette-group-label" style={{paddingLeft:0}}>Versions / History</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {versions.map((v,i)=>(
            <div key={i} className={`card ${v.current?"":""}`} style={{padding:8,borderColor:v.current?"var(--primary)":"var(--line)",boxShadow:v.current?"0 0 0 3px color-mix(in oklab, var(--primary) 15%, transparent)":undefined,cursor:"pointer"}}>
              <div style={{width:"100%",aspectRatio:"16/9",borderRadius:4,overflow:"hidden"}}><SlideThumb variant={v.c} title="Revenue Growth" chart/></div>
              <div className="flex items-center gap-1 mt-2">
                <Badge kind={v.label==="Canonical"?"ok":v.label==="Approved"?"info":v.label==="Generated"?"ai":"primary"}>{v.label}</Badge>
              </div>
              <div style={{fontSize:11,marginTop:4}}>
                <div><b>{v.v}</b> {v.current && <span className="muted">Current</span>}</div>
                <div className="muted">{v.date}</div>
                <div className="muted">{v.who}</div>
              </div>
            </div>
          ))}
          <a className="link" style={{fontSize:12,marginTop:4}}>View all 9 versions →</a>
        </div>
      </div>

      {/* Main preview + variants explorer */}
      <div>
        <div className="card" style={{padding:18}}>
          <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:20,alignItems:"center"}}>
            <div>
              <h2 style={{fontSize:26,margin:0,letterSpacing:"-0.02em"}}>Revenue Growth<br/>Momentum</h2>
              <div className="muted" style={{fontSize:13,marginTop:8}}>Sustained performance across all customer segments</div>
              <div className="muted mono" style={{fontSize:10,marginTop:14}}>Q2 2025 Board Update</div>
              <div style={{fontSize:10,fontWeight:700,color:"var(--primary)",marginTop:4}}>ACME</div>
            </div>
            <div>
              <div className="muted" style={{fontSize:11,textAlign:"right"}}>Quarterly Revenue ($M)</div>
              <svg viewBox="0 0 320 160" style={{width:"100%",height:140}}>
                {[72.1,78.4,88.7,97.3,112.6].map((v,i)=>{
                  const h = (v/120)*120;
                  return <g key={i}><rect x={20+i*58} y={140-h} width={38} height={h} fill="var(--primary)" rx="2"/><text x={39+i*58} y={140-h-4} fontSize="10" textAnchor="middle" fill="var(--ink-2)">{v}</text><text x={39+i*58} y={155} fontSize="9" textAnchor="middle" fill="var(--ink-3)">{["Q2 24","Q3 24","Q4 24","Q1 25","Q2 25"][i]}</text></g>;
                })}
                <path d="M 39,60 L 97,50 L 155,40 L 213,30 L 271,18" stroke="var(--ok)" strokeWidth="1.5" fill="none" strokeDasharray="3 3"/>
              </svg>
              <div style={{fontSize:26,fontWeight:700,color:"var(--ok)",textAlign:"right",letterSpacing:"-0.02em"}}>+55%<span style={{fontSize:11,fontWeight:500,marginLeft:4,color:"var(--ink-3)"}}>YoY</span></div>
            </div>
          </div>
        </div>

        <div className="card mt-3" style={{padding:16}}>
          <div className="flex items-center justify-between" style={{marginBottom:10}}>
            <b style={{fontSize:14}}>Variants Explorer</b>
            <div className="muted" style={{fontSize:11}}>Use <span className="kbd">←</span> <span className="kbd">→</span> to explore conceptual siblings <span style={{margin:"0 6px"}}>·</span> <span className="kbd">↑</span> <span className="kbd">↓</span> to view variants of selected</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="icon-btn" style={{borderRadius:"50%"}}><Ico.Left size={14}/></button>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,flex:1}}>
              {variantsExplorer.map((v,i)=>(
                <div key={i} className={`compare-card ${v.current?"current":""}`} style={{padding:8}}>
                  <div style={{position:"relative"}}>
                    <SlideThumb variant={v.c} title={v.t} brand="ACME" chart/>
                  </div>
                  <div style={{fontSize:11,fontWeight:600,marginTop:6,lineHeight:1.3}}>{v.t}</div>
                  <div style={{fontSize:9,color:"var(--ink-3)",marginTop:2}}>{v.s}%</div>
                  <div className="flex gap-1" style={{flexWrap:"wrap",marginTop:6}}>
                    {v.tags.map(t=><span key={t} className="tag sm" style={{fontSize:9,background:t==="Canonical"?"var(--info-bg)":t==="Variant"?"var(--primary-bg)":t==="Alternative"?"var(--ai-bg)":"var(--bg-2)",color:t==="Canonical"?"var(--info)":t==="Variant"?"var(--primary)":t==="Alternative"?"var(--ai)":"var(--ink-3)"}}>{t}</span>)}
                  </div>
                </div>
              ))}
            </div>
            <button className="icon-btn" style={{borderRadius:"50%"}}><Ico.Right size={14}/></button>
          </div>
          <div className="flex items-center gap-3 justify-center mt-3" style={{fontSize:11}}>
            <span className="flex items-center gap-1"><span className="dot" style={{background:"var(--info)",width:6,height:6,borderRadius:"50%"}}/> Canonical (1)</span>
            <span className="flex items-center gap-1"><span className="dot" style={{background:"var(--primary)",width:6,height:6,borderRadius:"50%"}}/> Approved (4)</span>
            <span className="flex items-center gap-1"><span className="dot" style={{background:"var(--ai)",width:6,height:6,borderRadius:"50%"}}/> Generated (8)</span>
            <span className="flex items-center gap-1"><span className="dot" style={{background:"var(--ink-3)",width:6,height:6,borderRadius:"50%"}}/> Manual-link (6)</span>
            <span className="flex items-center gap-1"><span className="dot" style={{background:"var(--ai-2)",width:6,height:6,borderRadius:"50%"}}/> AI-link (8)</span>
            <span className="muted">27 total variants</span>
          </div>
          <a className="link flex items-center gap-1 mt-2" style={{fontSize:12}} onClick={()=>go("variationExplorer")}><Ico.External size={11}/> Open full Variation Explorer</a>
        </div>

        {/* Similarity + Comments row */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}>
          <div className="card" style={{padding:14}}>
            <div className="flex items-center justify-between" style={{marginBottom:10}}>
              <b style={{fontSize:13}}>Similarity Matches</b><a className="link" style={{fontSize:12}}>View all</a>
            </div>
            {[
              {n:"Revenue Performance Highlights",id:"cu_67abf398",s:92},
              {n:"Financial Performance Highlights",id:"cu_ef8a37a6", meta:"FY24 Annual Report",s:89},
              {n:"Top-line Growth Trend",id:"cu_ab821a12",meta:"Investor Presentation",s:85},
              {n:"Growth Momentum Overview",id:"cu_22b3ef12",meta:"Executive Deck",s:82},
              {n:"Quarterly Revenue Overview",id:"cu_e82a1f1c",meta:"Board Update Q1 2025",s:78},
            ].map((s,i)=>(
              <div key={i} className="flex items-center gap-2" style={{padding:"6px 0",borderBottom:i<4?"1px dashed var(--line-soft)":"none",fontSize:12}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.n}</div>
                  <div className="muted mono" style={{fontSize:10}}>{s.id}{s.meta && ` · ${s.meta}`}</div>
                </div>
                <b>{s.s}%</b>
              </div>
            ))}
          </div>
          <div className="card" style={{padding:14}}>
            <div className="flex items-center justify-between" style={{marginBottom:10}}>
              <b style={{fontSize:13}}>Comments</b><a className="link" style={{fontSize:12}}>View all (4)</a>
            </div>
            {[
              {who:"Michael Torres",date:"May 9, 2025",msg:"Can we add the customer segment callout here in the next version?",likes:2},
              {who:"Sarah Chen",date:"May 7, 2025",msg:"@MichaelTorres Good call. Added in v5.0.",likes:1},
            ].map((c,i)=>(
              <div key={i} className="flex items-start gap-2" style={{padding:"8px 0",borderBottom:i<1?"1px dashed var(--line-soft)":"none"}}>
                <Avatar who={c.who} className="sm"/>
                <div style={{flex:1,fontSize:12}}>
                  <div className="flex items-center gap-2"><b>{c.who}</b><span className="muted" style={{fontSize:11}}>{c.date}</span></div>
                  <div style={{marginTop:2}}>{c.msg}</div>
                  <div className="flex items-center gap-3 mt-1" style={{fontSize:11,color:"var(--ink-3)"}}><a className="link" style={{fontSize:11}}>Reply</a><span>♡ {c.likes}</span></div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-2" style={{padding:"8px 10px",background:"var(--bg-2)",borderRadius:6,fontSize:12}}>
              <Avatar who="Alex Kim" className="sm"/>
              <span className="muted">Add a comment…</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card mt-3" style={{padding:14}}>
          <div className="flex items-center justify-between" style={{marginBottom:10}}>
            <b style={{fontSize:13}}>Notes <span className="count-inline">2</span></b><a className="link" style={{fontSize:12}}>View all</a>
          </div>
          {[
            {msg:"Key message: Strong YoY growth of 55%", who:"Sarah Chen",date:"May 12, 2025"},
            {msg:"Update Q3 2025 with latest actuals", who:"Michael Torres",date:"Apr 30, 2025"},
          ].map((n,i)=>(
            <div key={i} className="flex items-start gap-2" style={{padding:"8px 0",borderBottom:i<1?"1px dashed var(--line-soft)":"none"}}>
              <Ico.Bookmark size={14} color="var(--warn)"/>
              <div style={{flex:1,fontSize:12}}>
                <div style={{fontWeight:500}}>{n.msg}</div>
                <div className="muted" style={{fontSize:11}}>{n.who} · {n.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right rail — Provenance + Ratings */}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div className="card" style={{padding:14}}>
          <b style={{fontSize:13}}>Provenance</b>
          <div style={{display:"grid",gridTemplateColumns:"110px 1fr",gap:"6px 10px",marginTop:8,fontSize:12}}>
            <div className="muted">Source</div><div>Q2 2025 Board Update.pptx</div>
            <div className="muted">Slide #</div><div>8 of 32</div>
            <div className="muted">Created</div><div>May 8, 2025 by Sarah Chen</div>
            <div className="muted">Last modified</div><div>May 12, 2025 by Sarah Chen</div>
            <div className="muted">Imported</div><div>May 8, 2025 via BoxBrain Connector</div>
            <div className="muted">Tags</div><div className="flex gap-1" style={{flexWrap:"wrap"}}><span className="tag blue sm">revenue</span><span className="tag blue sm">growth</span><span className="tag blue sm">financial</span><span className="tag blue sm">quarterly results</span></div>
          </div>
        </div>

        <div className="card" style={{padding:14}}>
          <b style={{fontSize:13}}>Ratings & Quality</b>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"8px 10px",marginTop:8,fontSize:12,alignItems:"center"}}>
            <div className="muted">Average rating</div><div className="flex items-center gap-1"><Stars n={5}/> <b>4.7</b> <span className="muted">(24)</span></div>
            <div className="muted">Quality score</div><div><ScorePill v={92} label="Excellent"/></div>
            <div className="muted">Relevance</div><div><ScorePill v={94} label="High"/></div>
            <div className="muted">Usage score</div><div><ScorePill v={87} label="High"/></div>
          </div>
        </div>

        <div className="card" style={{padding:14}}>
          <b style={{fontSize:13}}>Usage Stats (30d)</b>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr auto",gap:"6px 10px",marginTop:8,fontSize:12}}>
            <div className="muted">Views</div><div><b>128</b></div>
            <div className="muted">Downloads</div><div><b>18</b></div>
            <div className="muted">Add to Decks</div><div><b>6</b></div>
            <div className="muted">Shares</div><div><b>7</b></div>
          </div>
        </div>
      </div>

      {/* Where used */}
      <div>
        <div className="card" style={{padding:14}}>
          <div className="flex items-center justify-between" style={{marginBottom:8}}>
            <b style={{fontSize:13}}>Where used <span className="count-inline">6</span></b>
            <a className="link" style={{fontSize:11}}>View all</a>
          </div>
          {[
            {t:"Q2 2025 Board Update",k:"Deck",d:"Updated May 12, 2025",c:"var(--primary)"},
            {t:"FY24 Annual Report",k:"Document",d:"Mar 10, 2025",c:"var(--warn)"},
            {t:"Investor Presentation",k:"Deck",d:"Apr 28, 2025",c:"var(--ai)"},
          ].map((x,i)=>(
            <div key={i} className="flex items-center gap-2" style={{padding:"8px 0",borderBottom:i<2?"1px dashed var(--line-soft)":"none",fontSize:12}}>
              <span style={{width:20,height:20,borderRadius:4,background:`color-mix(in oklab, ${x.c} 14%, white)`,color:x.c,display:"grid",placeItems:"center",flexShrink:0}}><Ico.Deck size={10}/></span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.t}</div>
                <div className="muted" style={{fontSize:10}}>{x.k} · {x.d}</div>
              </div>
            </div>
          ))}
          <div className="muted" style={{fontSize:11,marginTop:4}}>+3 more</div>
        </div>

        <div className="card mt-3" style={{padding:12,background:"linear-gradient(180deg, var(--ai-bg), white)",borderColor:"var(--ai-border)"}}>
          <div className="flex items-center gap-2" style={{marginBottom:6}}>
            <Ico.Sparkle size={14} color="var(--ai)"/><b style={{fontSize:12}}>AI Insights</b><span className="badge ai" style={{fontSize:9}}>BETA</span>
          </div>
          <div className="muted" style={{fontSize:11,lineHeight:1.5}}>Strong performance narrative with clear growth trajectory. Consider adding customer segment breakdown for more granularity.</div>
        </div>
      </div>
    </div>
  );
}

function ScorePillRow({v,label,desc}) {
  const cls = v>=90?"good":v>=80?"mid":"low";
  return (
    <div className="flex items-center gap-2">
      <span className={`score-circle ${cls}`}>{v}</span>
      <div style={{flex:1,fontSize:12}}>
        <div style={{fontWeight:500}}>{label}</div>
        <div className="muted" style={{fontSize:11}}>{desc}</div>
      </div>
    </div>
  );
}

window.RouteWorkProduct = RouteWorkProduct;
window.RouteContentUnit = RouteContentUnit;
