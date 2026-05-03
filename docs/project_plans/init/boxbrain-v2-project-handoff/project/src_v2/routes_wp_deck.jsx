/* WorkProduct Deck Detail — full detail view for a deck-type WorkProduct
   showing all contained ContentUnits, variants, lineage, usage & AI insights. */

function WpdDeckMini({variant="dark", title, brand="NW", overlay, active}) {
  return (
    <div className={`slide-thumb ${variant}`} style={{fontSize:11,border:active?"2px solid var(--primary)":"1px solid var(--line)",boxShadow:active?"0 0 0 3px color-mix(in oklab, var(--primary) 14%, transparent)":"none"}}>
      <div className="content">
        <div className="brand">{brand}</div>
        <div className="title" style={{marginTop:"auto",fontSize:"1.15em"}}>{title}</div>
      </div>
      {overlay}
    </div>
  );
}

function WpdDonut({v=92, color="var(--ok)", size=56, label}) {
  const r = 22, C = 2*Math.PI*r;
  const off = C - (v/100)*C;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--bg-2)" strokeWidth="5"/>
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 28 28)"/>
      <text x="28" y="30" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--ink)">{v}</text>
      {label && <text x="28" y="42" textAnchor="middle" fontSize="7" fill="var(--ink-3)">{label}</text>}
    </svg>
  );
}

function WpdBars({data, h=44}) {
  const max = Math.max(...data.map(d=>d.v));
  return (
    <svg viewBox={`0 0 ${data.length*14} ${h}`} style={{width:"100%",height:h}} preserveAspectRatio="none">
      {data.map((d,i)=>{
        const bh = (d.v/max)*(h-4);
        return <rect key={i} x={i*14+2} y={h-bh-2} width="10" height={bh} fill={d.c||"var(--primary)"} rx="1.5" opacity={d.faded?0.35:1}/>;
      })}
    </svg>
  );
}

