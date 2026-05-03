/* Opportunity Storyboard — net new tab on Opportunity page. */
/* Mirrors the WorkProduct storyboard pattern but storyboards Plays + WorkProducts
   instead of ContentUnits. Plays fill the narrative slots; WorkProducts are the
   candidate "ContentUnits" equivalent. */

function OppSbDonut({v=76, color="var(--primary)", size=80, label="Good", sub}) {
  const r = 30, C = 2*Math.PI*r;
  const off = C - (v/100)*C;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--bg-2)" strokeWidth="7"/>
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 40 40)"/>
        <text x="40" y="42" textAnchor="middle" fontSize="19" fontWeight="700" fill="var(--ink)" letterSpacing="-0.02em">{v}</text>
        <text x="40" y="56" textAnchor="middle" fontSize="8" fill="var(--ink-3)" fontWeight="500">/100</text>
      </svg>
      {label && <div style={{fontSize:12,fontWeight:600,color}}>{label}</div>}
      {sub && <div className="muted" style={{fontSize:11,textAlign:"center"}}>{sub}</div>}
    </div>
  );
}

function OppHealthRow({label, v, color}) {
  const c = color || (v>=80?"var(--ok)":v>=65?"var(--primary)":v>=50?"var(--warn)":"var(--danger)");
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 80px 34px",gap:8,alignItems:"center",fontSize:11,padding:"4px 0"}}>
      <span style={{color:"var(--ink-2)"}}>{label}</span>
      <div style={{height:5,background:"var(--bg-2)",borderRadius:3,overflow:"hidden"}}>
        <div style={{width:`${v}%`,height:"100%",background:c}}/>
      </div>
      <span style={{textAlign:"right",fontWeight:600,color:"var(--ink-2)"}}>{v}</span>
    </div>
  );
}

