/* BoxBrain v2 - main app */

function AppV2() {
  const [route, setRoute] = React.useState(() => {
    try { return localStorage.getItem("bbv2_route") || "home"; } catch(e){ return "home"; }
  });
  const go = (r) => { setRoute(r); try{localStorage.setItem("bbv2_route", r);}catch(e){} window.scrollTo(0,0); };

  let Content;
  if (route === "home") Content = <RouteHome go={go}/>;
  else if (route === "search") Content = <RouteAskBoxBrain go={go}/>;
  else if (route === "library") Content = <RouteLibrary go={go}/>;
  else if (route === "workproduct") Content = <RouteWorkProduct go={go}/>;
  else if (route === "contentunit") Content = <RouteContentUnit go={go}/>;
  else if (route === "variationExplorer") Content = <RouteVariationExplorer go={go}/>;
  else if (route === "plays") Content = <RoutePlaysList go={go}/>;
  else if (route === "playDetail") Content = <RoutePlayDetail go={go}/>;
  else if (route === "opps") Content = <RouteOpportunity go={go}/>;
  else if (route === "oppStoryboard") Content = <RouteOppStoryboard go={go}/>;
  else if (route === "reviews") Content = <RouteReviews go={go}/>;
  else if (route === "reviewsV2") Content = <RouteReviewsV2 go={go}/>;
  else if (route === "compare") Content = <RouteCompare/>;
  else if (route === "wpStoryboard") Content = <RouteWorkProductStoryboard go={go}/>;
  else if (route === "storyboardWorkspace") Content = <RouteStoryboardWorkspace go={go}/>;
  else if (route === "storyboardWorkspaceV2") Content = <RouteStoryboardWorkspaceV2 go={go}/>;
  else if (route === "wpDeckDetail") Content = <RouteWpDeckDetail go={go}/>;
  else if (route === "wpPublishPackage") Content = <RouteWpPublishPackage go={go}/>;
  else Content = <RouteFallback name={route.charAt(0).toUpperCase()+route.slice(1)} go={go}/>;

  // Floating route picker so users can jump between all the key designed screens
  return (
    <MySelectionProvider>
      <div className="app">
        <Sidebar route={route} setRoute={go}/>
        <main className="main" data-screen-label={route}>
          {Content}
        </main>
        <RoutePicker route={route} setRoute={go}/>
        <button className="help-bubble" onClick={()=>go("search")}><Ico.Sparkle size={18}/></button>
      </div>
    </MySelectionProvider>
  );
}

function RoutePicker({route, setRoute}) {
  const [open, setOpen] = React.useState(false);
  const items = [
    {k:"home",l:"Home"},
    {k:"search",l:"Ask BoxBrain"},
    {k:"library",l:"Library"},
    {k:"workproduct",l:"Work Product"},
    {k:"wpStoryboard",l:"WP · Storyboard Tab"},
    {k:"storyboardWorkspace",l:"Storyboard Workspace"},
    {k:"storyboardWorkspaceV2",l:"Storyboard Workspace v2"},
    {k:"wpDeckDetail",l:"WP · Deck Detail"},
    {k:"wpPublishPackage",l:"WP · Publish & Package"},
    {k:"contentunit",l:"Content Unit"},
    {k:"variationExplorer",l:"Variation Explorer"},
    {k:"plays",l:"Plays"},
    {k:"playDetail",l:"Play Detail"},
    {k:"opps",l:"Opportunity"},
    {k:"oppStoryboard",l:"Opp · Storyboard Tab"},
    {k:"reviews",l:"Reviews"},
    {k:"reviewsV2",l:"Reviews · Redesign"},
    {k:"compare",l:"Compare view"},
  ];
  return (
    <div style={{position:"fixed",bottom:24,left:260,zIndex:30}}>
      {open && (
        <div className="card" style={{padding:6,marginBottom:6,boxShadow:"var(--shadow-lg)",minWidth:200}}>
          {items.map(it=>(
            <div key={it.k} onClick={()=>{setRoute(it.k);setOpen(false);}}
              style={{padding:"7px 10px",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:route===it.k?600:400,color:route===it.k?"var(--primary)":"var(--ink-2)",background:route===it.k?"var(--primary-bg)":"transparent"}}>
              {it.l}
            </div>
          ))}
        </div>
      )}
      <button className="btn btn-ghost btn-sm" onClick={()=>setOpen(!open)} style={{boxShadow:"var(--shadow)"}}>
        <Ico.Layers size={13}/> Screens <Ico.Down size={11}/>
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AppV2/>);