function RouteWpDeckDetail({go}) {
  const [activeVariant, setActiveVariant] = React.useState("Board");
  const [activeSlot, setActiveSlot] = React.useState("1.3");
  const [previewIdx, setPreviewIdx] = React.useState(0);
  const [openSections, setOpenSections] = React.useState({1:true, 2:true, 3:true});

  const variants = [
    {n:"Board", tag:"Current", slides:24, c:"dark", approved:true, current:true},
    {n:"Executive", tag:"", slides:24, c:"light", approved:true},
    {n:"Technical", tag:"", slides:32, c:"teal", approved:false},
    {n:"Regional — EMEA", tag:"", slides:28, c:"purple", approved:false},
  ];

  const previews = [
    {t:"Northwind Expansion", s:"Board Brief", c:"dark"},
    {t:"Executive Summary", s:"Strategy overview", c:"light"},
    {t:"Strategic Priorities", s:"3 pillars", c:"dark"},
    {t:"Market Opportunity", s:"TAM & growth", c:"teal"},
    {t:"Competitive Landscape", s:"Positioning", c:"purple"},
    {t:"Financial Impact", s:"Revenue model", c:"light"},
    {t:"Next Steps", s:"Commitments", c:"dark"},
  ];

  const sections = [
    {n:1, t:"Executive Summary", slots:3, slots_list:[
      {id:"1.1", t:"Title Slide", purpose:"Set context & branding", cu:"Title Slide — Northwind Board v2.5", src:"Slide", dt:"May 22, 2025"},
      {id:"1.2", t:"Key Takeaways", purpose:"3–5 themes", cu:"Key Takeaways — Board v2.3", src:"Slide", dt:"May 20, 2025"},
      {id:"1.3", t:"Financial Impact Snapshot", purpose:"Headline financial impact", cu:"Financial Snapshot — Board v3.3", src:"Chart", dt:"May 22, 2025", active:true},
    ]},
    {n:2, t:"Strategic Rationale", slots:4, slots_list:[
      {id:"2.1", t:"Market Opportunity", purpose:"Market size & growth", cu:"Market Opportunity — Board v2.1", src:"Slide", dt:"May 18, 2025"},
      {id:"2.2", t:"Competitive Landscape", purpose:"Positioning & threats", cu:"Competitive Landscape v1.6", src:"Slide", dt:"May 17, 2025"},
      {id:"2.3", t:"Customer Demand", purpose:"Customer need & demand", cu:"Customer Demand — Board v1.1", src:"Slide", dt:"May 18, 2025"},
      {id:"2.4", t:"Strategic Fit", purpose:"Alignment to strategy", cu:"Strategic Fit v1.3", src:"Slide", dt:"May 16, 2025"},
    ]},
    {n:3, t:"Financial Impact", slots:3, slots_list:[]},
  ];

  const swapAlternatives = [
    {t:"Financial Snapshot — Board v3.5", tag:"Slide", dt:"May 22, 2025", current:false, better:true},
    {t:"Financial Snapshot — Technical v1.2", tag:"Chart", dt:"May 20, 2025"},
    {t:"Financial Snapshot — Regional v1.1", tag:"Chart", dt:"May 17, 2025"},
  ];

  return (
    <div className="route-wrap">
      <Topbar crumbs={["WorkProducts","Northwind Expansion — Executive Brief","Work Product Detail"]}/>
      <div className="route-body" style={{paddingTop:16}}>
        {/* Title Row */}
        <div className="flex items-start justify-between" style={{marginBottom:4}}>
          <div>
            <div className="flex items-center gap-2">
              <h1 style={{fontSize:24,margin:0,letterSpacing:"-0.015em"}}>Northwind Expansion — Executive Brief</h1>
              <Badge>Deck</Badge>
              <span style={{fontSize:11,background:"var(--bg-2)",color:"var(--ink-3)",padding:"2px 7px",borderRadius:4,fontFamily:"var(--mono)",fontWeight:500}}>v3.2</span>
              <Badge kind="ok">Latest</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm"><Ico.Eye size={13}/> Preview Full Deck</button>
            <button className="btn btn-sm"><Ico.Share size={13}/> Share</button>
            <button className="icon-btn"><Ico.More size={14}/></button>
            <div className="btn-split" style={{marginLeft:4}}>
              <button className="btn btn-primary btn-sm"><Ico.Plus size={13}/> Create Variant</button>
              <button className="btn btn-primary btn-sm"><Ico.Down size={11}/></button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{marginTop:14,marginBottom:18}}>
          <div className="tab active">Overview</div>
          <div className="tab">Variants <span className="count-inline">4</span></div>
          <div className="tab">Versions <span className="count-inline">7</span></div>
          <div className="tab">Similar</div>
          <div className="tab" onClick={()=>go("wpStoryboard")} style={{cursor:"pointer"}}>Storyboard</div>
          <div className="tab">Comments <span className="count-inline">3</span></div>
          <div className="tab">Notes <span className="count-inline">2</span></div>
          <div className="tab">Activity</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:20,alignItems:"start"}}>
          <div style={{display:"flex",flexDirection:"column",gap:18}}>

            {/* Row 1 — Deck Preview + Variants */}
            <div style={{display:"grid",gridTemplateColumns:"1.1fr 1fr",gap:16}}>
              {/* Deck Preview */}
              <div className="card" style={{padding:16}}>
                <div className="flex items-center justify-between" style={{marginBottom:10}}>
                  <div className="flex items-center gap-2">
                    <b style={{fontSize:13}}>Deck Preview</b>
                    <span className="muted" style={{fontSize:12}}>— Executive <span style={{color:"var(--primary)"}}>(Current Variant)</span></span>
                    <Ico.Info size={11} color="var(--ink-4)"/>
                  </div>
                </div>
                <div style={{position:"relative"}}>
                  <div style={{borderRadius:8,overflow:"hidden"}}>
                    <WpdDeckMini variant={previews[previewIdx].c} title={previews[previewIdx].t} brand="NORTHWIND"/>
                  </div>
                  <button onClick={()=>setPreviewIdx(Math.max(0,previewIdx-1))} className="icon-btn" style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",background:"rgba(15,23,42,0.6)",color:"#fff",border:"none",width:28,height:28,borderRadius:"50%"}}><Ico.Left size={14}/></button>
                  <button onClick={()=>setPreviewIdx(Math.min(previews.length-1,previewIdx+1))} className="icon-btn" style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"rgba(15,23,42,0.6)",color:"#fff",border:"none",width:28,height:28,borderRadius:"50%"}}><Ico.Right size={14}/></button>
                </div>
                <div className="flex items-center justify-between mt-3" style={{fontSize:12,color:"var(--ink-3)"}}>
                  <span className="mono">{previewIdx+1} / 24</span>
                  <div className="flex items-center gap-1">
                    <button className="icon-btn borderless" style={{width:26,height:26}}><Ico.Grid size={12}/></button>
                    <button className="icon-btn borderless" style={{width:26,height:26}}><Ico.External size={12}/></button>
                  </div>
                </div>
              </div>

              {/* Variants */}
              <div className="card" style={{padding:16}}>
                <div className="flex items-center justify-between" style={{marginBottom:10}}>
                  <div className="flex items-center gap-2">
                    <b style={{fontSize:13}}>Deck Variants</b>
                  </div>
                  <button className="btn btn-xs"><Ico.Settings size={11}/> Manage Variants</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:10}}>
                  {variants.slice(0,3).map(v=>(
                    <div key={v.n} onClick={()=>setActiveVariant(v.n)} style={{cursor:"pointer"}}>
                      <div style={{marginBottom:6,fontSize:11,fontWeight:600,color:activeVariant===v.n?"var(--primary)":"var(--ink-2)",display:"flex",alignItems:"center",gap:4}}>
                        {v.n}
                        {v.tag && <Badge kind="primary" style={{fontSize:9}}>{v.tag}</Badge>}
                      </div>
                      <WpdDeckMini variant={v.c} title={v.n+" Brief"} brand="NW" active={activeVariant===v.n}/>
                      <div className="flex items-center justify-between mt-1" style={{fontSize:10,color:"var(--ink-3)"}}>
                        <span>{v.slides} slides</span>
                        {v.approved && <Ico.Check size={10} color="var(--ok)"/>}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Extra: single 4th variant inline note */}
                <div className="flex items-center gap-2 mt-2" style={{fontSize:11,color:"var(--ink-3)",paddingTop:8,borderTop:"1px dashed var(--line-soft)"}}>
                  <span style={{width:18,height:18,borderRadius:4,background:"linear-gradient(135deg,#312e81,#6d28d9)"}}/>
                  <span><b style={{color:"var(--ink-2)",fontWeight:600}}>Regional — EMEA</b></span>
                  <span className="muted">28 slides</span>
                  <Badge kind="warn" style={{marginLeft:"auto",fontSize:9}}>Pending</Badge>
                  <Ico.Right size={11}/>
                </div>
              </div>
            </div>

            {/* Row 2 — Variant Composition (big table) */}
            <div className="card" style={{padding:0,overflow:"visible"}}>
              <div className="flex items-center justify-between" style={{padding:"14px 18px",borderBottom:"1px solid var(--line)"}}>
                <div>
                  <b style={{fontSize:14}}>Variant Composition — <span style={{color:"var(--primary)"}}>{activeVariant}</span></b>
                  <div className="muted" style={{fontSize:12,marginTop:2}}>Each slot is powered by a content unit selection. Changes here update the variant.</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="muted" style={{fontSize:12}}>View as</span>
                  <div className="select-wrap"><select><option>Slots</option><option>Slides</option><option>Sections</option></select></div>
                  <button className="btn btn-xs"><Ico.Up size={11}/> Collapse All</button>
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:0}}>
                {/* LEFT: Composition table */}
                <div style={{borderRight:"1px solid var(--line)"}}>
                  <div style={{display:"grid",gridTemplateColumns:"auto 1fr 1.2fr 1fr 0.7fr 0.8fr 24px",gap:10,padding:"10px 18px",fontSize:10,fontWeight:600,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.04em",background:"var(--bg-2)",borderBottom:"1px solid var(--line)"}}>
                    <span>#</span>
                    <span>Section / Slot</span>
                    <span>Purpose</span>
                    <span>Selected Content Unit</span>
                    <span>Source</span>
                    <span>Last Edited</span>
                    <span/>
                  </div>
                  {sections.map(sec=>(
                    <div key={sec.n}>
                      <div onClick={()=>setOpenSections(s=>({...s,[sec.n]:!s[sec.n]}))} className="flex items-center gap-2" style={{padding:"10px 18px",background:"var(--bg)",borderBottom:"1px solid var(--line-soft)",cursor:"pointer",fontSize:12,fontWeight:600}}>
                        {openSections[sec.n] ? <Ico.Down size={12}/> : <Ico.Right size={12}/>}
                        <span>{sec.n}. {sec.t}</span>
                        <span className="muted" style={{fontSize:11,fontWeight:400}}>({sec.slots})</span>
                      </div>
                      {openSections[sec.n] && sec.slots_list.map(s=>(
                        <div key={s.id} onClick={()=>setActiveSlot(s.id)}
                          style={{display:"grid",gridTemplateColumns:"auto 1fr 1.2fr 1fr 0.7fr 0.8fr 24px",gap:10,padding:"11px 18px",fontSize:12,alignItems:"center",
                            borderBottom:"1px solid var(--line-soft)",cursor:"pointer",
                            background:activeSlot===s.id?"var(--primary-bg)":"transparent"}}>
                          <span className="mono muted" style={{fontSize:11}}>{s.id}</span>
                          <span style={{fontWeight:activeSlot===s.id?600:500,color:"var(--ink)"}}>{s.t}</span>
                          <span className="muted" style={{fontSize:11.5}}>{s.purpose}</span>
                          <a className="link" style={{fontSize:11.5,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.cu}</a>
                          <span className="muted" style={{fontSize:11}}>{s.src}</span>
                          <span className="muted" style={{fontSize:11}}>{s.dt}</span>
                          <button className="icon-btn borderless" style={{width:22,height:22}}><Ico.More size={11}/></button>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div style={{padding:"12px 18px"}}>
                    <button className="btn btn-sm"><Ico.Compare size={13}/> Compare Variants</button>
                  </div>
                </div>

                {/* RIGHT: Slot Details */}
                <div style={{padding:16}}>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>Slot Details · <span style={{color:"var(--primary)"}}>1.3 Financial Impact Snapshot</span></div>

                  <div style={{fontSize:11,fontWeight:600,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:8}}>Current Selection</div>
                  <div className="card" style={{padding:10,border:"1px solid var(--primary)",background:"var(--primary-bg)",marginBottom:14}}>
                    <div className="flex items-start gap-8">
                      <div style={{width:76}}>
                        <WpdDeckMini variant="light" title="Financial Impact" brand="NW"/>
                      </div>
                      <div style={{flex:1,minWidth:0,fontSize:11.5}}>
                        <div style={{fontWeight:600}}>Financial Snapshot — Board v3.3</div>
                        <div className="muted" style={{fontSize:11}}>Content Unit</div>
                        <div style={{borderTop:"1px dashed var(--primary-border)",margin:"8px 0",paddingTop:6,display:"grid",gridTemplateColumns:"auto 1fr",gap:"3px 10px",fontSize:11}}>
                          <span className="muted">Owner</span><span>Finance Team</span>
                          <span className="muted">Last Edited</span><span>May 22, 2025</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between" style={{marginBottom:6}}>
                    <div style={{fontSize:11,fontWeight:600,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.04em"}}>Swap This Slide</div>
                    <div className="flex items-center gap-1">
                      <button className="icon-btn borderless" style={{width:22,height:22}}><Ico.Search size={11}/></button>
                      <button className="icon-btn borderless" style={{width:22,height:22}}><Ico.Filter size={11}/></button>
                    </div>
                  </div>
                  <div style={{fontSize:11,color:"var(--ink-3)",marginBottom:8}}>Search alternative content units…</div>
                  {swapAlternatives.map((a,i)=>(
                    <div key={i} className="flex items-center gap-2" style={{padding:"8px 0",borderBottom:i<swapAlternatives.length-1?"1px dashed var(--line-soft)":"none"}}>
                      <div style={{width:44}}>
                        <WpdDeckMini variant={i===0?"light":i===1?"teal":"purple"} title="FS" brand="" />
                      </div>
                      <div style={{flex:1,minWidth:0,fontSize:11}}>
                        <div style={{fontWeight:500}}>{a.t}</div>
                        <div className="muted" style={{fontSize:10}}>{a.tag} · {a.dt}</div>
                      </div>
                      {a.better && <Badge kind="ok" style={{fontSize:9}}>+8</Badge>}
                      <button className="btn btn-xs">Swap</button>
                    </div>
                  ))}

                  <button className="btn btn-sm mt-3" style={{width:"100%",justifyContent:"center"}}><Ico.Library size={13}/> Browse Content Library</button>
                </div>
              </div>
            </div>

            {/* Row 3 — Analytics */}
            <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1fr",gap:16}}>
              {/* Usage & Performance */}
              <div className="card" style={{padding:16}}>
                <div className="flex items-center justify-between" style={{marginBottom:10}}>
                  <b style={{fontSize:13}}>Usage & Performance</b>
                  <div className="select-wrap"><select style={{fontSize:11}}><option>Last 30 days</option><option>90 days</option></select></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:14,marginBottom:12}}>
                  {[
                    {l:"Views",v:"1.2K",d:"+18%",up:true},
                    {l:"Shares",v:"36",d:"+12%",up:true},
                    {l:"Avg. Time Viewed",v:"6m 24s",d:"+8%",up:true},
                    {l:"Downloads",v:"24",d:"−5%",up:false},
                  ].map((s,i)=>(
                    <div key={i}>
                      <div className="muted" style={{fontSize:10,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.04em"}}>{s.l}</div>
                      <div style={{fontSize:20,fontWeight:700,letterSpacing:"-0.02em",marginTop:2}}>{s.v}</div>
                      <div style={{fontSize:10,color:s.up?"var(--ok)":"var(--danger)",fontWeight:600,display:"flex",alignItems:"center",gap:2}}>
                        {s.up?<Ico.ArrowUp size={10}/>:<Ico.Down size={10}/>} {s.d}
                      </div>
                    </div>
                  ))}
                </div>
                <WpdBars h={60} data={Array.from({length:14},(_,i)=>({v:20+Math.sin(i*0.9)*14+i*2, c:"var(--primary)"}))}/>
                <div className="flex items-center justify-between mt-1" style={{fontSize:10,color:"var(--ink-3)"}}>
                  <span>Apr 23</span><span>May 7</span><span>May 22</span>
                </div>
              </div>

              {/* Collaboration & Notes */}
              <div className="card" style={{padding:16}}>
                <div className="flex items-center justify-between" style={{marginBottom:10}}>
                  <b style={{fontSize:13}}>Collaboration & Notes <span className="count-inline">3</span></b>
                </div>
                <div className="flex items-center gap-2" style={{padding:"6px 10px",border:"1px solid var(--line)",borderRadius:6,marginBottom:10}}>
                  <Ico.Plus size={12} color="var(--ink-3)"/>
                  <span className="muted" style={{fontSize:11.5}}>Add a note or @mention…</span>
                </div>
                <div className="flex items-start gap-2" style={{marginBottom:10}}>
                  <Avatar who="Mark Thompson" className="sm"/>
                  <div style={{flex:1,fontSize:11.5}}>
                    <div><b>Mark Thompson</b> <span className="muted" style={{fontSize:10.5}}>May 22, 2025 3:14 PM</span></div>
                    <div style={{color:"var(--ink-2)",lineHeight:1.45,marginTop:2}}>Updated financial assumptions in the snapshot. Please review.</div>
                    <div className="flex items-center gap-2 mt-1" style={{fontSize:10.5}}>
                      <a className="link" style={{fontSize:10.5}}>@Finance Team</a>
                      <a className="link" style={{fontSize:10.5}}>@Sarah Chen</a>
                      <span className="muted">·</span>
                      <a className="link" style={{fontSize:10.5}}>Reply</a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Similarity Suggestions */}
              <div className="card" style={{padding:16}}>
                <div className="flex items-center justify-between" style={{marginBottom:10}}>
                  <b style={{fontSize:13}}>Similarity Suggestions</b>
                  <a className="link" style={{fontSize:11}}>View all</a>
                </div>
                {[
                  {t:"Northwind Expansion — Investor Deck", m:"92%", dt:"Deck · v3.1", c:"dark"},
                  {t:"Northwind Expansion — Technical Deep Dive", m:"88%", dt:"Deck · v1.0", c:"teal"},
                  {t:"Q2 Financial Outlook — Board Pack", m:"74%", dt:"Deck · v2.2", c:"purple"},
                ].map((s,i)=>(
                  <div key={i} className="flex items-center gap-2" style={{padding:"7px 0",borderBottom:i<2?"1px dashed var(--line-soft)":"none"}}>
                    <div style={{width:44,flexShrink:0}}>
                      <WpdDeckMini variant={s.c} title="NW" brand="" />
                    </div>
                    <div style={{flex:1,minWidth:0,fontSize:11}}>
                      <div style={{fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.t}</div>
                      <div className="muted" style={{fontSize:10}}><span style={{color:"var(--primary)",fontWeight:600}}>{s.m} similar</span> · {s.dt}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT RAIL */}
          <aside style={{display:"flex",flexDirection:"column",gap:14,position:"sticky",top:16}}>
            {/* Build Manifest */}
            <div className="card" style={{padding:14}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <b style={{fontSize:13}}>Build Manifest</b>
                <Ico.Info size={11} color="var(--ink-4)"/>
              </div>
              <div className="flex items-center gap-2" style={{marginBottom:10,fontSize:11,color:"var(--ink-3)"}}>
                Board · v3.2 <span style={{flex:1}}/> Last built: May 22, 10:42 AM
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:8,marginBottom:8}}>
                {[{l:"Slides",v:"24"},{l:"Content Units",v:"18"},{l:"Collections",v:"6"},{l:"Size",v:"42.6 MB"}].map((m,i)=>(
                  <div key={i} style={{background:"var(--bg-2)",borderRadius:6,padding:8,textAlign:"center"}}>
                    <div style={{fontSize:16,fontWeight:700,letterSpacing:"-0.02em",lineHeight:1}}>{m.v}</div>
                    <div className="muted" style={{fontSize:10,marginTop:2}}>{m.l}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1" style={{fontSize:11,color:"var(--ok)"}}>
                <Ico.Check size={11}/> All changes saved
              </div>
            </div>

            {/* Lineage & Provenance */}
            <div className="card" style={{padding:14}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <b style={{fontSize:13}}>Lineage & Provenance</b>
              </div>
              <div className="flex items-center gap-2" style={{fontSize:11,marginBottom:8}}>
                <Avatar who="Sarah Chen" className="sm"/>
                <div style={{flex:1}}><b>Created by</b> <span className="muted">Sarah Chen</span></div>
                <span className="muted" style={{fontSize:10}}>May 23, 2025</span>
              </div>
              <div style={{fontSize:11,paddingTop:8,borderTop:"1px dashed var(--line-soft)"}}>
                <div className="muted" style={{fontSize:10,marginBottom:2}}>Derived from</div>
                <a className="link" style={{fontSize:11}}>Northwind Expansion — Pitch Deck v5.0</a>
              </div>
              <div style={{fontSize:11,paddingTop:8,marginTop:8,borderTop:"1px dashed var(--line-soft)"}}>
                <div className="muted" style={{fontSize:10,marginBottom:2}}>Uses content from</div>
                <div className="flex items-center gap-2">
                  <a className="link" style={{fontSize:11}}>18 Content Units</a>
                  <span className="muted">·</span>
                  <a className="link" style={{fontSize:11}}>6 Collections</a>
                </div>
              </div>
              <button className="btn btn-xs mt-3" style={{width:"100%",justifyContent:"center"}}><Ico.Lineage size={11}/> View Provenance Graph</button>
            </div>

            {/* Freshness & Approval */}
            <div className="card" style={{padding:14}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <b style={{fontSize:13}}>Freshness & Approval</b>
              </div>
              <div className="flex items-center gap-3" style={{marginBottom:12}}>
                <WpdDonut v={88} color="var(--ok)" size={52}/>
                <div style={{flex:1}}>
                  <div className="muted" style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",fontWeight:600}}>Content Freshness</div>
                  <Badge kind="ok">Good</Badge>
                  <div className="muted" style={{fontSize:10,marginTop:2}}>Updated 3 of 18 content units</div>
                </div>
              </div>
              <div className="flex items-center gap-3" style={{marginBottom:6}}>
                <WpdDonut v={100} color="var(--ok)" size={52}/>
                <div style={{flex:1}}>
                  <div className="muted" style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",fontWeight:600}}>Approval Status</div>
                  <Badge kind="ok">Approved</Badge>
                  <div className="muted" style={{fontSize:10,marginTop:2}}>By Sarah Chen on May 22, 2025</div>
                </div>
              </div>
              <a className="link" style={{fontSize:11,display:"inline-block",marginTop:6}}>View Approval History</a>
            </div>

            {/* Derived Work Product Variants */}
            <div className="card" style={{padding:14}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <b style={{fontSize:13}}>Derived Work Product Variants</b>
              </div>
              {[
                {n:"Executive", v:"v3.2", slides:24, status:"Approved", kind:"ok"},
                {n:"Technical", v:"v3.2", slides:32, status:"Pending", kind:"warn"},
                {n:"Regional — EMEA", v:"v3.0", slides:28, status:"Pending", kind:"warn"},
              ].map((d,i)=>(
                <div key={i} className="flex items-center gap-2" style={{padding:"7px 0",borderBottom:i<2?"1px dashed var(--line-soft)":"none",fontSize:11}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600}}>{d.n}</div>
                    <div className="muted" style={{fontSize:10}}><span className="mono">{d.v}</span> · {d.slides} slides</div>
                  </div>
                  <Badge kind={d.kind} style={{fontSize:9}}>{d.status}</Badge>
                </div>
              ))}
              <button className="btn btn-xs mt-3" style={{width:"100%",justifyContent:"center"}}><Ico.Settings size={11}/> Manage Variants</button>
            </div>

            {/* AI Insights */}
            <div className="card" style={{padding:14,background:"linear-gradient(180deg,var(--ai-bg),var(--paper))",borderColor:"var(--ai-border)"}}>
              <div className="flex items-center gap-2" style={{marginBottom:8}}>
                <Ico.Sparkle size={14} color="var(--ai)"/>
                <b style={{fontSize:13}}>AI Insights</b>
                <span style={{fontSize:9,padding:"1px 6px",background:"var(--ai)",color:"#fff",borderRadius:4,fontWeight:700}}>BETA</span>
              </div>
              <div style={{fontSize:11.5,color:"var(--ink-2)",marginBottom:8}}>Detected 3 content units that may impact this deck.</div>
              {[
                {t:"Market Size & Growth (Q2)", dt:"Updated May 22, 2025"},
                {t:"Competitive Landscape (Q2)", dt:"Updated May 21, 2025"},
                {t:"Customer Demand Trends", dt:"Updated May 18, 2025"},
              ].map((s,i)=>(
                <div key={i} style={{padding:"6px 0",borderBottom:i<2?"1px dashed var(--line-soft)":"none",fontSize:11}}>
                  <div style={{fontWeight:500}}>{s.t}</div>
                  <div className="muted" style={{fontSize:10}}>{s.dt}</div>
                </div>
              ))}
              <button className="btn btn-xs mt-3" style={{width:"100%",justifyContent:"center",borderColor:"var(--ai-border)",color:"var(--ai)"}}><Ico.Refresh size={11}/> Review Updates</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

window.RouteWpDeckDetail = RouteWpDeckDetail;
