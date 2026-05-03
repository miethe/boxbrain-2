/* Variation Explorer route — full-page horizontal/vertical similarity browser */

function RouteVariationExplorer({go}) {
  const similar = [
    {t:"Market Opportunity", id:"SLIDE-7H3K9", match:78, c:"light"},
    {t:"Industry Growth Drivers", id:"SLIDE-9J2L1", match:82, c:"light"},
    {t:"Market Opportunity Overview", id:"SLIDE-1A2B3", match:98, c:"light", current:true},
    {t:"TAM/SAM/SOM Analysis", id:"SLIDE-4D5E6", match:75, c:"light"},
    {t:"Addressable Market", id:"SLIDE-8F7G6", match:71, c:"light"},
  ];
  const variants = [
    {v:"v3",label:"Canonical", sub:"Clean (Canonical)", date:"Apr 24, 2024", badge:"Canonical", c:"light", current:true},
    {v:"v2",label:"Style Alt", sub:"Executive Dark", date:"Apr 20, 2024", badge:"Style Alt", c:"dark"},
    {v:"v1",label:"Prior Version", sub:"", date:"Apr 18, 2024", badge:"Prior Version", c:"purple"},
  ];
  const [selSimilar, setSelSimilar] = React.useState(2);
  const [selVariant, setSelVariant] = React.useState(0);

  return (
    <div className="route-wrap">
      <Topbar crumbs={["Content Library","ContentUnit Variation Explorer"]}/>
      <div className="route-body">
        <div className="page-head-row">
          <div>
            <h1 style={{fontSize:24,margin:0,letterSpacing:"-0.02em"}}>
              ContentUnit Variation Explorer <Ico.Info size={14} color="var(--ink-4)"/>
            </h1>
            <div className="muted" style={{fontSize:13,marginTop:4}}>
              Explore similar concepts horizontally and alternate versions vertically.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm"><Ico.Share size={14}/> Share</button>
            <button className="btn btn-sm"><Ico.Compare size={14}/> Compare (2)</button>
            <button className="btn btn-primary btn-split btn-sm">
              <Ico.Plus size={14}/> Add to Deck <span className="sep"/><Ico.Down size={12}/>
            </button>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:20,marginTop:20,alignItems:"start"}}>
          <div>
            {/* Horizontal rail: Similar Concepts */}
            <div className="flex items-center gap-3" style={{marginBottom:10}}>
              <b style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--ink-3)"}}>Similar Concepts</b>
              <span className="muted" style={{fontSize:11}}>Swipe / scroll horizontally</span>
              <span style={{flex:1}}/>
              <span className="flex items-center gap-1 muted" style={{fontSize:11}}>
                <Ico.Left size={12}/> Swipe / scroll <Ico.Right size={12}/> horizontally
              </span>
            </div>
            <div className="ve-rail">
              <button className="ve-arrow"><Ico.Left size={14}/></button>
              <div className="ve-rail-track">
                {similar.map((s,i)=>(
                  <div key={i} onClick={()=>setSelSimilar(i)}
                    className={`ve-concept ${i===selSimilar?"current":""}`}>
                    <div className="ve-concept-match">{i===selSimilar?"Best Match":`${s.match}% Match`}</div>
                    <div style={{borderRadius:4,overflow:"hidden",marginTop:6,position:"relative"}}>
                      <SlideThumb variant={s.c} title={s.t} brand="ACME" chart/>
                      {i===selSimilar && <div className="ve-concept-check"><Ico.Check size={14}/></div>}
                    </div>
                    <div style={{fontSize:12,fontWeight:600,marginTop:8}}>{s.t}</div>
                    <div className="muted mono" style={{fontSize:10,marginTop:2}}>ID: {s.id}</div>
                  </div>
                ))}
              </div>
              <button className="ve-arrow"><Ico.Right size={14}/></button>
            </div>
            <div className="flex items-center justify-center mt-2">
              <div className="ve-pagination-dot"/>
            </div>

            {/* Vertical rail + Main preview */}
            <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:20,marginTop:18,alignItems:"start"}}>
              <div>
                <div className="flex items-center justify-between" style={{marginBottom:10}}>
                  <b style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--ink-3)"}}>Variations</b>
                  <span className="flex items-center gap-1 muted" style={{fontSize:10}}><Ico.Up size={10}/><Ico.Down size={10}/></span>
                </div>
                <div className="muted" style={{fontSize:10,marginBottom:10}}>Swipe / scroll vertically</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {variants.map((v,i)=>(
                    <div key={i} onClick={()=>setSelVariant(i)}
                      className={`ve-variant ${i===selVariant?"current":""}`}>
                      <div className="flex items-center justify-between" style={{marginBottom:6}}>
                        <Badge kind={v.badge==="Canonical"?"ok":v.badge==="Style Alt"?"warn":"primary"}>{v.badge}</Badge>
                      </div>
                      <div style={{borderRadius:4,overflow:"hidden"}}>
                        <SlideThumb variant={v.c} title="Market Opportunity" brand="ACME" chart/>
                      </div>
                      <div style={{fontSize:11,marginTop:6}}>
                        <div style={{fontWeight:600}}>{v.sub}</div>
                        <div className="muted" style={{fontSize:10,marginTop:1}}>{v.v} · {v.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <a className="link flex items-center justify-center gap-1 mt-3" style={{fontSize:12,background:"var(--bg-2)",padding:"7px",borderRadius:6}}>
                  View all 6 variations
                </a>
              </div>

              {/* Main preview */}
              <div className="card" style={{padding:22,position:"relative"}}>
                <button className="icon-btn" style={{position:"absolute",top:12,right:12}}><Ico.External size={14}/></button>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:22,alignItems:"start"}}>
                  <div>
                    <h2 style={{fontSize:26,margin:0,letterSpacing:"-0.02em",maxWidth:"14ch"}}>Market Opportunity Overview</h2>
                    <div style={{height:3,width:40,background:"var(--primary)",marginTop:8}}/>
                    <div className="muted" style={{fontSize:13,marginTop:12,lineHeight:1.5,maxWidth:"28ch"}}>
                      A substantial and growing market opportunity driven by digital transformation and increasing customer demand.
                    </div>
                    <div style={{marginTop:22}}>
                      <div style={{fontSize:34,fontWeight:700,color:"var(--primary)",letterSpacing:"-0.02em"}}>$42B</div>
                      <div style={{fontSize:14,fontWeight:600,marginTop:2}}>Total Addressable Market</div>
                      <div style={{fontSize:12,color:"var(--ok)",fontWeight:600,marginTop:4}}>+18% CAGR through 2028</div>
                    </div>
                  </div>
                  <div>
                    <div className="muted" style={{fontSize:11,textAlign:"right",marginBottom:4}}>Market Growth Projection (USD)</div>
                    <svg viewBox="0 0 320 160" style={{width:"100%",height:140}}>
                      {[21,25,30,34,36,42].map((v,i)=>{
                        const h = (v/50)*130;
                        const isLast = i===5;
                        return <g key={i}>
                          <rect x={12+i*50} y={140-h} width={34} height={h} fill={isLast?"var(--primary)":"color-mix(in oklab, var(--primary) 35%, white)"} rx="2"/>
                          <text x={29+i*50} y={140-h-4} fontSize="10" textAnchor="middle" fill="var(--ink-2)" fontWeight={isLast?700:500}>${v}B</text>
                          <text x={29+i*50} y={155} fontSize="9" textAnchor="middle" fill="var(--ink-3)">{2023+i}</text>
                        </g>;
                      })}
                    </svg>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginTop:18}}>
                  {[
                    {icon:<Ico.Users size={14} color="var(--primary)"/>,v:"120M+",l:"Potential\nCustomers"},
                    {icon:<Ico.TrendingUp size={14} color="var(--primary)"/>,v:"$350B",l:"Market\nPotential"},
                    {icon:<Ico.Globe size={14} color="var(--primary)"/>,v:"5",l:"Key Growth\nRegions"},
                  ].map((k,i)=>(
                    <div key={i} className="flex items-center gap-2" style={{padding:"10px 12px",background:"var(--bg-2)",borderRadius:8}}>
                      <span style={{width:28,height:28,borderRadius:"50%",background:"var(--primary-bg)",display:"grid",placeItems:"center"}}>{k.icon}</span>
                      <div>
                        <div style={{fontSize:15,fontWeight:700,letterSpacing:"-0.01em"}}>{k.v}</div>
                        <div className="muted" style={{fontSize:10,whiteSpace:"pre-line",lineHeight:1.2}}>{k.l}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4" style={{fontSize:11,color:"var(--ink-3)"}}>
                  <span>Source: BoxBrain Market Intelligence, May 2024</span>
                  <span>Company Name · 7</span>
                </div>
              </div>
            </div>

            {/* Pagination strip */}
            <div className="flex items-center justify-center gap-3 mt-4" style={{padding:"8px"}}>
              <span className="muted" style={{fontSize:12}}>3 / 15</span>
              <button className="icon-btn" style={{borderRadius:"50%"}}><Ico.Left size={14}/></button>
              <button className="icon-btn" style={{borderRadius:"50%"}}><Ico.Right size={14}/></button>
            </div>

            {/* Bottom: Included in / Actions */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 220px",gap:16,marginTop:14}}>
              <div className="card" style={{padding:14}}>
                <div className="flex items-center justify-between" style={{marginBottom:10}}>
                  <b style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.05em",color:"var(--ink-3)"}}>Included in Plays <span className="count-inline">3</span></b>
                </div>
                {[
                  {t:"Growth Strategy Play", d:"Updated Apr 23, 2024", badge:"Primary"},
                  {t:"Investor Update Q2 2024", d:"Updated Apr 20, 2024", badge:"Secondary"},
                  {t:"Market Expansion Play", d:"Updated Apr 18, 2024", badge:"Secondary"},
                ].map((p,i)=>(
                  <div key={i} className="flex items-center gap-2" style={{padding:"6px 0",borderBottom:i<2?"1px dashed var(--line-soft)":"none",fontSize:12}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:500}}>{p.t}</div>
                      <div className="muted" style={{fontSize:10}}>{p.d}</div>
                    </div>
                    <Badge kind={p.badge==="Primary"?"ok":"primary"}>{p.badge}</Badge>
                  </div>
                ))}
                <a className="link" style={{fontSize:11,display:"inline-block",marginTop:6}}>View all 3 plays</a>
              </div>
              <div className="card" style={{padding:14}}>
                <div className="flex items-center justify-between" style={{marginBottom:10}}>
                  <b style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.05em",color:"var(--ink-3)"}}>Included in WorkProducts <span className="count-inline">2</span></b>
                </div>
                {[
                  {t:"Executive Summary — Q2 2024", d:"Generated Apr 24, 2024", page:"Page 7"},
                  {t:"Board Update — May 2024", d:"Generated May 2, 2024", page:"Page 12"},
                ].map((p,i)=>(
                  <div key={i} className="flex items-center gap-2" style={{padding:"6px 0",borderBottom:i<1?"1px dashed var(--line-soft)":"none",fontSize:12}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:500}}>{p.t}</div>
                      <div className="muted" style={{fontSize:10}}>{p.d}</div>
                    </div>
                    <span className="muted mono" style={{fontSize:10}}>{p.page}</span>
                  </div>
                ))}
                <a className="link flex items-center justify-between" style={{fontSize:11,marginTop:6}}>
                  View all 2 workproducts <Ico.Down size={10}/>
                </a>
              </div>
              <div className="card" style={{padding:14}}>
                <div className="flex items-center justify-between" style={{marginBottom:10}}>
                  <b style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.05em",color:"var(--ink-3)"}}>Actions</b>
                </div>
                {[
                  {i:<Ico.Plus size={12}/>,l:"Add to Deck"},
                  {i:<Ico.Collections size={12}/>,l:"Add to Collection"},
                  {i:<Ico.Plays size={12}/>,l:"Add to Play"},
                  {i:<Ico.Download size={12}/>,l:"Download Slide"},
                  {i:<Ico.External size={12}/>,l:"View Source File"},
                ].map((a,i)=>(
                  <div key={i} className="flex items-center gap-2" style={{padding:"5px 0",fontSize:12,cursor:"pointer",color:"var(--primary)"}}>
                    {a.i} {a.l}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right rail — details */}
          <aside style={{display:"flex",flexDirection:"column",gap:14,position:"sticky",top:16}}>
            <div className="card" style={{padding:14}}>
              <b style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.05em",color:"var(--ink-3)"}}>ContentUnit Details</b>
              <div style={{display:"grid",gridTemplateColumns:"110px 1fr",gap:"8px 10px",marginTop:10,fontSize:12}}>
                <div className="muted">ContentUnit ID</div>
                <div className="flex items-center gap-1"><span className="mono">SLIDE-1A2B3</span><Ico.Copy size={11} color="var(--ink-4)"/></div>
                <div className="muted">Source</div>
                <div>Strategy_Deck_Q2_2024.pptx</div>
                <div className="muted">Last Updated</div>
                <div>Apr 24, 2024 by Alex Kim</div>
                <div className="muted">File Location</div>
                <div className="mono" style={{fontSize:11}}>/Strategy Decks/2024/Q2/</div>
                <div className="muted">Tags</div>
                <div className="flex gap-1" style={{flexWrap:"wrap"}}>
                  <span className="tag blue sm">Market Opportunity</span>
                  <span className="tag blue sm">Overview</span>
                  <span className="tag blue sm">Financial</span>
                  <span className="tag blue sm">Growth</span>
                  <span className="tag sm">+2</span>
                </div>
              </div>
            </div>

            <div className="card" style={{padding:14}}>
              <b style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.05em",color:"var(--ink-3)"}}>Similarity & Relevance</b>
              <div style={{marginTop:12,fontSize:12}}>
                <div className="flex items-center justify-between" style={{marginBottom:4}}>
                  <span style={{color:"var(--ok)",fontWeight:600}}>Best Match</span>
                  <b>98%</b>
                </div>
                <div style={{height:6,borderRadius:3,background:"var(--bg-2)",overflow:"hidden"}}>
                  <div style={{width:"98%",height:"100%",background:"var(--ok)"}}/>
                </div>
                <div className="flex items-center justify-between" style={{marginTop:10,marginBottom:4}}>
                  <span className="muted">Average Similarity (All)</span>
                  <b>76%</b>
                </div>
                <div style={{height:6,borderRadius:3,background:"var(--bg-2)",overflow:"hidden"}}>
                  <div style={{width:"76%",height:"100%",background:"var(--primary)"}}/>
                </div>
                <div className="flex items-center justify-between" style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--line-soft)"}}>
                  <span className="muted">Total Similar Concepts</span><b>15</b>
                </div>
              </div>
            </div>

            <div className="card" style={{padding:14}}>
              <div className="flex items-center justify-between" style={{marginBottom:8}}>
                <b style={{fontSize:12,textTransform:"uppercase",letterSpacing:"0.05em",color:"var(--ink-3)"}}>Extracted Text</b>
                <a className="link" style={{fontSize:11}}>Copy all</a>
              </div>
              <div style={{fontSize:11,lineHeight:1.55,color:"var(--ink-2)",background:"var(--bg-2)",padding:10,borderRadius:6}}>
                Market Opportunity Overview<br/>
                A substantial and growing market opportunity driven by digital transformation and increasing customer demand.<br/><br/>
                $42B Total Addressable Market<br/>
                +18% CAGR through 2028<br/>
                120M+ Potential Customers…
              </div>
              <a className="link" style={{fontSize:11,display:"inline-block",marginTop:8}}>Show more</a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

window.RouteVariationExplorer = RouteVariationExplorer;
