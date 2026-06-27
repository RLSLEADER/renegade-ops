import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// These get replaced with your real values from Supabase dashboard
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
let supabase = null;
try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch(e) {
  console.error("Supabase init error:", e);
}

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T = {
  navy: "#1A3A5C", navyLight: "#244d7a", navyDark: "#102540",
  orange: "#C8742A", orangeLight: "#E8924E", orangePale: "#FDF0E6",
  slate: "#4A5568", silver: "#8898AA", fog: "#F4F6F9",
  white: "#FFFFFF", border: "#E2E8F0", borderDark: "#CBD5E0",
  ok: { bg:"#E6F4EA", text:"#1E6832" }, tx: { bg:"#E8F0FB", text:"#1A3A7C" },
  nm: { bg:"#FEF3E2", text:"#7A4210" }, ks: { bg:"#EDE9FB", text:"#4A2E8C" },
  ar: { bg:"#FDE8E8", text:"#8C1C1C" },
  og:{ bg:"#FEF3E2", text:"#7A4210" }, wind:{ bg:"#E8F0FB", text:"#1A3A7C" },
  solar:{ bg:"#E6F4EA", text:"#1E6832" }, ccs:{ bg:"#EDE9FB", text:"#4A2E8C" },
  uran:{ bg:"#FDE8E8", text:"#8C1C1C" }, mid:{ bg:"#E8F8F8", text:"#1A6A6A" },
  active:{bg:"#E6F4EA",text:"#1E6832"}, pending:{bg:"#FEF3E2",text:"#7A4210"},
  approved:{bg:"#E6F4EA",text:"#1E6832"}, submitted:{bg:"#E8F0FB",text:"#1A3A7C"},
  overdue:{bg:"#FDE8E8",text:"#8C1C1C"}, review:{bg:"#EDE9FB",text:"#4A2E8C"},
  routed:{bg:"#F0E8FA",text:"#5C1E8C"}, complete:{bg:"#E6F4EA",text:"#1E6832"},
  qualifying:{bg:"#FEF3E2",text:"#7A4210"},
};

// ─── ROLES ───────────────────────────────────────────────────────────────────
const ROLE_ACCESS = {
  admin:   ["overview","permits","projects","vendor","retainer","peripheral","financial","agent","team"],
  landman: ["overview","permits","projects","retainer","agent"],
  sales:   ["overview","permits","vendor","peripheral","financial"],
};
const canEdit = (role, module) => {
  if (role === "admin") return true;
  if (role === "landman" && ["permits","projects","retainer"].includes(module)) return true;
  if (role === "sales" && ["permits","vendor","peripheral"].includes(module)) return true;
  return false;
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2,9);
const fmt$ = v => "$" + Number(v||0).toLocaleString();
const fmtDate = d => d ? new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";
const isOverdue = due => due && new Date(due) < new Date() && new Date(due).toDateString() !== new Date().toDateString();

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
const Tag = ({label,colors}) => <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:colors?.bg||T.fog,color:colors?.text||T.slate,whiteSpace:"nowrap"}}>{label}</span>;
const StateTag = ({state}) => <Tag label={state} colors={T[state?.toLowerCase()]||{bg:T.fog,text:T.slate}}/>;
const SectorTag = ({sector}) => <Tag label={sector} colors={{og:T.og,wind:T.wind,solar:T.solar,ccs:T.ccs,uranium:T.uran,midstream:T.mid}[sector?.toLowerCase()]||{bg:T.fog,text:T.slate}}/>;
const StatusBadge = ({status}) => { const label=status?status.charAt(0).toUpperCase()+status.slice(1):"—"; return <Tag label={label} colors={T[status]||{bg:T.fog,text:T.slate}}/>; };
const Btn = ({children,onClick,variant="secondary",small,disabled}) => {
  const bg=variant==="primary"?T.orange:variant==="danger"?"#E24B4A":T.white;
  const color=variant==="primary"||variant==="danger"?T.white:T.slate;
  return <button onClick={onClick} disabled={disabled} style={{padding:small?"4px 10px":"7px 14px",background:bg,color,border:`1px solid ${variant==="primary"?T.orange:variant==="danger"?"#E24B4A":T.border}`,borderRadius:8,fontSize:small?11:13,fontWeight:600,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1}}>{children}</button>;
};
const FilterChip = ({label,active,onClick}) => <button onClick={onClick} style={{padding:"4px 12px",borderRadius:20,border:active?`1.5px solid ${T.orange}`:`1px solid ${T.border}`,background:active?T.orangePale:T.white,color:active?T.orange:T.silver,fontSize:12,fontWeight:600,cursor:"pointer"}}>{label}</button>;
const MetricCard = ({label,value,sub,subColor}) => <div style={{background:T.fog,borderRadius:10,padding:"14px 16px",display:"flex",flexDirection:"column",gap:4}}><div style={{fontSize:11,color:T.silver,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:600}}>{label}</div><div style={{fontSize:24,fontWeight:600,color:T.navy,lineHeight:1.2}}>{value}</div>{sub&&<div style={{fontSize:11,color:subColor||T.silver}}>{sub}</div>}</div>;
const SectionCard = ({children,style}) => <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:20,marginBottom:16,...style}}>{children}</div>;
const CardHeader = ({title,children}) => <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}><div style={{fontSize:14,fontWeight:700,color:T.navy}}>{title}</div><div style={{display:"flex",gap:8}}>{children}</div></div>;
const SLABar = ({due,status}) => { const ov=status==="overdue"||isOverdue(due); const color=ov?"#E24B4A":status==="review"?"#7F77DD":"#639922"; return <div style={{width:80,height:6,background:T.fog,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:ov?"100%":"45%",background:color,borderRadius:3}}/></div>; };

// ─── FORM HELPERS ─────────────────────────────────────────────────────────────
const Inp = ({label,value,onChange,type="text",placeholder="",required,small}) => <div style={{marginBottom:small?8:14}}>{label&&<div style={{fontSize:12,fontWeight:600,color:T.slate,marginBottom:4}}>{label}{required&&<span style={{color:"#E24B4A"}}> *</span>}</div>}<input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:"100%",padding:"8px 10px",border:`1px solid ${T.border}`,borderRadius:7,fontSize:13,color:T.navy,outline:"none",background:T.white,boxSizing:"border-box"}}/></div>;
const Sel = ({label,value,onChange,options,required,small}) => <div style={{marginBottom:small?8:14}}>{label&&<div style={{fontSize:12,fontWeight:600,color:T.slate,marginBottom:4}}>{label}{required&&<span style={{color:"#E24B4A"}}> *</span>}</div>}<select value={value||""} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"8px 10px",border:`1px solid ${T.border}`,borderRadius:7,fontSize:13,color:T.navy,background:T.white,boxSizing:"border-box"}}><option value="">Select…</option>{options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}</select></div>;
const Txt = ({label,value,onChange,rows=3}) => <div style={{marginBottom:14}}>{label&&<div style={{fontSize:12,fontWeight:600,color:T.slate,marginBottom:4}}>{label}</div>}<textarea value={value||""} onChange={e=>onChange(e.target.value)} rows={rows} style={{width:"100%",padding:"8px 10px",border:`1px solid ${T.border}`,borderRadius:7,fontSize:13,color:T.navy,resize:"vertical",background:T.white,boxSizing:"border-box"}}/></div>;
const Chk = ({label,checked,onChange}) => <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:8}}><input type="checkbox" checked={!!checked} onChange={e=>onChange(e.target.checked)} style={{width:15,height:15}}/><span style={{fontSize:13,color:T.slate}}>{label}</span></label>;
const FormRow = ({children}) => <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{children}</div>;
const FormBtn = ({children,onClick,variant="secondary",type="button",disabled}) => { const bg=variant==="primary"?T.orange:variant==="danger"?"#E24B4A":T.white; const color=variant==="primary"||variant==="danger"?T.white:T.slate; return <button type={type} onClick={onClick} disabled={disabled} style={{padding:"9px 18px",background:bg,color,border:variant==="secondary"?`1px solid ${T.border}`:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1}}>{children}</button>; };

// ─── MODAL ────────────────────────────────────────────────────────────────────
const Modal = ({title,onClose,children,wide}) => <div style={{position:"fixed",inset:0,background:"rgba(10,20,40,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}><div style={{background:T.white,borderRadius:14,width:wide?720:520,maxHeight:"88vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:`1px solid ${T.border}`}}><div style={{fontSize:15,fontWeight:600,color:T.navy}}>{title}</div><button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.silver,fontSize:20,lineHeight:1}}>×</button></div><div style={{padding:20}}>{children}</div></div></div>;

