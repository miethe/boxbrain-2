/* v2 sample data */
const V2_PLAYS = [
  {id:"p1", title:"Executive Expansion Play", verified:true, owner:"Sarah Chen", ownerRole:"VP, Customer Success",
   updated:"May 14, 2025", summary:"Drive multi-product adoption and expand account value through executive alignment, business case expansion, and cross-functional engagement.",
   tags:["Expansion","Enterprise","SaaS","Multi-Product"], extra:2,
   stats:{uses:342, winRate:68, dealSize:"$145K", ttv:"41 days", adoption:"89%"},
   audience:"Account Executives, Customer Success Managers, Solutions Engineers",
   experience:"Mid to Senior", deals:"$100K+ ACV",
   useCases:["Expand into new business units","Increase seat count and usage","Add complementary products","Drive platform consolidation"],
   whenToUse:"When an account has strong product adoption and clear expansion potential but limited growth in the past 90 days.",
   success:"Expansion pipeline generated, executive sponsor engaged, and additional products or seats activated.",
   steps:[
    {icon:"meeting",title:"Executive Alignment",type:"MEETING",desc:"Align on strategic priorities and expansion objectives with executive sponsor.",time:"7–10 days"},
    {icon:"workproduct",title:"Business Case Expansion",type:"WORK PRODUCT",desc:"Build and validate the expansion business case with quantified value.",time:"5–7 days"},
    {icon:"workshop",title:"Solution Expansion Workshop",type:"WORKSHOP",desc:"Identify expansion opportunities and shape the multi-product solution.",time:"7–10 days"},
    {icon:"engagement",title:"Stakeholder Engagement",type:"ENGAGEMENT",desc:"Activate cross-functional champions and address objections.",time:"10–14 days"},
    {icon:"proposal",title:"Proposal & Close",type:"PROPOSAL",desc:"Present proposal, finalize terms, and close expansion.",time:"7–10 days"},
   ],
  },
  {id:"p2",title:"Land and Expand",summary:"Expansion · 312 uses",tags:["Expansion"],stats:{uses:312}},
  {id:"p3",title:"Cross-Sell New Product",summary:"Cross-Sell · 278 uses",tags:["Cross-sell"],stats:{uses:278}},
  {id:"p4",title:"Account Growth Accelerator",summary:"Growth · 195 uses",tags:["Growth"],stats:{uses:195}},
];

const V2_WORKPRODUCTS = [
  {id:"wp1",title:"Q1 2025 Go-to-Market Strategy",type:"Presentation Deck",v:"v3.2",updated:"May 7, 2025 by Sarah Chen",
   status:"approved",fresh:true,
   desc:"Executive-level strategy deck outlining our go-to-market approach, product-led growth motions, and execution plan for Q1 2025.",
   file:"Q1 2025 GTM Strategy.pptx", size:"18.4 MB", owner:"Sarah Chen", team:"Strategy & Solutions",
   created:"Apr 10, 2025", classification:"Internal Use", sensitivity:"Confidential", languages:"English",
   tags:["go-to-market","strategy","q1-2025"], extra:3,
   stats:{reuse:87, usage:24, saves:18, plays:9, rating:4.6, reviews:23},
   taxonomy:{industry:"Business Services",solution:"Growth Markets",contentType:"Strategy Deck",engagement:"Strategy",persona:"C-Suite; Head of Growth",geography:"Global"},
   thumb:"mountain"
  },
  {id:"wp2",title:"ACME Digital Transformation",type:"Work Product",updated:"Apr 28",status:"draft"},
  {id:"wp3",title:"Pricing Strategy Analysis",type:"Work Product",updated:"Apr 24",status:"review"},
  {id:"wp4",title:"Client Pitch Deck Template",type:"Template",updated:"Apr 22",status:"canonical"},
  {id:"wp5",title:"2024 Market Outlook",type:"Research",updated:"Apr 18",status:"approved"},
];

