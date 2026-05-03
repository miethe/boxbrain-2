/* Storyboard routes — WorkProduct Storyboard tab + Storyboard Workspace */

/* Small helpers local to this file */
function SbHealthBar({v, kind="good"}) {
  const color = v>=90?"var(--ok)":v>=70?"var(--primary)":v>=50?"var(--warn)":"var(--danger)";
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,height:4,background:"var(--bg-2)",borderRadius:2,overflow:"hidden"}}>
        <div style={{width:`${v}%`,height:"100%",background:color}}/>
      </div>
    </div>
  );
}

function SbDonut({v=78, color="var(--primary)", size=64}) {
  const r = 26, C = 2*Math.PI*r;
  const off = C - (v/100)*C;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--bg-2)" strokeWidth="6"/>
      <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 32 32)"/>
      <text x="32" y="36" textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--ink)" letterSpacing="-0.02em">{v}</text>
    </svg>
  );
}

function SbMiniBar({data, max=100, h=44, color="var(--primary)"}) {
  return (
    <svg viewBox={`0 0 ${data.length*18} ${h}`} style={{width:"100%",height:h}}>
      {data.map((d,i)=>{
        const bh = (d.v/max)*(h-14);
        return <g key={i}>
          <rect x={i*18+2} y={h-bh-12} width={14} height={bh} fill={d.c||color} rx="1.5"/>
          <text x={i*18+9} y={h-bh-14} fontSize="8" textAnchor="middle" fill="var(--ink-3)">{d.v}%</text>
          <text x={i*18+9} y={h-2} fontSize="8" textAnchor="middle" fill="var(--ink-3)">{d.l}</text>
        </g>;
      })}
    </svg>
  );
}

function SbHBar({data, max=5}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {data.map((d,i)=>(
        <div key={i} style={{display:"grid",gridTemplateColumns:"80px 1fr 24px",alignItems:"center",gap:6,fontSize:10}}>
          <div className="muted" style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.l}</div>
          <div style={{height:6,background:"var(--bg-2)",borderRadius:3,overflow:"hidden"}}>
            <div style={{width:`${(d.v/max)*100}%`,height:"100%",background:d.c||"var(--primary)"}}/>
          </div>
          <div style={{textAlign:"right",fontWeight:600,color:"var(--ink-2)"}}>{d.v}</div>
        </div>
      ))}
    </div>
  );
}

/* ==================== WORKPRODUCT STORYBOARD TAB ==================== */

