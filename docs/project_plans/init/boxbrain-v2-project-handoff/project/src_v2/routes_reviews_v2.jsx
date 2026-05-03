/* Reviews v2 — AI-powered queue for content quality, dedup, and governance */

function RvTab({label, count, active, onClick, sub}) {
  return (
    <div onClick={onClick} style={{
      padding:"12px 18px",
      borderBottom:active?"2px solid var(--primary)":"2px solid transparent",
      color:active?"var(--primary)":"var(--ink-2)",
      fontWeight:active?600:500,
      fontSize:13,
      cursor:"pointer",
      display:"flex",
      alignItems:"center",
      gap:6,
      whiteSpace:"nowrap"
    }}>
      {label}
      {count!=null && <span style={{
        background:active?"var(--primary-bg)":"var(--bg-2)",
        color:active?"var(--primary)":"var(--ink-3)",
        padding:"1px 8px",borderRadius:10,fontSize:11,fontWeight:600
      }}>{count}</span>}
    </div>
  );
}

function RvDupCard({score, title, v, type, updated, vs, vsV, confidence, selected, onClick}) {
  const scoreColor = score>=85?"var(--ok)":score>=70?"var(--primary)":score>=55?"var(--warn)":"var(--danger)";
  const scoreBg = score>=85?"#ecfdf5":score>=70?"var(--primary-bg)":score>=55?"#fef3c7":"#fee2e2";
  return (
    <div onClick={onClick} className={`list-row ${selected?"active":""}`} style={{padding:"12px 14px",gap:10,alignItems:"flex-start"}}>
      <span style={{
        width:36,height:36,borderRadius:"50%",
        border:`2px solid ${scoreColor}`,
        background:scoreBg,color:scoreColor,
        display:"grid",placeItems:"center",fontSize:13,fontWeight:700,flexShrink:0
      }}>{score}</span>
      <div style={{flex:1,minWidth:0}}>
        <div className="flex items-center gap-2" style={{marginBottom:2}}>
          <span style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title}</span>
          <span className="mono" style={{fontSize:10,color:"var(--ink-3)",fontWeight:500}}>{v}</span>
          <span className="muted" style={{fontSize:10,marginLeft:"auto",whiteSpace:"nowrap"}}>{updated}</span>
        </div>
        <div className="muted" style={{fontSize:11,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{type}</div>
        <div className="muted" style={{fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          vs. <span style={{color:"var(--ink-2)"}}>{vs}</span> <span className="mono" style={{fontSize:10}}>{vsV}</span>
        </div>
        <span style={{
          fontSize:10,fontWeight:600,
          color:confidence.startsWith("High")?"var(--ok)":confidence.startsWith("Medium")?"var(--warn)":"var(--danger)",
          marginTop:4,display:"inline-block"
        }}>{confidence}</span>
      </div>
    </div>
  );
}

function RvSimilarityRow({label, v, color}) {
  const c = color || (v>=90?"var(--ok)":v>=80?"var(--primary)":"var(--warn)");
  return (
    <div style={{textAlign:"center",padding:"6px 4px"}}>
      <div style={{fontSize:18,fontWeight:700,color:c,lineHeight:1}}>{v}%</div>
      <div className="muted" style={{fontSize:9,marginTop:4,lineHeight:1.2}}>{label}</div>
    </div>
  );
}

function RouteReviewsV2({go}) {
  const [tab, setTab] = React.useState("dup");
  const [selectedDup, setSelectedDup] = React.useState("r1");
  const [commentsTab, setCommentsTab] = React.useState("comments");

  const tabs = [
    {k:"new",l:"New Items",c:24},
    {k:"dup",l:"Duplicate Candidates",c:18},
    {k:"var",l:"Variant Linking",c:12},
    {k:"sim",l:"Similarity Review",c:31},
    {k:"stale",l:"Stale Content",c:27},
    {k:"app",l:"Approvals",c:9},
    {k:"com",l:"Comment Resolution",c:14},
  ];

  const dupes = [
    {id:"r1",score:92,title:"Q1 2025 Go-to-Market Strategy",v:"v3.2",type:"Presentation Deck · Updated May 7, 2025",vs:"GTM Strategy Q1 2025",vsV:"v1.4",updated:"5m ago",confidence:"High confidence"},
    {id:"r2",score:86,title:"Enterprise Value Proposition",v:"v2.1",type:"Strategy Document · Updated Apr 30, 2025",vs:"EVP Framework",vsV:"v3.0",updated:"12m ago",confidence:"High confidence"},
    {id:"r3",score:78,title:"Market Analysis — Healthcare",v:"v1.6",type:"Research Report · Updated Apr 28, 2025",vs:"Healthcare Market Analysis",vsV:"v2.2",updated:"28m ago",confidence:"Medium confidence"},
    {id:"r4",score:72,title:"Pricing Strategy Framework",v:"v4.0",type:"Strategy Document · Updated Apr 25, 2025",vs:"Pricing Strategy Guide",vsV:"v2.1",updated:"42m ago",confidence:"Medium confidence"},
    {id:"r5",score:91,title:"Competitive Landscape",v:"v2.3",type:"Research Report · Updated Apr 24, 2025",vs:"Competitor Analysis",vsV:"v1.8",updated:"1h ago",confidence:"High confidence"},
  ];

  const matchingSections = [
    {n:"Executive Summary",v:97},
    {n:"Market Opportunity",v:94},
    {n:"Target Positioning",v:93},
    {n:"Go-to-Market Approach",v:91},
    {n:"Success Metrics",v:88},
  ];

  return (
    <div className="route-wrap">
      <Topbar crumbs={["Reviews & Governance","Reviews", <span key="t" className="flex items-center gap-1" style={{color:"var(--ok)",fontWeight:500}}><Ico.Shield size={12}/> Trusted</span>]}/>
      <div className="route-body">

        {/* Header */}
        <div className="flex items-start justify-between" style={{marginBottom:14}}>
          <div>
            <h1 style={{fontSize:24,margin:0,letterSpacing:"-0.015em"}}>Reviews</h1>
            <div className="muted" style={{fontSize:12,marginTop:2}}>AI-powered review queues for content quality, deduplication, and governance</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm"><Ico.Settings size={13}/> Queue Settings</button>
            <button className="btn btn-sm"><Ico.Download size={13}/> Export</button>
            <button className="btn btn-primary btn-sm"><Ico.Refresh size={13}/> Refresh</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",borderBottom:"1px solid var(--line)",overflow:"auto",marginBottom:14}}>
          {tabs.map(t=>(
            <RvTab key={t.k} label={t.l} count={t.c} active={tab===t.k} onClick={()=>setTab(t.k)}/>
          ))}
        </div>

        {/* 3-column layout: list · compare · AI panel */}
        <div style={{display:"grid",gridTemplateColumns:"340px 1fr 280px",gap:12,alignItems:"start"}}>

          {/* LEFT: list */}
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <div className="flex items-center justify-between" style={{padding:"10px 14px",borderBottom:"1px solid var(--line-soft)"}}>
              <div className="flex items-center gap-2">
                <b style={{fontSize:13}}>18 Duplicate Candidates</b>
              </div>
              <div className="flex items-center gap-2" style={{fontSize:11,color:"var(--ink-3)"}}>
                Sort by:
                <div className="select-wrap" style={{fontSize:11}}>
                  <select style={{fontSize:11,padding:"3px 18px 3px 6px",height:24}}>
                    <option>AI Confidence</option>
                    <option>Updated</option>
                    <option>Title</option>
                  </select>
                </div>
                <button className="icon-btn borderless" style={{width:20,height:20}}><Ico.Filter size={11}/></button>
              </div>
            </div>
            <div style={{maxHeight:620,overflow:"auto"}}>
              {dupes.map(d=>(
                <RvDupCard key={d.id} {...d} selected={selectedDup===d.id} onClick={()=>setSelectedDup(d.id)}/>
              ))}
            </div>
            <div className="flex items-center justify-between" style={{padding:"10px 14px",borderTop:"1px solid var(--line-soft)",fontSize:11,color:"var(--ink-3)"}}>
              <span>Showing 1 to 5 of 18 results</span>
              <div className="flex items-center gap-1">
                <button className="icon-btn" style={{width:22,height:22}}><Ico.Left size={10}/></button>
                {[1,2,3,4].map(n=>(
                  <button key={n} className={`icon-btn ${n===1?"":""}`} style={{width:22,height:22,fontSize:11,background:n===1?"var(--primary)":"",color:n===1?"#fff":"",border:n===1?"1px solid var(--primary)":""}}>{n}</button>
                ))}
                <button className="icon-btn" style={{width:22,height:22}}><Ico.Right size={10}/></button>
              </div>
            </div>
          </div>

          {/* MIDDLE: compare */}
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <div className="flex items-center justify-between" style={{padding:"10px 14px",borderBottom:"1px solid var(--line-soft)",gap:12,flexWrap:"wrap"}}>
              <div className="flex items-center gap-2" style={{fontSize:13}}>
                <b>Compare:</b>
                <span>Q1 2025 Go-to-Market Strategy</span>
                <span className="mono" style={{fontSize:10,color:"var(--ink-3)"}}>v3.2</span>
                <span className="muted">vs.</span>
                <span>GTM Strategy Q1 2025</span>
                <span className="mono" style={{fontSize:10,color:"var(--ink-3)"}}>v1.4</span>
                <span style={{background:"var(--ai-bg)",color:"var(--ai)",padding:"2px 7px",borderRadius:10,fontSize:10,fontWeight:600,border:"1px solid var(--ai-border)"}}>AI Confidence: 92%</span>
              </div>
              <div className="flex items-center gap-2" style={{fontSize:11}}>
                <span className="muted">Manual Override</span>
                <span className="toggle"/>
                <button className="btn btn-sm"><Ico.Sparkle size={12} color="var(--ai)"/> AI Analysis Details</button>
                <button className="icon-btn"><Ico.External size={13}/></button>
              </div>
            </div>

            {/* Two-deck compare */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 24px 1fr",gap:0,padding:14,background:"var(--bg)"}}>
              {/* Left deck */}
              <div>
                <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>Q1 2025 Go-to-Market Strategy <span className="mono" style={{fontSize:10,color:"var(--ink-3)",fontWeight:500,marginLeft:4}}>v3.2</span></div>
                <div className="muted" style={{fontSize:11,marginBottom:10}}>Presentation Deck · Updated May 7, 2025 by Sarah Chen</div>
                <div style={{borderRadius:8,overflow:"hidden",boxShadow:"var(--shadow)"}}>
                  <SlideThumb variant="dark" title="Q1 2025" sub="Go-to-Market Strategy" brand="" big/>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <button className="icon-btn borderless" style={{width:24,height:24}}><Ico.Eye size={12}/></button>
                  <button className="icon-btn borderless" style={{width:24,height:24}}><Ico.Download size={12}/></button>
                  <button className="icon-btn borderless" style={{width:24,height:24}}><Ico.More size={12}/></button>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                <button className="icon-btn" style={{width:28,height:28,borderRadius:"50%",background:"var(--paper)"}}><Ico.Compare size={13}/></button>
              </div>
              {/* Right deck */}
              <div>
                <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>GTM Strategy Q1 2025 <span className="mono" style={{fontSize:10,color:"var(--ink-3)",fontWeight:500,marginLeft:4}}>v1.4</span></div>
                <div className="muted" style={{fontSize:11,marginBottom:10}}>Presentation Deck · Updated Apr 28, 2025 by Michael Lee</div>
                <div style={{borderRadius:8,overflow:"hidden",boxShadow:"var(--shadow)"}}>
                  <SlideThumb variant="dark" title="Q1 2025" sub="GTM Strategy" brand="" big/>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <button className="icon-btn borderless" style={{width:24,height:24}}><Ico.Eye size={12}/></button>
                  <button className="icon-btn borderless" style={{width:24,height:24}}><Ico.Download size={12}/></button>
                  <button className="icon-btn borderless" style={{width:24,height:24}}><Ico.More size={12}/></button>
                </div>
              </div>
            </div>

            {/* Tabs on lower section */}
            <div style={{borderTop:"1px solid var(--line)"}}>
              <div style={{display:"flex",borderBottom:"1px solid var(--line-soft)",padding:"0 14px"}}>
                {[
                  {k:"content",l:"Content Comparison"},
                  {k:"comments",l:"Comments",c:3},
                  {k:"prov",l:"Provenance"},
                  {k:"ver",l:"Version History"},
                  {k:"act",l:"Activity"},
                ].map(t=>(
                  <div key={t.k} onClick={()=>setCommentsTab(t.k)} style={{
                    padding:"10px 14px",
                    borderBottom:commentsTab===t.k?"2px solid var(--primary)":"2px solid transparent",
                    color:commentsTab===t.k?"var(--primary)":"var(--ink-2)",
                    fontSize:12,fontWeight:commentsTab===t.k?600:500,
                    cursor:"pointer",marginBottom:-1,
                    display:"flex",alignItems:"center",gap:5
                  }}>
                    {t.l}
                    {t.c && <span style={{background:"var(--bg-2)",color:"var(--ink-3)",padding:"1px 6px",borderRadius:9,fontSize:10,fontWeight:600}}>{t.c}</span>}
                  </div>
                ))}
              </div>

              <div style={{padding:"10px 14px"}}>
                {/* Filter bar */}
                <div className="flex items-center gap-2" style={{marginBottom:10,flexWrap:"wrap"}}>
                  <div className="select-wrap" style={{fontSize:11}}>
                    <select style={{fontSize:11,height:26}}><option>All Comments</option></select>
                  </div>
                  <div className="select-wrap" style={{fontSize:11}}>
                    <select style={{fontSize:11,height:26}}><option>All Status</option></select>
                  </div>
                  <div className="select-wrap" style={{fontSize:11}}>
                    <select style={{fontSize:11,height:26}}><option>Sort by: Newest</option></select>
                  </div>
                  <div style={{flex:1}}/>
                  <button className="btn btn-sm"><Ico.Plus size={12}/> Add Comment</button>
                </div>

                {/* Comment list */}
                {[
                  {who:"Jessica Parker",i:"JP",when:"May 7, 2025 at 10:24 AM",m:"Updated market sizing slide 8 with latest IDC numbers. The go-to-market approach section has been refined based on Q1 learnings.",open:true,variant:true,color:"var(--primary)"},
                  {who:"David Morgan",i:"DM",when:"May 7, 2025 at 9:15 AM",m:"Added success metrics framework on slide 12. Minor updates to competitive positioning.",open:true,variant:true,color:"var(--ok)"},
                  {who:"AI Assistant",i:"AI",when:"May 7, 2025 at 9:00 AM",m:"Detected content updates in 3 sections. No material changes to core strategy or positioning.",ai:true,informational:true,color:"var(--ai)"},
                ].map((c,i)=>(
                  <div key={i} className="flex items-start gap-2" style={{padding:"10px 0",borderBottom:i<2?"1px solid var(--line-soft)":"none"}}>
                    <span style={{width:28,height:28,borderRadius:"50%",background:c.color,color:"#fff",display:"grid",placeItems:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{c.i}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div className="flex items-center gap-2" style={{marginBottom:3}}>
                        <span style={{fontSize:12,fontWeight:600}}>{c.who}</span>
                        <span className="muted" style={{fontSize:11}}>{c.when}</span>
                        <div style={{flex:1}}/>
                        {c.open && <Badge kind="">Open</Badge>}
                        {c.variant && <Badge kind="primary">Variant</Badge>}
                        {c.informational && <Badge kind="ai">Informational</Badge>}
                        <button className="icon-btn borderless" style={{width:20,height:20}}><Ico.Edit size={11}/></button>
                        <button className="icon-btn borderless" style={{width:20,height:20}}><Ico.Check size={11}/></button>
                        <button className="icon-btn borderless" style={{width:20,height:20}}><Ico.More size={11}/></button>
                      </div>
                      <div style={{fontSize:12,color:"var(--ink-2)",lineHeight:1.5}}>{c.m}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: AI panel */}
          <aside style={{display:"flex",flexDirection:"column",gap:10,position:"sticky",top:10}}>
            <div className="card" style={{padding:12}}>
              <div className="flex items-center gap-2" style={{marginBottom:10}}>
                <Ico.Sparkle size={13} color="var(--ai)"/>
                <b style={{fontSize:12}}>AI Similarity Analysis</b>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:4,marginBottom:8}}>
                <RvSimilarityRow label="Overall Similarity" v={92}/>
                <RvSimilarityRow label="Content Similarity" v={89}/>
                <RvSimilarityRow label="Structure Similarity" v={95}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr",gap:4,marginBottom:10}}>
                <div style={{textAlign:"center",padding:"4px 0"}}>
                  <div style={{fontSize:18,fontWeight:700,color:"var(--primary)",lineHeight:1}}>91%</div>
                  <div className="muted" style={{fontSize:9,marginTop:3}}>Semantic Similarity</div>
                </div>
              </div>

              <b style={{fontSize:11}}>Top Matching Sections</b>
              <div style={{marginTop:6}}>
                {matchingSections.map((m,i)=>(
                  <div key={i} className="flex items-center justify-between" style={{padding:"4px 0",fontSize:11,borderBottom:i<4?"1px dashed var(--line-soft)":"none"}}>
                    <span style={{color:"var(--ink-2)"}}>{i+1}. {m.n}</span>
                    <span style={{fontWeight:700,color:m.v>=95?"var(--ok)":"var(--primary)"}}>{m.v}%</span>
                  </div>
                ))}
              </div>
              <a className="link" style={{fontSize:11,display:"inline-block",marginTop:8}}>View all 12 matched sections</a>
            </div>

            <div className="card" style={{padding:12}}>
              <b style={{fontSize:12}}>Suggested Action</b>
              <div className="muted" style={{fontSize:11,marginTop:4,marginBottom:10,lineHeight:1.4}}>These items appear to be variants of the same content with minor updates.</div>

              <button className="btn btn-primary" style={{width:"100%",justifyContent:"flex-start",marginBottom:6,padding:"10px 12px",height:"auto"}}>
                <Ico.Link size={12}/>
                <div style={{textAlign:"left",marginLeft:4}}>
                  <div style={{fontSize:12,fontWeight:600}}>Mark as Variants</div>
                  <div style={{fontSize:10,fontWeight:400,opacity:0.85}}>Link as variants</div>
                </div>
              </button>
              <button className="btn" style={{width:"100%",justifyContent:"flex-start",marginBottom:6,padding:"10px 12px",height:"auto"}}>
                <Ico.Copy size={12}/>
                <div style={{textAlign:"left",marginLeft:4}}>
                  <div style={{fontSize:12,fontWeight:600}}>Mark as Similar</div>
                  <div style={{fontSize:10,color:"var(--ink-3)"}}>Track similarity</div>
                </div>
              </button>
              <button className="btn" style={{width:"100%",justifyContent:"flex-start",marginBottom:6,padding:"10px 12px",height:"auto"}}>
                <Ico.Layers size={12}/>
                <div style={{textAlign:"left",marginLeft:4}}>
                  <div style={{fontSize:12,fontWeight:600}}>Merge Versions</div>
                  <div style={{fontSize:10,color:"var(--ink-3)"}}>Combine into single</div>
                </div>
              </button>
              <button className="btn" style={{width:"100%",justifyContent:"flex-start",marginBottom:6,padding:"10px 12px",height:"auto"}}>
                <Ico.Check size={12}/>
                <div style={{textAlign:"left",marginLeft:4}}>
                  <div style={{fontSize:12,fontWeight:600}}>Set Canonical</div>
                  <div style={{fontSize:10,color:"var(--ink-3)"}}>Choose primary version</div>
                </div>
              </button>
              <button className="btn" style={{width:"100%",justifyContent:"flex-start",padding:"10px 12px",height:"auto",borderColor:"var(--danger)"}}>
                <Ico.X size={12} color="var(--danger)"/>
                <div style={{textAlign:"left",marginLeft:4}}>
                  <div style={{fontSize:12,fontWeight:600,color:"var(--danger)"}}>Not Duplicates</div>
                  <div style={{fontSize:10,color:"var(--ink-3)"}}>Different content</div>
                </div>
              </button>
            </div>

            <div className="card" style={{padding:12}}>
              <b style={{fontSize:12}}>Provenance Overview</b>
              <div style={{fontSize:11,marginTop:8,display:"flex",flexDirection:"column",gap:5}}>
                <div className="flex items-center justify-between">
                  <span className="muted">Common Source</span>
                  <span style={{fontSize:10,textAlign:"right"}}>Q4 2024 GTM Strategy<br/><span className="muted">Aug 28, 2025</span></span>
                </div>
                <div className="flex items-center justify-between" style={{marginTop:2}}>
                  <span className="muted">Diverged</span>
                  <span className="mono" style={{fontSize:10}}>89 days ago</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="muted">Authors</span>
                  <div className="flex items-center gap-1">
                    <Avatar who="Sarah Chen" className="xs"/>
                    <Avatar who="Michael Lee" className="xs"/>
                    <span className="muted" style={{fontSize:10}}>+3</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="muted">Collections</span>
                  <span style={{fontSize:10}}>Strategy & Solutions <a className="link" style={{fontSize:10}}>View all</a></span>
                </div>
              </div>
              <button className="btn btn-sm mt-2" style={{width:"100%"}}><Ico.Lineage size={12}/> View Full Provenance Graph</button>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}

window.RouteReviewsV2 = RouteReviewsV2;