const V2_LIBRARY_CARDS = [
  {id:"lc1",kind:"Deck",type:"ppt",title:"Enterprise AI Platform Overview Deck",tag:["Deck","Sales"],trusted:true,
   owner:"Taylor Morgan",updated:"2h ago",views:342,downloads:128,relevance:92,thumbColor:"dark",thumbTitle:"Enterprise AI Platform Overview",featured:true,
   desc:"Executive overview deck for enterprise AI…"},
  {id:"lc2",kind:"Document",type:"doc",title:"AI-Powered Contract Intelligence",tag:["Document","Contracts"],trusted:true,
   owner:"Alex Rivera",updated:"5h ago",views:276,downloads:94,relevance:89,thumbColor:"light",thumbTitle:"AI-Powered Contract Intelligence",
   desc:"How BoxBrain extracts value from unstructured contracts…"},
  {id:"lc3",kind:"Case Study",type:"img",title:"Customer Success Momentum",tag:["Image","Case Study"],trusted:true,
   owner:"Jordan Lee",updated:"1d ago",views:198,downloads:73,relevance:null,thumbColor:"city",thumbTitle:"",
   desc:"Global customer adoption and growth visual"},
  {id:"lc4",kind:"Play",type:"img",title:"Competitive Battlecard Play",tag:["Play","Battlecards"],trusted:true,starred:true,
   owner:"Riley Smith",updated:"3d ago",views:512,downloads:201,relevance:94,thumbColor:"purple",thumbTitle:"Competitive Battlecard Play",
   desc:"Guided battlecard for top competitors and objections"},
  {id:"lc5",kind:"Document",type:"doc",title:"The Total Economic Impact of BoxBrain",tag:["Document","White Paper"],trusted:true,
   owner:"—",updated:"—",thumbColor:"light",thumbTitle:"The Total Economic Impact of BoxBrain",
   desc:"Forrester TEI study on BoxBrain customer outcomes…"},
  {id:"lc6",kind:"Deck",type:"ppt",title:"Financial Services Solution Deck",tag:["Deck","Financial Services"],trusted:true,
   thumbColor:"dark",thumbTitle:"Financial Services Solution Deck",
   desc:"Tailored solution deck for financial services firms…"},
  {id:"lc7",kind:"Implementation",type:"doc",title:"BoxBrain Enterprise Implementation Guide",tag:["Doc","Implementation"],trusted:true,
   thumbColor:"light",thumbTitle:"BoxBrain Enterprise Implementation",
   desc:"Step-by-step implementation guide for enterprise teams…"},
  {id:"lc8",kind:"Product",type:"img",title:"AI in Action Product Screenshot",tag:["Image","Product"],trusted:true,
   thumbColor:"aurora",thumbTitle:"",
   desc:"Key capabilities in the BoxBrain platform"},
];

const V2_CONTENT_UNITS = [
  {id:"cu1",title:"Revenue Growth Momentum",score:92,status:"Excellent",version:"v5.2",current:true,thumbColor:"light"},
  {id:"cu2",title:"Growth Summary",score:65,status:"Good",version:"v4.1",thumbColor:"light"},
  {id:"cu3",title:"Revenue Growth Momentum",score:89,status:"Excellent",version:"v5.0",thumbColor:"light"},
  {id:"cu4",title:"Revenue Performance Highlights",score:87,status:"Very good",version:"v2.7",thumbColor:"dark"},
  {id:"cu5",title:"Revenue Momentum",score:76,status:"Good",version:"v3.4",thumbColor:"light"},
];

const V2_ASK_SLIDES = [
  {id:"s1",title:"Financial Services Pitch Deck",sub:"May 7, 2024 • v3",badges:["Approved","Fresh","Canonical"],signals:["High semantic match","Reused often"],thumbColor:"dark",pages:18},
  {id:"s2",title:"Wealth Management Pitch Deck",sub:"Apr 18, 2024 • v2",badges:["Approved","Fresh"],signals:["High semantic match","Recently used"],thumbColor:"bridge",pages:16},
  {id:"s3",title:"Banking AI Solutions Deck",sub:"Mar 22, 2024 • v1",badges:["Approved","Canonical"],signals:["Reused often"],thumbColor:"purple",pages:20},
];

const V2_OPPS = [
  {id:"o1",name:"ACME Global Expansion",status:"Active",amount:"$4.2M",close:"Sep 30, 2025",days:76,stage:"Solution Design",
   tags:["Global Manufacturing","IT Transformation","Multi-Region","RFP","Executive Sponsor"],
   team:[1,2,3,4,5],
   deal:{engagement:"High",budget:"Confirmed",competition:"Moderate",timeline:"On Track",score:78},
   industry:"ACME Corporation",regions:"NA, EMEA, APAC",owner:"Sarah Chen",solution:"Digital Workplace",
   decision:"Security, Scalability, TCO",pains:"Legacy systems, Siloed data, Time to market"},
];

const V2_REVIEWS = [
  {id:"r1",title:"Q2 2025 Board Update",type:"Presentation",owner:"Sarah Chen",submitted:"2 days ago",priority:"High",status:"pending"},
  {id:"r2",title:"AI Platform Overview v3",type:"Deck",owner:"Alex Rivera",submitted:"4 hours ago",priority:"High",status:"pending"},
  {id:"r3",title:"Financial Services Solution",type:"Document",owner:"Jordan Lee",submitted:"1 day ago",priority:"Medium",status:"pending"},
  {id:"r4",title:"Competitive Battlecard — Snowflake",type:"Battlecard",owner:"Riley Smith",submitted:"3 hours ago",priority:"High",status:"pending"},
  {id:"r5",title:"2024 Market Outlook",type:"Research",owner:"Taylor Morgan",submitted:"6 days ago",priority:"Low",status:"pending"},
];

window.V2_PLAYS = V2_PLAYS;
window.V2_WORKPRODUCTS = V2_WORKPRODUCTS;
window.V2_LIBRARY_CARDS = V2_LIBRARY_CARDS;
window.V2_CONTENT_UNITS = V2_CONTENT_UNITS;
window.V2_ASK_SLIDES = V2_ASK_SLIDES;
window.V2_OPPS = V2_OPPS;
window.V2_REVIEWS = V2_REVIEWS;
