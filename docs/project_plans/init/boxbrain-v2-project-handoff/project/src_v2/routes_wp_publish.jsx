/* Publish & Package WorkProduct — final review/publish flow for a deck */

function PubDeckMini({variant="dark", title, brand="NW", size="md"}) {
  return (
    <div className={`slide-thumb ${variant}`} style={{fontSize:size==="sm"?9:11}}>
      <div className="content">
        <div className="brand">{brand}</div>
        <div className="title" style={{marginTop:"auto",fontSize:"1.1em"}}>{title}</div>
      </div>
    </div>
  );
}

function PubCheckRow({label, status="ok", desc, ai}) {
  const icons = {
    ok: <span style={{width:18,height:18,borderRadius:"50%",background:"var(--ok)",color:"#fff",display:"grid",placeItems:"center",flexShrink:0}}><Ico.Check size={11}/></span>,
    warn: <span style={{width:18,height:18,borderRadius:"50%",background:"var(--warn)",color:"#fff",display:"grid",placeItems:"center",flexShrink:0,fontSize:11,fontWeight:700}}>!</span>,
    err: <span style={{width:18,height:18,borderRadius:"50%",background:"var(--danger)",color:"#fff",display:"grid",placeItems:"center",flexShrink:0}}><Ico.X size={11}/></span>,
    pending: <span style={{width:18,height:18,borderRadius:"50%",background:"var(--bg-2)",border:"1px solid var(--line-2)",flexShrink:0}}/>
  };
  return (
    <div className="flex items-start gap-2" style={{padding:"8px 0",borderBottom:"1px dashed var(--line-soft)"}}>
      {icons[status]}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12,fontWeight:500,color:"var(--ink)"}}>{label}</div>
        {desc && <div className="muted" style={{fontSize:11,marginTop:1}}>{desc}</div>}
        {ai && <div style={{fontSize:10.5,color:"var(--ai)",marginTop:2,display:"flex",alignItems:"center",gap:3}}><Ico.Sparkle size={10}/> {ai}</div>}
      </div>
      {status==="warn" && <button className="btn btn-xs">Fix</button>}
    </div>
  );
}