function RouteWorkProductStoryboard({go}) {
  const wp = V2_WORKPRODUCTS[0];
  const [view, setView] = React.useState("Narrative Map");
  const [activeAction, setActiveAction] = React.useState("Auto-balance Story");

  const sections = [
    {n:"1. Set the Stage", sub:"Why it matters", score:85, slides:[
      {t:"Executive Summary", sub:"Why modernization now", id:"CU-10234", vals:[74,"7d",94,"96%",12], c:"light"},
    ]},
    {n:"2. The Challenge", sub:"What we're solving", score:null, slides:[
      {t:"The Modernization Gap", sub:"The challenge we're facing", id:"CU-10411", vals:[78,"7d",82,"85%",9], c:"light"},
    ]},
    {n:"3. Our Approach", sub:"How we solve it", score:null, slides:[
      {t:"BoxBrain Platform Overview", sub:"Unified content intelligence", id:"CU-10129", vals:[90,"3d",88,"92%",15], c:"dark"},
    ]},
    {n:"4. Proof & Impact", sub:"Why it works", score:null, slides:[
      {t:"How It Works", sub:"Intelligent content lifecycle", id:"CU-10173", vals:[90,"5d",72,"88%",7], c:"dark"},
    ]},
    {n:"5. Next Steps", sub:"Move forward", score:null, slides:[
      {t:"Customer Impact", sub:"Results that matter", id:"CU-10555", vals:[91,"1d",85,"92%",14], c:"dark"},
      {t:"Next Steps", sub:"Let's bring it together", id:"CU-10601", vals:[91,"1d",85,"92%",14], c:"dark"},
    ]},
  ];

  const actions = ["Auto-balance Story","Find Better Slide","Compare Alternatives","Insert Gap Filler","Generate Speaker Notes","More Actions"];

  return (
    <div className="route-wrap">
      <Topbar crumbs={["WorkSpace","WorkProducts","Q2 Sales Enablement Deck","Storyboard & Assembly Review"]}/>
      <div className="route-body">
        {/* Sub-header row with review mode + save version */}
        <div className="flex items-center justify-between" style={{marginTop:2,marginBottom:14}}>
          <div className="flex items-center gap-2">
            <span className="badge info" style={{background:"var(--ai-bg)",color:"var(--ai)",borderColor:"var(--ai-border)",padding:"3px 10px",fontWeight:600}}>
              <Ico.Eye size={11}/> Review mode
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm"><Ico.Save size={13}/> Save as Version</button>
            <button className="btn btn-primary btn-sm"><Ico.Share size={13}/> Share Review</button>
            <button className="icon-btn"><Ico.More size={14}/></button>
            <div className="avatar sm" style={{width:30,height:30,fontSize:11}}>SJ</div>
          </div>
        </div>

        {/* Title row */}
        <div className="card" style={{padding:16,marginBottom:14}}>
          <div className="flex items-start gap-3">
            <span className="file-icon ppt" style={{width:42,height:48}}><Ico.Deck size={18}/></span>
            <div style={{flex:1}}>
              <div className="flex items-center gap-2">
                <h1 style={{fontSize:20,margin:0,letterSpacing:"-0.01em"}}>Q2 Sales Enablement Deck</h1>
                <span style={{fontSize:11,background:"var(--bg-2)",color:"var(--ink-3)",padding:"2px 7px",borderRadius:4,fontFamily:"var(--mono)",fontWeight:500}}>v3.2</span>
                <Badge kind="review">In Review</Badge>
              </div>
              <div className="flex items-center gap-4 mt-1" style={{fontSize:12,color:"var(--ink-3)"}}>
                <span><b style={{color:"var(--ink-2)",fontWeight:500}}>Audience:</b> CIO, IT Leaders</span>
                <span><b style={{color:"var(--ink-2)",fontWeight:500}}>Persona:</b> Technical Buyer</span>
                <span><b style={{color:"var(--ink-2)",fontWeight:500}}>Stage:</b> Solution Exploration</span>
                <span className="flex items-center gap-1"><b style={{color:"var(--ink-2)",fontWeight:500}}>Owner:</b> <Avatar who="Sarah Johnson" className="sm"/> Sarah Johnson</span>
              </div>
            </div>
            <div style={{textAlign:"right",fontSize:11,color:"var(--ink-3)"}}>
              <div>Last updated: May 16, 2025, 10:42 AM</div>
              <div className="flex items-center gap-2 mt-2" style={{justifyContent:"flex-end"}}>
                <span>View:</span>
                <div className="select-wrap">
                  <select value={view} onChange={e=>setView(e.target.value)}>
                    <option>Narrative Map</option>
                    <option>Timeline</option>
                    <option>Grid</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:16,alignItems:"start"}}>
          <div>
            {/* Storyboard metrics row */}
            <div className="grid" style={{gridTemplateColumns:"repeat(5, 1fr)",gap:12}}>
              {/* Sequence Health */}
              <div className="card" style={{padding:14}}>
                <div className="flex items-center gap-1" style={{fontSize:11,color:"var(--ink-3)",fontWeight:500,marginBottom:6}}>Sequence Health <Ico.Info size={10}/></div>
                <div className="flex items-center gap-3">
                  <SbDonut v={82} color="var(--ok)" size={54}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--ok)"}}>Good</div>
                    <div className="muted" style={{fontSize:11}}>Well-structured flow</div>
                    <svg viewBox="0 0 100 14" style={{width:"100%",height:12,marginTop:3}}>
                      <path d="M0 10 L15 8 L30 9 L45 6 L60 7 L75 4 L90 5 L100 3" fill="none" stroke="var(--ok)" strokeWidth="1.5"/>
                    </svg>
                  </div>
                </div>
              </div>
              {/* Content Coverage */}
              <div className="card" style={{padding:14}}>
                <div className="flex items-center gap-1" style={{fontSize:11,color:"var(--ink-3)",fontWeight:500,marginBottom:6}}>Content Coverage <Ico.Info size={10}/></div>
                <div style={{fontSize:22,fontWeight:700,letterSpacing:"-0.02em",lineHeight:1}}>78%</div>
                <div className="muted" style={{fontSize:11,marginTop:2}}>18 / 23</div>
                <div style={{height:4,background:"var(--bg-2)",borderRadius:2,marginTop:8,overflow:"hidden"}}>
                  <div style={{width:"78%",height:"100%",background:"var(--primary)"}}/>
                </div>
                <div className="muted" style={{fontSize:10,marginTop:4}}>Key topics covered</div>
              </div>
              {/* Duplicate */}
              <div className="card" style={{padding:14}}>
                <div className="flex items-center gap-1" style={{fontSize:11,color:"var(--ink-3)",fontWeight:500,marginBottom:6}}>Duplicate Content <Ico.Info size={10}/></div>
                <div style={{fontSize:22,fontWeight:700,letterSpacing:"-0.02em",color:"var(--warn)",lineHeight:1}}>3</div>
                <div className="muted" style={{fontSize:11,marginTop:2}}>Potential duplicates</div>
                <a className="link" style={{fontSize:11,display:"inline-block",marginTop:6,color:"var(--primary)"}}>Review Duplicates</a>
              </div>
              {/* Weak transitions */}
              <div className="card" style={{padding:14}}>
                <div className="flex items-center gap-1" style={{fontSize:11,color:"var(--ink-3)",fontWeight:500,marginBottom:6}}>Weak Transitions <Ico.Info size={10}/></div>
                <div style={{fontSize:22,fontWeight:700,letterSpacing:"-0.02em",color:"var(--warn)",lineHeight:1}}>2</div>
                <div className="muted" style={{fontSize:11,marginTop:2}}>Need improvement</div>
                <a className="link" style={{fontSize:11,display:"inline-block",marginTop:6,color:"var(--primary)"}}>Review Transitions</a>
              </div>
              {/* Estimated read time */}
              <div className="card" style={{padding:14}}>
                <div className="flex items-center gap-1" style={{fontSize:11,color:"var(--ink-3)",fontWeight:500,marginBottom:6}}>Estimated Read Time</div>
                <div className="flex items-baseline gap-1">
                  <Ico.Clock size={14} color="var(--ink-3)"/>
                  <div style={{fontSize:22,fontWeight:700,letterSpacing:"-0.02em",lineHeight:1}}>18</div>
                  <div className="muted" style={{fontSize:12}}>min</div>
                </div>
                <div className="muted" style={{fontSize:11,marginTop:6}}>Target: 15–20 min</div>
              </div>
            </div>

            {/* Action pills */}
            <div className="flex items-center gap-2 mt-3" style={{flexWrap:"wrap"}}>
              {actions.map(a=>(
                <button key={a} className={`btn btn-sm ${activeAction===a?"btn-primary":""}`} onClick={()=>setActiveAction(a)}>
                  {a==="Auto-balance Story" && <Ico.Sparkle size={13}/>}
                  {a==="Find Better Slide" && <Ico.Search size={13}/>}
                  {a==="Compare Alternatives" && <Ico.Compare size={13}/>}
                  {a==="Insert Gap Filler" && <Ico.Plus size={13}/>}
                  {a==="Generate Speaker Notes" && <Ico.FileText size={13}/>}
                  {a==="More Actions" && <Ico.More size={13}/>}
                  {a}
                  {(a==="Generate Speaker Notes" || a==="More Actions") && <Ico.Down size={10}/>}
                </button>
              ))}
            </div>

            {/* Narrative map */}
            <div className="card mt-3" style={{padding:18,background:"var(--bg)"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5, 1fr)",gap:10,alignItems:"start"}}>
                {sections.map((sec, si)=>(
                  <div key={si}>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--ink)"}}>{sec.n}</div>
                    <div className="muted" style={{fontSize:11,marginBottom:8}}>{sec.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(5, 1fr)",gap:10,alignItems:"start",position:"relative"}}>
                {sections.map((sec, si)=>(
                  <div key={si} style={{display:"flex",flexDirection:"column",gap:8,position:"relative"}}>
                    {si===0 && (
                      <div style={{position:"absolute",left:-6,top:-4,bottom:-4,display:"flex",alignItems:"center",zIndex:1}}>
                        <div style={{background:"var(--paper)",border:"1px solid var(--line)",borderRadius:6,padding:"6px 4px",writingMode:"vertical-rl",transform:"rotate(180deg)",fontSize:9,color:"var(--ink-3)",fontWeight:600,letterSpacing:"0.05em"}}>
                          Section<br/>Health
                        </div>
                      </div>
                    )}
                    {si===0 && (
                      <div style={{position:"absolute",left:14,top:80,zIndex:2}}>
                        <span style={{background:"var(--ok)",color:"#fff",borderRadius:"50%",width:24,height:24,fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 0 3px var(--bg)"}}>85</span>
                      </div>
                    )}

                    {sec.slides.map((sl, li)=>(
                      <div key={li} className="card" style={{padding:10,background:"var(--paper)",border:"1px solid var(--line)",position:"relative"}}>
                        <div className="flex items-center justify-between" style={{marginBottom:6}}>
                          <div style={{fontSize:11,fontWeight:600,lineHeight:1.2}}>{sl.t}</div>
                          <button className="icon-btn borderless" style={{width:20,height:20}}><Ico.External size={11}/></button>
                        </div>
                        <div className="muted" style={{fontSize:10,marginBottom:6}}>{sl.sub}</div>
                        <div style={{borderRadius:4,overflow:"hidden"}}>
                          <SlideThumb variant={sl.c} title={sl.t} brand=""/>
                        </div>
                        <div className="muted mono" style={{fontSize:9,marginTop:6}}>{sl.id}</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(5, 1fr)",gap:3,marginTop:6,fontSize:9}}>
                          {sl.vals.map((v,i)=>{
                            const iconMap=[
                              {bg:"var(--primary-bg)",fg:"var(--primary)"},
                              {bg:"var(--info-bg)",fg:"var(--info)"},
                              {bg:"var(--ai-bg)",fg:"var(--ai)"},
                              {bg:"var(--ok-bg)",fg:"var(--ok)"},
                              {bg:"var(--bg-2)",fg:"var(--ink-3)"},
                            ];
                            return (
                              <div key={i} style={{background:iconMap[i].bg,color:iconMap[i].fg,borderRadius:3,padding:"2px 0",textAlign:"center",fontSize:9,fontWeight:600}}>{v}</div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Add slide slot */}
                    <div style={{border:"1.5px dashed var(--line-2)",borderRadius:8,padding:"14px 10px",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--paper)",cursor:"pointer",color:"var(--ink-3)"}}>
                      <Ico.Plus size={18}/>
                    </div>
                  </div>
                ))}
              </div>

              {/* Metrics legend */}
              <div className="flex items-center gap-3 mt-4" style={{fontSize:11,color:"var(--ink-3)",flexWrap:"wrap"}}>
                <span className="flex items-center gap-1" style={{fontWeight:600,color:"var(--ink-2)"}}>Metrics:</span>
                <span className="flex items-center gap-1"><span style={{width:8,height:8,borderRadius:2,background:"var(--primary)"}}/> Confidence</span>
                <span className="flex items-center gap-1"><span style={{width:8,height:8,borderRadius:2,background:"var(--info)"}}/> Freshness</span>
                <span className="flex items-center gap-1"><span style={{width:8,height:8,borderRadius:2,background:"var(--ai)"}}/> Score</span>
                <span className="flex items-center gap-1"><span style={{width:8,height:8,borderRadius:2,background:"var(--ok)"}}/> Persona Fit</span>
                <span className="flex items-center gap-1"><span style={{width:8,height:8,borderRadius:2,background:"var(--ink-3)"}}/> Reuse Count</span>
                <span style={{flex:1}}/>
                <span style={{fontWeight:600,color:"var(--ink-2)"}}>Health Guide:</span>
                <span className="flex items-center gap-1"><span style={{width:8,height:8,borderRadius:"50%",background:"var(--ok)"}}/> 90-100 Excellent</span>
                <span className="flex items-center gap-1"><span style={{width:8,height:8,borderRadius:"50%",background:"var(--primary)"}}/> 70-89 Good</span>
                <span className="flex items-center gap-1"><span style={{width:8,height:8,borderRadius:"50%",background:"var(--warn)"}}/> 50-69 Fair</span>
                <span className="flex items-center gap-1"><span style={{width:8,height:8,borderRadius:"50%",background:"var(--danger)"}}/> 0-49 Poor</span>
              </div>
            </div>

            {/* Storyboard Analytics */}
            <div className="card mt-3" style={{padding:18}}>
              <div className="flex items-center gap-2" style={{marginBottom:12}}>
                <b style={{fontSize:14}}>Storyboard Analytics</b>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1.1fr 1.2fr 1fr 1fr 1.1fr",gap:18}}>
                {/* Flow Balance */}
                <div>
                  <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>Flow Balance</div>
                  <div className="muted" style={{fontSize:10,marginBottom:8}}>Distribution of content by section</div>
                  <SbMiniBar
                    data={[
                      {l:"Set Stage",v:20,c:"var(--primary)"},
                      {l:"The Challenge",v:18,c:"var(--ai)"},
                      {l:"Our Approach",v:26,c:"var(--primary)"},
                      {l:"Proof & Impact",v:22,c:"var(--ok)"},
                      {l:"Next Steps",v:12,c:"var(--warn)"},
                    ]}
                    max={30} h={70}
                  />
                </div>
                {/* Content Depth */}
                <div>
                  <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>Content Depth</div>
                  <div className="muted" style={{fontSize:10,marginBottom:8}}>Avg slides per key topic</div>
                  <SbHBar
                    data={[
                      {l:"Platform Services",v:4.2,c:"var(--primary)"},
                      {l:"Security & Trust",v:3.5,c:"var(--primary)"},
                      {l:"Integrations",v:2.8,c:"var(--primary)"},
                      {l:"Customer Outcomes",v:2.4,c:"var(--primary)"},
                      {l:"Implementation",v:2.1,c:"var(--primary)"},
                    ]}
                    max={5}
                  />
                </div>
                {/* Confidence Distribution — donut */}
                <div style={{display:"flex",flexDirection:"column"}}>
                  <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>Confidence Distribution</div>
                  <div className="muted" style={{fontSize:10,marginBottom:8}}>Across all slides</div>
                  <div className="flex items-center gap-3" style={{flex:1}}>
                    <svg viewBox="0 0 60 60" width={66} height={66}>
                      <circle cx="30" cy="30" r="22" fill="none" stroke="var(--ok)" strokeWidth="8" strokeDasharray="88 138" strokeDashoffset="0" transform="rotate(-90 30 30)"/>
                      <circle cx="30" cy="30" r="22" fill="none" stroke="var(--warn)" strokeWidth="8" strokeDasharray="45 138" strokeDashoffset="-88" transform="rotate(-90 30 30)"/>
                      <circle cx="30" cy="30" r="22" fill="none" stroke="var(--danger)" strokeWidth="8" strokeDasharray="5 138" strokeDashoffset="-133" transform="rotate(-90 30 30)"/>
                      <text x="30" y="30" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">23</text>
                      <text x="30" y="40" textAnchor="middle" fontSize="7" fill="var(--ink-3)">Total</text>
                    </svg>
                    <div style={{fontSize:10,display:"flex",flexDirection:"column",gap:4}}>
                      <div className="flex items-center gap-1"><span style={{width:7,height:7,borderRadius:2,background:"var(--ok)"}}/> High (90-100) <b style={{marginLeft:4}}>14 (65%)</b></div>
                      <div className="flex items-center gap-1"><span style={{width:7,height:7,borderRadius:2,background:"var(--warn)"}}/> Medium (70-89) <b style={{marginLeft:4}}>7 (30%)</b></div>
                      <div className="flex items-center gap-1"><span style={{width:7,height:7,borderRadius:2,background:"var(--danger)"}}/> Low (&lt;70) <b style={{marginLeft:4}}>1 (5%)</b></div>
                    </div>
                  </div>
                </div>
                {/* Content Freshness — donut */}
                <div style={{display:"flex",flexDirection:"column"}}>
                  <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>Content Freshness</div>
                  <div className="muted" style={{fontSize:10,marginBottom:8}}>By last updated</div>
                  <div className="flex items-center gap-3" style={{flex:1}}>
                    <svg viewBox="0 0 60 60" width={66} height={66}>
                      <circle cx="30" cy="30" r="22" fill="none" stroke="var(--ok)" strokeWidth="8" strokeDasharray="85 138" transform="rotate(-90 30 30)"/>
                      <circle cx="30" cy="30" r="22" fill="none" stroke="var(--primary)" strokeWidth="8" strokeDasharray="32 138" strokeDashoffset="-85" transform="rotate(-90 30 30)"/>
                      <circle cx="30" cy="30" r="22" fill="none" stroke="var(--warn)" strokeWidth="8" strokeDasharray="18 138" strokeDashoffset="-117" transform="rotate(-90 30 30)"/>
                      <circle cx="30" cy="30" r="22" fill="none" stroke="var(--danger)" strokeWidth="8" strokeDasharray="3 138" strokeDashoffset="-135" transform="rotate(-90 30 30)"/>
                      <text x="30" y="30" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">23</text>
                      <text x="30" y="40" textAnchor="middle" fontSize="7" fill="var(--ink-3)">Total</text>
                    </svg>
                    <div style={{fontSize:10,display:"flex",flexDirection:"column",gap:4}}>
                      <div className="flex items-center gap-1"><span style={{width:7,height:7,borderRadius:2,background:"var(--ok)"}}/> 0-7 days <b style={{marginLeft:4}}>12 (52%)</b></div>
                      <div className="flex items-center gap-1"><span style={{width:7,height:7,borderRadius:2,background:"var(--primary)"}}/> 8-30 days <b style={{marginLeft:4}}>5 (22%)</b></div>
                      <div className="flex items-center gap-1"><span style={{width:7,height:7,borderRadius:2,background:"var(--warn)"}}/> 31-90 days <b style={{marginLeft:4}}>4 (20%)</b></div>
                      <div className="flex items-center gap-1"><span style={{width:7,height:7,borderRadius:2,background:"var(--danger)"}}/> 90+ days <b style={{marginLeft:4}}>2 (6%)</b></div>
                    </div>
                  </div>
                </div>
                {/* Reuse Efficiency */}
                <div>
                  <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>Reuse Efficiency</div>
                  <div className="muted" style={{fontSize:10,marginBottom:8}}>Reuse count distribution</div>
                  <SbHBar
                    data={[
                      {l:"10+ times",v:8,c:"var(--ok)"},
                      {l:"5-9 times",v:5,c:"var(--primary)"},
                      {l:"2-4 times",v:7,c:"var(--ai)"},
                      {l:"1 time",v:2,c:"var(--warn)"},
                    ]}
                    max={10}
                  />
                  <div className="muted" style={{fontSize:9,marginTop:4,textAlign:"right"}}>(35%) (22%) (30%) (8%)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right rail — AI Recommendations + Narrative Score */}
          <aside style={{display:"flex",flexDirection:"column",gap:12,position:"sticky",top:16}}>
            {/* Narrative Score */}
            <div className="card" style={{padding:14}}>
              <div className="flex items-center gap-2" style={{marginBottom:8}}>
                <b style={{fontSize:13}}>Narrative Score</b>
              </div>
              <div className="flex items-center gap-3">
                <SbDonut v={74} color="var(--warn)" size={64}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--warn)"}}>Good</div>
                  <div className="muted" style={{fontSize:11}}>Room to improve</div>
                </div>
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="card" style={{padding:14,background:"linear-gradient(180deg, var(--ai-bg), var(--paper))",borderColor:"var(--ai-border)"}}>
              <div className="flex items-center justify-between" style={{marginBottom:8}}>
                <div className="flex items-center gap-2">
                  <Ico.Sparkle size={14} color="var(--ai)"/>
                  <b style={{fontSize:13}}>AI Recommendations</b>
                </div>
                <Ico.Up size={12} color="var(--ink-3)"/>
              </div>

              <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>Missing Slides (3)</div>
              <div className="muted" style={{fontSize:11,marginBottom:8}}>Detected gaps in your story</div>
              {[
                {t:"ROI / Business Case",s:"Financial Impact & ROI",p:"High Impact"},
                {t:"Security & Compliance",s:"Address security concerns",p:"Medium Impact"},
                {t:"Implementation Timeline",s:"Plan & rollout approach",p:"Medium Impact"},
              ].map((m,i)=>(
                <div key={i} className="flex items-start gap-2" style={{padding:"6px 0",borderBottom:i<2?"1px dashed var(--line-soft)":"none"}}>
                  <div style={{flex:1,minWidth:0,fontSize:11}}>
                    <div style={{fontWeight:600}}>{m.t}</div>
                    <div className="muted" style={{fontSize:10}}>{m.s}</div>
                    <div style={{fontSize:10,color:m.p.includes("High")?"var(--danger)":"var(--warn)",marginTop:2}}>● {m.p}</div>
                  </div>
                  <button className="btn btn-xs">Insert</button>
                </div>
              ))}
              <a className="link" style={{fontSize:11,display:"inline-block",marginTop:6}}>View all missing (3)</a>

              <div style={{fontSize:12,fontWeight:600,marginTop:14,marginBottom:2}}>Stronger Alternatives (4)</div>
              <div className="muted" style={{fontSize:11,marginBottom:8}}>Higher quality replacements found</div>
              {[
                {cur:"The Modernization Gap",rep:"Replace with Modernization Legacy",s:"+15 Score"},
                {cur:"Customer Impact",rep:"Replace with Customer Outcomes",s:"+12 Score"},
              ].map((a,i)=>(
                <div key={i} className="flex items-start gap-2" style={{padding:"6px 0",borderBottom:i<1?"1px dashed var(--line-soft)":"none",fontSize:11}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div><span className="muted">Current:</span> <b>{a.cur}</b></div>
                    <div className="muted" style={{fontSize:10,lineHeight:1.3}}>{a.rep}</div>
                    <div style={{fontSize:10,color:"var(--ok)",marginTop:2,fontWeight:600}}>{a.s}</div>
                  </div>
                  <button className="btn btn-xs">Compare</button>
                </div>
              ))}
              <a className="link" style={{fontSize:11,display:"inline-block",marginTop:6}}>View all alternatives (4)</a>

              <div style={{fontSize:12,fontWeight:600,marginTop:14,marginBottom:2}}>Auto-fill Opportunities (2)</div>
              <div className="muted" style={{fontSize:11,marginBottom:8}}>Let AI fill content gaps</div>
              <div className="flex items-start justify-between" style={{padding:"6px 0",borderBottom:"1px dashed var(--line-soft)"}}>
                <div style={{fontSize:11}}>
                  <b>Auto-fill speaker notes</b>
                  <div className="muted" style={{fontSize:10}}>Generate notes for 6 slides</div>
                </div>
                <button className="btn btn-xs">Generate</button>
              </div>
              <div className="flex items-start justify-between" style={{padding:"6px 0"}}>
                <div style={{fontSize:11}}>
                  <b>Auto-fill slide content</b>
                  <div className="muted" style={{fontSize:10}}>Enhance 3 content-light slides</div>
                </div>
                <button className="btn btn-xs">Review</button>
              </div>
            </div>

            {/* AI Assistant */}
            <div className="card" style={{padding:12,background:"var(--ai-bg)",borderColor:"var(--ai-border)"}}>
              <div className="flex items-center gap-2" style={{marginBottom:8}}>
                <Ico.Sparkle size={13} color="var(--ai)"/>
                <b style={{fontSize:12}}>AI Assistant</b>
              </div>
              <div className="muted" style={{fontSize:11,marginBottom:8}}>Ask anything about your story</div>
              <div style={{background:"var(--paper)",border:"1px solid var(--ai-border)",borderRadius:6,padding:"7px 10px",display:"flex",alignItems:"center",gap:6,fontSize:12}}>
                <input placeholder="Ask a question…" style={{flex:1,border:0,outline:0,background:"transparent",fontSize:12}}/>
                <button className="icon-btn borderless" style={{width:20,height:20,color:"var(--ai)"}}><Ico.Send size={12}/></button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ==================== STORYBOARD WORKSPACE ==================== */

function RouteStoryboardWorkspace({go}) {
  const [expanded, setExpanded] = React.useState({});
  const [variantMenuOpen, setVariantMenuOpen] = React.useState(true);

  const sections = [
    {id:"s1", n:1, title:"Market Context", desc:"Set the stage with market dynamics and customer challenges.",
      units:3, estMin:5, expanded:false,
      rows:[
        {t:"Market Landscape",k:"Chart",score:92,c:"light"},
        {t:"Customer Challenges",k:"Slide",score:94,c:"dark"},
        {t:"Trends & Drivers",k:"Slide",score:null,c:"light"},
      ],
      matching:5
    },
    {id:"s2", n:2, title:"Business Impact", desc:"Quantify the impact of inaction and the cost of delay.",
      units:4, estMin:6, expanded:false,
      rows:[
        {t:"Financial Impact",k:"Slide",score:90,c:"light"},
        {t:"Industry Benchmarks",k:"Chart",score:88,c:"light"},
        {t:"Cost of Inaction",k:"Slide",score:92,c:"light"},
        {t:"Impact Summary",k:"Slide",score:85,c:"dark"},
      ],
      matching:3
    },
    {id:"s3", n:3, title:"Our Solution", desc:"Introduce our solution and key differentiators.",
      units:5, estMin:8, expanded:true, highlight:true,
      rows:[
        {t:"Solution Overview",k:"Slide",score:90,c:"light",variants:2,hasVariantMenu:true},
        {t:"Key Capabilities",k:"Slide",score:97,c:"light"},
        {t:"Platform Demo",k:"Video",score:null,c:"dark"},
        {t:"Differentiators",k:"Slide",score:92,c:"light"},
        {t:"Architecture",k:"Diagram",score:87,c:"light"},
      ],
      matching:7
    },
    {id:"s4", n:4, title:"Proof & Trust", desc:"Build confidence with proof points and validation.",
      units:4, estMin:6, expanded:false,
      rows:[
        {t:"Customer Success",k:"Testimonial",score:90,c:"dark"},
        {t:"ROI Summary",k:"Slide",score:92,c:"light"},
        {t:"Security & Compliance",k:"Slide",score:88,c:"light"},
      ],
      matching:2
    },
    {id:"s5", n:5, title:"Next Steps", desc:"Guide the buyer to the next engagement step.",
      units:3, estMin:4, expanded:false,
      rows:[
        {t:"Executive Next Steps",k:"Slide",score:92,c:"dark"},
      ],
      matching:4
    },
    {id:"s6", n:6, title:"Appendix", desc:"Additional resources and technical details.",
      units:2, estMin:0, expanded:false, appendix:true,
      rows:[
        {t:"Technical Deep Dive",k:"Slide",score:null,c:"dark"},
        {t:"Pricing Overview",k:"Slide",score:null,c:"light"},
        {t:"Resource Library",k:"Document",score:null,c:"light"},
      ],
      matching:3
    },
  ];

  const recommended = [
    {t:"Market Landscape",k:"Slide",meta:"92% match",count:2,c:"light"},
    {t:"Solution Overview",k:"Slide",meta:"96% match",count:3,c:"dark"},
    {t:"ROI Summary",k:"Slide",meta:"95% match",count:2,c:"light"},
    {t:"Customer Proof",k:"Testimonial",meta:"91% match",count:1,c:"dark"},
    {t:"Executive Next Steps",k:"Slide",meta:"89% match",count:1,c:"light"},
  ];

  const aiSuggestions = ["Market Context","Business Impact","Our Solution","Proof & Trust","Next Steps"];

  return (
    <div className="route-wrap">
      <Topbar crumbs={["WorkSpace","WorkProducts","Q2 Sales Enablement Deck","Storyboard Workspace"]}/>
      <div className="route-body">
        {/* Header */}
        <div className="flex items-center justify-between" style={{marginTop:2,marginBottom:12}}>
          <div/>
          <div className="flex items-center gap-2">
            <span className="badge info" style={{background:"var(--ai-bg)",color:"var(--ai)",borderColor:"var(--ai-border)",padding:"3px 10px",fontWeight:600}}>
              <Ico.Eye size={11}/> Review mode
            </span>
          </div>
        </div>

        <div className="flex items-start justify-between" style={{marginBottom:14}}>
          <div>
            <div className="flex items-center gap-2">
              <h1 style={{fontSize:22,margin:0,letterSpacing:"-0.015em"}}>Q2 Sales Enablement Deck Storyboard</h1>
              <span style={{fontSize:11,background:"var(--bg-2)",color:"var(--ink-3)",padding:"2px 7px",borderRadius:4,fontFamily:"var(--mono)",fontWeight:500}}>v3.2</span>
            </div>
            <div className="flex items-center gap-2 mt-2" style={{fontSize:11,color:"var(--ink-3)"}}>
              <Ico.Refresh size={11}/> Auto-saved 2m ago
            </div>
            <div className="flex items-center gap-2 mt-3" style={{flexWrap:"wrap"}}>
              <button className="btn btn-sm btn-primary"><Ico.FileText size={13}/> Work Product</button>
              <button className="btn btn-sm"><Ico.Plays size={13}/> Play</button>
              <button className="btn btn-sm"><Ico.Target size={13}/> Opportunity</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="avatar-stack">
              <Avatar who="Sarah Chen" className="sm"/>
              <Avatar who="Michael Torres" className="sm"/>
              <Avatar who="Emily Davis" className="sm"/>
              <span className="more">+3</span>
            </div>
            <button className="btn btn-sm"><Ico.Users size={13}/> Share</button>
            <div className="btn btn-sm" style={{display:"inline-flex",alignItems:"center",gap:6}}>
              <Ico.Layers size={13}/> Versions
              <span style={{background:"var(--bg-2)",padding:"1px 6px",borderRadius:4,fontSize:11,color:"var(--ink-3)",fontFamily:"var(--mono)"}}>v3.2</span>
              <Ico.Down size={10}/>
              <span className="count-inline" style={{background:"var(--primary)",color:"#fff",marginLeft:4}}>5</span>
            </div>
            <button className="btn btn-sm"><Ico.Compare size={13}/> Compare to v3.1</button>
            <button className="icon-btn"><Ico.More size={14}/></button>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:16,alignItems:"start"}}>
          <div>
            {/* AI Suggestions strip */}
            <div className="card" style={{padding:12,marginBottom:12,background:"var(--bg)"}}>
              <div className="flex items-center gap-2" style={{marginBottom:8,flexWrap:"wrap"}}>
                <Ico.Sparkle size={13} color="var(--ai)"/>
                <b style={{fontSize:12}}>AI Section Suggestions</b>
                <button className="btn btn-xs" style={{background:"var(--ai)",color:"#fff",border:"none"}}><Ico.Regenerate size={11}/> Generate</button>
                <span style={{flex:1}}/>
              </div>
              <div className="flex items-center gap-2" style={{flexWrap:"wrap"}}>
                {aiSuggestions.map(a=><span key={a} className="chip" style={{fontSize:11}}>{a}</span>)}
                <a className="link flex items-center gap-1" style={{fontSize:11}}><Ico.Plus size={10}/> Add custom section</a>
              </div>
            </div>

            {/* Recommended for storyboard */}
            <div className="card" style={{padding:14,marginBottom:12}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <b style={{fontSize:13}}>Recommended for this storyboard</b>
                <a className="link" style={{fontSize:11}}>Show more recommendations</a>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5, 1fr)",gap:10}}>
                {recommended.map((r,i)=>(
                  <div key={i} className="card" style={{padding:8,border:"1px dashed var(--line-2)",position:"relative",background:"var(--bg)"}}>
                    <div style={{fontSize:10,fontWeight:600,color:"var(--ink-2)",marginBottom:4,display:"flex",alignItems:"center",gap:4}}>
                      <Ico.Chart size={10} color="var(--primary)"/> {r.t}
                    </div>
                    <div style={{borderRadius:3,overflow:"hidden"}}>
                      <SlideThumb variant={r.c} title={r.t}/>
                    </div>
                    <div className="flex items-center justify-between" style={{marginTop:5,fontSize:9}}>
                      <span style={{color:"var(--ink-3)"}}>{r.k}</span>
                      <span style={{color:"var(--ok)",fontWeight:600}}>{r.meta}</span>
                    </div>
                    {r.count>1 && (
                      <span style={{position:"absolute",top:6,right:6,background:"var(--primary)",color:"#fff",fontSize:9,padding:"1px 5px",borderRadius:10,fontWeight:600}}>{r.count}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sections header */}
            <div className="flex items-center justify-between" style={{marginBottom:10}}>
              <div>
                <b style={{fontSize:14}}>Storyboard Sections</b>
                <div className="muted" style={{fontSize:11,marginTop:1}}>6 sections · 22 content units · Est. read time 19 min</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-sm"><Ico.Drag size={13}/> Reorder</button>
                <button className="btn btn-sm"><Ico.Up size={13}/> Collapse all</button>
                <button className="btn btn-sm"><Ico.Chart size={13}/> Show metrics</button>
                <label className="flex items-center gap-1" style={{fontSize:11,color:"var(--ink-3)"}}>
                  <input type="checkbox" defaultChecked/> Track changes
                </label>
                <button className="btn btn-sm"><Ico.Filter size={13}/> Filters</button>
              </div>
            </div>

            {/* Section rows */}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {sections.map(sec=>(
                <div key={sec.id} className="card" style={{padding:0,overflow:"visible",borderColor:sec.highlight?"var(--primary-border)":"var(--line)"}}>
                  <div style={{display:"grid",gridTemplateColumns:"240px 1fr 140px",gap:12,padding:"12px 14px",alignItems:"stretch"}}>
                    {/* Section meta */}
                    <div style={{paddingRight:10,borderRight:"1px solid var(--line-soft)"}}>
                      <div className="flex items-center gap-2" style={{marginBottom:4}}>
                        <span style={{width:22,height:22,background:sec.appendix?"var(--bg-2)":"var(--primary)",color:sec.appendix?"var(--ink-3)":"#fff",borderRadius:4,display:"grid",placeItems:"center",fontSize:11,fontWeight:700}}>{sec.n}</span>
                        <b style={{fontSize:13}}>{sec.title}</b>
                      </div>
                      <div className="muted" style={{fontSize:11,lineHeight:1.4}}>{sec.desc}</div>
                      <div className="flex items-center gap-3 mt-2" style={{fontSize:10,color:"var(--ink-3)"}}>
                        <span><b style={{color:"var(--ink-2)",fontWeight:600}}>{sec.units} units</b></span>
                        {sec.estMin>0 && <span>Est. time <b style={{color:"var(--ink-2)",fontWeight:600}}>{sec.estMin} min</b></span>}
                      </div>
                    </div>

                    {/* Content unit chips */}
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignContent:"flex-start"}}>
                      {sec.rows.map((r,i)=>(
                        <div key={i} style={{position:"relative",width:150}}>
                          <div className="card" style={{padding:8,border:`1px solid ${sec.highlight && i===0?"var(--primary)":"var(--line)"}`,boxShadow:sec.highlight && i===0?"0 0 0 2px color-mix(in oklab, var(--primary) 15%, transparent)":"none"}}>
                            <div className="flex items-center gap-1" style={{marginBottom:4,fontSize:10,color:"var(--ink-2)",fontWeight:600}}>
                              {r.k==="Chart" && <Ico.Chart size={10} color="var(--primary)"/>}
                              {r.k==="Slide" && <Ico.Deck size={10} color="var(--primary)"/>}
                              {r.k==="Video" && <Ico.Preview size={10} color="var(--ai)"/>}
                              {r.k==="Diagram" && <Ico.Cube size={10} color="var(--primary)"/>}
                              {r.k==="Testimonial" && <Ico.Message size={10} color="var(--ai)"/>}
                              {r.k==="Document" && <Ico.FileText size={10} color="var(--primary)"/>}
                              <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.t}</span>
                              {r.variants && <span style={{fontSize:9,color:"var(--ink-3)"}}>{r.variants}</span>}
                              <Ico.Down size={9} color="var(--ink-4)"/>
                            </div>
                            <div style={{borderRadius:3,overflow:"hidden"}}>
                              <SlideThumb variant={r.c} title={r.t}/>
                            </div>
                            <div className="flex items-center justify-between" style={{marginTop:4,fontSize:9}}>
                              <span className="muted">{r.k}</span>
                              {r.score && <span style={{color:r.score>=90?"var(--ok)":r.score>=80?"var(--primary)":"var(--warn)",fontWeight:600}}>{r.score}%</span>}
                            </div>
                          </div>
                          {/* Variant menu dropdown */}
                          {r.hasVariantMenu && variantMenuOpen && (
                            <div className="card" style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,marginTop:4,padding:6,boxShadow:"var(--shadow-lg)",minWidth:200}}>
                              <div style={{fontSize:10,color:"var(--ink-3)",padding:"4px 6px",fontWeight:600}}>Solution Overview variants</div>
                              {[
                                {n:"Default (Current)",m:"100% match",cur:true},
                                {n:"SaaS Variant",m:"Used for SaaS buyers · 87% match"},
                                {n:"Enterprise Variant",m:"Used in 6 work products · 82% match"},
                                {n:"Tactical Variant",m:"Deep dive for technical buyers · 79% match"},
                              ].map((v,vi)=>(
                                <div key={vi} className="flex items-center gap-2" style={{padding:"6px 8px",borderRadius:4,cursor:"pointer",background:v.cur?"var(--primary-bg)":"transparent"}}>
                                  <span style={{width:12,height:12,borderRadius:"50%",border:`1.5px solid ${v.cur?"var(--primary)":"var(--line-2)"}`,background:v.cur?"var(--primary)":"transparent",display:"grid",placeItems:"center"}}>
                                    {v.cur && <span style={{width:5,height:5,background:"#fff",borderRadius:"50%"}}/>}
                                  </span>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:11,fontWeight:600}}>{v.n}</div>
                                    <div className="muted" style={{fontSize:10}}>{v.m}</div>
                                  </div>
                                </div>
                              ))}
                              <div style={{borderTop:"1px solid var(--line-soft)",marginTop:4,paddingTop:4}}>
                                <a className="link flex items-center gap-1" style={{fontSize:11,padding:"4px 8px"}}><Ico.Settings size={10}/> Manage variants</a>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {/* Add content unit slot */}
                      <div style={{width:120,border:"1.5px dashed var(--line-2)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"var(--ink-3)",cursor:"pointer",background:"var(--bg)"}}>
                        <Ico.Plus size={12}/><span style={{marginLeft:4}}>Add content unit</span>
                      </div>
                    </div>

                    {/* Matching work products */}
                    <div style={{paddingLeft:10,borderLeft:"1px solid var(--line-soft)",fontSize:10}}>
                      <div className="muted" style={{marginBottom:4,fontSize:10,fontWeight:500}}>Matching Work Products</div>
                      <div className="flex items-center gap-1">
                        <span style={{background:"var(--bg-2)",padding:"2px 6px",borderRadius:4,fontWeight:600,color:"var(--ink-2)"}}><Ico.FileText size={9}/> {sec.matching}</span>
                        <Ico.Down size={11} color="var(--ink-4)"/>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add section */}
              <div style={{border:"1.5px dashed var(--line-2)",borderRadius:8,padding:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:12,color:"var(--ink-3)",cursor:"pointer"}}>
                <Ico.Plus size={13}/> Add section <Ico.Down size={10}/>
              </div>
            </div>

            {/* Bottom metrics strip */}
            <div className="card mt-3" style={{padding:14}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(6, 1fr)",gap:14,alignItems:"center"}}>
                <div className="flex items-center gap-3">
                  <SbDonut v={88} color="var(--ok)" size={54}/>
                  <div>
                    <div className="muted" style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",fontWeight:600}}>Storyboard Health</div>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--ok)"}}>Excellent</div>
                    <div className="muted" style={{fontSize:10}}>Well-structured and balanced</div>
                  </div>
                </div>
                <div>
                  <div className="muted" style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",fontWeight:600,marginBottom:4}}>Content Coverage</div>
                  <div style={{fontSize:22,fontWeight:700,letterSpacing:"-0.02em",lineHeight:1}}>76%</div>
                  <div className="muted" style={{fontSize:10,marginTop:2}}>17 / 23</div>
                  <div style={{height:3,background:"var(--bg-2)",borderRadius:2,marginTop:4,overflow:"hidden"}}>
                    <div style={{width:"76%",height:"100%",background:"var(--primary)"}}/>
                  </div>
                  <div className="muted" style={{fontSize:9,marginTop:3}}>Key topics covered</div>
                </div>
                <div>
                  <div className="muted" style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",fontWeight:600,marginBottom:4}}>Duplicate Content</div>
                  <div style={{fontSize:22,fontWeight:700,letterSpacing:"-0.02em",color:"var(--warn)",lineHeight:1}}>2</div>
                  <div className="muted" style={{fontSize:10,marginTop:2}}>Potential duplicates</div>
                  <a className="link" style={{fontSize:10}}>Review duplicates</a>
                </div>
                <div>
                  <div className="muted" style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",fontWeight:600,marginBottom:4}}>Weak Transitions</div>
                  <div style={{fontSize:22,fontWeight:700,letterSpacing:"-0.02em",color:"var(--warn)",lineHeight:1}}>1</div>
                  <div className="muted" style={{fontSize:10,marginTop:2}}>Need improvement</div>
                  <a className="link" style={{fontSize:10}}>Review transitions</a>
                </div>
                <div>
                  <div className="muted" style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",fontWeight:600,marginBottom:4}}>Estimated Read Time</div>
                  <div className="flex items-baseline gap-1">
                    <Ico.Clock size={13} color="var(--ink-3)"/>
                    <div style={{fontSize:22,fontWeight:700,letterSpacing:"-0.02em",lineHeight:1}}>18</div>
                    <div className="muted" style={{fontSize:11}}>min</div>
                  </div>
                  <div className="muted" style={{fontSize:10,marginTop:4}}>Target: 15–20 min</div>
                </div>
                <div className="flex items-center gap-3">
                  <SbDonut v={82} color="var(--ok)" size={54}/>
                  <div>
                    <div className="muted" style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",fontWeight:600}}>Narrative Score</div>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--ok)"}}>Great</div>
                    <div className="muted" style={{fontSize:10}}>Strong narrative flow</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right rail — Comments + AI recs */}
          <aside style={{display:"flex",flexDirection:"column",gap:12,position:"sticky",top:16}}>
            <div className="card" style={{padding:12}}>
              <div className="tabs" style={{borderBottom:"1px solid var(--line)",marginBottom:10,marginTop:-2}}>
                <div className="tab active" style={{padding:"6px 10px",fontSize:12}}>
                  <Ico.Message size={12}/> Comments <span className="count-inline" style={{background:"var(--primary)",color:"#fff"}}>8</span>
                </div>
                <div className="tab" style={{padding:"6px 10px",fontSize:12}}>
                  <Ico.Sparkle size={12}/> AI Assistant
                </div>
              </div>
              <div className="flex items-center gap-2" style={{marginBottom:10}}>
                <span className="chip active" style={{fontSize:11}}>Unresolved <Ico.Down size={10}/></span>
                <span className="chip" style={{fontSize:11}}>All types <Ico.Down size={10}/></span>
              </div>

              {[
                {who:"Sarah Johnson",t:"10:24 AM",s:"Solution Overview · Section 3",m:"Can we swap this with the SaaS variant for the app?",replies:2},
                {who:"Michael Chen",t:"9:13 AM",s:"ROI Summary · Section 2",m:"Update this logo and customer name to Acme."},
                {who:"Emily Davis",t:"Yesterday",s:"Implementation Timeline · Section 5",m:"Let's pivot the timeline to 90 days based on latest scoping."},
              ].map((c,i)=>(
                <div key={i} style={{padding:"8px 0",borderBottom:i<2?"1px dashed var(--line-soft)":"none"}}>
                  <div className="flex items-center gap-2" style={{marginBottom:4}}>
                    <Avatar who={c.who} className="sm"/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11}}><b>{c.who}</b> <span className="muted">{c.t}</span></div>
                      <div className="muted" style={{fontSize:10,color:"var(--primary)"}}>{c.s}</div>
                    </div>
                    <Ico.More size={12} color="var(--ink-4)"/>
                  </div>
                  <div style={{fontSize:11,color:"var(--ink-2)",lineHeight:1.4}}>{c.m}</div>
                  {c.replies && <a className="link" style={{fontSize:10,display:"inline-block",marginTop:4}}>{c.replies} replies</a>}
                </div>
              ))}
            </div>

            <div className="card" style={{padding:12,background:"linear-gradient(180deg, var(--ai-bg), var(--paper))",borderColor:"var(--ai-border)"}}>
              <div className="flex items-center gap-2" style={{marginBottom:8}}>
                <Ico.Sparkle size={13} color="var(--ai)"/>
                <b style={{fontSize:12}}>AI Recommendations</b>
                <span className="count-inline" style={{background:"var(--ai)",color:"#fff"}}>12</span>
              </div>
              <div style={{fontSize:11,fontWeight:600,color:"var(--ink-2)",marginBottom:4}}>Content Gaps</div>
              <ul style={{margin:0,paddingLeft:16,fontSize:11,color:"var(--ink-2)",lineHeight:1.6}}>
                <li>Add competitor comparison <span className="muted" style={{fontSize:10}}>Recommended for Section 3</span></li>
                <li>Include cybersecurity proof <span className="muted" style={{fontSize:10}}>Recommended for Section 4</span></li>
                <li>Add pricing tiers <span className="muted" style={{fontSize:10}}>Recommended for Section 6</span></li>
              </ul>
              <div style={{fontSize:11,fontWeight:600,color:"var(--ink-2)",marginTop:10,marginBottom:4}}>Optimize Flow</div>
              <ul style={{margin:0,paddingLeft:16,fontSize:11,color:"var(--ink-2)",lineHeight:1.6}}>
                <li>Move "Impact Summary" before "Financial Impact"</li>
                <li>Consider "Trends & Drivers" with "Market Landscape"</li>
              </ul>
              <div style={{fontSize:11,fontWeight:600,color:"var(--ink-2)",marginTop:10,marginBottom:4}}>Personalize for Opportunity</div>
              <div className="flex items-center justify-between" style={{padding:"6px 8px",background:"var(--paper)",borderRadius:6,border:"1px solid var(--ai-border)",marginBottom:4}}>
                <div style={{fontSize:11}}>
                  <b>Customize for Acme Corp</b>
                  <div className="muted" style={{fontSize:10}}>3 content units to adjust</div>
                </div>
                <button className="btn btn-xs btn-primary">Apply</button>
              </div>
              <a className="link" style={{fontSize:11,display:"inline-block",marginTop:6}}>View all recommendations</a>
            </div>
          </aside>
        </div>

        <div className="flex items-center gap-2 mt-3" style={{fontSize:11,color:"var(--ink-3)",justifyContent:"flex-end"}}>
          <span>Last edited: May 16, 9:41 AM</span>
          <span>·</span>
          <span>Snapshot: May 14, 10:22 AM</span>
        </div>
      </div>
    </div>
  );
}

window.RouteWorkProductStoryboard = RouteWorkProductStoryboard;
window.RouteStoryboardWorkspace = RouteStoryboardWorkspace;