// ─── TABLE ────────────────────────────────────────────────────────────────────
function Tbl({cols,rows,onEdit,onDelete,emptyMsg="No records yet.",loading}) {
  if (loading) return <div style={{textAlign:"center",padding:32,color:T.silver}}>Loading…</div>;
  if (!rows.length) return <div style={{textAlign:"center",padding:32,color:T.silver,fontSize:13}}>{emptyMsg}</div>;
  return <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{cols.map(c=><th key={c.key} style={{padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:T.silver,borderBottom:`1px solid ${T.border}`,letterSpacing:"0.05em",whiteSpace:"nowrap",width:c.w||"auto"}}>{c.label}</th>)}{(onEdit||onDelete)&&<th style={{width:80}}/>}</tr></thead><tbody>{rows.map((row,i)=><tr key={row.id||i} style={{background:i%2===0?T.white:T.fog}}>{cols.map(c=><td key={c.key} style={{padding:"9px 10px",borderBottom:`1px solid ${T.border}`,verticalAlign:"middle",color:T.navy}}>{c.render?c.render(row):(row[c.key]||"—")}</td>)}{(onEdit||onDelete)&&<td style={{padding:"9px 10px",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap"}}>{onEdit&&<button onClick={()=>onEdit(row)} style={{background:"none",border:"none",cursor:"pointer",color:T.slate,fontSize:12,fontWeight:600,padding:"2px 6px"}}>Edit</button>}{onDelete&&<button onClick={()=>onDelete(row.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#E24B4A",fontSize:12,fontWeight:600,padding:"2px 6px"}}>Del</button>}</td>}</tr>)}</tbody></table></div>;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginPage({onLogin}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login");

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      let result;
      if (mode === "login") {
        result = await supabase.auth.signInWithPassword({ email, password });
      } else {
        result = await supabase.auth.signUp({ email, password });
      }
      if (result.error) throw result.error;
      if (mode === "signup") setError("Check your email to confirm your account, then log in.");
    } catch(err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:T.navy,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.white,borderRadius:16,padding:40,width:400,boxShadow:"0 24px 80px rgba(0,0,0,0.4)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:13,fontWeight:800,color:T.orange,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>RENEGADE</div>
          <div style={{fontSize:20,fontWeight:700,color:T.navy}}>Land Title & Leasing</div>
          <div style={{fontSize:12,color:T.silver,marginTop:4}}>Operations Hub</div>
        </div>
        <form onSubmit={handle}>
          <Inp label="Email" type="email" value={email} onChange={setEmail} required/>
          <Inp label="Password" type="password" value={password} onChange={setPassword} required/>
          {error && <div style={{padding:"8px 12px",background:error.includes("Check")?"#E6F4EA":"#FDE8E8",borderRadius:8,fontSize:12,color:error.includes("Check")?"#1E6832":"#8C1C1C",marginBottom:12}}>{error}</div>}
          <button type="submit" disabled={loading} style={{width:"100%",padding:"11px",background:T.orange,color:T.white,border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:12}}>
            {loading?"…":mode==="login"?"Sign In":"Create Account"}
          </button>
          <div style={{textAlign:"center",fontSize:12,color:T.silver}}>
            {mode==="login"?<>No account? <button type="button" onClick={()=>setMode("signup")} style={{background:"none",border:"none",color:T.orange,cursor:"pointer",fontWeight:600}}>Sign up</button></>:<>Have an account? <button type="button" onClick={()=>setMode("login")} style={{background:"none",border:"none",color:T.orange,cursor:"pointer",fontWeight:600}}>Sign in</button></>}
          </div>
        </form>
        {!SUPABASE_URL && (
          <div style={{marginTop:16,padding:"10px 12px",background:"#FEF3E2",borderRadius:8,fontSize:11,color:"#7A4210"}}>
            ⚠ Supabase not configured yet. See setup instructions in README.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── OVERVIEW ────────────────────────────────────────────────────────────────
function Overview({counts,userRole}) {
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        <MetricCard label="Active Orders" value={counts.activeProjects||0} sub={counts.overdueProjects?`⚠ ${counts.overdueProjects} overdue`:"All on track"} subColor={counts.overdueProjects?"#E24B4A":T.silver}/>
        <MetricCard label="Vendor Approvals" value={counts.approvedVendors||0} sub={`${counts.pendingVendors||0} pending`}/>
        <MetricCard label="Retainer Clients" value={counts.activeRetainers||0} sub={`${fmt$(counts.retainerMRR||0)}/mo recurring`} subColor="#3B6D11"/>
        <MetricCard label="DB Mining Entries" value={counts.permits||0} sub={`${counts.unflaggedPermits||0} need action`} subColor={T.orange}/>
      </div>
      <SectionCard>
        <CardHeader title="Welcome to Renegade Land Title & Leasing — Operations Hub"/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
          {[
            {icon:"⦿",title:"DB Mining",desc:"Monitor OCC, RRC, FERC, BLM, EPA UIC permits and log new operators for outreach.",module:"permits"},
            {icon:"⊟",title:"Projects & Orders",desc:"Track all active abstract, leasing, curative, and GIS orders with SLA timers.",module:"projects"},
            {icon:"⊕",title:"Vendor Registration",desc:"Track approval status, champion contacts, and package checklists for all target companies.",module:"vendor"},
            {icon:"★",title:"Retainer Clients",desc:"Manage monthly retainer relationships, SLA orders, and pitch pipeline.",module:"retainer"},
            {icon:"◎",title:"Peripheral Leads",desc:"Route and manage inbound leads from outside the 5-state core territory.",module:"peripheral"},
            {icon:"▦",title:"Financial",desc:"Log revenue by sector and state. Track against 3-year KPI targets.",module:"financial"},
          ].filter(m=>ROLE_ACCESS[userRole]?.includes(m.module)).map(m=>(
            <div key={m.module} style={{padding:"16px",border:`1px solid ${T.border}`,borderRadius:10,background:T.fog}}>
              <div style={{fontSize:20,marginBottom:6}}>{m.icon}</div>
              <div style={{fontSize:13,fontWeight:700,color:T.navy,marginBottom:4}}>{m.title}</div>
              <div style={{fontSize:12,color:T.silver,lineHeight:1.5}}>{m.desc}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── PERMITS MODULE ───────────────────────────────────────────────────────────
function PermitForm({initial,onSave,onClose}) {
  const [f,setF] = useState(initial||{operator:"",source:"OCC",county:"",state:"OK",sector:"O&G",count:1,date:new Date().toISOString().slice(0,10),flagged:false,added_to_crm:false,notes:""});
  const set=k=>v=>setF(p=>({...p,[k]:v}));
  return <form onSubmit={e=>{e.preventDefault();onSave({...f,count:Number(f.count)||1});}}>
    <FormRow><Inp label="Operator" value={f.operator} onChange={set("operator")} required/><Sel label="Source" value={f.source} onChange={set("source")} options={["OCC","RRC","FERC","BLM","EPA UIC","NRC","EDGAR","BOEM","Enverus","LandGate"]}/></FormRow>
    <FormRow><Inp label="County" value={f.county} onChange={set("county")}/><Sel label="State" value={f.state} onChange={set("state")} options={["OK","TX","NM","KS","AR","CO","ND","WY","LA","MT","Other"]}/></FormRow>
    <FormRow><Sel label="Sector" value={f.sector} onChange={set("sector")} options={["O&G","Wind","Solar","CCS","Uranium","Midstream"]}/><Inp label="Count" type="number" value={f.count} onChange={set("count")}/></FormRow>
    <FormRow><Inp label="Date" type="date" value={f.date} onChange={set("date")}/><div/></FormRow>
    <Chk label="Flagged for outreach" checked={f.flagged} onChange={set("flagged")}/>
    <Chk label="Pushed to HubSpot" checked={f.added_to_crm} onChange={set("added_to_crm")}/>
    <Txt label="Notes" value={f.notes} onChange={set("notes")} rows={2}/>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><FormBtn onClick={onClose}>Cancel</FormBtn><FormBtn variant="primary" type="submit">Save</FormBtn></div>
  </form>;
}

function PermitsModule({userRole,hsToken}) {
  const [rows,setRows] = useState([]);
  const [loading,setLoading] = useState(true);
  const [modal,setModal] = useState(null);
  const [filter,setFilter] = useState("All");
  const editable = canEdit(userRole,"permits");

  const load = useCallback(async()=>{ setLoading(true); const {data}=await supabase.from("permits").select("*").order("created_at",{ascending:false}); setRows(data||[]); setLoading(false); },[]);
  useEffect(()=>{ load(); },[load]);

  const save = async(rec) => {
    if(rec.id){ await supabase.from("permits").update(rec).eq("id",rec.id); }
    else { await supabase.from("permits").insert({...rec,id:undefined}); }
    setModal(null); load();
  };
  const del = async(id) => { if(window.confirm("Delete?")){ await supabase.from("permits").delete().eq("id",id); load(); } };
  const pushHS = async(row) => {
    if(!hsToken){ alert("Set HubSpot token in Settings first."); return; }
    try {
      const res = await fetch("https://api.hubapi.com/crm/v3/objects/companies",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${hsToken}`},body:JSON.stringify({properties:{name:row.operator,industry:row.sector,state:row.state,description:row.notes||""}})});
      if(res.ok||(await res.json()).category==="CONFLICT"){ await supabase.from("permits").update({added_to_crm:true}).eq("id",row.id); load(); alert("✓ Pushed to HubSpot"); }
      else alert("HubSpot error — check your token in Settings");
    } catch(e){ alert("Error: "+e.message); }
  };

  const sources = ["All","OCC","RRC","FERC","BLM","EPA UIC","NRC","Enverus","LandGate"];
  const filtered = rows.filter(r=>filter==="All"||r.source===filter);
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        <MetricCard label="Total entries" value={rows.length} sub="In permit log"/>
        <MetricCard label="Flagged" value={rows.filter(r=>r.flagged&&!r.added_to_crm).length} sub="Need HubSpot action" subColor={T.orange}/>
        <MetricCard label="Pushed to HubSpot" value={rows.filter(r=>r.added_to_crm).length} sub="In CRM" subColor="#3B6D11"/>
        <MetricCard label="Sources" value={[...new Set(rows.map(r=>r.source))].length} sub="Databases tracked"/>
      </div>
      <SectionCard>
        <CardHeader title="Permit & Database Feed">
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginRight:8}}>{sources.map(s=><FilterChip key={s} label={s} active={filter===s} onClick={()=>setFilter(s)}/>)}</div>
          {editable&&<Btn variant="primary" onClick={()=>setModal({})}>+ Add Entry</Btn>}
        </CardHeader>
        <Tbl loading={loading} cols={[
          {key:"operator",label:"Operator",w:150,render:r=><span style={{fontWeight:600}}>{r.operator}</span>},
          {key:"source",label:"Source",w:80,render:r=><Tag label={r.source} colors={{bg:T.fog,text:T.slate}}/>},
          {key:"county",label:"County/State",render:r=>`${r.county||"—"}, ${r.state}`},
          {key:"sector",label:"Sector",render:r=><SectorTag sector={r.sector}/>},
          {key:"count",label:"Permits",w:60},
          {key:"date",label:"Date",w:90},
          {key:"flagged",label:"Flagged",w:65,render:r=><span style={{color:r.flagged?"#C8742A":"#ccc",fontWeight:700}}>{r.flagged?"●":"○"}</span>},
          {key:"hs",label:"HubSpot",w:90,render:r=>r.added_to_crm?<span style={{color:"#3B6D11",fontSize:11,fontWeight:700}}>✓ Pushed</span>:<button onClick={()=>pushHS(r)} style={{fontSize:11,padding:"2px 8px",background:"#ff7a59",color:"white",border:"none",borderRadius:5,cursor:"pointer"}}>→ Push</button>},
          {key:"notes",label:"Notes",render:r=><span style={{color:T.silver,fontSize:11}}>{r.notes||"—"}</span>},
        ]} rows={filtered} onEdit={editable?r=>setModal(r):null} onDelete={editable?del:null}/>
      </SectionCard>
      {modal!==null&&<Modal title={modal.id?"Edit Entry":"Add Entry"} onClose={()=>setModal(null)}><PermitForm initial={modal} onSave={save} onClose={()=>setModal(null)}/></Modal>}
    </div>
  );
}

// ─── PROJECTS MODULE ──────────────────────────────────────────────────────────
function ProjectForm({initial,onSave,onClose}) {
  const [f,setF] = useState(initial||{client:"",type:"Abstract",state:"OK",sector:"O&G",tracts:1,assigned:"",due_date:"",status:"active",value:0,invoiced:false,notes:""});
  const set=k=>v=>setF(p=>({...p,[k]:v}));
  return <form onSubmit={e=>{e.preventDefault();onSave({...f,tracts:Number(f.tracts)||1,value:Number(f.value)||0});}}>
    <FormRow><Inp label="Client" value={f.client} onChange={set("client")} required/><Sel label="Type" value={f.type} onChange={set("type")} options={["Abstract","Surface Lease","Curative","Title + GIS","Runsheet","Division Order","Due Diligence","ROW/Easement","Other"]}/></FormRow>
    <FormRow><Sel label="State" value={f.state} onChange={set("state")} options={["OK","TX","NM","KS","AR","CO","ND","WY","LA","MT","Other"]}/><Sel label="Sector" value={f.sector} onChange={set("sector")} options={["O&G","Wind","Solar","CCS","Uranium","Midstream"]}/></FormRow>
    <FormRow><Inp label="Tracts" type="number" value={f.tracts} onChange={set("tracts")}/><Inp label="Assigned To" value={f.assigned} onChange={set("assigned")}/></FormRow>
    <FormRow><Inp label="Due Date" type="date" value={f.due_date} onChange={set("due_date")}/><Inp label="Value ($)" type="number" value={f.value} onChange={set("value")}/></FormRow>
    <Sel label="Status" value={f.status} onChange={set("status")} options={["active","pending","review","overdue","complete"]}/>
    <Chk label="Invoice sent" checked={f.invoiced} onChange={set("invoiced")}/>
    <Txt label="Notes" value={f.notes} onChange={set("notes")} rows={2}/>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><FormBtn onClick={onClose}>Cancel</FormBtn><FormBtn variant="primary" type="submit">Save Order</FormBtn></div>
  </form>;
}
function ProjectsModule({userRole}) {
  const [rows,setRows] = useState([]);
  const [loading,setLoading] = useState(true);
  const [modal,setModal] = useState(null);
  const [filter,setFilter] = useState("All");
  const editable = canEdit(userRole,"projects");
  const load = useCallback(async()=>{ setLoading(true); const {data}=await supabase.from("projects").select("*").order("due_date",{ascending:true}); setRows(data||[]); setLoading(false); },[]);
  useEffect(()=>{ load(); },[load]);
  const save = async(rec)=>{ if(rec.id){await supabase.from("projects").update(rec).eq("id",rec.id);}else{await supabase.from("projects").insert({...rec,id:undefined});} setModal(null); load(); };
  const del = async(id)=>{ if(window.confirm("Delete order?")){ await supabase.from("projects").delete().eq("id",id); load(); } };
  const filtered = rows.filter(r=>filter==="All"||r.status===filter);
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        <MetricCard label="Active orders" value={rows.filter(r=>["active","review","pending"].includes(r.status)).length} sub={`${rows.filter(r=>r.status==="overdue").length} overdue`} subColor={rows.filter(r=>r.status==="overdue").length?"#E24B4A":T.silver}/>
        <MetricCard label="Total tracts" value={rows.reduce((s,r)=>s+(r.tracts||0),0)} sub="Across all orders"/>
        <MetricCard label="Pipeline value" value={fmt$(rows.filter(r=>!r.invoiced).reduce((s,r)=>s+(r.value||0),0))} sub="Un-invoiced"/>
        <MetricCard label="Completed" value={rows.filter(r=>r.status==="complete").length} sub="This period"/>
      </div>
      <SectionCard>
        <CardHeader title="All Orders">
          <div style={{display:"flex",gap:6,marginRight:8}}>{["All","active","overdue","review","complete"].map(s=><FilterChip key={s} label={s.charAt(0).toUpperCase()+s.slice(1)} active={filter===s} onClick={()=>setFilter(s)}/>)}</div>
          {editable&&<Btn variant="primary" onClick={()=>setModal({})}>+ New Order</Btn>}
        </CardHeader>
        <Tbl loading={loading} cols={[
          {key:"client",label:"Client",w:140,render:r=><span style={{fontWeight:600}}>{r.client}</span>},
          {key:"type",label:"Type",w:110},
          {key:"state",label:"State",w:50,render:r=><StateTag state={r.state}/>},
          {key:"sector",label:"Sector",w:70,render:r=><SectorTag sector={r.sector}/>},
          {key:"tracts",label:"Tracts",w:55},
          {key:"assigned",label:"Assigned",w:100},
          {key:"due_date",label:"Due",w:90,render:r=><span style={{color:isOverdue(r.due_date)&&r.status!=="complete"?"#E24B4A":T.navy,fontWeight:isOverdue(r.due_date)?700:400,fontSize:12}}>{r.due_date||"—"}</span>},
          {key:"value",label:"Value",w:80,render:r=><span style={{fontWeight:600}}>{fmt$(r.value)}</span>},
          {key:"sla",label:"SLA",w:90,render:r=><SLABar due={r.due_date} status={r.status}/>},
          {key:"status",label:"Status",render:r=><StatusBadge status={r.status}/>},
          {key:"invoiced",label:"Inv.",w:40,render:r=><span style={{color:r.invoiced?"#3B6D11":"#ccc",fontWeight:700}}>{r.invoiced?"✓":"○"}</span>},
        ]} rows={filtered} onEdit={editable?r=>setModal(r):null} onDelete={editable?del:null}/>
      </SectionCard>
      {modal!==null&&<Modal title={modal.id?"Edit Order":"New Order"} onClose={()=>setModal(null)} wide><ProjectForm initial={modal} onSave={save} onClose={()=>setModal(null)}/></Modal>}
    </div>
  );
}

// ─── VENDOR MODULE ────────────────────────────────────────────────────────────
function VendorForm({initial,onSave,onClose}) {
  const [f,setF] = useState(initial||{company:"",type:"E&P",states:[],submitted:"",status:"pending",champion:"",champion_title:"",portal:"",next_step:"",insurance_ok:false,w9:false,msa:false,duns:false,notes:""});
  const set=k=>v=>setF(p=>({...p,[k]:v}));
  const toggleState=st=>{ const arr=f.states.includes(st)?f.states.filter(s=>s!==st):[...f.states,st]; set("states")(arr); };
  return <form onSubmit={e=>{e.preventDefault();onSave({...f,id:f.id||undefined});}}>
    <FormRow><Inp label="Company" value={f.company} onChange={set("company")} required/><Sel label="Type" value={f.type} onChange={set("type")} options={["E&P","Major E&P","E&P + CCS","Wind/Solar","Midstream","Uranium","Mineral Aggregator","Energy Law Firm"]}/></FormRow>
    <div style={{marginBottom:14}}><div style={{fontSize:12,fontWeight:600,color:T.slate,marginBottom:6}}>Active States</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["OK","TX","NM","KS","AR","CO","WY","ND","LA","MT"].map(st=><button type="button" key={st} onClick={()=>toggleState(st)} style={{padding:"4px 10px",borderRadius:20,border:f.states.includes(st)?`1.5px solid ${T.orange}`:`1px solid ${T.border}`,background:f.states.includes(st)?T.orangePale:T.white,color:f.states.includes(st)?T.orange:T.silver,fontSize:12,fontWeight:600,cursor:"pointer"}}>{st}</button>)}</div></div>
    <FormRow><Inp label="Date Submitted" type="date" value={f.submitted} onChange={set("submitted")}/><Sel label="Status" value={f.status} onChange={set("status")} options={["pending","submitted","review","approved"]}/></FormRow>
    <FormRow><Inp label="Champion Name" value={f.champion} onChange={set("champion")}/><Inp label="Champion Title" value={f.champion_title} onChange={set("champion_title")}/></FormRow>
    <Inp label="Vendor Portal URL" value={f.portal} onChange={set("portal")}/>
    <Inp label="Next Action" value={f.next_step} onChange={set("next_step")}/>
    <div style={{marginBottom:14}}><div style={{fontSize:12,fontWeight:600,color:T.slate,marginBottom:8}}>Package Checklist</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}><Chk label="Insurance / COI" checked={f.insurance_ok} onChange={set("insurance_ok")}/><Chk label="W-9" checked={f.w9} onChange={set("w9")}/><Chk label="MSA signed" checked={f.msa} onChange={set("msa")}/><Chk label="D-U-N-S / SAM.gov" checked={f.duns} onChange={set("duns")}/></div></div>
    <Txt label="Notes" value={f.notes} onChange={set("notes")} rows={2}/>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><FormBtn onClick={onClose}>Cancel</FormBtn><FormBtn variant="primary" type="submit">Save</FormBtn></div>
  </form>;
}
function VendorModule({userRole,hsToken}) {
  const [rows,setRows] = useState([]);
  const [loading,setLoading] = useState(true);
  const [modal,setModal] = useState(null);
  const [filter,setFilter] = useState("All");
  const editable = canEdit(userRole,"vendor");
  const load = useCallback(async()=>{ setLoading(true); const {data}=await supabase.from("vendors").select("*").order("created_at",{ascending:false}); setRows(data||[]); setLoading(false); },[]);
  useEffect(()=>{ load(); },[load]);
  const save = async(rec)=>{ if(rec.id){await supabase.from("vendors").update(rec).eq("id",rec.id);}else{await supabase.from("vendors").insert({...rec,id:undefined});} setModal(null); load(); };
  const del = async(id)=>{ if(window.confirm("Delete vendor?")){ await supabase.from("vendors").delete().eq("id",id); load(); } };
  const pushHS = async(row)=>{ if(!hsToken){alert("Set HubSpot token in Settings.");return;} const res=await fetch("https://api.hubapi.com/crm/v3/objects/companies",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${hsToken}`},body:JSON.stringify({properties:{name:row.company,industry:row.type,state:(row.states||[]).join(", "),description:row.notes||""}})}); const d=await res.json(); if(res.ok||d.category==="CONFLICT"){alert("✓ Pushed to HubSpot");}else{alert("HubSpot error: "+d.message);} };
  const score = r => [r.insurance_ok,r.w9,r.msa,r.duns].filter(Boolean).length;
  const filtered = rows.filter(r=>filter==="All"||r.status===filter);
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        <MetricCard label="Total tracked" value={rows.length} sub="Target: 15+ by Q2"/>
        <MetricCard label="Approved" value={rows.filter(r=>r.status==="approved").length} sub="Active vendor status" subColor="#3B6D11"/>
        <MetricCard label="Submitted/Review" value={rows.filter(r=>["submitted","review"].includes(r.status)).length} sub="Awaiting response" subColor={T.orange}/>
        <MetricCard label="Champions" value={rows.filter(r=>r.champion&&r.champion.length>3).length} sub="Internal contacts"/>
      </div>
      <SectionCard>
        <CardHeader title="Vendor Registration Tracker">
          <div style={{display:"flex",gap:6,marginRight:8}}>{["All","approved","submitted","review","pending"].map(s=><FilterChip key={s} label={s.charAt(0).toUpperCase()+s.slice(1)} active={filter===s} onClick={()=>setFilter(s)}/>)}</div>
          {editable&&<Btn variant="primary" onClick={()=>setModal({})}>+ Add Company</Btn>}
        </CardHeader>
        <Tbl loading={loading} cols={[
          {key:"company",label:"Company",w:160,render:r=><span style={{fontWeight:600}}>{r.company}</span>},
          {key:"type",label:"Type",w:110},
          {key:"states",label:"States",w:100,render:r=><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{(r.states||[]).map(s=><StateTag key={s} state={s}/>)}</div>},
          {key:"submitted",label:"Submitted",w:90},
          {key:"status",label:"Status",w:90,render:r=><StatusBadge status={r.status}/>},
          {key:"pkg",label:"Package",w:80,render:r=><div style={{display:"flex",alignItems:"center",gap:4}}><div style={{height:6,width:60,background:T.fog,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${score(r)/4*100}%`,background:score(r)===4?"#3B6D11":T.orange,borderRadius:3}}/></div><span style={{fontSize:11,color:T.silver}}>{score(r)}/4</span></div>},
          {key:"champion",label:"Champion",w:140,render:r=>r.champion?<div><div style={{fontSize:12,fontWeight:600}}>{r.champion}</div><div style={{fontSize:11,color:T.silver}}>{r.champion_title}</div></div>:<span style={{color:T.silver,fontSize:12}}>—</span>},
          {key:"next_step",label:"Next Action",render:r=><span style={{fontSize:12,color:T.slate}}>{r.next_step||"—"}</span>},
          {key:"hs",label:"HubSpot",w:80,render:r=><button onClick={()=>pushHS(r)} style={{fontSize:11,padding:"2px 8px",background:"#ff7a59",color:"white",border:"none",borderRadius:5,cursor:"pointer"}}>→ Push</button>},
        ]} rows={filtered} onEdit={editable?r=>setModal(r):null} onDelete={editable?del:null}/>
      </SectionCard>
      {modal!==null&&<Modal title={modal.id?"Edit Vendor":"Add Company"} onClose={()=>setModal(null)} wide><VendorForm initial={modal} onSave={save} onClose={()=>setModal(null)}/></Modal>}
    </div>
  );
}

// ─── RETAINER MODULE ──────────────────────────────────────────────────────────
function RetainerModule({userRole}) {
  const [retainers,setRetainers] = useState([]);
  const [pipeline,setPipeline] = useState([]);
  const [loading,setLoading] = useState(true);
  const [modal,setModal] = useState(null);
  const [orderModal,setOrderModal] = useState(null);
  const [pipeModal,setPipeModal] = useState(null);
  const editable = canEdit(userRole,"retainer");

  const load = useCallback(async()=>{
    setLoading(true);
    const [{data:r},{data:p},{data:pip}] = await Promise.all([
      supabase.from("retainers").select("*"),
      supabase.from("retainer_orders").select("*"),
      supabase.from("retainer_pipeline").select("*").order("created_at",{ascending:false}),
    ]);
    const ret = (r||[]).map(ret=>({...ret,orders:(p||[]).filter(o=>o.retainer_id===ret.id)}));
    setRetainers(ret); setPipeline(pip||[]); setLoading(false);
  },[]);
  useEffect(()=>{ load(); },[load]);

  const saveRetainer = async(rec)=>{ const {orders,...data}=rec; if(data.id){await supabase.from("retainers").update(data).eq("id",data.id);}else{await supabase.from("retainers").insert({...data,id:undefined});} setModal(null); load(); };
  const delRetainer = async(id)=>{ if(window.confirm("Remove retainer?")){ await supabase.from("retainers").delete().eq("id",id); load(); } };
  const addOrder = async(rid,order)=>{ await supabase.from("retainer_orders").insert({...order,retainer_id:rid,id:undefined}); setOrderModal(null); load(); };
  const delOrder = async(id)=>{ await supabase.from("retainer_orders").delete().eq("id",id); load(); };
  const savePipe = async(rec)=>{ if(rec.id){await supabase.from("retainer_pipeline").update(rec).eq("id",rec.id);}else{await supabase.from("retainer_pipeline").insert({...rec,id:undefined});} setPipeModal(null); load(); };
  const delPipe = async(id)=>{ if(window.confirm("Remove?")){await supabase.from("retainer_pipeline").delete().eq("id",id); load();} };

  const totalMRR = retainers.filter(r=>r.status==="active").reduce((s,r)=>s+(r.fee||0),0);

  if(loading) return <div style={{textAlign:"center",padding:40,color:T.silver}}>Loading…</div>;

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        <MetricCard label="Active retainers" value={retainers.filter(r=>r.status==="active").length} sub="Target: 4 by Q3"/>
        <MetricCard label="Monthly MRR" value={fmt$(totalMRR)} sub="Recurring revenue" subColor="#3B6D11"/>
        <MetricCard label="Open SLA orders" value={retainers.flatMap(r=>r.orders||[]).filter(o=>o.status!=="complete").length} sub="24-hr window"/>
        <MetricCard label="Pipeline prospects" value={pipeline.length} sub="In pitch sequence"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        {retainers.map(r=>(
          <SectionCard key={r.id}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <div><div style={{fontSize:15,fontWeight:700,color:T.navy}}>{r.client}</div><div style={{fontSize:12,color:T.silver}}>{r.type}</div></div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <StatusBadge status={r.status}/>
                {editable&&<><button onClick={()=>setModal(r)} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,padding:"3px 8px",fontSize:11,color:T.slate,cursor:"pointer"}}>Edit</button><button onClick={()=>delRetainer(r.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#E24B4A",fontSize:14,padding:"3px 6px"}}>×</button></>}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:12}}>
              {[["Fee",fmt$(r.fee)+"/mo"],["Hours",r.hours+" hrs"],["Rush",r.rush_orders+" incl."],["SLA",r.sla],["Term",r.term],["Renews",r.renew_date?fmtDate(r.renew_date):"—"],["Champion",r.champion||"—"],["Title",r.champion_title||"—"]].map(([k,v])=>(
                <div key={k} style={{fontSize:12}}><span style={{color:T.silver}}>{k}: </span><span style={{fontWeight:600,color:T.navy}}>{v}</span></div>
              ))}
            </div>
            <div style={{borderTop:`1px solid ${T.border}`,paddingTop:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:11,fontWeight:700,color:T.slate,textTransform:"uppercase"}}>SLA Orders</div>
                {editable&&<button onClick={()=>setOrderModal(r.id)} style={{fontSize:11,padding:"3px 8px",background:T.navy,color:T.white,border:"none",borderRadius:5,cursor:"pointer"}}>+ Add Order</button>}
              </div>
              {(r.orders||[]).map(o=>(
                <div key={o.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${T.border}`}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:o.status==="overdue"?"#E24B4A":o.status==="complete"?"#3B6D11":T.orange,flexShrink:0}}/>
                  <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{o.description}</div><div style={{fontSize:11,color:T.silver}}>Due: {o.due_date||"—"}</div></div>
                  <StatusBadge status={o.status}/>
                  {editable&&<button onClick={()=>delOrder(o.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#E24B4A",fontSize:14}}>×</button>}
                </div>
              ))}
              {!(r.orders||[]).length&&<div style={{color:T.silver,fontSize:12}}>No open SLA orders</div>}
            </div>
          </SectionCard>
        ))}
        {editable&&<SectionCard style={{border:`2px dashed ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",minHeight:120}} onClick={()=>setModal({})}><div style={{textAlign:"center",color:T.silver}}><div style={{fontSize:28}}>+</div><div style={{fontSize:13,fontWeight:600}}>Add Retainer Client</div></div></SectionCard>}
      </div>
      <SectionCard>
        <CardHeader title="Retainer Pitch Pipeline">{editable&&<Btn variant="primary" onClick={()=>setPipeModal({})}>+ Add Prospect</Btn>}</CardHeader>
        <Tbl cols={[
          {key:"prospect",label:"Prospect",w:180,render:r=><span style={{fontWeight:600}}>{r.prospect}</span>},
          {key:"stage",label:"Stage",render:r=><StatusBadge status={r.stage}/>},
          {key:"action",label:"Next Action",render:r=><span style={{fontSize:12,color:T.slate}}>{r.action||"—"}</span>},
          {key:"priority",label:"Priority",w:80,render:r=><span style={{fontSize:12,fontWeight:700,color:r.priority==="high"?"#E24B4A":r.priority==="medium"?T.orange:"#3B6D11"}}>{(r.priority||"").toUpperCase()}</span>},
        ]} rows={pipeline} onEdit={editable?r=>setPipeModal(r):null} onDelete={editable?delPipe:null} emptyMsg="No prospects in pipeline yet"/>
      </SectionCard>
      {modal!==null&&<Modal title={modal.id?"Edit Retainer":"New Retainer"} onClose={()=>setModal(null)} wide>
        <form onSubmit={e=>{e.preventDefault();saveRetainer(modal);}}>
          <FormRow><Inp label="Client" value={modal.client||""} onChange={v=>setModal(m=>({...m,client:v}))} required/><Sel label="Type" value={modal.type||""} onChange={v=>setModal(m=>({...m,type:v}))} options={["E&P","Major E&P","E&P + CCS","Wind/Solar","Mineral Aggregator","Midstream","Energy Law Firm"]}/></FormRow>
          <FormRow><Inp label="Monthly Fee ($)" type="number" value={modal.fee||""} onChange={v=>setModal(m=>({...m,fee:v}))}/><Inp label="Included Hours" type="number" value={modal.hours||""} onChange={v=>setModal(m=>({...m,hours:v}))}/></FormRow>
          <FormRow><Inp label="Rush Orders" type="number" value={modal.rush_orders||""} onChange={v=>setModal(m=>({...m,rush_orders:v}))}/><Inp label="SLA" value={modal.sla||""} onChange={v=>setModal(m=>({...m,sla:v}))}/></FormRow>
          <FormRow><Sel label="Term" value={modal.term||""} onChange={v=>setModal(m=>({...m,term:v}))} options={["3-mo pilot","6 months","12 months","24 months"]}/><Inp label="Renewal Date" type="date" value={modal.renew_date||""} onChange={v=>setModal(m=>({...m,renew_date:v}))}/></FormRow>
          <FormRow><Inp label="Champion" value={modal.champion||""} onChange={v=>setModal(m=>({...m,champion:v}))}/><Inp label="Champion Title" value={modal.champion_title||""} onChange={v=>setModal(m=>({...m,champion_title:v}))}/></FormRow>
          <Sel label="Status" value={modal.status||"active"} onChange={v=>setModal(m=>({...m,status:v}))} options={["active","pending","complete"]}/>
          <Txt label="Notes" value={modal.notes||""} onChange={v=>setModal(m=>({...m,notes:v}))} rows={2}/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><FormBtn onClick={()=>setModal(null)}>Cancel</FormBtn><FormBtn variant="primary" type="submit">Save Retainer</FormBtn></div>
        </form>
      </Modal>}
      {orderModal!==null&&<Modal title="Add SLA Order" onClose={()=>setOrderModal(null)}>
        <form onSubmit={e=>{e.preventDefault();const fd=new FormData(e.target);addOrder(orderModal,{description:fd.get("desc"),received:fd.get("received"),due_date:fd.get("due"),status:"active"});}}>
          <Inp label="Description" name="desc" required onChange={()=>{}}/>
          <FormRow><Inp label="Received" name="received" type="date" onChange={()=>{}}/><Inp label="Due Date" name="due" type="date" onChange={()=>{}}/></FormRow>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><FormBtn onClick={()=>setOrderModal(null)}>Cancel</FormBtn><FormBtn variant="primary" type="submit">Add Order</FormBtn></div>
        </form>
      </Modal>}
      {pipeModal!==null&&<Modal title={pipeModal.id?"Edit Prospect":"Add Prospect"} onClose={()=>setPipeModal(null)}>
        <form onSubmit={e=>{e.preventDefault();savePipe(pipeModal);}}>
          <Inp label="Prospect Company" value={pipeModal.prospect||""} onChange={v=>setPipeModal(m=>({...m,prospect:v}))} required/>
          <Sel label="Stage" value={pipeModal.stage||"active"} onChange={v=>setPipeModal(m=>({...m,stage:v}))} options={["active","complete","review","submitted","pending"]}/>
          <Inp label="Next Action" value={pipeModal.action||""} onChange={v=>setPipeModal(m=>({...m,action:v}))}/>
          <Sel label="Priority" value={pipeModal.priority||"medium"} onChange={v=>setPipeModal(m=>({...m,priority:v}))} options={["high","medium","low"]}/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><FormBtn onClick={()=>setPipeModal(null)}>Cancel</FormBtn><FormBtn variant="primary" type="submit">Save</FormBtn></div>
        </form>
      </Modal>}
    </div>
  );
}

// ─── PERIPHERAL MODULE ────────────────────────────────────────────────────────
function PeripheralModule({userRole}) {
  const [rows,setRows] = useState([]);
  const [loading,setLoading] = useState(true);
  const [modal,setModal] = useState(null);
  const [filter,setFilter] = useState("All");
  const editable = canEdit(userRole,"peripheral");
  const load = useCallback(async()=>{ setLoading(true); const {data}=await supabase.from("peripheral_leads").select("*").order("created_at",{ascending:false}); setRows(data||[]); setLoading(false); },[]);
  useEffect(()=>{ load(); },[load]);
  const save = async(rec)=>{ if(rec.id){await supabase.from("peripheral_leads").update(rec).eq("id",rec.id);}else{await supabase.from("peripheral_leads").insert({...rec,id:undefined});} setModal(null); load(); };
  const del = async(id)=>{ if(window.confirm("Delete lead?")){ await supabase.from("peripheral_leads").delete().eq("id",id); load(); } };
  const filtered = rows.filter(r=>filter==="All"||r.status===filter);
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        <MetricCard label="Total leads" value={rows.length} sub="Outside 5-state core"/>
        <MetricCard label="Active" value={rows.filter(r=>r.status==="active").length} sub="Revenue generating" subColor="#3B6D11"/>
        <MetricCard label="Qualifying" value={rows.filter(r=>r.status==="qualifying").length} sub="Pending scope" subColor={T.orange}/>
        <MetricCard label="Avg premium" value={rows.length?Math.round(rows.reduce((s,r)=>s+(r.premium||0),0)/rows.length)+"%":"—"} sub="Over standard rates"/>
      </div>
      <SectionCard>
        <CardHeader title="Peripheral Lead Log">
          <div style={{display:"flex",gap:6,marginRight:8}}>{["All","active","qualifying","routed","complete"].map(s=><FilterChip key={s} label={s.charAt(0).toUpperCase()+s.slice(1)} active={filter===s} onClick={()=>setFilter(s)}/>)}</div>
          {editable&&<Btn variant="primary" onClick={()=>setModal({})}>+ Log Lead</Btn>}
        </CardHeader>
        <Tbl loading={loading} cols={[
          {key:"state",label:"State",w:60,render:r=><Tag label={r.state} colors={{bg:"#E1F5EE",text:"#085041"}}/>},
          {key:"basin",label:"Basin",w:110},
          {key:"sector",label:"Sector",w:80,render:r=><SectorTag sector={r.sector}/>},
          {key:"client",label:"Client/Source",w:140,render:r=><span style={{fontWeight:600}}>{r.client||"—"}</span>},
          {key:"scope",label:"Scope",render:r=><span style={{fontSize:12}}>{r.scope||"—"}</span>},
          {key:"model",label:"Model",w:130},
          {key:"premium",label:"Premium",w:70,render:r=><span style={{fontWeight:600,color:T.orange}}>+{r.premium||0}%</span>},
          {key:"status",label:"Status",w:90,render:r=><StatusBadge status={r.status}/>},
        ]} rows={filtered} onEdit={editable?r=>setModal(r):null} onDelete={editable?del:null}/>
      </SectionCard>
      {modal!==null&&<Modal title={modal.id?"Edit Lead":"Log Peripheral Lead"} onClose={()=>setModal(null)} wide>
        <form onSubmit={e=>{e.preventDefault();save(modal);}}>
          <FormRow><Sel label="State" value={modal.state||""} onChange={v=>setModal(m=>({...m,state:v}))} options={["CO","ND","WY","LA","MT","NE","Other"]} required/><Inp label="Basin/Area" value={modal.basin||""} onChange={v=>setModal(m=>({...m,basin:v}))}/></FormRow>
          <FormRow><Sel label="Sector" value={modal.sector||""} onChange={v=>setModal(m=>({...m,sector:v}))} options={["O&G","Wind","Solar","CCS","Uranium","Midstream"]}/><Inp label="Client/Source" value={modal.client||""} onChange={v=>setModal(m=>({...m,client:v}))}/></FormRow>
          <Inp label="Scope" value={modal.scope||""} onChange={v=>setModal(m=>({...m,scope:v}))}/>
          <FormRow><Sel label="Model" value={modal.model||""} onChange={v=>setModal(m=>({...m,model:v}))} options={["Remote","Remote + partner","Partner/subcontract","Scale up + remote"]}/><Inp label="Premium (%)" type="number" value={modal.premium||15} onChange={v=>setModal(m=>({...m,premium:Number(v)}))}/></FormRow>
          <FormRow><Sel label="Status" value={modal.status||"qualifying"} onChange={v=>setModal(m=>({...m,status:v}))} options={["qualifying","active","routed","complete"]}/><Inp label="First Contacted" type="date" value={modal.contacted||""} onChange={v=>setModal(m=>({...m,contacted:v}))}/></FormRow>
          <Txt label="Notes" value={modal.notes||""} onChange={v=>setModal(m=>({...m,notes:v}))} rows={2}/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><FormBtn onClick={()=>setModal(null)}>Cancel</FormBtn><FormBtn variant="primary" type="submit">Save Lead</FormBtn></div>
        </form>
      </Modal>}
    </div>
  );
}

// ─── FINANCIAL MODULE ─────────────────────────────────────────────────────────
function FinancialModule({userRole}) {
  const [rows,setRows] = useState([]);
  const [loading,setLoading] = useState(true);
  const [modal,setModal] = useState(null);
  const [view,setView] = useState("charts");
  const editable = userRole === "admin";
  const load = useCallback(async()=>{ setLoading(true); const {data}=await supabase.from("revenue").select("*").order("month",{ascending:false}); setRows(data||[]); setLoading(false); },[]);
  useEffect(()=>{ load(); },[load]);
  const save = async(rec)=>{ if(rec.id){await supabase.from("revenue").update(rec).eq("id",rec.id);}else{await supabase.from("revenue").insert({...rec,id:undefined,amount:Number(rec.amount)||0});} setModal(null); load(); };
  const del = async(id)=>{ if(window.confirm("Delete entry?")){ await supabase.from("revenue").delete().eq("id",id); load(); } };

  const thisMonth = new Date().toISOString().slice(0,7);
  const mtd = rows.filter(r=>r.month===thisMonth);
  const mtdTotal = mtd.reduce((s,r)=>s+(r.amount||0),0);
  const retainerMTD = mtd.filter(r=>r.type==="Retainer").reduce((s,r)=>s+(r.amount||0),0);
  const allTotal = rows.reduce((s,r)=>s+(r.amount||0),0);
  const bySector = {}; rows.forEach(r=>{bySector[r.sector]=(bySector[r.sector]||0)+(r.amount||0);});
  const byState = {}; rows.forEach(r=>{byState[r.state]=(byState[r.state]||0)+(r.amount||0);});
  const maxS = Math.max(...Object.values(bySector),1);
  const maxSt = Math.max(...Object.values(byState),1);

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        <MetricCard label="MTD Revenue" value={fmt$(mtdTotal)} sub="This month" subColor="#3B6D11"/>
        <MetricCard label="Retainer MRR" value={fmt$(retainerMTD)} sub={`${mtdTotal?Math.round(retainerMTD/mtdTotal*100):0}% of MTD`} subColor="#3B6D11"/>
        <MetricCard label="Total logged" value={fmt$(allTotal)} sub="All time"/>
        <MetricCard label="Yr 1 target" value="$15–25k/mo" sub={mtdTotal>=15000?"✓ On target":"Building toward target"} subColor={mtdTotal>=15000?"#3B6D11":T.orange}/>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {["charts","byMonth","log"].map(v=><FilterChip key={v} label={v==="charts"?"Charts":v==="byMonth"?"By Month":"Revenue Log"} active={view===v} onClick={()=>setView(v)}/>)}
        <div style={{marginLeft:"auto"}}>{editable&&<Btn variant="primary" onClick={()=>setModal({})}>+ Add Entry</Btn>}</div>
      </div>
      {view==="charts"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <SectionCard><CardHeader title="Revenue by sector (all time)"/>
          {Object.entries(bySector).sort((a,b)=>b[1]-a[1]).map(([sec,amt])=>(
            <div key={sec} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:90,textAlign:"right"}}><SectorTag sector={sec}/></div>
              <div style={{flex:1,height:16,background:T.fog,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${amt/maxS*100}%`,background:T.navy,borderRadius:3}}/></div>
              <div style={{fontSize:13,fontWeight:700,color:T.navy,minWidth:70,textAlign:"right"}}>{fmt$(amt)}</div>
            </div>
          ))}
        </SectionCard>
        <SectionCard><CardHeader title="Revenue by state (all time)"/>
          {Object.entries(byState).sort((a,b)=>b[1]-a[1]).map(([st,amt])=>(
            <div key={st} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:50,textAlign:"right"}}><StateTag state={st}/></div>
              <div style={{flex:1,height:16,background:T.fog,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${amt/maxSt*100}%`,background:T.orange,borderRadius:3}}/></div>
              <div style={{fontSize:13,fontWeight:700,color:T.navy,minWidth:70,textAlign:"right"}}>{fmt$(amt)}</div>
            </div>
          ))}
        </SectionCard>
      </div>}
      {view==="log"&&<SectionCard><CardHeader title="Revenue Log"/>
        <Tbl loading={loading} cols={[
          {key:"month",label:"Month",w:90},
          {key:"client",label:"Client",w:160,render:r=><span style={{fontWeight:600}}>{r.client}</span>},
          {key:"type",label:"Type",w:110},
          {key:"sector",label:"Sector",w:80,render:r=><SectorTag sector={r.sector}/>},
          {key:"state",label:"State",w:60,render:r=><StateTag state={r.state}/>},
          {key:"amount",label:"Amount",w:100,render:r=><span style={{fontWeight:700,color:T.navy}}>{fmt$(r.amount)}</span>},
        ]} rows={rows} onEdit={editable?r=>setModal(r):null} onDelete={editable?del:null}/>
      </SectionCard>}
      {view==="byMonth"&&<SectionCard><CardHeader title="Monthly Breakdown"/>
        {[...new Set(rows.map(r=>r.month))].sort().reverse().map(m=>{
          const me=rows.filter(r=>r.month===m); const mt=me.reduce((s,r)=>s+(r.amount||0),0);
          return <div key={m} style={{marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${T.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><div style={{fontSize:13,fontWeight:700,color:T.navy}}>{m}</div><div style={{fontSize:13,fontWeight:700,color:T.orange}}>{fmt$(mt)}</div></div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{me.map(e=><span key={e.id} style={{fontSize:11,padding:"2px 8px",background:T.fog,borderRadius:12,color:T.slate}}>{e.client} · {e.type} · {fmt$(e.amount)}</span>)}</div>
          </div>;
        })}
        {!rows.length&&<div style={{color:T.silver,fontSize:13}}>No revenue entries yet</div>}
      </SectionCard>}
      {modal!==null&&<Modal title={modal.id?"Edit Entry":"Add Revenue Entry"} onClose={()=>setModal(null)} wide>
        <form onSubmit={e=>{e.preventDefault();save(modal);}}>
          <FormRow><Inp label="Month (YYYY-MM)" value={modal.month||thisMonth} onChange={v=>setModal(m=>({...m,month:v}))} required/><Inp label="Client" value={modal.client||""} onChange={v=>setModal(m=>({...m,client:v}))} required/></FormRow>
          <FormRow><Sel label="Sector" value={modal.sector||""} onChange={v=>setModal(m=>({...m,sector:v}))} options={["O&G","Wind","Solar","CCS","Uranium","Midstream"]}/><Sel label="State" value={modal.state||""} onChange={v=>setModal(m=>({...m,state:v}))} options={["OK","TX","NM","KS","AR","CO","ND","WY","LA","MT","Other"]}/></FormRow>
          <FormRow><Sel label="Type" value={modal.type||""} onChange={v=>setModal(m=>({...m,type:v}))} options={["Abstract","Leasing","Curative","Retainer","Surface Lease","Title + GIS","Division Order","ROW/Easement","Other"]}/><Inp label="Amount ($)" type="number" value={modal.amount||""} onChange={v=>setModal(m=>({...m,amount:v}))}/></FormRow>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><FormBtn onClick={()=>setModal(null)}>Cancel</FormBtn><FormBtn variant="primary" type="submit">Save Entry</FormBtn></div>
        </form>
      </Modal>}
    </div>
  );
}

// ─── TEAM MODULE (Admin only) ─────────────────────────────────────────────────
function TeamModule() {
  const [members,setMembers] = useState([]);
  const [loading,setLoading] = useState(true);
  const [modal,setModal] = useState(null);
  const load = useCallback(async()=>{ setLoading(true); const {data}=await supabase.from("team_members").select("*").order("created_at"); setMembers(data||[]); setLoading(false); },[]);
  useEffect(()=>{ load(); },[load]);
  const save = async(rec)=>{ if(rec.id){await supabase.from("team_members").update(rec).eq("id",rec.id);}else{await supabase.from("team_members").insert({...rec,id:undefined});} setModal(null); load(); };
  const del = async(id)=>{ if(window.confirm("Remove team member?")){ await supabase.from("team_members").delete().eq("id",id); load(); } };
  const toggle = async(id,active)=>{ await supabase.from("team_members").update({active}).eq("id",id); load(); };
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        <MetricCard label="Team members" value={members.length} sub="Total registered"/>
        <MetricCard label="Active" value={members.filter(m=>m.active).length} sub="Currently active"/>
        <MetricCard label="Roles" value="Admin · Landman · Sales" sub="3 role levels"/>
      </div>
      <SectionCard>
        <CardHeader title="Team Members"><Btn variant="primary" onClick={()=>setModal({})}>+ Add Member</Btn></CardHeader>
        <Tbl loading={loading} cols={[
          {key:"name",label:"Name",w:160,render:r=><span style={{fontWeight:600}}>{r.name}</span>},
          {key:"email",label:"Email",w:220},
          {key:"role",label:"Role",w:100,render:r=><Tag label={r.role.toUpperCase()} colors={r.role==="admin"?{bg:"#FEF3E2",text:"#7A4210"}:r.role==="landman"?{bg:"#E6F4EA",text:"#1E6832"}:{bg:"#E8F0FB",text:"#1A3A7C"}}/>},
          {key:"active",label:"Status",w:90,render:r=><div style={{display:"flex",alignItems:"center",gap:6}}><button onClick={()=>toggle(r.id,!r.active)} style={{padding:"3px 10px",borderRadius:20,border:"none",background:r.active?"#E6F4EA":"#FDE8E8",color:r.active?"#1E6832":"#8C1C1C",fontSize:11,fontWeight:700,cursor:"pointer"}}>{r.active?"Active":"Inactive"}</button></div>},
          {key:"access",label:"Module Access",render:r=><span style={{fontSize:11,color:T.silver}}>{(ROLE_ACCESS[r.role]||[]).join(", ")}</span>},
        ]} rows={members} onEdit={r=>setModal(r)} onDelete={del}/>
      </SectionCard>
      {modal!==null&&<Modal title={modal.id?"Edit Member":"Add Team Member"} onClose={()=>setModal(null)}>
        <form onSubmit={e=>{e.preventDefault();save(modal);}}>
          <Inp label="Full Name" value={modal.name||""} onChange={v=>setModal(m=>({...m,name:v}))} required/>
          <Inp label="Email" type="email" value={modal.email||""} onChange={v=>setModal(m=>({...m,email:v}))} required/>
          <Sel label="Role" value={modal.role||"landman"} onChange={v=>setModal(m=>({...m,role:v}))} options={["admin","landman","sales"]} required/>
          <Chk label="Active" checked={modal.active!==false} onChange={v=>setModal(m=>({...m,active:v}))}/>
          <div style={{padding:"10px 12px",background:T.fog,borderRadius:8,fontSize:12,color:T.slate,marginBottom:14}}>
            <strong>Role permissions:</strong><br/>
            Admin: All modules + Settings + Team management<br/>
            Landman: DB Mining, Projects, Retainer Portal, Agent<br/>
            Sales: DB Mining (view), Vendor Registration, Peripheral Leads, Financial (view)
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><FormBtn onClick={()=>setModal(null)}>Cancel</FormBtn><FormBtn variant="primary" type="submit">Save Member</FormBtn></div>
        </form>
      </Modal>}
    </div>
  );
}

// ─── AGENT MODULE (simplified for web) ───────────────────────────────────────
function AgentModule({userRole}) {
  const [messages,setMessages] = useState([{role:"agent",type:"welcome",ts:new Date()}]);
  const [input,setInput] = useState("");
  const [loading,setLoading] = useState(false);
  const apiKey = localStorage.getItem("elt_claude_key") || "";
  const [showKey,setShowKey] = useState(!apiKey);
  const [keyVal,setKeyVal] = useState(apiKey);

  const send = async() => {
    if(!input.trim()||loading) return;
    if(!apiKey){ setShowKey(true); return; }
    const msg = input.trim(); setInput("");
    setMessages(m=>[...m,{role:"user",content:msg,ts:new Date()}]);
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,system:`You are the Renegade Land Title & Leasing Operations Agent. You help with energy land title business development across Oklahoma, Texas, New Mexico, Kansas, and Arkansas. Answer questions, generate lead ideas, draft outreach, and provide operational guidance. Be specific, practical, and direct.`,messages:[{role:"user",content:msg}]})
      });
      const d = await res.json();
      if(d.error) throw new Error(d.error.message);
      setMessages(m=>[...m,{role:"agent",type:"text",content:d.content?.[0]?.text||"",ts:new Date()}]);
    } catch(e) {
      setMessages(m=>[...m,{role:"agent",type:"error",content:"Error: "+e.message,ts:new Date()}]);
    }
    setLoading(false);
  };

  const QUICK = ["What should I focus on today?","Find 5 new O&G leads in Oklahoma","Draft outreach for a new permit holder in Grady County OK","How do I qualify for preferred vendor status with Devon Energy?","What's the best way to pitch a retainer to a mineral fund?"];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 120px)"}}>
      {showKey&&<div style={{background:T.white,border:`1.5px solid ${T.orange}`,borderRadius:10,padding:"14px 16px",marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:T.navy,marginBottom:8}}>Enter Claude API Key</div>
        <div style={{display:"flex",gap:8}}>
          <input type="password" value={keyVal} onChange={e=>setKeyVal(e.target.value)} placeholder="sk-ant-api03-..." style={{flex:1,padding:"8px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:13}}/>
          <Btn variant="primary" onClick={()=>{localStorage.setItem("elt_claude_key",keyVal);setShowKey(false);}}>Save</Btn>
        </div>
        <div style={{fontSize:11,color:T.silver,marginTop:6}}>Get your key at console.anthropic.com → API Keys</div>
      </div>}
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:12,paddingBottom:8}}>
        {messages.map((msg,i)=>(
          <div key={i}>
            {msg.type==="welcome"&&<div style={{textAlign:"center",padding:"32px 16px"}}><div style={{fontSize:32,marginBottom:8}}>✦</div><div style={{fontSize:18,fontWeight:700,color:T.navy,marginBottom:4}}>Renegade Operations Agent</div><div style={{fontSize:13,color:T.silver}}>Ask me anything — lead generation, outreach drafting, operational guidance, or business strategy.</div></div>}
            {msg.role==="user"&&<div style={{display:"flex",justifyContent:"flex-end"}}><div style={{background:T.navy,color:T.white,borderRadius:"16px 16px 4px 16px",padding:"10px 14px",maxWidth:"70%",fontSize:13}}>{msg.content}</div></div>}
            {msg.role==="agent"&&msg.type==="text"&&<div style={{display:"flex",gap:10}}><div style={{width:28,height:28,borderRadius:"50%",background:T.orange,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:13,fontWeight:700,flexShrink:0}}>✦</div><div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:"4px 16px 16px 16px",padding:"10px 14px",maxWidth:"75%",fontSize:13,color:T.slate,whiteSpace:"pre-wrap"}}>{msg.content}</div></div>}
            {msg.type==="error"&&<div style={{padding:"10px 14px",background:"#FDE8E8",borderRadius:10,fontSize:13,color:"#8C1C1C"}}>{msg.content}</div>}
          </div>
        ))}
        {loading&&<div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{width:28,height:28,borderRadius:"50%",background:T.orange,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:13}}>✦</div><div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:"4px 16px 16px 16px",padding:"10px 14px",fontSize:13,color:T.silver}}>Thinking…</div></div>}
      </div>
      <div style={{borderTop:`1px solid ${T.border}`,paddingTop:10}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{QUICK.map((q,i)=><button key={i} onClick={()=>setInput(q)} style={{padding:"4px 10px",borderRadius:20,border:`1px solid ${T.border}`,background:T.white,fontSize:11,color:T.slate,cursor:"pointer"}}>{q.length>50?q.slice(0,50)+"…":q}</button>)}</div>
        <div style={{display:"flex",gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),send())} placeholder="Ask the agent anything…" style={{flex:1,padding:"10px 14px",border:`1.5px solid ${T.border}`,borderRadius:10,fontSize:13,color:T.navy}}/>
          <button onClick={send} disabled={loading} style={{padding:"10px 20px",background:loading?T.silver:T.orange,color:"white",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:loading?"not-allowed":"pointer"}}>{loading?"…":"Send ↵"}</button>
          <button onClick={()=>setShowKey(true)} style={{padding:"10px 12px",background:T.fog,border:`1px solid ${T.border}`,borderRadius:10,fontSize:13,cursor:"pointer",color:apiKey?T.orange:T.silver}}>🔑</button>
        </div>
      </div>
    </div>
  );
}

// ─── SETTINGS MODAL ───────────────────────────────────────────────────────────
function SettingsModal({onClose,hsToken,setHsToken}) {
  const [token,setToken] = useState(hsToken||"");
  const [testing,setTesting] = useState(false);
  const [testResult,setTestResult] = useState(null);
  const [claudeKey,setClaudeKey] = useState(localStorage.getItem("elt_claude_key")||"");
  const saveToken=()=>{ localStorage.setItem("elt_hs_token",token); setHsToken(token); };
  const saveClaudeKey=()=>{ localStorage.setItem("elt_claude_key",claudeKey); };
  const test=async()=>{ setTesting(true); try{ const r=await fetch("https://api.hubapi.com/crm/v3/objects/companies?limit=1",{headers:{"Authorization":`Bearer ${token}`}}); setTestResult(r.ok?{ok:true,msg:"✓ Connected to HubSpot"}:{ok:false,msg:"✗ Invalid token"}); }catch(e){ setTestResult({ok:false,msg:"✗ "+e.message}); } setTesting(false); };
  return <Modal title="Settings" onClose={onClose} wide>
    <div style={{marginBottom:24}}>
      <div style={{fontSize:14,fontWeight:700,color:T.navy,marginBottom:4}}>⬡ HubSpot Integration</div>
      <div style={{fontSize:12,color:T.silver,marginBottom:12}}>HubSpot → Settings → Integrations → Private Apps → Create app. Scopes: crm.objects.companies, crm.objects.contacts</div>
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        <input type="password" value={token} onChange={e=>setToken(e.target.value)} placeholder="pat-na1-xxxxxxxx…" style={{flex:1,padding:"8px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:13}}/>
        <FormBtn onClick={saveToken} variant="primary">Save</FormBtn>
        <FormBtn onClick={test}>{testing?"Testing…":"Test"}</FormBtn>
      </div>
      {testResult&&<div style={{padding:"8px 12px",borderRadius:8,background:testResult.ok?"#E6F4EA":"#FDE8E8",fontSize:12,fontWeight:600,color:testResult.ok?"#1E6832":"#8C1C1C"}}>{testResult.msg}</div>}
    </div>
    <div style={{borderTop:`1px solid ${T.border}`,paddingTop:20}}>
      <div style={{fontSize:14,fontWeight:700,color:T.navy,marginBottom:4}}>✦ Claude API Key (Agent)</div>
      <div style={{fontSize:12,color:T.silver,marginBottom:12}}>console.anthropic.com → API Keys</div>
      <div style={{display:"flex",gap:8}}>
        <input type="password" value={claudeKey} onChange={e=>setClaudeKey(e.target.value)} placeholder="sk-ant-api03-…" style={{flex:1,padding:"8px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:13}}/>
        <FormBtn onClick={saveClaudeKey} variant="primary">Save</FormBtn>
      </div>
      {claudeKey&&<div style={{marginTop:8,fontSize:12,color:"#3B6D11",fontWeight:600}}>✓ Claude API key is set</div>}
    </div>
  </Modal>;
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#1A3A5C",color:"white",fontFamily:"system-ui",padding:40,flexDirection:"column",gap:16}}>
          <div style={{fontSize:24,fontWeight:700}}>Renegade Land Title & Leasing</div>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.7)"}}>App Error — please refresh</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",maxWidth:600,wordBreak:"break-all"}}>{String(this.state.error)}</div>
          <button onClick={()=>window.location.reload()} style={{padding:"10px 24px",background:"#C8742A",border:"none",borderRadius:8,color:"white",fontSize:14,cursor:"pointer",marginTop:8}}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [session,setSession] = useState(null);
  const [userRole,setUserRole] = useState("landman");
  const [userName,setUserName] = useState("");
  const [activeTab,setActiveTab] = useState("overview");
  const [showSettings,setShowSettings] = useState(false);
  const [hsToken,setHsToken] = useState(()=>process.env.REACT_APP_HUBSPOT_TOKEN || localStorage.getItem("elt_hs_token") || "");
  const [counts,setCounts] = useState({});

  useEffect(()=>{
    if(!supabase) return;
    supabase.auth.getSession().then(({data:{session}})=>setSession(session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,session)=>setSession(session));
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!session||!supabase) return;
    // Load user role
    supabase.from("team_members").select("role,name").eq("email",session.user.email).single()
      .then(({data})=>{ if(data){ setUserRole(data.role); setUserName(data.name); } else { setUserRole("admin"); setUserName(session.user.email); } });
    // Load counts for overview
    Promise.all([
      supabase.from("projects").select("status"),
      supabase.from("vendors").select("status"),
      supabase.from("retainers").select("fee,status"),
      supabase.from("permits").select("flagged,added_to_crm"),
    ]).then(([{data:p},{data:v},{data:r},{data:pm}])=>{
      setCounts({
        activeProjects:(p||[]).filter(x=>x.status==="active").length,
        overdueProjects:(p||[]).filter(x=>x.status==="overdue").length,
        approvedVendors:(v||[]).filter(x=>x.status==="approved").length,
        pendingVendors:(v||[]).filter(x=>x.status==="submitted").length,
        activeRetainers:(r||[]).filter(x=>x.status==="active").length,
        retainerMRR:(r||[]).filter(x=>x.status==="active").reduce((s,x)=>s+(x.fee||0),0),
        permits:(pm||[]).length,
        unflaggedPermits:(pm||[]).filter(x=>x.flagged&&!x.added_to_crm).length,
      });
    });
  },[session]);

  if(!supabase) return <div style={{minHeight:"100vh",background:T.navy,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{background:T.white,borderRadius:16,padding:40,maxWidth:500,textAlign:"center"}}><div style={{fontSize:20,fontWeight:700,color:T.navy,marginBottom:12}}>Renegade Land Title & Leasing</div><div style={{fontSize:13,color:T.slate,marginBottom:16}}>Supabase is not configured yet. Add your environment variables to deploy.</div><div style={{background:T.fog,borderRadius:8,padding:16,fontSize:12,fontFamily:"monospace",textAlign:"left",color:T.navy}}>REACT_APP_SUPABASE_URL=https://xxx.supabase.co<br/>REACT_APP_SUPABASE_ANON_KEY=eyJ...</div></div></div>;
  if(!session) return <LoginPage onLogin={setSession}/>;

  const TABS = [
    {id:"overview",label:"Overview",icon:"⊞"},
    {id:"permits",label:"DB Mining",icon:"⦿"},
    {id:"projects",label:"Projects & Orders",icon:"⊟"},
    {id:"vendor",label:"Vendor Registration",icon:"⊕"},
    {id:"retainer",label:"Retainer Clients",icon:"★"},
    {id:"peripheral",label:"Peripheral Leads",icon:"◎"},
    {id:"financial",label:"Financial",icon:"▦"},
    {id:"agent",label:"Agent",icon:"✦",highlight:true},
    ...(userRole==="admin"?[{id:"team",label:"Team",icon:"◉"}]:[]),
  ].filter(t=>ROLE_ACCESS[userRole]?.includes(t.id));

  return (
    <div style={{fontFamily:"system-ui,-apple-system,sans-serif",background:T.fog,minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      {/* Top bar */}
      <div style={{background:T.navy,color:T.white,padding:"0 24px",display:"flex",alignItems:"center",height:52,gap:16,flexShrink:0}}>
        <div style={{display:"flex",flexDirection:"column",lineHeight:1.2}}>
          <span style={{fontSize:13,fontWeight:700,letterSpacing:"0.02em"}}>RENEGADE LAND TITLE & LEASING</span>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.45)",letterSpacing:"0.08em"}}>OPERATIONS HUB</span>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",background:"rgba(255,255,255,0.08)",borderRadius:20}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"#ff7a59"}}/>
            <span style={{fontSize:11,color:"rgba(255,255,255,0.7)"}}>HubSpot synced</span>
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",padding:"4px 10px",background:"rgba(255,255,255,0.08)",borderRadius:20}}>
            {userName||session.user.email} · <span style={{textTransform:"capitalize"}}>{userRole}</span>
          </div>
          <button onClick={()=>setShowSettings(true)} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"rgba(255,255,255,0.8)",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer"}}>⚙ Settings</button>
          <button onClick={()=>supabase.auth.signOut()} style={{background:"rgba(200,50,50,0.2)",border:"1px solid rgba(255,100,100,0.3)",color:"rgba(255,180,180,0.9)",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer"}}>Sign Out</button>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{background:T.white,borderBottom:`1px solid ${T.border}`,padding:"0 24px",display:"flex",gap:0,flexShrink:0,overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{padding:"12px 18px",border:"none",borderBottom:activeTab===t.id?`3px solid ${T.orange}`:"3px solid transparent",background:t.highlight&&activeTab!==t.id?"linear-gradient(180deg,rgba(200,116,42,0.06) 0%,transparent 100%)":"none",fontSize:13,fontWeight:activeTab===t.id?700:500,color:t.highlight?(activeTab===t.id?T.orange:T.orangeLight):activeTab===t.id?T.navy:T.silver,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:14}}>{t.icon}</span>{t.label}
            {t.highlight&&<span style={{fontSize:9,fontWeight:800,background:T.orange,color:"white",borderRadius:10,padding:"1px 5px"}}>AI</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{flex:1,padding:"20px 24px",overflowY:"auto"}}>
        {activeTab==="overview"    && <Overview counts={counts} userRole={userRole}/>}
        {activeTab==="permits"     && <PermitsModule userRole={userRole} hsToken={hsToken}/>}
        {activeTab==="projects"    && <ProjectsModule userRole={userRole}/>}
        {activeTab==="vendor"      && <VendorModule userRole={userRole} hsToken={hsToken}/>}
        {activeTab==="retainer"    && <RetainerModule userRole={userRole}/>}
        {activeTab==="peripheral"  && <PeripheralModule userRole={userRole}/>}
        {activeTab==="financial"   && <FinancialModule userRole={userRole}/>}
        {activeTab==="agent"       && <AgentModule userRole={userRole}/>}
        {activeTab==="team"        && <TeamModule/>}
      </div>

      {showSettings&&<SettingsModal onClose={()=>setShowSettings(false)} hsToken={hsToken} setHsToken={setHsToken}/>}
    </div>
  );
}