function RouteWpPublishPackage({go}) {
  const [publishMode, setPublishMode] = React.useState("release");
  const [selectedPackages, setSelectedPackages] = React.useState({pptx:true, pdf:true, hostedLink:true, brief:false, speaker:false, deckKit:true});
  const [previewIdx, setPreviewIdx] = React.useState(0);

  const previews = [
    {t:"Northwind Expansion", s:"Board Brief", c:"dark"},
    {t:"Executive Summary", s:"", c:"light"},
    {t:"Strategic Priorities", s:"", c:"dark"},
    {t:"Market Opportunity", s:"", c:"teal"},
    {t:"Financial Impact", s:"", c:"light"},
    {t:"Next Steps", s:"", c:"dark"},
  ];

  return (
    <div className="route-wrap">
      <Topbar crumbs={["WorkProducts","Northwind Expansion — Executive Brief","Publish & Package"]}/>
      <div className="route-body" style={{paddingTop:14}}>
        {/* Title row */}
        <div className="flex items-start justify-between" style={{marginBottom:14}}>
          <div>
            <div className="flex items-center gap-2">
              <span style={{width:34,height:34,borderRadius:8,background:"var(--primary-bg)",color:"var(--primary)",display:"grid",placeItems:"center"}}><Ico.Rocket size={18}/></span>
              <div>
                <h1 style={{fontSize:22,margin:0,letterSpacing:"-0.015em"}}>Publish & Package</h1>
                <div className="muted" style={{fontSize:12,marginTop:2}}>Northwind Expansion — Executive Brief · <span className="mono">v3.2</span> · Final review before release</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm" onClick={()=>go("wpDeckDetail")}><Ico.Left size={13}/> Back to Detail</button>
            <button className="btn btn-sm"><Ico.Save size={13}/> Save Draft</button>
            <div className="btn-split" style={{marginLeft:4}}>
              <button className="btn btn-primary btn-sm"><Ico.Rocket size={13}/> Publish v3.2</button>
              <button className="btn btn-primary btn-sm"><Ico.Down size={11}/></button>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="card" style={{padding:"12px 18px",marginBottom:16,background:"var(--bg)"}}>
          <div className="flex items-center gap-2" style={{fontSize:12}}>
            {[
              {n:1,l:"Build",done:true},
              {n:2,l:"Storyboard",done:true},
              {n:3,l:"Review & Approve",done:true},
              {n:4,l:"Package",active:true},
              {n:5,l:"Publish"},
              {n:6,l:"Distribute"},
            ].map((s,i,arr)=>(
              <React.Fragment key={s.n}>
                <div className="flex items-center gap-2" style={{color:s.active?"var(--primary)":s.done?"var(--ok)":"var(--ink-3)",fontWeight:s.active?600:500}}>
                  <span style={{width:22,height:22,borderRadius:"50%",background:s.active?"var(--primary)":s.done?"var(--ok)":"var(--bg-2)",color:s.active||s.done?"#fff":"var(--ink-3)",display:"grid",placeItems:"center",fontSize:11,fontWeight:700,border:s.active?"2px solid color-mix(in oklab, var(--primary) 30%, transparent)":"none"}}>
                    {s.done?<Ico.Check size={11}/>:s.n}
                  </span>
                  {s.l}
                </div>
                {i<arr.length-1 && <div style={{flex:1,height:2,background:s.done?"var(--ok)":"var(--line)"}}/>}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:20,alignItems:"start"}}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {/* Deck Preview Strip */}
            <div className="card" style={{padding:16}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <div className="flex items-center gap-2">
                  <b style={{fontSize:13}}>Deck Preview</b>
                  <span className="muted" style={{fontSize:11}}>— Board Variant · 24 slides</span>
                </div>
                <div className="flex items-center gap-1">
                  <button className="btn btn-xs"><Ico.Eye size={11}/> Preview Full</button>
                  <button className="btn btn-xs"><Ico.External size={11}/> Open</button>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1.6fr repeat(5, 1fr)",gap:8}}>
                <div style={{borderRadius:8,overflow:"hidden",border:"2px solid var(--primary)"}}>
                  <PubDeckMini variant={previews[previewIdx].c} title={previews[previewIdx].t} brand="NORTHWIND"/>
                </div>
                {previews.slice(0,5).map((p,i)=>(
                  <div key={i} onClick={()=>setPreviewIdx(i)} style={{borderRadius:6,overflow:"hidden",border:previewIdx===i?"1.5px solid var(--primary)":"1px solid var(--line)",cursor:"pointer",opacity:previewIdx===i?1:0.85}}>
                    <PubDeckMini variant={p.c} title={p.t} brand="NW" size="sm"/>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2" style={{fontSize:11,color:"var(--ink-3)"}}>
                <span><span className="mono">{previewIdx+1} / 24</span> slides</span>
                <div className="flex items-center gap-2">
                  <button className="icon-btn borderless" style={{width:22,height:22}}><Ico.Left size={11}/></button>
                  <button className="icon-btn borderless" style={{width:22,height:22}}><Ico.Right size={11}/></button>
                </div>
              </div>
            </div>

            {/* Version Summary + Publish Mode */}
            <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:16}}>
              <div className="card" style={{padding:16}}>
                <div className="flex items-center justify-between" style={{marginBottom:10}}>
                  <b style={{fontSize:13}}>Version Summary</b>
                  <a className="link" style={{fontSize:11}}>Compare to v3.1</a>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"8px 14px",fontSize:12}}>
                  <span className="muted">From</span><span><span className="mono" style={{background:"var(--bg-2)",padding:"1px 6px",borderRadius:3}}>v3.1</span> → <span className="mono" style={{background:"var(--primary-bg)",color:"var(--primary-ink)",padding:"1px 6px",borderRadius:3,fontWeight:600}}>v3.2</span></span>
                  <span className="muted">Contributors</span>
                  <div className="flex items-center gap-1">
                    <div className="avatar-stack">
                      <Avatar who="Sarah Chen" className="sm"/>
                      <Avatar who="Mark Thompson" className="sm"/>
                      <Avatar who="Priya Patel" className="sm"/>
                    </div>
                    <span className="muted" style={{fontSize:11,marginLeft:4}}>Sarah, Mark, Priya</span>
                  </div>
                  <span className="muted">Changes</span><span><b>14</b> slides edited · <b>3</b> added · <b>1</b> removed</span>
                  <span className="muted">Since last version</span><span>7 days · 23 edits · 6 comments resolved</span>
                </div>
                <div style={{borderTop:"1px dashed var(--line-soft)",marginTop:10,paddingTop:10,fontSize:11.5}}>
                  <div style={{fontSize:11,fontWeight:600,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6}}>Release Notes</div>
                  <ul style={{margin:0,paddingLeft:18,lineHeight:1.55,color:"var(--ink-2)"}}>
                    <li>Updated Q2 financial assumptions & forecast model</li>
                    <li>Refreshed competitive landscape with latest market data</li>
                    <li>Added EMEA-specific case study and regional rollout timeline</li>
                  </ul>
                </div>
              </div>
              <div className="card" style={{padding:16}}>
                <div className="flex items-center justify-between" style={{marginBottom:10}}>
                  <b style={{fontSize:13}}>Publish Mode</b>
                  <Ico.Info size={11} color="var(--ink-4)"/>
                </div>
                {[
                  {k:"release",t:"Release",d:"New numbered version, notifies subscribers",i:"Rocket",hot:true},
                  {k:"patch",t:"Patch",d:"Minor fix — increments patch number only",i:"Regenerate"},
                  {k:"preview",t:"Preview Only",d:"Shareable link, not counted as a release",i:"Eye"},
                ].map(o=>{
                  const I = Ico[o.i];
                  return (
                    <div key={o.k} onClick={()=>setPublishMode(o.k)} className="flex items-start gap-2" style={{padding:10,border:`1.5px solid ${publishMode===o.k?"var(--primary)":"var(--line)"}`,borderRadius:6,cursor:"pointer",marginBottom:6,background:publishMode===o.k?"var(--primary-bg)":"transparent"}}>
                      <span style={{width:14,height:14,borderRadius:"50%",border:`1.5px solid ${publishMode===o.k?"var(--primary)":"var(--line-2)"}`,background:publishMode===o.k?"var(--primary)":"transparent",display:"grid",placeItems:"center",flexShrink:0,marginTop:2}}>
                        {publishMode===o.k && <span style={{width:5,height:5,background:"#fff",borderRadius:"50%"}}/>}
                      </span>
                      <I size={14} color={publishMode===o.k?"var(--primary)":"var(--ink-3)"}/>
                      <div style={{flex:1,fontSize:11.5}}>
                        <div style={{fontWeight:600}}>{o.t}</div>
                        <div className="muted" style={{fontSize:10.5,marginTop:1}}>{o.d}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Approval Checklist */}
            <div className="card" style={{padding:16}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <div className="flex items-center gap-2">
                  <b style={{fontSize:13}}>Approval Checklist</b>
                  <Badge kind="ok">9 of 10</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="muted" style={{fontSize:11}}>1 warning remaining</span>
                  <button className="btn btn-xs"><Ico.Sparkle size={11} color="var(--ai)"/> Run Full AI Review</button>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 24px"}}>
                <div>
                  <div style={{fontSize:10.5,fontWeight:700,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:4,marginTop:4}}>Content Integrity</div>
                  <PubCheckRow label="All slots have selected content units" desc="24 of 24 slots filled"/>
                  <PubCheckRow label="No deprecated content units" desc="Checked 18 units · 0 deprecated"/>
                  <PubCheckRow label="No duplicate or conflicting slides" desc="AI verified · no conflicts found" ai="Claude 3 · May 22, 10:42 AM"/>
                  <PubCheckRow label="Freshness check" status="warn" desc="2 content units updated upstream since last build" ai="Suggests rebuild to include latest updates"/>
                </div>
                <div>
                  <div style={{fontSize:10.5,fontWeight:700,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:4,marginTop:4}}>Brand & Rights</div>
                  <PubCheckRow label="Brand compliance — logos, colors, type" desc="Board template · all in spec"/>
                  <PubCheckRow label="No external/unlicensed imagery" desc="All 12 images cleared"/>
                  <PubCheckRow label="Customer references have consent" desc="3 customer logos · all on file"/>
                  <PubCheckRow label="PII & sensitive data scan" desc="No PII detected in content or notes"/>
                  <div style={{fontSize:10.5,fontWeight:700,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:4,marginTop:10}}>Narrative & Accessibility</div>
                  <PubCheckRow label="Narrative score ≥ 80" desc="Current: 88 · Excellent"/>
                  <PubCheckRow label="Accessibility — alt text, contrast, type size" desc="WCAG AA · all slides pass"/>
                </div>
              </div>
            </div>

            {/* Package Outputs + Provenance side by side */}
            <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:16}}>
              <div className="card" style={{padding:16}}>
                <div className="flex items-center justify-between" style={{marginBottom:10}}>
                  <b style={{fontSize:13}}>Package Outputs</b>
                  <span className="muted" style={{fontSize:11}}>{Object.values(selectedPackages).filter(Boolean).length} of 6 selected</span>
                </div>
                {[
                  {k:"pptx",i:"Deck",t:"PowerPoint (.pptx)",d:"Native editable deck · 24 slides · ~42 MB",meta:"Generated on publish"},
                  {k:"pdf",i:"FileText",t:"PDF (.pdf)",d:"Flattened deck · print-ready · 24 pages",meta:"Generated on publish"},
                  {k:"hostedLink",i:"Globe",t:"Hosted View Link",d:"Trackable shareable link · analytics enabled",meta:"boxbrain.co/nw-board-v32"},
                  {k:"brief",i:"File",t:"Executive Summary (1-pager)",d:"AI-generated summary from deck content",meta:"Claude · ~250 words",ai:true},
                  {k:"speaker",i:"Mic",t:"Speaker Notes Package",d:"Full script for presenter · 2,100 words",meta:"Includes timing hints",ai:true},
                  {k:"deckKit",i:"Archive",t:"Deck Kit (.zip)",d:"All assets, source files, and notes bundled",meta:"~68 MB"},
                ].map(p=>{
                  const I = Ico[p.i];
                  const on = selectedPackages[p.k];
                  return (
                    <div key={p.k} onClick={()=>setSelectedPackages(s=>({...s,[p.k]:!s[p.k]}))}
                      className="flex items-center gap-3" style={{padding:"10px 4px",borderBottom:"1px dashed var(--line-soft)",cursor:"pointer"}}>
                      <span style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${on?"var(--primary)":"var(--line-2)"}`,background:on?"var(--primary)":"transparent",display:"grid",placeItems:"center",flexShrink:0}}>
                        {on && <Ico.Check size={10} color="#fff"/>}
                      </span>
                      <span style={{width:30,height:30,borderRadius:6,background:p.ai?"var(--ai-bg)":"var(--bg-2)",color:p.ai?"var(--ai)":"var(--ink-2)",display:"grid",placeItems:"center",flexShrink:0}}><I size={14}/></span>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="flex items-center gap-2">
                          <span style={{fontSize:12.5,fontWeight:600}}>{p.t}</span>
                          {p.ai && <Badge kind="ai" style={{fontSize:9}}>AI</Badge>}
                        </div>
                        <div className="muted" style={{fontSize:11}}>{p.d}</div>
                      </div>
                      <span className="muted" style={{fontSize:10.5,fontFamily:p.k==="hostedLink"?"var(--mono)":"inherit"}}>{p.meta}</span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between mt-3">
                  <a className="link" style={{fontSize:11}}><Ico.Plus size={11}/> Add custom output…</a>
                  <span className="muted" style={{fontSize:11}}>Total est. size: <b style={{color:"var(--ink-2)",fontWeight:600}}>~114 MB</b></span>
                </div>
              </div>

              <div className="card" style={{padding:16}}>
                <div className="flex items-center justify-between" style={{marginBottom:10}}>
                  <b style={{fontSize:13}}>Provenance & Rights</b>
                  <Badge kind="ok" style={{fontSize:9}}>All Clear</Badge>
                </div>
                <div style={{fontSize:11.5}}>
                  <div style={{fontSize:10.5,fontWeight:700,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6}}>Composed from</div>
                  {[
                    {n:"18 Content Units",sub:"from 6 Collections",i:"Cube"},
                    {n:"3 Brand Templates",sub:"Board Pack master",i:"Deck"},
                    {n:"4 Data Sources",sub:"Salesforce · Gong · Tableau · Looker",i:"Chart"},
                  ].map((s,i)=>{
                    const I = Ico[s.i];
                    return (
                      <div key={i} className="flex items-center gap-2" style={{padding:"6px 0",borderBottom:i<2?"1px dashed var(--line-soft)":"none"}}>
                        <I size={13} color="var(--primary)"/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:600,fontSize:11.5}}>{s.n}</div>
                          <div className="muted" style={{fontSize:10.5}}>{s.sub}</div>
                        </div>
                        <Ico.Right size={11} color="var(--ink-4)"/>
                      </div>
                    );
                  })}
                  <div style={{fontSize:10.5,fontWeight:700,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:"0.04em",marginTop:12,marginBottom:6}}>Customer & 3rd-Party</div>
                  <div className="flex items-center gap-2" style={{padding:"6px 0",borderBottom:"1px dashed var(--line-soft)"}}>
                    <Ico.Shield size={13} color="var(--ok)"/>
                    <div style={{flex:1,fontSize:11.5}}>
                      <div style={{fontWeight:600}}>3 customer logos</div>
                      <div className="muted" style={{fontSize:10.5}}>Consent on file · renew: Aug 2025</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" style={{padding:"6px 0"}}>
                    <Ico.Shield size={13} color="var(--ok)"/>
                    <div style={{flex:1,fontSize:11.5}}>
                      <div style={{fontWeight:600}}>Market data</div>
                      <div className="muted" style={{fontSize:10.5}}>Licensed · Gartner, Forrester</div>
                    </div>
                  </div>
                  <button className="btn btn-xs mt-3" style={{width:"100%",justifyContent:"center"}}><Ico.Lineage size={11}/> View Full Provenance Graph</button>
                </div>
              </div>
            </div>

            {/* Audience & Use Case */}
            <div className="card" style={{padding:16}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <b style={{fontSize:13}}>Audience & Use Case</b>
                <button className="btn btn-xs"><Ico.Edit size={11}/> Edit</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:14,fontSize:11.5}}>
                <div>
                  <div className="muted" style={{fontSize:10.5,textTransform:"uppercase",letterSpacing:"0.04em",fontWeight:700,marginBottom:4}}>Audience</div>
                  <div className="flex items-center gap-1" style={{flexWrap:"wrap"}}>
                    <span className="chip" style={{fontSize:11}}>Board of Directors</span>
                    <span className="chip" style={{fontSize:11}}>C-Suite</span>
                  </div>
                </div>
                <div>
                  <div className="muted" style={{fontSize:10.5,textTransform:"uppercase",letterSpacing:"0.04em",fontWeight:700,marginBottom:4}}>Use Case</div>
                  <div className="flex items-center gap-1" style={{flexWrap:"wrap"}}>
                    <span className="chip" style={{fontSize:11}}>Quarterly Review</span>
                    <span className="chip" style={{fontSize:11}}>Strategic Planning</span>
                  </div>
                </div>
                <div>
                  <div className="muted" style={{fontSize:10.5,textTransform:"uppercase",letterSpacing:"0.04em",fontWeight:700,marginBottom:4}}>Stage</div>
                  <span className="chip active" style={{fontSize:11}}>Board Presentation</span>
                </div>
                <div>
                  <div className="muted" style={{fontSize:10.5,textTransform:"uppercase",letterSpacing:"0.04em",fontWeight:700,marginBottom:4}}>Linked Opportunity</div>
                  <a className="link" style={{fontSize:12,fontWeight:500}}>Northwind — Enterprise Expansion</a>
                  <div className="muted" style={{fontSize:10.5,marginTop:2}}>$4.2M · Negotiation</div>
                </div>
              </div>
            </div>

            {/* AI Package Recommendations */}
            <div className="card" style={{padding:16,background:"linear-gradient(180deg,var(--ai-bg),var(--paper))",borderColor:"var(--ai-border)"}}>
              <div className="flex items-center gap-2" style={{marginBottom:10}}>
                <Ico.Sparkle size={14} color="var(--ai)"/>
                <b style={{fontSize:13}}>AI Package Recommendations</b>
                <span style={{fontSize:9,padding:"1px 6px",background:"var(--ai)",color:"#fff",borderRadius:4,fontWeight:700}}>BETA</span>
                <span style={{flex:1}}/>
                <a className="link" style={{fontSize:11}}>Why these?</a>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:12}}>
                {[
                  {t:"Include 1-pager summary",d:"Board members often preview on mobile. A 1-pager has 3.2× higher open rate than the deck.",action:"Enable", impact:"High"},
                  {t:"Add EMEA regional variant",d:"2 EMEA board members. Regional variant has localized numbers & case study.",action:"Generate", impact:"Medium"},
                  {t:"Refresh 2 stale content units",d:"Market sizing & competitive landscape were updated 3 days ago.",action:"Rebuild", impact:"Medium"},
                ].map((r,i)=>(
                  <div key={i} style={{padding:12,background:"var(--paper)",border:"1px solid var(--ai-border)",borderRadius:8}}>
                    <div className="flex items-start justify-between" style={{marginBottom:4}}>
                      <b style={{fontSize:12}}>{r.t}</b>
                      <Badge kind={r.impact==="High"?"warn":"primary"} style={{fontSize:9}}>{r.impact}</Badge>
                    </div>
                    <div className="muted" style={{fontSize:11,lineHeight:1.4,marginBottom:8}}>{r.d}</div>
                    <button className="btn btn-xs" style={{color:"var(--ai)",borderColor:"var(--ai-border)"}}>{r.action}</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Distribution preview */}
            <div className="card" style={{padding:16}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <b style={{fontSize:13}}>Distribution (after publish)</b>
                <button className="btn btn-xs"><Ico.Plus size={11}/> Add Channel</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:10}}>
                {[
                  {i:"Users",t:"4 Subscribers",s:"Board members will be notified",active:true},
                  {i:"Target",t:"Opportunity",s:"Attached to Northwind Expansion",active:true},
                  {i:"Library",t:"Library",s:"Published to Board Briefs collection",active:true},
                  {i:"Send",t:"Email Digest",s:"Scheduled Mon 9am to 12 recipients",active:false},
                ].map((d,i)=>{
                  const I = Ico[d.i];
                  return (
                    <div key={i} style={{padding:10,border:`1px solid ${d.active?"var(--line)":"var(--line-soft)"}`,borderRadius:6,background:d.active?"var(--paper)":"var(--bg)",opacity:d.active?1:0.7}}>
                      <div className="flex items-center gap-2" style={{marginBottom:4}}>
                        <I size={14} color={d.active?"var(--primary)":"var(--ink-3)"}/>
                        <b style={{fontSize:11.5}}>{d.t}</b>
                        {d.active && <Ico.Check size={11} color="var(--ok)" style={{marginLeft:"auto"}}/>}
                      </div>
                      <div className="muted" style={{fontSize:10.5,lineHeight:1.4}}>{d.s}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT RAIL */}
          <aside style={{display:"flex",flexDirection:"column",gap:14,position:"sticky",top:16}}>
            {/* Pre-flight */}
            <div className="card" style={{padding:14}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <b style={{fontSize:13}}>Pre-flight Status</b>
                <Badge kind="warn" style={{fontSize:9}}>1 Warning</Badge>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,fontSize:11.5}}>
                <div className="flex items-center gap-2"><Ico.Check size={12} color="var(--ok)"/><span>Checklist</span><span className="muted" style={{marginLeft:"auto",fontSize:10.5}}>9/10</span></div>
                <div className="flex items-center gap-2"><Ico.Check size={12} color="var(--ok)"/><span>Approvals</span><span className="muted" style={{marginLeft:"auto",fontSize:10.5}}>3/3</span></div>
                <div className="flex items-center gap-2"><Ico.Check size={12} color="var(--ok)"/><span>Brand & Rights</span><span className="muted" style={{marginLeft:"auto",fontSize:10.5}}>Clear</span></div>
                <div className="flex items-center gap-2" style={{color:"var(--warn)"}}><span style={{width:12,height:12,borderRadius:"50%",background:"var(--warn)",color:"#fff",display:"grid",placeItems:"center",fontSize:9,fontWeight:700}}>!</span><span>Freshness</span><span style={{marginLeft:"auto",fontSize:10.5}}>2 stale</span></div>
                <div className="flex items-center gap-2"><Ico.Check size={12} color="var(--ok)"/><span>Accessibility</span><span className="muted" style={{marginLeft:"auto",fontSize:10.5}}>WCAG AA</span></div>
              </div>
              <div style={{paddingTop:10,marginTop:10,borderTop:"1px dashed var(--line-soft)",fontSize:11}}>
                <div className="muted" style={{marginBottom:4}}>Ready to publish?</div>
                <div className="flex items-center gap-1" style={{color:"var(--warn)",fontWeight:600}}>
                  <Ico.Info size={12}/> Yes, with 1 warning
                </div>
              </div>
            </div>

            {/* Approval Routing */}
            <div className="card" style={{padding:14}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <b style={{fontSize:13}}>Approval Routing</b>
                <a className="link" style={{fontSize:11}}>Edit</a>
              </div>
              {[
                {who:"Sarah Chen",role:"Owner",status:"approved",dt:"May 21, 4:02 PM"},
                {who:"Priya Patel",role:"VP Strategy",status:"approved",dt:"May 22, 9:14 AM"},
                {who:"Mark Thompson",role:"CFO",status:"approved",dt:"May 22, 10:22 AM"},
                {who:"Legal",role:"Compliance",status:"not_required",dt:"Not required for v3.2"},
              ].map((a,i,arr)=>(
                <div key={i} className="flex items-center gap-2" style={{padding:"7px 0",borderBottom:i<arr.length-1?"1px dashed var(--line-soft)":"none"}}>
                  {a.status==="approved" ? <Avatar who={a.who} className="sm"/> : <span style={{width:24,height:24,borderRadius:"50%",background:"var(--bg-2)",display:"grid",placeItems:"center"}}><Ico.Shield size={11} color="var(--ink-3)"/></span>}
                  <div style={{flex:1,minWidth:0,fontSize:11}}>
                    <div style={{fontWeight:600}}>{a.who}</div>
                    <div className="muted" style={{fontSize:10.5}}>{a.role} · {a.dt}</div>
                  </div>
                  {a.status==="approved" ? <Ico.Check size={14} color="var(--ok)"/> : <Badge style={{fontSize:9}}>—</Badge>}
                </div>
              ))}
            </div>

            {/* Version Publish Settings */}
            <div className="card" style={{padding:14}}>
              <b style={{fontSize:13}}>Publish Settings</b>
              <div style={{fontSize:11.5,marginTop:10,display:"flex",flexDirection:"column",gap:10}}>
                <div>
                  <div className="muted" style={{fontSize:10.5,marginBottom:4}}>Access</div>
                  <div className="select-wrap"><select style={{fontSize:11.5,width:"100%"}}><option>Organization — all members</option><option>Team only</option><option>Restricted — invited</option></select></div>
                </div>
                <div>
                  <div className="muted" style={{fontSize:10.5,marginBottom:4}}>Expires</div>
                  <div className="select-wrap"><select style={{fontSize:11.5,width:"100%"}}><option>No expiration</option><option>30 days</option><option>Custom date…</option></select></div>
                </div>
                <label className="flex items-center gap-2" style={{fontSize:11.5,cursor:"pointer"}}>
                  <input type="checkbox" defaultChecked/> Notify subscribers on publish
                </label>
                <label className="flex items-center gap-2" style={{fontSize:11.5,cursor:"pointer"}}>
                  <input type="checkbox" defaultChecked/> Auto-retire v3.1 as deprecated
                </label>
                <label className="flex items-center gap-2" style={{fontSize:11.5,cursor:"pointer"}}>
                  <input type="checkbox"/> Lock variants from editing
                </label>
                <label className="flex items-center gap-2" style={{fontSize:11.5,cursor:"pointer"}}>
                  <input type="checkbox" defaultChecked/> Track views & engagement
                </label>
              </div>
            </div>

            {/* Activity */}
            <div className="card" style={{padding:14}}>
              <div className="flex items-center justify-between" style={{marginBottom:10}}>
                <b style={{fontSize:13}}>Recent Activity</b>
              </div>
              {[
                {who:"Mark Thompson", act:"approved this version", dt:"10:22 AM"},
                {who:"Sarah Chen", act:"resolved 3 comments", dt:"9:58 AM"},
                {who:"AI", act:"ran freshness check", dt:"9:41 AM", ai:true},
                {who:"Priya Patel", act:"approved this version", dt:"Yesterday"},
              ].map((a,i)=>(
                <div key={i} className="flex items-start gap-2" style={{padding:"6px 0",borderBottom:i<3?"1px dashed var(--line-soft)":"none",fontSize:11}}>
                  {a.ai ? <span style={{width:20,height:20,borderRadius:"50%",background:"var(--ai-bg)",display:"grid",placeItems:"center",flexShrink:0}}><Ico.Sparkle size={11} color="var(--ai)"/></span> : <Avatar who={a.who} className="sm"/>}
                  <div style={{flex:1,minWidth:0}}>
                    <div><b>{a.who}</b> {a.act}</div>
                    <div className="muted" style={{fontSize:10.5}}>{a.dt}</div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {/* Bottom sticky action bar */}
        <div style={{position:"sticky",bottom:16,marginTop:20,background:"var(--paper)",border:"1px solid var(--line)",borderRadius:10,padding:"12px 18px",boxShadow:"var(--shadow-lg)",display:"flex",alignItems:"center",gap:12}}>
          <span style={{width:30,height:30,borderRadius:6,background:"var(--primary-bg)",color:"var(--primary)",display:"grid",placeItems:"center"}}><Ico.Rocket size={15}/></span>
          <div style={{flex:1,fontSize:12}}>
            <b>Ready to publish as v3.2</b>
            <span className="muted" style={{marginLeft:8,fontSize:11}}>4 package outputs · 4 subscribers notified · 1 warning to review</span>
          </div>
          <button className="btn btn-sm">Schedule…</button>
          <button className="btn btn-sm">Publish Preview First</button>
          <button className="btn btn-primary btn-sm" style={{padding:"0 18px"}}><Ico.Rocket size={13}/> Publish v3.2 Now</button>
        </div>
      </div>
    </div>
  );
}

window.RouteWpPublishPackage = RouteWpPublishPackage;