function OppStoryboardChip({n, title, sub, slideTitle, variant="light", id, active, onClick}) {
  return (
    <div onClick={onClick} style={{cursor:"pointer",flex:"1 1 0",minWidth:0}}>
      <div style={{fontSize:11,fontWeight:700,color:"var(--ink)",marginBottom:1}}>
        {n}. {title}
      </div>
      <div className="muted" style={{fontSize:10,marginBottom:6,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sub}</div>
      <div className="card" style={{padding:6,position:"relative",borderColor:active?"var(--primary)":"var(--line)",boxShadow:active?"0 0 0 2px color-mix(in oklab, var(--primary) 20%, transparent)":"none",background:active?"var(--primary-bg)":"var(--paper)"}}>
        <div style={{borderRadius:3,overflow:"hidden"}}>
          <SlideThumb variant={variant} title={slideTitle} brand=""/>
        </div>
        {active && (
          <span style={{position:"absolute",top:4,right:4,background:"var(--primary)",color:"#fff",borderRadius:"50%",width:16,height:16,display:"grid",placeItems:"center"}}>
            <Ico.Check size={10}/>
          </span>
        )}
      </div>
      <div className="mono muted" style={{fontSize:9,marginTop:4}}>{id}</div>
      <div className="flex items-center gap-1" style={{marginTop:2,fontSize:9}}>
        <span style={{background:"var(--primary-bg)",color:"var(--primary)",padding:"1px 4px",borderRadius:3,fontWeight:600}}>82</span>
        <span style={{background:"var(--ai-bg)",color:"var(--ai)",padding:"1px 4px",borderRadius:3,fontWeight:600}}>91%</span>
        <span style={{background:"var(--ok-bg, #ecfdf5)",color:"var(--ok)",padding:"1px 4px",borderRadius:3,fontWeight:600}}>14</span>
      </div>
    </div>
  );
}

function RouteOppStoryboard({go}) {
  const [activeStep, setActiveStep] = React.useState(3);
  const [selected, setSelected] = React.useState(["ba-1","ba-3","ba-5","ba-7"]);

  const story = [
    {n:1, t:"Executive Summary", sub:"Why modernization now", st:"Executive Summary", id:"SLD-10304", v:"light"},
    {n:2, t:"The Modernization Gap", sub:"The challenge we're solving", st:"Modernization", id:"SLD-10478", v:"light"},
    {n:3, t:"Our Platform Advantage", sub:"Why BoxBrain", st:"Platform Overview", id:"SLD-10112", v:"dark"},
    {n:4, t:"Business Impact", sub:"Quantified outcomes", st:"ROI Analysis", id:"SLD-10540", v:"dark", active:true},
    {n:5, t:"Customer Proof", sub:"Real-world results", st:"Customer Story", id:"SLD-10212", v:"light"},
    {n:6, t:"Implementation", sub:"How we get there", st:"Implementation", id:"SLD-10877", v:"dark"},
    {n:7, t:"Next Steps", sub:"Let's build together", st:"Decision Timeline", id:"SLD-10661", v:"light"},
  ];

  const plays = [
    {t:"Global Expansion Play", k:"PLAYBOOK", winRate:58, match:88, desc:"Proven for enterprise digital transformation"},
    {t:"Cross-Sell New Products", k:"ACCELERATOR", winRate:72, match:68},
    {t:"Account Growth Accelerator", k:"SUPPORTING", winRate:65, match:44},
  ];

  const workProducts = [
    {t:"Global Expansion Business Case", meta:"Document · Updated Apr 22", status:"Recommended", statusK:"primary"},
    {t:"ROI Analysis — EMEA & APAC", meta:"Model · Updated May 12", status:"Recommended", statusK:"primary"},
    {t:"Executive Briefing Deck", meta:"Presentation · Updated Apr 19", status:"In Review", statusK:"warn"},
    {t:"Implementation Plan (EMEA)", meta:"Document · Updated Apr 22", status:"Approved", statusK:"ok"},
  ];

  const candidates = [
    {t:"Business Impact — Financial", id:"SLD-10012", date:"Updated Apr 14", score:93},
    {t:"Business Impact — Operational", id:"SLD-10013", date:"Updated Apr 12", score:91},
    {t:"Business Impact — Strategic", id:"SLD-10014", date:"Updated Apr 10", score:89},
    {t:"Business Impact — Customer", id:"SLD-10015", date:"Updated Apr 08", score:86},
    {t:"ROI Sensitivity Analysis", id:"SLD-10022", date:"Updated Apr 16", score:84},
  ];

  const savedSelections = [
    {t:"Business Impact", from:"Saved earlier", type:"Slide"},
    {t:"Customer Story — Acme Use Case", from:"From Play", type:"Story"},
    {t:"ROI Sensitivity Analysis", from:"Analyst pack", type:"Model"},
  ];

  const baVariants = [
    {id:"ba-1", label:"Executive Summary", c:"Standard (Current)", current:true, cov:88, sp:"Water-savvy, high-level overview"},
    {id:"ba-3", label:"The Modernization Gap", c:"Executive (Condensed)", cov:82, sp:"Concise; one-page story"},
    {id:"ba-5", label:"Our Platform Advantage", c:"Technical (Deep Dive)", cov:71, sp:"Architecture + deep detail"},
    {id:"ba-7", label:"Business Impact", c:"Standard (Current)", current:true, cov:91, sp:"ROI + benchmark blend"},
  ];

  const rationale = [
    {t:"High fit for Global Expansion (89%)",k:"fit"},
    {t:"Strong engagement signals",k:"signal"},
    {t:"Recent context consumption on ROI",k:"context"},
    {t:"Moderate risk in procurement timing",k:"risk"},
  ];

  return (
    <div className="route-wrap">
      <Topbar crumbs={["Opportunities","Acme Corp","Global Expansion Opportunity"]}/>
      <div className="route-body">

        {/* HEADER STRIP */}
        <div className="flex items-start justify-between" style={{marginBottom:8}}>
          <div className="flex items-center gap-3">
            <span style={{width:32,height:32,borderRadius:8,background:"var(--primary-bg)",color:"var(--primary)",display:"grid",placeItems:"center"}}>
              <Ico.Target size={16}/>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 style={{fontSize:22,margin:0,letterSpacing:"-0.01em"}}>Global Expansion Opportunity</h1>
                <Ico.Star size={16} color="var(--ink-4)"/>
              </div>
              <div className="flex items-center gap-3 mt-1" style={{fontSize:12,color:"var(--ink-3)"}}>
                <b style={{color:"var(--ink)",fontWeight:600,fontSize:14}}>$1.5M</b>
                <span className="muted">· Commit · Close Date: Jul 31, 2025 (60 days left) · Owner: Sarah Chen</span>
                <Badge kind="ok">Active</Badge>
                <span className="chip" style={{fontSize:11}}><Ico.Plus size={10}/> Add Tag</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm"><Ico.Plus size={13}/> Add to Collection</button>
            <button className="btn btn-sm"><Ico.Share size={13}/> Share</button>
            <button className="btn btn-primary btn-sm"><Ico.Edit size={13}/> Edit Opportunity</button>
            <button className="icon-btn"><Ico.More size={14}/></button>
          </div>
        </div>

        {/* TABS */}
        <div className="tabs" style={{marginTop:10}}>
          <div className="tab">Overview</div>
          <div className="tab active">Storyboard <span className="count-inline" style={{background:"var(--ai-bg)",color:"var(--ai)"}}>New</span></div>
          <div className="tab">WorkProducts <span className="count-inline">24</span></div>
          <div className="tab">Assets <span className="count-inline">38</span></div>
          <div className="tab">Activity</div>
          <div className="tab">Stakeholders <span className="count-inline">6</span></div>
          <div className="tab">Insights</div>
          <div className="tab">Notes <span className="count-inline">3</span></div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:14,alignItems:"start",marginTop:14}}>
          <div style={{display:"flex",flexDirection:"column",gap:12,minWidth:0}}>

            {/* TOP INFO ROW: Account / Relationship Health / Engagement / Stakeholders */}
            <div style={{display:"grid",gridTemplateColumns:"230px 200px 1fr 300px",gap:12}}>
              <div className="card" style={{padding:12}}>
                <div className="flex items-center justify-between" style={{marginBottom:6}}>
                  <b style={{fontSize:12}}>Account</b>
                </div>
                <div style={{fontSize:13,fontWeight:600}}>Acme Corp</div>
                <div className="muted" style={{fontSize:11}}>Technology · Software</div>
                <a className="link" style={{fontSize:11}}>acme.com</a>
                <div className="muted" style={{fontSize:11,marginTop:4}}>San Francisco, CA, US</div>
              </div>
              <div className="card" style={{padding:12,textAlign:"center"}}>
                <div className="flex items-center gap-1 justify-center" style={{fontSize:11,color:"var(--ink-3)",fontWeight:500,marginBottom:6}}>Relationship Health <Ico.Info size={10}/></div>
                <OppSbDonut v={82} color="var(--ok)" size={64} label="Healthy"/>
                <div className="muted" style={{fontSize:10,marginTop:4,textAlign:"center",lineHeight:1.3}}>Strong executive champions and growing multi-product usage.</div>
              </div>
              <div className="card" style={{padding:12}}>
                <div className="flex items-center justify-between" style={{marginBottom:6}}>
                  <b style={{fontSize:12}}>Engagement Trend</b>
                  <span className="muted" style={{fontSize:10}}>Last 90 days</span>
                </div>
                <div className="flex items-center gap-3" style={{fontSize:10,color:"var(--ink-3)",marginBottom:4}}>
                  <span className="flex items-center gap-1"><span style={{width:6,height:6,borderRadius:"50%",background:"var(--primary)"}}/> Meetings</span>
                  <span className="flex items-center gap-1"><span style={{width:6,height:6,borderRadius:"50%",background:"var(--ai)"}}/> Content Views</span>
                  <span className="flex items-center gap-1"><span style={{width:6,height:6,borderRadius:"50%",background:"var(--ok)"}}/> Trials</span>
                </div>
                <svg viewBox="0 0 260 70" style={{width:"100%",height:70}}>
                  <g stroke="var(--line-soft)" strokeDasharray="2 3">
                    {[0,1,2,3].map(i=><line key={i} x1="0" x2="260" y1={i*18+2} y2={i*18+2}/>)}
                  </g>
                  <path d="M0 50 L50 42 L100 38 L150 28 L200 22 L260 14" fill="none" stroke="var(--primary)" strokeWidth="1.5"/>
                  <path d="M0 58 L50 54 L100 48 L150 42 L200 36 L260 30" fill="none" stroke="var(--ai)" strokeWidth="1.5"/>
                  <path d="M0 62 L50 60 L100 56 L150 52 L200 46 L260 40" fill="none" stroke="var(--ok)" strokeWidth="1.5"/>
                  {["Feb 12","Mar 6","Apr 2","Apr 22","May 2"].map((l,i)=>(
                    <text key={i} x={i*52+10} y="68" fontSize="8" fill="var(--ink-3)">{l}</text>
                  ))}
                </svg>
              </div>
              <div className="card" style={{padding:12}}>
                <div className="flex items-center justify-between" style={{marginBottom:6}}>
                  <b style={{fontSize:12}}>Key Stakeholders (6)</b>
                  <a className="link" style={{fontSize:11}}>View all</a>
                </div>
                {[
                  {n:"James Whittaker",r:"VP, Global Operations",b:"Champion",bc:"ok"},
                  {n:"Priya Natrajan",r:"Director, IT Strategy",b:"High",bc:""},
                  {n:"Carlos Méndez",r:"VP, Finance",b:"Medium",bc:""},
                  {n:"Leah Kim",r:"Procurement Manager",b:"High",bc:""},
                ].map((s,i)=>(
                  <div key={i} className="flex items-center gap-2" style={{padding:"4px 0",borderBottom:i<3?"1px dashed var(--line-soft)":"none",fontSize:11}}>
                    <Avatar who={s.n} className="xs"/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:500,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.n}</div>
                      <div className="muted" style={{fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.r}</div>
                    </div>
                    <span style={{fontSize:9,padding:"1px 5px",borderRadius:3,background:s.bc==="ok"?"var(--ok-bg, #ecfdf5)":"var(--bg-2)",color:s.bc==="ok"?"var(--ok)":"var(--ink-2)",fontWeight:600}}>{s.b}</span>
                    <span className="muted" style={{fontSize:9}}>Engaged</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RECOMMENDED ROW */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 320px",gap:12}}>
              <div className="card" style={{padding:12}}>
                <div className="flex items-center justify-between" style={{marginBottom:6}}>
                  <div>
                    <b style={{fontSize:12}}>Top Recommended Plays</b>
                    <div className="muted" style={{fontSize:10}}>Based on opportunity score, stage, and persona.</div>
                  </div>
                  <a className="link" style={{fontSize:11}}>View all</a>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 60px 60px",gap:6,fontSize:10,color:"var(--ink-3)",borderBottom:"1px solid var(--line-soft)",padding:"4px 0"}}>
                  <span/>
                  <span style={{textAlign:"right"}}>Fit Rate</span>
                  <span style={{textAlign:"right"}}>Win Rate</span>
                </div>
                {plays.map((p,i)=>(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 60px 60px",gap:6,padding:"8px 0",borderBottom:i<2?"1px dashed var(--line-soft)":"none",alignItems:"center",fontSize:12}}>
                    <div>
                      <div className="flex items-center gap-1" style={{marginBottom:2}}>
                        <span style={{width:18,height:18,borderRadius:4,background:"var(--primary-bg)",color:"var(--primary)",display:"grid",placeItems:"center"}}><Ico.Plays size={10}/></span>
                        <b style={{fontSize:11}}>{p.t}</b>
                      </div>
                      <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.06em",color:i===0?"var(--primary)":"var(--ink-3)"}}>{p.k}</span>
                    </div>
                    <span style={{textAlign:"right",fontWeight:600,fontSize:11}}>{p.match}%</span>
                    <span style={{textAlign:"right",fontWeight:600,fontSize:11,color:"var(--ok)"}}>{p.winRate}%</span>
                  </div>
                ))}
              </div>

              <div className="card" style={{padding:12}}>
                <div className="flex items-center justify-between" style={{marginBottom:6}}>
                  <b style={{fontSize:12}}>Recommended WorkProducts</b>
                  <a className="link" style={{fontSize:11}}>View all</a>
                </div>
                {workProducts.map((w,i)=>(
                  <div key={i} className="flex items-center gap-2" style={{padding:"7px 0",borderBottom:i<3?"1px dashed var(--line-soft)":"none",fontSize:11}}>
                    <span className="file-icon ppt xs"><Ico.Deck size={9}/></span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:500,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{w.t}</div>
                      <div className="muted" style={{fontSize:9}}>{w.meta}</div>
                    </div>
                    <Badge kind={w.statusK}>{w.status}</Badge>
                  </div>
                ))}
              </div>

              <div className="card" style={{padding:12}}>
                <div className="flex items-center justify-between" style={{marginBottom:6}}>
                  <b style={{fontSize:12}}>Storyboard Health</b>
                  <Ico.Info size={10} color="var(--ink-3)"/>
                </div>
                <div className="muted" style={{fontSize:10,marginBottom:6}}>Score for this opportunity's storyboard</div>
                <div style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:10,alignItems:"center"}}>
                  <OppSbDonut v={76} color="var(--primary)" size={80} label="Good" sub="with moderate gaps"/>
                  <div>
                    <OppHealthRow label="Narrative Flow" v={82}/>
                    <OppHealthRow label="Content Coverage" v={76}/>
                    <OppHealthRow label="Audience Alignment" v={81} color="var(--warn)"/>
                    <OppHealthRow label="Risk Coverage" v={62} color="var(--warn)"/>
                    <OppHealthRow label="Proof & Impact" v={68}/>
                  </div>
                </div>
              </div>
            </div>

            {/* STORYBOARD STRIP */}
            <div className="card" style={{padding:14,background:"var(--bg)"}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <div>
                  <b style={{fontSize:13}}>Play-to-Opportunity Storyboard</b>
                  <div className="muted" style={{fontSize:11}}>Global Expansion Play mapped to Acme Corp's buying journey</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn btn-sm btn-primary"><Ico.Sparkle size={12}/> Auto-balance Story</button>
                  <button className="btn btn-sm"><Ico.Chart size={12}/> Optimize Flow</button>
                  <button className="btn btn-sm"><Ico.Regenerate size={12}/> Regenerate</button>
                  <button className="btn btn-sm"><Ico.Save size={12}/> Save Version</button>
                  <button className="icon-btn"><Ico.More size={14}/></button>
                </div>
              </div>

              <div style={{display:"flex",gap:6,alignItems:"flex-start",position:"relative"}}>
                {story.map((s,i)=>(
                  <React.Fragment key={s.n}>
                    <OppStoryboardChip
                      n={s.n} title={s.t} sub={s.sub} slideTitle={s.st} variant={s.v} id={s.id}
                      active={activeStep===s.n}
                      onClick={()=>setActiveStep(s.n)}
                    />
                    {i<story.length-1 && (
                      <div style={{flexShrink:0,color:"var(--line-2)",display:"flex",alignItems:"center",paddingTop:48}}>
                        <Ico.Right size={12}/>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Add slots below */}
              <div className="flex items-center gap-2" style={{marginTop:12,paddingLeft:8,paddingRight:8}}>
                {story.map((_,i)=>(
                  <div key={i} style={{flex:1,display:"flex",justifyContent:"center"}}>
                    <button className="icon-btn" style={{width:22,height:22,borderStyle:"dashed"}}><Ico.Plus size={11}/></button>
                  </div>
                ))}
              </div>
            </div>

            {/* BOTTOM WORKBENCH: Candidate Assets + Saved Selections + Selection Tray + Compare Alternatives */}
            <div style={{display:"grid",gridTemplateColumns:"330px 300px 250px 1fr",gap:12}}>
              <div className="card" style={{padding:12}}>
                <div className="flex items-center justify-between" style={{marginBottom:8}}>
                  <div className="flex items-center gap-2">
                    <b style={{fontSize:12}}>Candidate Assets</b>
                  </div>
                  <a className="link" style={{fontSize:11}}>Filter</a>
                </div>
                <div className="input" style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",marginBottom:8,height:28}}>
                  <Ico.Search size={11} color="var(--ink-3)"/>
                  <input placeholder="Search content…" style={{border:0,outline:0,background:"transparent",flex:1,fontSize:11}}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {candidates.map((c,i)=>(
                    <div key={i} className="card" style={{padding:6,display:"flex",alignItems:"center",gap:6,cursor:"grab",background:"var(--paper)"}}>
                      <div style={{width:46,height:30,borderRadius:3,overflow:"hidden",flexShrink:0}}>
                        <SlideThumb variant="light" title={c.t.split("—")[0]} brand=""/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.t}</div>
                        <div className="muted mono" style={{fontSize:9}}>{c.id} · {c.date}</div>
                      </div>
                      <span style={{fontSize:9,color:"var(--ok)",fontWeight:700}}>{c.score}%</span>
                      <Ico.Drag size={11} color="var(--ink-4)"/>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{padding:12}}>
                <div className="flex items-center justify-between" style={{marginBottom:8}}>
                  <b style={{fontSize:12}}>Saved Selections <span className="muted" style={{fontWeight:400}}>(3)</span></b>
                  <a className="link" style={{fontSize:11}}>Clear all</a>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {savedSelections.map((s,i)=>(
                    <div key={i} className="card" style={{padding:6,display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:46,height:30,borderRadius:3,overflow:"hidden",flexShrink:0}}>
                        <SlideThumb variant={i%2?"dark":"light"} title={s.t.split("—")[0]} brand=""/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.t}</div>
                        <div className="muted" style={{fontSize:9}}>{s.from}</div>
                      </div>
                      <button className="btn btn-xs" style={{fontSize:9,padding:"2px 6px",height:20}}>{i===0?"Selected":"Add"}</button>
                    </div>
                  ))}
                </div>
                <div style={{border:"1.5px dashed var(--line-2)",borderRadius:6,padding:"14px 8px",textAlign:"center",color:"var(--ink-3)",fontSize:10,marginTop:8}}>
                  Drop here to save
                </div>
              </div>

              <div className="card" style={{padding:12}}>
                <div className="flex items-center justify-between" style={{marginBottom:8}}>
                  <b style={{fontSize:12}}>Selection Tray <span className="muted" style={{fontWeight:400}}>(4)</span></b>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {[
                    {n:"1. Executive Summary",v:92},
                    {n:"2. The Modernization Gap",v:85},
                    {n:"3. Our Platform Advantage",v:91},
                    {n:"4. Business Impact",v:88},
                  ].map((x,i)=>(
                    <div key={i} className="flex items-center gap-2" style={{fontSize:10,padding:"5px 6px",background:"var(--bg)",borderRadius:4}}>
                      <Ico.Drag size={10} color="var(--ink-4)"/>
                      <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.n}</span>
                      <span style={{color:"var(--ok)",fontWeight:700,fontSize:10}}>{x.v}%</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-xs mt-2" style={{width:"100%"}}><Ico.Eye size={10}/> Preview</button>
              </div>

              <div className="card" style={{padding:12}}>
                <div className="flex items-center justify-between" style={{marginBottom:8}}>
                  <b style={{fontSize:12}}>Compare Alternatives</b>
                  <div className="muted" style={{fontSize:10}}>Compare up to 3</div>
                </div>
                <div className="tabs" style={{marginBottom:8,gap:10}}>
                  <div className="tab active" style={{fontSize:10,padding:"4px 0"}}>Slide Families</div>
                  <div className="tab" style={{fontSize:10,padding:"4px 0"}}>Deck Variants</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:6}}>
                  {[
                    {l:"Standard (Current)",cov:88,m:"Water-savvy, high-level"},
                    {l:"Executive (Condensed)",cov:82,m:"Concise; one-page story"},
                    {l:"Technical (Deep Dive)",cov:71,m:"Architecture + detail"},
                  ].map((v,i)=>(
                    <div key={i} className="card" style={{padding:6,borderColor:i===0?"var(--primary)":"var(--line)"}}>
                      <div style={{fontSize:10,fontWeight:600,marginBottom:4}}>{v.l}</div>
                      <div style={{borderRadius:3,overflow:"hidden",marginBottom:4}}>
                        <SlideThumb variant={i===0?"light":i===1?"dark":"purple"} title={v.l.split(" ")[0]} brand=""/>
                      </div>
                      <div style={{fontSize:9,color:"var(--ink-2)",marginBottom:4,lineHeight:1.3}}>{v.m}</div>
                      <div style={{fontSize:9,marginBottom:2}}>Coverage <b style={{marginLeft:4,color:"var(--ink)"}}>{v.cov}%</b></div>
                      <div style={{height:3,background:"var(--bg-2)",borderRadius:2,overflow:"hidden",marginBottom:4}}>
                        <div style={{width:`${v.cov}%`,height:"100%",background:i===0?"var(--ok)":i===1?"var(--primary)":"var(--warn)"}}/>
                      </div>
                      <div style={{fontSize:9,color:"var(--ink-3)",marginBottom:4}}>Read Time <b style={{color:"var(--ink-2)",marginLeft:4}}>{i===0?"18m":i===1?"8m":"24m"}</b></div>
                      <button className="btn btn-xs" style={{width:"100%",fontSize:10,padding:"3px 6px",height:22}}>Preview</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT RAIL */}
          <aside style={{display:"flex",flexDirection:"column",gap:12,position:"sticky",top:16}}>
            <div className="card" style={{padding:12}}>
              <div className="flex items-center justify-between" style={{marginBottom:8}}>
                <b style={{fontSize:12}}>At a Glance</b>
                <span className="badge ai" style={{fontSize:9}}>BETA</span>
              </div>
              <div className="flex items-center gap-3" style={{marginBottom:10}}>
                <OppSbDonut v={76} color="var(--ok)" size={52} label=""/>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--ok)"}}>Good</div>
                  <div className="muted" style={{fontSize:10}}>Top Risk</div>
                  <div style={{fontSize:11,fontWeight:500,color:"var(--warn)"}}>Procurement timing risk</div>
                </div>
              </div>
              <div style={{borderTop:"1px solid var(--line-soft)",paddingTop:8,marginBottom:6}}>
                <b style={{fontSize:11}}>Top Recommendation</b>
                <div style={{fontSize:11,marginTop:4}}>
                  <Ico.Check size={10} color="var(--ok)"/> Reinforce ROI with customer case studies
                </div>
                <div style={{fontSize:11,marginTop:4}}>
                  <Ico.Check size={10} color="var(--ok)"/> High impact
                </div>
              </div>
              <div className="muted" style={{fontSize:10,marginTop:8}}>Last Updated: May 15, 2025, 10:42 AM</div>
            </div>

            <div className="card" style={{padding:12,background:"linear-gradient(180deg, var(--ai-bg), var(--paper))",borderColor:"var(--ai-border)"}}>
              <div className="flex items-center justify-between" style={{marginBottom:6}}>
                <div className="flex items-center gap-2">
                  <Ico.Sparkle size={13} color="var(--ai)"/>
                  <b style={{fontSize:12}}>AI Rationale</b>
                </div>
                <span className="muted" style={{fontSize:10}}>Generated 2m ago</span>
              </div>
              <div className="muted" style={{fontSize:11,lineHeight:1.45,marginBottom:8}}>
                This play was selected because it aligns strongly with the project's expansion intent, multi-product adoption, and key stakeholder signals.
              </div>
              {rationale.map((r,i)=>(
                <div key={i} className="flex items-start gap-2" style={{fontSize:11,padding:"3px 0"}}>
                  <span style={{width:4,height:4,borderRadius:"50%",background:r.k==="risk"?"var(--warn)":"var(--ok)",marginTop:6,flexShrink:0}}/>
                  <span style={{color:"var(--ink-2)"}}>{r.t}</span>
                </div>
              ))}
              <a className="link" style={{fontSize:11,display:"inline-block",marginTop:6}}>View full rationale</a>
            </div>

            <div className="card" style={{padding:12}}>
              <div className="flex items-center justify-between" style={{marginBottom:6}}>
                <b style={{fontSize:12}}>Collaboration</b>
                <a className="link" style={{fontSize:11}}>View all</a>
              </div>
              {[
                {n:"Sarah Chen",m:"@Mike let's map slide 4 with the new customer story.",t:"2m ago"},
                {n:"Alex Morgan",m:"Done. Also added ROI sensitivity chart.",t:"Just now"},
                {n:"Priya N.",m:"Looks great. This will resonate with Finance.",t:"8m ago"},
              ].map((c,i)=>(
                <div key={i} className="flex items-start gap-2" style={{padding:"6px 0",borderBottom:i<2?"1px dashed var(--line-soft)":"none"}}>
                  <Avatar who={c.n} className="xs"/>
                  <div style={{flex:1,fontSize:11,minWidth:0}}>
                    <div style={{fontWeight:600}}>{c.n}</div>
                    <div className="muted" style={{fontSize:10,lineHeight:1.35}}>{c.m}</div>
                  </div>
                  <span className="muted" style={{fontSize:9,whiteSpace:"nowrap"}}>{c.t}</span>
                </div>
              ))}
              <div className="input" style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",marginTop:8,height:28}}>
                <input placeholder="Add a comment…" style={{border:0,outline:0,background:"transparent",flex:1,fontSize:11}}/>
                <Ico.Sparkle size={11} color="var(--ai)"/>
                <Ico.Send size={11} color="var(--primary)"/>
              </div>
            </div>

            <div className="card" style={{padding:12}}>
              <b style={{fontSize:12}}>Trust & Compliance</b>
              <div style={{fontSize:11,marginTop:8,display:"flex",flexDirection:"column",gap:6}}>
                <div className="flex items-center justify-between">
                  <span className="muted">Content Confidence</span>
                  <Badge kind="ok">High</Badge>
                </div>
                <div className="muted" style={{fontSize:10,marginTop:-4}}>Based on usage, freshness, and approval</div>
                <div className="flex items-center justify-between" style={{marginTop:4}}>
                  <span className="muted">Data Sensitivity</span>
                  <span style={{fontSize:11,fontWeight:600,color:"var(--ok)"}}>Low Risk</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="muted">Approved Sources</span>
                  <span style={{fontSize:11,fontWeight:600}}>98%</span>
                </div>
              </div>
              <a className="link" style={{fontSize:11,display:"inline-block",marginTop:8}}>View details</a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

window.RouteOppStoryboard = RouteOppStoryboard;
