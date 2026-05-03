/* Compare view (screen 6), Home, fallback routes */

function RouteHome({go}) {
  return (
    <div className="route-wrap">
      <Topbar crumbs={["Home"]}/>
      <div className="route-body">
        <div style={{maxWidth:1100}}>
          <h1 style={{fontSize:30,margin:0,letterSpacing:"-0.02em"}}>Good morning, Sarah</h1>
          <div className="muted" style={{fontSize:14,marginTop:4}}>Here's what's moving across your accounts today — April 22, 2026.</div>

          {/* Quick stats */}
          <div className="grid grid-4 mt-4">
            {[
              {l:"Active Opportunities",v:"12",h:"$42.8M pipeline",spark:"M0 16 L20 12 L40 14 L60 8 L80 10 L100 4",up:true},
              {l:"Plays in Flight",v:"8",h:"3 closing this week"},
              {l:"Pending Reviews",v:"12",h:"2 high priority",warn:true},
              {l:"Win Rate (30d)",v:"68%",h:"+12% vs prior period",spark:"M0 16 L20 14 L40 10 L60 12 L80 6 L100 4",up:true},
            ].map((s,i)=>(
              <div key={i} className="stat-card">
                <div className="label">{s.l}</div>
                <div className="value" style={{fontSize:28}}>{s.v}</div>
                <div className="hint" style={{color:s.warn?"var(--warn)":"var(--ink-3)"}}>{s.h}</div>
                {s.spark && <div className="spark"><svg className="spark-svg" viewBox="0 0 100 22" preserveAspectRatio="none"><path className="line up" d={s.spark}/></svg></div>}
              </div>
            ))}
          </div>

          {/* Two cols */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:18}}>
            <div className="card" style={{padding:18}}>
              <div className="flex items-center justify-between" style={{marginBottom:12}}>
                <b style={{fontSize:15}}>Needs your attention</b>
                <a className="link" style={{fontSize:12}}>View all</a>
              </div>
              {[
                {t:"ACME Global Expansion — RFP due Friday",d:"Opportunity · 3d left",c:"var(--danger)",i:<Ico.Flag size={12}/>},
                {t:"Q2 Board Update v5.2 awaiting approval",d:"Work Product · submitted 2 days ago",c:"var(--warn)",i:<Ico.Clock size={12}/>},
                {t:"Executive Expansion Play has 4 new outcomes",d:"Play · updated 2h ago",c:"var(--ai)",i:<Ico.Sparkle size={12}/>},
                {t:"3 slides flagged as outdated in your Collections",d:"Library health",c:"var(--primary)",i:<Ico.Shield size={12}/>},
              ].map((n,i)=>(
                <div key={i} className="flex items-start gap-3" style={{padding:"12px 0",borderBottom:i<3?"1px dashed var(--line-soft)":"none",cursor:"pointer"}} onClick={()=>go("plays")}>
                  <span style={{width:28,height:28,borderRadius:8,background:"color-mix(in oklab,"+n.c+" 14%, white)",color:n.c,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{n.i}</span>
                  <div style={{flex:1,fontSize:13}}>
                    <div style={{fontWeight:500}}>{n.t}</div>
                    <div className="muted" style={{fontSize:11}}>{n.d}</div>
                  </div>
                  <Ico.Right size={14} color="var(--ink-4)"/>
                </div>
              ))}
            </div>

            <div className="ai-panel" style={{padding:18}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <div className="flex items-center gap-2"><Ico.Sparkle size={14} color="var(--ai)"/> <b style={{fontSize:15}}>BoxBrain suggests</b></div>
                <Badge kind="ai">BETA</Badge>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {[
                  "Start a new Artifact Pack for ACME Global Expansion using the Global Expansion Framework.",
                  "Refresh the Q2 Board Update using your latest revenue data (+$8.4M since v5.0).",
                  "Competitive Battlecard Play: a new Snowflake objection pattern was detected in 4 recent deals.",
                ].map((x,i)=>(
                  <div key={i} className="flex items-start gap-2" style={{fontSize:12,padding:"8px 10px",background:"#fff",border:"1px solid var(--ai-border)",borderRadius:10}}>
                    <Ico.Sparkle size={12} color="var(--ai)" style={{marginTop:2,flexShrink:0}}/>
                    <span style={{color:"var(--ink-2)"}}>{x}</span>
                    <button className="btn btn-ghost btn-xs" style={{marginLeft:"auto",whiteSpace:"nowrap"}}>Take action</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-4 mt-4">
            {[
              {l:"Ask BoxBrain",i:<Ico.Sparkle size={16} color="var(--ai)"/>,go:"search"},
              {l:"Browse Library",i:<Ico.Library size={16} color="var(--primary)"/>,go:"library"},
              {l:"Open Plays",i:<Ico.Plays size={16} color="var(--ok)"/>,go:"plays"},
              {l:"My Opportunity",i:<Ico.Building size={16} color="var(--warn)"/>,go:"opps"},
            ].map((q,i)=>(
              <div key={i} className="card card-hoverable" style={{padding:16,cursor:"pointer"}} onClick={()=>go(q.go)}>
                <div className="flex items-center gap-3">
                  <span style={{width:36,height:36,borderRadius:10,background:"var(--bg-2)",display:"flex",alignItems:"center",justifyContent:"center"}}>{q.i}</span>
                  <b>{q.l}</b>
                  <Ico.Right size={14} color="var(--ink-4)" style={{marginLeft:"auto"}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoutePlaysList({go}) {
  return (
    <div className="route-wrap">
      <Topbar crumbs={["Plays"]}/>
      <div className="route-body">
        <div className="page-head-row">
          <h1 style={{fontSize:28,margin:0,letterSpacing:"-0.02em"}}>Plays</h1>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm"><Ico.Filter size={13}/> Filter</button>
            <button className="btn btn-primary btn-sm"><Ico.Plus size={13}/> New Play</button>
          </div>
        </div>
        <div className="tabs mt-3">
          <div className="tab active">All Plays <span className="count-inline">28</span></div>
          <div className="tab">Growth <span className="count-inline">12</span></div>
          <div className="tab">Expansion <span className="count-inline">7</span></div>
          <div className="tab">Cross-Sell <span className="count-inline">5</span></div>
          <div className="tab">Retention <span className="count-inline">4</span></div>
        </div>
        <div className="grid grid-3 mt-4">
          {V2_PLAYS.concat(V2_PLAYS.slice(1)).map((p,i)=>(
            <div key={i} className="card card-hoverable" style={{padding:16,cursor:"pointer"}} onClick={()=>go("playDetail")}>
              <div className="flex items-start gap-3">
                <div style={{width:44,height:44,borderRadius:10,background:i%3===0?"linear-gradient(140deg,#7c3aed,#a855f7)":i%3===1?"linear-gradient(140deg,#2563eb,#38bdf8)":"linear-gradient(140deg,#059669,#14b8a6)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {i%3===0 ? <Ico.Mountain size={20} color="#fff"/> : i%3===1 ? <Ico.TrendingUp size={20} color="#fff"/> : <Ico.Rocket size={20} color="#fff"/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div className="flex items-center gap-2">
                    <b style={{fontSize:14}}>{p.title}</b>
                    {i===0 && <Badge kind="ok" style={{fontSize:10}}>VERIFIED</Badge>}
                  </div>
                  <div className="muted" style={{fontSize:12,marginTop:2,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{p.summary}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3" style={{fontSize:11,color:"var(--ink-3)"}}>
                <span><Ico.TrendingUp size={11}/> {p.stats.uses} uses</span>
                {p.stats.winRate && <span><Ico.CheckCircle size={11} color="var(--ok)"/> {p.stats.winRate}% win rate</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RouteReviews({go}) {
  const [sel,setSel] = React.useState(V2_REVIEWS[0].id);
  return (
    <div className="route-wrap">
      <Topbar crumbs={["Reviews"]}/>
      <div className="route-body">
        <div className="page-head-row">
          <h1 style={{fontSize:28,margin:0,letterSpacing:"-0.02em"}}>Reviews</h1>
          <div className="flex items-center gap-2">
            <Badge kind="warn">12 pending</Badge>
            <button className="btn btn-ghost btn-sm"><Ico.Filter size={13}/> Filter</button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"360px 1fr",gap:16,marginTop:16}}>
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            {V2_REVIEWS.map((r,i)=>(
              <div key={r.id} className={`list-row ${sel===r.id?"active":""}`} onClick={()=>setSel(r.id)}>
                <span className="file-icon ppt sm"><Ico.Deck size={10}/></span>
                <div style={{flex:1,minWidth:0,fontSize:13}}>
                  <div style={{fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</div>
                  <div className="muted" style={{fontSize:11}}>{r.type} · {r.owner} · {r.submitted}</div>
                </div>
                <Badge kind={r.priority==="High"?"danger":r.priority==="Medium"?"warn":""}>{r.priority}</Badge>
              </div>
            ))}
          </div>
          <RouteCompare embedded/>
        </div>
      </div>
    </div>
  );
}

function RouteCompare({embedded}) {
  const cards = [
    {v:"v3.2",age:"2d ago",status:"Approved",statusKind:"ok",quality:92,qLabel:"Excellent",fresh:"2 days ago",freshL:"Up to date",updBy:"Michael Lee",size:"1.8 MB",usage:"6 plays, 38 views",rating:4.8,reviews:36,compliance:"Compliant",variant:"dark",qPct:92,freshAge:"Up to date"},
    {v:"v3.4",age:"5d ago",status:"In Review",statusKind:"warn",quality:88,qLabel:"Very Good",fresh:"5 days ago",freshL:"Slightly stale",updBy:"Priya Patel",size:"2.0 MB",usage:"2 plays, 14 views",rating:4.2,reviews:18,compliance:"Compliant",variant:"light",qPct:88,freshAge:"Slightly stale"},
    {v:"v2.7",age:"1w ago",status:"Draft",statusKind:"",quality:78,qLabel:"Good",fresh:"1 week ago",freshL:"Stale",updBy:"Daniel Kim",size:"2.1 MB",usage:"3 plays, 8 views",rating:3.6,reviews:15,compliance:"Needs Review",variant:"dark",qPct:78,freshAge:"Stale"},
  ];
  const rows = [
    {k:"Quality Score",r:(c)=><div className="flex items-center gap-2"><span className={`score-circle sm ${c.qPct>=90?"good":c.qPct>=80?"mid":"low"}`}>{c.quality}</span><div><div style={{fontSize:12,fontWeight:500}}>{c.qLabel}</div><div className="muted" style={{fontSize:11}}>Top {c.qPct>=90?"5%":c.qPct>=80?"15%":"25%"}</div></div></div>},
    {k:"Freshness",r:(c)=><div style={{fontSize:12}}><div style={{fontWeight:500}}>{c.fresh}</div><div className="muted" style={{fontSize:11}}>{c.freshL}</div></div>},
    {k:"Last Updated By",r:(c)=><div className="flex items-center gap-2" style={{fontSize:12}}><Avatar who={c.updBy} className="xs"/><span>{c.updBy}</span></div>},
    {k:"File Size",r:(c)=><div style={{fontSize:12}}>{c.size}</div>},
    {k:"Usage",r:(c)=><div style={{fontSize:12}}>{c.usage}</div>},
    {k:"Rating",r:(c)=><div style={{fontSize:12}} className="flex items-center gap-2"><Stars n={Math.round(c.rating)}/><span style={{fontWeight:500}}>{c.rating}</span> <span className="muted" style={{fontSize:11}}>({c.reviews})</span></div>},
    {k:"Compliance",r:(c)=><Badge kind={c.compliance==="Compliant"?"ok":"warn"}>{c.compliance}</Badge>},
  ];
  return (
    <div className={embedded?"":"route-wrap"}>
      {!embedded && <Topbar crumbs={["Library","Presentations","Q2 Financial Results","Revenue Performance Overview"]}/>}
      <div className={embedded?"":"route-body"}>
        {!embedded && (
          <div className="page-head-row">
            <div className="flex items-center gap-3">
              <span className="file-icon ppt"><Ico.Deck size={14}/></span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 style={{fontSize:22,margin:0}}>Revenue Performance Overview</h1>
                  <Ico.Star size={16} color="var(--ink-4)"/>
                  <BadgeCheck>Trusted</BadgeCheck>
                </div>
                <div className="muted" style={{fontSize:13,marginTop:2}}>Slide · Updated 2 days ago by Michael Lee · v5.2</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost btn-sm"><Ico.Compare size={14}/> Compare <span className="count-inline">2</span></button>
              <button className="btn btn-ghost btn-sm"><Ico.Search size={14}/> Find Similar</button>
              <button className="btn btn-ghost btn-sm"><Ico.Plus size={14}/> Add to Collection</button>
              <button className="btn btn-ghost btn-sm"><Ico.Plus size={14}/> Add to Play</button>
              <button className="btn btn-ghost btn-sm"><Ico.Plus size={14}/> Add to Workspace</button>
              <button className="btn btn-primary btn-split"><Ico.Check size={14}/> Approve <span className="sep"/><Ico.Down size={12}/></button>
              <button className="icon-btn"><Ico.X size={14}/></button>
            </div>
          </div>
        )}

        <div className="card mt-3" style={{padding:14,background:"var(--bg-2)"}}>
          <div className="flex items-center justify-between" style={{marginBottom:12}}>
            <div className="flex items-center gap-2">
              <Ico.Compare size={14} color="var(--primary)"/>
              <b>Compare</b>
              <Badge kind="primary">{cards.length} items selected</Badge>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost btn-sm">Reorder</button>
              <button className="icon-btn"><Ico.X size={14}/></button>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:`140px repeat(${cards.length},1fr)`,gap:12,alignItems:"stretch"}}>
            <div></div>
            {cards.map((c,i)=>(
              <div key={i} className="card" style={{padding:0,overflow:"hidden"}}>
                <div style={{padding:10,borderBottom:"1px solid var(--line)",fontSize:11,fontWeight:600,color:"var(--ink-2)",textTransform:"uppercase",letterSpacing:"0.05em",display:"flex",alignItems:"center",gap:6}}>
                  <input type="checkbox" defaultChecked/>
                  {i===0 ? "Current" : "Alternative "+i}
                </div>
                <div style={{padding:10}}>
                  <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>
                    {i===0?"Revenue Performance Overview":i===1?"Q2 Revenue Summary":"Revenue Highlights"}
                  </div>
                  <div className="muted" style={{fontSize:11,marginBottom:6}}>{c.v} · {c.age}</div>
                  <SlideThumb variant={c.variant} title={i===0?"Q2'24 Revenue Performance":i===1?"Q2 Revenue Summary":"Q2'24 Revenue Highlights"} brand="ACME" chart/>
                </div>
                <div style={{padding:"10px",borderTop:"1px solid var(--line-soft)"}}>
                  <Badge kind={c.statusKind}>{i===0?"Approved":i===1?"In Review":"Draft"}</Badge>
                  <div className="muted" style={{fontSize:11,marginTop:4}}>{i===0?"By Finance Team":i===1?"By Finance Team":"Not submitted"}</div>
                </div>
              </div>
            ))}

            {rows.map((r,ri)=>(
              <React.Fragment key={ri}>
                <div style={{fontSize:12,color:"var(--ink-3)",padding:"10px 12px",fontWeight:500}}>{r.k}</div>
                {cards.map((c,ci)=>(
                  <div key={ci} style={{background:"#fff",border:"1px solid var(--line)",borderTop:ri===0?"1px solid var(--line)":"none",padding:"10px 12px"}}>{r.r(c)}</div>
                ))}
              </React.Fragment>
            ))}
            <div></div>
            {cards.map((_,i)=>(
              <div key={i} className="flex items-center gap-1" style={{background:"#fff",border:"1px solid var(--line)",borderTop:"none",padding:"8px 10px",borderRadius:"0 0 10px 10px"}}>
                <button className="icon-btn borderless"><Ico.Eye size={13}/></button>
                <button className="icon-btn borderless"><Ico.External size={13}/></button>
                <button className="icon-btn borderless"><Ico.Share size={13}/></button>
                <button className="icon-btn borderless"><Ico.More size={13}/></button>
              </div>
            ))}
          </div>

          <button className="btn btn-ghost btn-sm mt-3" style={{width:"100%",borderStyle:"dashed"}}>
            <Ico.Plus size={13}/> Add another item
            <span className="muted" style={{fontSize:11,fontWeight:400,marginLeft:6}}>Search or browse content to compare</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function RouteFallback({name, go}) {
  return (
    <div className="route-wrap">
      <Topbar crumbs={[name]}/>
      <div className="route-body">
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:500}}>
          <div style={{textAlign:"center",maxWidth:400}}>
            <div style={{fontSize:48,opacity:0.2}}>{name[0]}</div>
            <h2 style={{fontSize:20,margin:"12px 0 4px",letterSpacing:"-0.01em"}}>{name}</h2>
            <div className="muted" style={{fontSize:13}}>This section is part of the BoxBrain v2 shell. Navigate to a main workflow to see designed screens.</div>
            <div className="flex gap-2 justify-center mt-3">
              <button className="btn btn-ghost btn-sm" onClick={()=>go("home")}>Home</button>
              <button className="btn btn-primary btn-sm" onClick={()=>go("search")}><Ico.Sparkle size={13}/> Ask BoxBrain</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.RouteHome = RouteHome;
window.RoutePlaysList = RoutePlaysList;
window.RouteReviews = RouteReviews;
window.RouteCompare = RouteCompare;
window.RouteFallback = RouteFallback;
