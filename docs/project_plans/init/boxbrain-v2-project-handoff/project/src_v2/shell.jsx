/* v2 shell: Sidebar, Topbar, shared primitives */

function Sidebar({route, setRoute}) {
  const NAV_TOP = [
    {key:"home", label:"Home", icon:"Home"},
    {key:"search", label:"Search", icon:"Search", kbd:"⌘K"},
    {key:"inbox", label:"Inbox", icon:"Inbox", count:"8"},
    {key:"opps", label:"Opportunities", icon:"Opps"},
    {key:"accounts", label:"Accounts", icon:"Building"},
    {key:"plays", label:"Plays", icon:"Plays"},
    {key:"library", label:"Library", icon:"Library"},
    {key:"reports", label:"Reports", icon:"Chart"},
    {key:"reviews", label:"Reviews", icon:"Reviews", count:"12"},
    {key:"admin", label:"Admin", icon:"Admin"},
  ];
  const FAV = [
    {key:"play", label:"Executive Expansion Play", icon:"Star"},
    {key:"play", label:"Competitive Battlecard", icon:"Star"},
    {key:"wp", label:"Q1 GTM Strategy", icon:"Star"},
    {key:"wp", label:"Security Questionnaire", icon:"Star"},
  ];
  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="logo">B</div>
        <div className="name">BoxBrain</div>
      </div>
      <div className="sb-workspace">
        <div className="ws-icon">A</div>
        <div style={{flex:1}}>Acme Corp</div>
        <Ico.Down size={12}/>
      </div>
      <nav className="sb-nav">
        {NAV_TOP.map(n => {
          const I = Ico[n.icon];
          const isActive = route === n.key || (n.key==="plays" && route==="playDetail") || (n.key==="library" && (route==="workproduct"||route==="contentunit"||route==="variationExplorer"));
          return (
            <div key={n.key} className={`sb-item ${isActive?"active":""}`} onClick={()=>setRoute(n.key)}>
              <I/>
              <span>{n.label}</span>
              {n.kbd && <span style={{marginLeft:"auto",fontFamily:"var(--mono)",fontSize:10,color:"var(--sidebar-ink-3)"}}>{n.kbd}</span>}
              {n.count && <span className="count">{n.count}</span>}
            </div>
          );
        })}
      </nav>
      <div className="sb-group">Favorites</div>
      <nav className="sb-nav">
        {FAV.map((f,i) => {
          const I = Ico[f.icon];
          return (
            <div key={i} className="sb-pinned-item" onClick={()=>setRoute(f.key)}>
              <I/>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.label}</span>
            </div>
          );
        })}
      </nav>
      <div className="sb-group">Spaces</div>
      <nav className="sb-nav">
        {["Growth","Public Sector","Strategic Accounts","Product Marketing"].map(s=>(
          <div key={s} className="sb-pinned-item"><Ico.Folder size={14}/><span>{s}</span></div>
        ))}
      </nav>
      <div className="sb-spacer"/>
      <div className="sb-user">
        <div className="av">SC</div>
        <div style={{flex:1,minWidth:0}}>
          <div className="name">Sarah Chen</div>
          <div className="sub">Enterprise AE</div>
        </div>
        <Ico.Down size={12} color="var(--sidebar-ink-3)"/>
      </div>
    </aside>
  );
}

function Topbar({crumbs, onCommand}) {
  return (
    <header className="topbar">
      <div className="breadcrumbs">
        {(crumbs||[]).map((c,i)=>(
          <React.Fragment key={i}>
            {i>0 && <span className="sep"><Ico.Right size={12}/></span>}
            <span className={i===crumbs.length-1?"cur":""}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="search">
        <Ico.Search size={14}/>
        <input placeholder="Search BoxBrain…" onFocus={onCommand}/>
        <span className="kbd">⌘K</span>
      </div>
      <button className="icon-btn borderless"><Ico.Sparkle size={16} color="var(--ai)"/></button>
      {typeof MySelectionButton !== "undefined" && <MySelectionButton/>}
      <button className="icon-btn borderless"><Ico.Bell/><span className="badge-dot"/></button>
      <button className="icon-btn borderless"><Ico.Help/></button>
      <div className="avatar">AK</div>
    </header>
  );
}

function SlideThumb({variant="dark", title, sub, brand="ACME", chart, big=false}) {
  const variantMap = {dark:"dark",light:"light",purple:"purple",teal:"teal",bridge:"teal",city:"dark",aurora:"purple",mountain:""};
  const cls = variantMap[variant] !== undefined ? variantMap[variant] : "";
  return (
    <div className={`slide-thumb ${cls}`} style={big?{fontSize:14}:{}}>
      <div className="content">
        <div className="brand">{brand}</div>
        <div className="title" style={{marginTop:"auto"}}>{title||"Revenue Growth Momentum"}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {chart && (
        <svg viewBox="0 0 100 40" style={{position:"absolute",right:"8%",bottom:"10%",width:"45%",height:"35%",opacity:0.85}}>
          {[20,25,30,35,28,32,38].map((h,i)=>(
            <rect key={i} x={i*13} y={40-h} width="10" height={h} fill="rgba(96,165,250,0.8)" rx="1"/>
          ))}
        </svg>
      )}
    </div>
  );
}

function Badge({kind, children}) {
  return <span className={`badge ${kind||""}`}><span className="dot"/>{children}</span>;
}
function BadgeCheck({children}) {
  return <span className="badge-check"><Ico.Check size={13}/>{children}</span>;
}

function Stat({label, value, hint, spark, up, down}) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint && <div className="hint">{hint}</div>}
      {spark && (
        <div className="spark">
          <svg className="spark-svg" viewBox="0 0 100 22" preserveAspectRatio="none">
            <path className={`line ${up?"up":""} ${down?"down":""}`} d={spark}/>
          </svg>
        </div>
      )}
    </div>
  );
}

function ScorePill({v, label}) {
  const cls = v>=85?"good":v>=70?"mid":"low";
  return <span className={`score-pill ${cls}`}><span className="circle">{v}</span>{label||""}</span>;
}

function Meter({v=92, label, kind}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`meter ${kind||""}`} style={{"--v":v}}><span>{v}</span></div>
      {label && <div>{label}</div>}
    </div>
  );
}

function Stars({n=5, of=5}) {
  return (
    <span className="stars">
      {[...Array(of)].map((_,i)=><Ico.Star key={i} size={12} color={i<n?"#f59e0b":"#e2e8f0"}/>)}
    </span>
  );
}

function Avatar({who, className=""}) {
  const colors = ["violet","teal","amber","green",""];
  const hash = (who||"X").charCodeAt(0) % colors.length;
  const initials = (who||"U").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return <div className={`avatar ${colors[hash]} ${className}`}>{initials}</div>;
}

window.Sidebar = Sidebar;
window.Topbar = Topbar;
window.SlideThumb = SlideThumb;
window.Badge = Badge;
window.BadgeCheck = BadgeCheck;
window.Stat = Stat;
window.ScorePill = ScorePill;
window.Meter = Meter;
window.Stars = Stars;
window.Avatar = Avatar;
