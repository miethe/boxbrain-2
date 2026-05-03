/* Play detail (screen 1) + Opportunity workspace (screen 5) + Reviews (screen 6-ish compare view) */

function RoutePlayDetail({go}) {
  const p = V2_PLAYS[0];
  const stepIcon = {meeting:<Ico.Users size={16}/>, workproduct:<Ico.TrendingUp size={16}/>, workshop:<Ico.Cube size={16}/>, engagement:<Ico.Target size={16}/>, proposal:<Ico.FileText size={16}/>};
  const stepColor = {meeting:"var(--primary)",workproduct:"var(--ok)",workshop:"var(--ai)",engagement:"var(--warn)",proposal:"var(--danger)"};
  return (
    <div className="route-wrap">
      <Topbar crumbs={["Plays","Growth","Expansion","Executive Expansion Play"]}/>
      <div className="route-body">
        <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:20,alignItems:"start"}}>
          <div>
            <div className="card" style={{padding:22}}>
              <div className="flex items-start gap-4">
                <div style={{width:88,height:88,borderRadius:14,background:"linear-gradient(140deg,#7c3aed,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <svg viewBox="0 0 32 32" width="44" height="44" fill="none" stroke="#fff" strokeWidth="2"><path d="M6 26 L12 14 L18 20 L24 8" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 6 L26 6 L26 10" strokeLinecap="round"/></svg>
                </div>
                <div style={{flex:1}}>
                  <Badge kind="ok" style={{marginBottom:6}}><Ico.CheckCircle size={11}/> VERIFIED</Badge>
                  <div className="flex items-center gap-2">
                    <h1 style={{fontSize:26,margin:0,letterSpacing:"-0.02em"}}>{p.title}</h1>
                    <Ico.Star size={18} color="var(--ink-4)"/>
                  </div>
                  <div className="muted" style={{fontSize:13,marginTop:4,lineHeight:1.5,maxWidth:640}}>{p.summary}</div>
                  <div className="flex gap-1 mt-3" style={{flexWrap:"wrap"}}>
                    {p.tags.map(t=><span key={t} className="tag blue">{t}</span>)}
                    <span className="tag">+{p.extra}</span>
                  </div>
                </div>
                <div style={{width:180,textAlign:"right",fontSize:12}}>
                  <div className="muted">Owner</div>
                  <div className="flex items-center gap-2 mt-1" style={{justifyContent:"flex-end"}}>
                    <Avatar who={p.owner} className="sm"/>
                    <div>
                      <div style={{fontWeight:600,fontSize:13,textAlign:"left"}}>{p.owner}</div>
                      <div className="muted" style={{fontSize:11,textAlign:"left"}}>{p.ownerRole}</div>
                    </div>
                  </div>
                  <div className="muted mt-3">Last updated</div>
                  <div style={{fontSize:13,fontWeight:500}}>{p.updated}</div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="card mt-3" style={{padding:0,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5, 1fr)"}}>
                {[
                  {l:"Usage",v:p.stats.uses,h:"Times used",spark:"M0 16 L20 14 L40 12 L60 10 L80 8 L100 6",up:true},
                  {l:"Win Rate",v:p.stats.winRate+"%",h:"Based on 120 wins",spark:"M0 14 L20 12 L40 15 L60 8 L80 10 L100 5",up:true},
                  {l:"Avg. Deal Size Increase",v:p.stats.dealSize,h:"+32% vs. baseline",spark:"M0 18 L20 15 L40 11 L60 13 L80 7 L100 4",up:true},
                  {l:"Time to Value",v:p.stats.ttv,h:"Median time to close",spark:"M0 12 L20 14 L40 11 L60 9 L80 11 L100 8",up:true},
                  {l:"Adoption",v:p.stats.adoption,h:"Rep adoption rate",spark:"M0 16 L20 13 L40 14 L60 10 L80 8 L100 5",up:true},
                ].map((s,i)=>(
                  <div key={i} style={{padding:18,borderRight:i<4?"1px solid var(--line-soft)":"none"}}>
                    <div className="muted" style={{fontSize:12}}>{s.l}</div>
                    <div style={{fontSize:26,fontWeight:700,letterSpacing:"-0.02em",marginTop:2}}>{s.v}</div>
                    <div className="flex items-end justify-between mt-1">
                      <div className="muted" style={{fontSize:11}}>{s.h}</div>
                      <svg className="spark-svg" viewBox="0 0 100 22" preserveAspectRatio="none" style={{width:54,height:18}}>
                        <path className="line up" d={s.spark}/>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audience / Use cases / When / Success */}
            <div className="card mt-3" style={{padding:0,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)"}}>
                {[
                  {i:<Ico.Users size={14}/>,t:"Intended Audience",c:<><div>{p.audience}</div><div className="muted" style={{fontSize:12,marginTop:4}}>Experience: {p.experience}</div><div className="muted" style={{fontSize:12}}>Deals: {p.deals}</div></>,color:"var(--primary)"},
                  {i:<Ico.Target size={14}/>,t:"Use Cases",c:<ul style={{margin:0,paddingLeft:16,fontSize:12,lineHeight:1.6}}>{p.useCases.map(u=><li key={u}>{u}</li>)}</ul>,color:"var(--ok)"},
                  {i:<Ico.Clock size={14}/>,t:"When to Use",c:<div>{p.whenToUse}</div>,color:"var(--warn)"},
                  {i:<Ico.Flag size={14}/>,t:"Success Criteria",c:<div>{p.success}</div>,color:"var(--ai)"},
                ].map((b,i)=>(
                  <div key={i} style={{padding:18,borderRight:i<3?"1px solid var(--line-soft)":"none",fontSize:12,color:"var(--ink-2)"}}>
                    <div className="flex items-center gap-2" style={{marginBottom:8}}>
                      <span style={{width:22,height:22,borderRadius:6,background:"color-mix(in oklab,"+b.color+" 14%, white)",color:b.color,display:"flex",alignItems:"center",justifyContent:"center"}}>{b.i}</span>
                      <b style={{fontSize:12.5,color:"var(--ink)"}}>{b.t}</b>
                    </div>
                    {b.c}
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs + flow */}
            <div className="tabs mt-4">
              <div className="tab active">Play Flow</div>
              <div className="tab">Rationale</div>
              <div className="tab">Related Opportunities <span className="count-inline">24</span></div>
              <div className="tab">Assets <span className="count-inline">18</span></div>
              <div className="tab">Outcome Metrics</div>
              <div className="tab">Reviews <span className="count-inline">8</span></div>
            </div>

            <div className="card mt-3" style={{padding:18}}>
              <div className="flex items-center justify-between" style={{marginBottom:12}}>
                <div>
                  <b style={{fontSize:15}}>Recommended Flow</b>
                  <div className="muted" style={{fontSize:12,marginTop:2}}>A proven sequence of steps to drive executive alignment and expand account value.</div>
                </div>
                <button className="btn btn-ghost btn-sm"><Ico.Layers size={13}/> View as Flow</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:0}}>
                {p.steps.map((s,i)=>(
                  <div key={i} className="flow-step">
                    <span className="flow-num">{i+1}</span>
                    <span className="flow-icon" style={{background:"color-mix(in oklab,"+stepColor[s.icon]+" 12%, white)",color:stepColor[s.icon]}}>{stepIcon[s.icon]}</span>
                    <div style={{minWidth:220}}>
                      <div style={{fontWeight:600,fontSize:14}}>{s.title}</div>
                    </div>
                    <Badge kind={s.icon==="meeting"?"primary":s.icon==="workproduct"?"ok":s.icon==="workshop"?"ai":s.icon==="engagement"?"warn":"danger"}>{s.type}</Badge>
                    <div style={{flex:1,fontSize:13,color:"var(--ink-2)"}}>{s.desc}</div>
                    <div className="muted" style={{fontSize:12,whiteSpace:"nowrap"}}>{s.time}</div>
                    <button className="icon-btn borderless"><Ico.More size={14}/></button>
                  </div>
                ))}
                <button className="btn btn-ghost" style={{alignSelf:"flex-start",marginTop:10}}><Ico.Plus size={13}/> Add Step</button>
              </div>
            </div>
          </div>

          {/* Right rail */}
          <aside style={{display:"flex",flexDirection:"column",gap:12,position:"sticky",top:16}}>
            <div className="ai-panel" style={{padding:16}}>
              <div className="flex items-center justify-between" style={{marginBottom:8}}>
                <div className="flex items-center gap-2"><Ico.Sparkle size={14} color="var(--ai)"/> <b style={{fontSize:13}}>AI Guidance</b></div>
                <Badge kind="ai">BETA</Badge>
              </div>
              <div style={{fontSize:12,color:"var(--ink-2)",lineHeight:1.55}}>
                BoxBrain AI suggests key actions to maximize your success with this play.
              </div>
              <div className="mt-3" style={{display:"flex",flexDirection:"column",gap:8}}>
                {["Tailor this play for your account's industry and size.","Review similar plays used in your region.","Prepare a business case using our Expansion ROI Calculator."].map((x,i)=>(
                  <div key={i} className="flex items-start gap-2" style={{fontSize:12}}>
                    <Ico.FileText size={13} color="var(--ai)"/> <span style={{color:"var(--ink-2)"}}>{x}</span>
                  </div>
                ))}
              </div>
              <button className="btn ai mt-3" style={{width:"100%",justifyContent:"space-between"}}>
                <span className="flex items-center gap-2"><Ico.Sparkle size={12}/> Ask BoxBrain</span>
                <Ico.Send size={12}/>
              </button>
            </div>

            <div className="card" style={{padding:16}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <b style={{fontSize:13}}>Similar Plays</b>
                <a className="link" style={{fontSize:12}}>See all</a>
              </div>
              {[
                {t:"Land and Expand",k:"Expansion · 312 uses",c:"var(--primary)",i:<Ico.TrendingUp size={14}/>},
                {t:"Cross-Sell New Product",k:"Cross-Sell · 278 uses",c:"var(--ai)",i:<Ico.Cube size={14}/>},
                {t:"Account Growth Accelerator",k:"Growth · 195 uses",c:"var(--ok)",i:<Ico.Rocket size={14}/>},
              ].map((x,i)=>(
                <div key={i} className="flex items-center gap-3" style={{padding:"10px 0",borderBottom:i<2?"1px dashed var(--line-soft)":"none",cursor:"pointer"}} onClick={()=>go("plays")}>
                  <span style={{width:32,height:32,borderRadius:8,background:"color-mix(in oklab,"+x.c+" 14%, white)",color:x.c,display:"flex",alignItems:"center",justifyContent:"center"}}>{x.i}</span>
                  <div style={{flex:1,fontSize:13}}>
                    <div style={{fontWeight:600}}>{x.t}</div>
                    <div className="muted" style={{fontSize:11}}>{x.k}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{padding:16}}>
              <b style={{fontSize:13}}>Actions</b>
              <div className="mt-2" style={{display:"flex",flexDirection:"column"}}>
                {[
                  {i:<Ico.Copy size={13}/>,t:"Duplicate Play"},
                  {i:<Ico.Edit size={13}/>,t:"Customize for My Team"},
                  {i:<Ico.Upload size={13}/>,t:"Publish to Team"},
                  {i:<Ico.Share size={13}/>,t:"Share Play"},
                  {i:<Ico.Download size={13}/>,t:"Export as PDF"},
                ].map((a,i)=>(
                  <div key={i} className="flex items-center gap-2" style={{padding:"8px 0",borderBottom:"1px dashed var(--line-soft)",fontSize:13,cursor:"pointer"}}>
                    <span style={{color:"var(--ink-3)"}}>{a.i}</span>{a.t}
                  </div>
                ))}
                <div className="flex items-center gap-2" style={{padding:"10px 0",fontSize:13,color:"var(--danger)",cursor:"pointer"}}>
                  <Ico.Archive size={13}/> Archive Play
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function RouteOpportunity({go}) {
  const o = V2_OPPS[0];
  return (
    <div className="route-wrap">
      <Topbar crumbs={["Opportunities","ACME Global Expansion"]}/>
      <div className="route-body">
        <div className="page-head-row">
          <div className="flex items-center gap-3">
            <span style={{width:36,height:36,borderRadius:8,background:"var(--primary-bg)",color:"var(--primary)",display:"flex",alignItems:"center",justifyContent:"center"}}><Ico.Building size={18}/></span>
            <div>
              <div className="flex items-center gap-2">
                <h1 style={{fontSize:22,margin:0}}>{o.name}</h1>
                <Ico.Star size={16} color="var(--ink-4)"/>
                <Badge kind="ok"><span className="dot"/>{o.status}</Badge>
              </div>
              <div className="flex gap-1 mt-1" style={{flexWrap:"wrap"}}>
                {o.tags.map(t=><span key={t} className="tag">{t}</span>)}
                <span className="tag">+</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div style={{textAlign:"right",fontSize:12}}>
              <div><b style={{fontSize:17}}>{o.amount}</b></div>
              <div className="muted">Close {o.close} ({o.days} days)</div>
              <div className="muted">Stage: {o.stage}</div>
            </div>
            <div className="avatar-stack">
              {o.team.map(i=><Avatar key={i} who={"U "+i} className="sm"/>)}
              <span className="count">+5</span>
            </div>
            <button className="btn btn-ghost btn-sm"><Ico.Share size={14}/> Share</button>
            <button className="btn btn-ghost btn-sm"><Ico.More size={14}/></button>
          </div>
        </div>

        <div className="tabs" style={{marginTop:12}}>
          <div className="tab active">Workspace</div>
          <div className="tab" onClick={()=>go("oppStoryboard")}>Storyboard</div>
          <div className="tab">Insights</div>
          <div className="tab">Requirements <span className="count-inline">24</span></div>
          <div className="tab">Messages <span className="count-inline">8</span></div>
          <div className="tab">Activity</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"260px 1fr 340px 1fr",gap:14,marginTop:14,alignItems:"start"}}>
          {/* Context snapshot */}
          <div className="card" style={{padding:14}}>
            <div className="flex items-center justify-between" style={{marginBottom:10}}>
              <div className="flex items-center gap-1" style={{fontSize:12,fontWeight:600,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.05em"}}>CONTEXT SNAPSHOT</div>
              <a className="link" style={{fontSize:12}}>Edit</a>
            </div>
            <div style={{fontSize:12,display:"flex",flexDirection:"column",gap:8}}>
              <div><div className="muted">Customer</div><div style={{fontWeight:500}}>{o.industry}</div></div>
              <div><div className="muted">Industry</div><div>Global Manufacturing</div></div>
              <div><div className="muted">Regions</div><div>{o.regions}</div></div>
              <div><div className="muted">Opportunity Owner</div><div className="flex items-center gap-1"><Avatar who="Sarah Chen" className="xs"/> {o.owner}</div></div>
              <div><div className="muted">Solution Area</div><div>{o.solution}</div></div>
              <div><div className="muted">Decision Criteria</div><div>{o.decision}</div></div>
              <div><div className="muted">Pain Points</div><div>{o.pains}</div></div>
            </div>
            <a className="link mt-3" style={{fontSize:12,display:"block"}}>View full context</a>

            <div style={{borderTop:"1px solid var(--line)",margin:"14px -14px",padding:"14px 14px 0"}}>
              <div className="flex items-center gap-1" style={{fontSize:12,fontWeight:600,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>DEAL HEALTH</div>
              <div className="flex items-center gap-3">
                <div className="score-circle lg good">{o.deal.score}</div>
                <div><div style={{fontSize:15,fontWeight:700}}>Good</div></div>
              </div>
              <div style={{marginTop:10,fontSize:12}}>
                {Object.entries(o.deal).filter(([k])=>k!=="score").map(([k,v])=>(
                  <div key={k} className="flex items-center gap-2" style={{padding:"4px 0"}}>
                    <span className="muted" style={{textTransform:"capitalize",flex:1}}>{k}</span>
                    <Badge kind={v==="High"||v==="Confirmed"||v==="On Track"?"ok":v==="Moderate"?"warn":""}>{v}</Badge>
                  </div>
                ))}
              </div>
              <a className="link mt-2" style={{fontSize:12,display:"block"}}>View details</a>
            </div>

            <div style={{borderTop:"1px solid var(--line)",margin:"14px -14px",padding:"14px 14px 0"}}>
              <div className="flex items-center gap-1" style={{fontSize:12,fontWeight:600,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>TEAM & COLLABORATION</div>
              {[
                {who:"Michael Torres",act:"added a comment",d:"55m ago",s:"Let's lead with the ROI case study for similar deals"},
                {who:"Priya Nair",act:"uploaded 3 files",d:"2h ago"},
                {who:"You",act:"opened the Play",d:"2h ago"},
              ].map((a,i)=>(
                <div key={i} className="flex items-start gap-2" style={{padding:"6px 0",borderBottom:i<2?"1px dashed var(--line-soft)":"none"}}>
                  <Avatar who={a.who} className="xs"/>
                  <div style={{flex:1,fontSize:12}}>
                    <div><b>{a.who}</b> <span className="muted">{a.act}</span> <span className="muted" style={{fontSize:11}}>· {a.d}</span></div>
                    {a.s && <div className="muted" style={{fontSize:11,marginTop:2}}>"{a.s}"</div>}
                  </div>
                </div>
              ))}
              <a className="link mt-2" style={{fontSize:12,display:"block"}}>View all activity</a>
            </div>
          </div>

          {/* Middle: BoxBrain AI + Top Plays/Slides */}
          <div style={{display:"flex",flexDirection:"column",gap:12,minWidth:0}}>
            <div className="ai-panel" style={{padding:14}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <div className="flex items-center gap-2"><Ico.Sparkle size={14} color="var(--ai)"/> <b style={{fontSize:13}}>BoxBrain AI</b> <a className="link" style={{fontSize:11}}>Why these?</a></div>
                <div className="muted" style={{fontSize:11}}>Based on ACME's context, report intent, and similar deals.</div>
              </div>
              <div className="grid" style={{gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {[
                  {t:"Lead with ROI & Outcomes",d:"Top performing in 7 similar wins",v:"+92% Impact"},
                  {t:"Address Security Early",d:"High buyer priority in RFP",v:"+88% Impact"},
                  {t:"Show Global Scale",d:"Relevant to multi-region needs",v:"+85% Impact"},
                ].map((x,i)=>(
                  <div key={i} className="card" style={{padding:10,fontSize:11}}>
                    <b style={{fontSize:12}}>{x.t}</b>
                    <div className="muted" style={{marginTop:4}}>{x.d}</div>
                    <div style={{color:"var(--ok)",fontWeight:600,fontSize:11,marginTop:6}}>{x.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{padding:14}}>
              <div className="flex items-center justify-between" style={{marginBottom:8}}>
                <b style={{fontSize:13}}>TOP PLAYS</b>
                <a className="link" style={{fontSize:12}}>View all Plays</a>
              </div>
              {[
                {t:"Global Expansion Framework",best:true,d:"Proven Framework for multi-region deployments. Used in 9 wins.",v:82},
                {t:"Secure & Scalable Platform",d:"Emphasizes security, reliability and scale. Used in 6 wins.",v:87},
                {t:"Total Economic Impact",d:"Quantify business value and cost savings. Used in 4 wins. Win Rate 72%.",v:81},
              ].map((x,i)=>(
                <div key={i} className="flex items-center gap-2" style={{padding:"10px 0",borderBottom:i<2?"1px dashed var(--line-soft)":"none"}}>
                  <span style={{width:28,height:28,borderRadius:8,background:"var(--primary-bg)",color:"var(--primary)",display:"flex",alignItems:"center",justifyContent:"center"}}><Ico.Plays size={12}/></span>
                  <div style={{flex:1,fontSize:12}}>
                    <div className="flex items-center gap-2"><b>{x.t}</b> {x.best && <Badge kind="ok" style={{fontSize:10}}>Best Match</Badge>}</div>
                    <div className="muted" style={{fontSize:11}}>{x.d}</div>
                  </div>
                  <span className="match-score good" style={{fontSize:11}}>{x.v} Match Score</span>
                </div>
              ))}
            </div>
            <div className="card" style={{padding:14}}>
              <div className="flex items-center justify-between" style={{marginBottom:8}}>
                <b style={{fontSize:13}}>TOP SLIDES</b>
                <a className="link" style={{fontSize:12}}>View full slide ranking</a>
              </div>
              <table className="tbl">
                <thead><tr><th>Rank</th><th>Slide</th><th>Source</th><th>Relevance</th><th>Last Used</th></tr></thead>
                <tbody>
                  {[
                    {r:1,n:"Executive Summary",s:"Digital Transformation",sc:92,d:"May 12, 2025"},
                    {r:2,n:"Business Impact",s:"ACME Manufacturing Win",sc:89,d:"Apr 28, 2025"},
                    {r:3,n:"Solution Overview",s:"Digital Workplace Deck",sc:87,d:"Apr 22, 2025"},
                    {r:4,n:"Security & Compliance",s:"Security Deep Dive",sc:84,d:"Apr 20, 2025"},
                    {r:5,n:"Implementation Plan",s:"Global Deployment Playbook",sc:79,d:"Apr 18, 2025"},
                  ].map((r,i)=>(
                    <tr key={i}><td style={{fontWeight:600}}>{r.r}</td><td>{r.n}</td><td className="muted">{r.s}</td><td><span className={`match-score ${r.sc>=85?"good":r.sc>=80?"mid":"low"}`} style={{fontSize:10}}>{r.sc}</span></td><td className="muted">{r.d}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-2 mt-2" style={{fontSize:11,color:"var(--ink-3)"}}>
                <span><span className="dot" style={{background:"var(--ok)"}}/>High Relevance (80+)</span>
                <span><span className="dot" style={{background:"var(--warn)"}}/>Medium (70-79)</span>
                <span><span className="dot" style={{background:"var(--danger)"}}/>Low (&lt;70)</span>
              </div>
            </div>
          </div>

          {/* Saved candidate materials */}
          <div className="card" style={{padding:14}}>
            <div className="flex items-center justify-between" style={{marginBottom:10}}>
              <b style={{fontSize:13}}>SAVED CANDIDATE MATERIALS</b>
              <div className="flex items-center gap-1"><span className="count-inline">15 items</span> <button className="icon-btn borderless"><Ico.Filter size={11}/></button></div>
            </div>
            {[
              {t:"ACME Manufacturing Case Study",k:"PDF · 2.4 MB",v:94},
              {t:"Global ROI Calculator",k:"XLSX · 180 KB",v:91},
              {t:"Customer Testimonial Video",k:"MP4 · 45 MB",v:88},
              {t:"Total Cost of Ownership",k:"PPTX · 3.8 MB",v:84},
              {t:"Executive Briefing Note",k:"DOCX · 232 KB",v:80},
            ].map((x,i)=>(
              <div key={i} className="flex items-center gap-2" style={{padding:"10px 0",borderBottom:i<4?"1px dashed var(--line-soft)":"none"}}>
                <span className="file-icon doc sm"><Ico.FileText size={10}/></span>
                <div style={{flex:1,fontSize:12,minWidth:0}}>
                  <div style={{fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.t}</div>
                  <div className="muted" style={{fontSize:11}}>{x.k}</div>
                </div>
                <span className={`match-score ${x.v>=85?"good":"mid"}`} style={{fontSize:10}}>{x.v}</span>
              </div>
            ))}
            <div style={{border:"1.5px dashed var(--line-2)",borderRadius:10,padding:20,textAlign:"center",fontSize:12,color:"var(--ink-3)",marginTop:12}}>
              <Ico.Upload size={16}/>
              <div style={{marginTop:4}}>Drop files here or browse</div>
            </div>
          </div>

          {/* Play builder */}
          <div style={{display:"flex",flexDirection:"column",gap:12,minWidth:0}}>
            <div className="card" style={{padding:14}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:"var(--ai)",textTransform:"uppercase",letterSpacing:"0.05em"}}>PLAY BUILDER</div>
                  <b style={{fontSize:13}}>Global Expansion Framework</b>
                  <div className="muted" style={{fontSize:11}}>Artifact Pack: ACME Executive Briefing · Draft</div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="icon-btn"><Ico.Left size={12}/></button>
                  <button className="icon-btn"><Ico.Right size={12}/></button>
                  <button className="btn btn-ghost btn-xs"><Ico.Eye size={11}/> Preview</button>
                  <button className="btn btn-ghost btn-xs"><Ico.Compare size={11}/> Compare</button>
                  <button className="btn btn-primary btn-xs btn-split">Publish Pack <span className="sep"/><Ico.Down size={10}/></button>
                </div>
              </div>
              <div className="flex items-center gap-2" style={{fontSize:11,padding:"8px 0",borderBottom:"1px solid var(--line-soft)"}}>
                <span style={{width:18,height:18,borderRadius:"50%",background:"var(--primary)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:600}}>1</span> <b>Build</b> <span className="muted" style={{marginLeft:6}}>——</span>
                <span style={{width:18,height:18,borderRadius:"50%",background:"var(--line-2)",color:"var(--ink-3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>2</span> <span className="muted">Review</span> <span className="muted" style={{marginLeft:6}}>——</span>
                <span style={{width:18,height:18,borderRadius:"50%",background:"var(--line-2)",color:"var(--ink-3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>3</span> <span className="muted">Finalize</span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <b style={{fontSize:12}}>SECTIONS <span className="muted" style={{fontWeight:400}}>(Drag cards here)</span></b>
                <div className="flex items-center gap-1" style={{fontSize:11}}>Auto-order <span className="toggle on"/></div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:6}}>
                {[
                  {n:"Executive Summary",d:"1 slide"},
                  {n:"Business Impact",d:"2 slides"},
                  {n:"Solution Overview",d:"",active:true},
                  {n:"Security & Compliance",d:"1 slide"},
                  {n:"Implementation Approach",d:"2 slides"},
                  {n:"Next Steps",d:"1 slide"},
                ].map((s,i)=>(
                  <div key={i} className={`flow-step compact ${s.active?"active":""}`}>
                    <Ico.Drag size={12} color="var(--ink-4)"/>
                    <span className="flow-num sm">{i+1}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:500,fontSize:12}}>{s.n}</div>
                      <div className="muted" style={{fontSize:10}}>{s.d || (s.active?"Drop here":"")}</div>
                    </div>
                    {s.active && <span className="file-icon ppt xs"><Ico.Deck size={9}/></span>}
                  </div>
                ))}
                <button className="btn btn-ghost btn-xs" style={{alignSelf:"flex-start",marginTop:4}}><Ico.Plus size={11}/> Add Section</button>
              </div>
            </div>
            <div className="card" style={{padding:14}}>
              <div className="flex items-center justify-between" style={{marginBottom:8}}>
                <b style={{fontSize:13}}>CONTENT <span className="muted" style={{fontWeight:400}}>(6 items)</span></b>
                <div className="flex items-center gap-1" style={{fontSize:11,color:"var(--ink-3)"}}>Reorder <Ico.Down size={10}/> <button className="icon-btn borderless"><Ico.More size={11}/></button></div>
              </div>
              {[
                {t:"Solution Overview · Title Slide",k:"PPTX Slide · v3.2",v:94},
                {t:"Platform Capabilities",k:"PPTX Slide · v2.7",v:90},
                {t:"Integration Ecosystem",k:"PPTX Slide · v1.5",v:88},
                {t:"Global Scale & Performance",k:"PPTX Slide · v2.1",v:86},
                {t:"Innovation Roadmap",k:"PPTX Slide · v1.2",v:84},
                {t:"Customer Logos",k:"PPTX Slide · v4.0",v:85},
              ].map((x,i)=>(
                <div key={i} className="flex items-center gap-2" style={{padding:"7px 0",borderBottom:i<5?"1px dashed var(--line-soft)":"none"}}>
                  <Ico.Drag size={11} color="var(--ink-4)"/>
                  <span className="file-icon ppt xs"><Ico.Deck size={9}/></span>
                  <div style={{flex:1,fontSize:12,minWidth:0}}>
                    <div style={{fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.t}</div>
                    <div className="muted" style={{fontSize:11}}>{x.k}</div>
                  </div>
                  <span className={`match-score ${x.v>=85?"good":"mid"}`} style={{fontSize:10}}>{x.v}</span>
                  <button className="icon-btn borderless"><Ico.Down size={10}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.RoutePlayDetail = RoutePlayDetail;
window.RouteOpportunity = RouteOpportunity;
