import { useState, useRef, useEffect, useCallback } from "react";

const GROQ_API_KEY = "YOUR_GROQ_API_KEY_HERE";

const HORIZON = {
  gold:     "#f59e0b",
  orange:   "#f97316",
  rose:     "#fb7185",
  violet:   "#8b5cf6",
  sky:      "#38bdf8",
  grad:     "linear-gradient(135deg, #f59e0b, #f97316, #fb7185)",
  gradBtn:  "linear-gradient(135deg, #f97316, #fb7185)",
  gradCool: "linear-gradient(135deg, #8b5cf6, #38bdf8)",
  surface:  "rgba(18,16,42,0.82)",
  panel:    "rgba(26,23,48,0.85)",
  border:   "rgba(42,37,80,0.7)",
  muted:    "#6b6890",
  text:     "#e8e6f0",
  sub:      "#9896b0",
};

const ROLES = {
  general:    { label:"General Assistant",  icon:"◎", color:HORIZON.sky,    system:"You are Horizon AI – a balanced, structured, highly capable general assistant. Provide clear, organized, actionable responses. Use headers and bullet points where helpful. Always be practical and concise." },
  mentor:     { label:"Ruthless Mentor",    icon:"△", color:HORIZON.rose,   system:"You are Horizon AI in RUTHLESS MENTOR mode. Be brutally honest, direct, high standards. Call out weak thinking. Push harder. No sugar-coating. Short punchy sentences. End with a challenge or call to action." },
  strategist: { label:"Strategist",         icon:"◈", color:HORIZON.gold,   system:"You are Horizon AI in STRATEGIST mode. Think in systems and leverage points. Structure every response: Situation → Options → Recommended Action → Risks. Use numbered steps. Optimize for results." },
  business:   { label:"Business Advisor",   icon:"◇", color:"#34d399",      system:"You are Horizon AI in BUSINESS ADVISOR mode. Focus on ideas, systems, revenue, growth. Think like a top-tier consultant. Structure: Opportunity → Strategy → Execution Steps → Expected Outcome." },
  creative:   { label:"Creative Generator", icon:"✦", color:HORIZON.orange, system:"You are Horizon AI in CREATIVE GENERATOR mode. Brainstorm freely, generate bold ideas. Give 3-5 diverse options whenever possible. Be energetic and inspiring." },
  wingman:    { label:"Virtual Wingman",    icon:"◉", color:HORIZON.violet, system:"You are Horizon AI in VIRTUAL WINGMAN mode. Social advice, communication coaching, confidence building. Cool, casual, direct. Give real-world scripts the user can use immediately." },
};

const AGENT_SYS = `You are Horizon AI running a MULTI-AGENT WORKFLOW. Simulate three agents:

PLANNER: Break the goal into clear numbered steps.
EXECUTOR: Generate the detailed solution for each step.
CRITIC: Evaluate output and suggest improvements.

Format EXACTLY:
---
PLANNER
[numbered steps]

EXECUTOR
[detailed solution]

CRITIC
[evaluation + improvements]
---`;

const IMG_SYS = `Generate a highly detailed, optimized image prompt for DALL-E, Midjourney, or Stable Diffusion. Include: subject, style, lighting, mood, composition, color palette, technical parameters (e.g. --ar 16:9 --v 6). Make it vivid and professional.`;

async function callClaude(messages, system, onChunk) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1000,
      stream: true,
      messages: [
        { role: 'system', content: system },
        ...messages,
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of dec.decode(value).split('\n')) {
      if (line.startsWith('data: ') && !line.includes('[DONE]')) {
        try {
          const d = JSON.parse(line.slice(6));
          const text = d.choices?.[0]?.delta?.content;
          if (text) { full += text; onChunk(full); }
        } catch {}
      }
    }
  }
  return full;
}

function fmt(t) {
  return t
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^#{1,3} (.+)$/gm, `<span style="font-weight:700;color:#f59e0b;display:block;margin:8px 0 3px;font-size:15px">$1</span>`)
    .replace(/^---$/gm, `<hr style="border:none;border-top:1px solid rgba(42,37,80,0.6);margin:12px 0"/>`)
    .replace(/\n/g, '<br/>');
}

function Dots({ color }) {
  return (
    <div style={{ display:'flex', gap:5, padding:'10px 14px', alignItems:'center' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:color, opacity:0.8, animation:`hbounce 1.2s ${i*0.2}s infinite ease-in-out` }} />
      ))}
    </div>
  );
}

function Msg({ m, rc }) {
  const u = m.role === 'user';
  return (
    <div style={{ display:'flex', flexDirection:u?'row-reverse':'row', gap:10, marginBottom:18, alignItems:'flex-start', animation:'hfade 0.25s ease' }}>
      <div style={{ width:34, height:34, borderRadius:'50%', background:u?'rgba(26,23,48,0.9)':`${rc}22`, border:`1.5px solid ${u?'rgba(42,37,80,0.9)':rc}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0, color:u?HORIZON.sub:rc, fontWeight:700, backdropFilter:'blur(8px)' }}>
        {u ? 'U' : 'H'}
      </div>
      <div style={{ maxWidth:'80%', background:u?'rgba(26,23,48,0.72)':'rgba(12,10,26,0.72)', border:`1px solid ${u?'rgba(42,37,80,0.7)':rc+'35'}`, borderRadius:u?'16px 3px 16px 16px':'3px 16px 16px 16px', padding:'11px 15px', color:HORIZON.text, fontSize:14, lineHeight:1.7, backdropFilter:'blur(14px)' }}
        dangerouslySetInnerHTML={{ __html: fmt(m.content) }} />
    </div>
  );
}

const STARS = [
  [8,12,0],[5,28,0.4],[12,45,0.8],[4,63,1.1],[9,78,0.2],
  [18,8,1.4],[15,55,0.6],[22,88,1.8],[3,92,0.9],[25,35,1.2],
  [7,70,0.5],[20,20,1.6],[6,40,2.0],[14,85,0.3],[10,60,1.0],
];

export default function HorizonAI() {
  const [role, setRole]           = useState('general');
  const [mode, setMode]           = useState('chat');
  const [msgs, setMsgs]           = useState([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [streaming, setStreaming] = useState('');
  const [chats, setChats]         = useState(() => { try { return JSON.parse(localStorage.getItem('horizon_chats') || '[]'); } catch { return []; } });
  const [cid, setCid]             = useState(null);
  const [sidebar, setSidebar]     = useState(false);
  const [wfSteps, setWfSteps]     = useState([]);
  const [wfStep, setWfStep]       = useState(0);
  const [voiceOn, setVoiceOn]     = useState(false);
  const [settings, setSettings]   = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const srRef     = useRef(null);
  const R  = ROLES[role];
  const rc = R.color;

  useEffect(() => { localStorage.setItem('horizon_chats', JSON.stringify(chats)); }, [chats]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs, streaming]);
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      srRef.current = new SR();
      srRef.current.onresult = e => { setInput(e.results[0][0].transcript); setVoiceOn(false); };
      srRef.current.onend = () => setVoiceOn(false);
    }
  }, []);

  const speak = t => { if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(t.replace(/<[^>]*>/g,'').slice(0,500)); u.rate=1.05; window.speechSynthesis.speak(u); } };
  const newChat = () => { const id = Math.random().toString(36).slice(2); setChats(p=>[{id,title:'New Chat',messages:[],role,mode,ts:Date.now()},...p]); setCid(id); setMsgs([]); setWfSteps([]); setWfStep(0); setSidebar(false); setTimeout(()=>inputRef.current?.focus(),80); };
  const loadChat = c => { setCid(c.id); setMsgs(c.messages); setRole(c.role||'general'); setMode(c.mode||'chat'); setSidebar(false); };
  const delChat  = (id,e) => { e.stopPropagation(); setChats(p=>p.filter(c=>c.id!==id)); if(cid===id){setCid(null);setMsgs([]);} };

  const sysFor = useCallback(m => {
    if (m==='agent') return AGENT_SYS;
    if (m==='image') return R.system + '\n\n' + IMG_SYS;
    return R.system;
  }, [R]);

  const send = useCallback(async txt => {
    const text = (txt || input).trim();
    if (!text || loading) return;
    setInput('');
    let am = mode;
    if (mode==='chat') { const l=text.toLowerCase(); if(l.includes('image')||l.includes('midjourney'))am='image'; else if(l.includes('multi-agent'))am='agent'; }
    const um = { id:Math.random().toString(36).slice(2), role:'user', content:text };
    const nm = [...msgs, um];
    setMsgs(nm); setLoading(true); setStreaming('');
    try {
      let final = '';
      await callClaude(nm.map(m=>({role:m.role==='user'?'user':'assistant',content:m.content})), sysFor(am), p=>{setStreaming(p);final=p;});
      const a = { id:Math.random().toString(36).slice(2), role:'assistant', content:final };
      const done = [...nm, a];
      setMsgs(done); setStreaming('');
      if (voiceOn) speak(final);
      const chatId = cid || Math.random().toString(36).slice(2);
      if (!cid) setCid(chatId);
      setChats(p => { const ex=p.find(c=>c.id===chatId); if(ex) return p.map(c=>c.id===chatId?{...c,messages:done,title:c.title==='New Chat'?text.slice(0,38):c.title}:c); return [{id:chatId,title:text.slice(0,38),messages:done,role,mode,ts:Date.now()},...p]; });
    } catch(err) {
      setMsgs(p=>[...p,{id:Math.random().toString(36).slice(2),role:'assistant',content:`Error: ${err.message}`}]);
      setStreaming('');
    }
    setLoading(false);
  }, [input,msgs,loading,mode,role,cid,sysFor,voiceOn]);

  const planWf = async () => {
    const goal = input.trim(); if (!goal) return; setInput('');
    const um = { id:Math.random().toString(36).slice(2), role:'user', content:`Workflow Goal: ${goal}` };
    const nm = [...msgs, um]; setMsgs(nm); setLoading(true); setStreaming('');
    try {
      let plan = '';
      await callClaude([{role:'user',content:`Break into 3-5 numbered steps (list only, no preamble): "${goal}"`}], R.system, p=>{setStreaming(p);plan=p;});
      const steps = plan.split('\n').filter(l=>/^\d+\./.test(l.trim())).map(l=>l.replace(/^\d+\.\s*/,'').trim());
      if (!steps.length) { setMsgs(p=>[...p,{id:Math.random().toString(36).slice(2),role:'assistant',content:'Could not parse steps. Try rephrasing your goal.'}]); setStreaming(''); setLoading(false); return; }
      setWfSteps(steps); setWfStep(0);
      const a = { id:Math.random().toString(36).slice(2), role:'assistant', content:`**Workflow Plan (${steps.length} steps):**\n\n${steps.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\n**Step 1 is ready — hit Execute to begin.**` };
      setMsgs([...nm,a]); setStreaming(''); setMode('workflow');
    } catch(err) { setMsgs(p=>[...p,{id:Math.random().toString(36).slice(2),role:'assistant',content:`Error: ${err.message}`}]); setStreaming(''); }
    setLoading(false);
  };

  const execStep = async () => {
    if (wfStep>=wfSteps.length||loading) return;
    const step = wfSteps[wfStep];
    const um = { id:Math.random().toString(36).slice(2), role:'user', content:`Execute Step ${wfStep+1}: ${step}` };
    const nm = [...msgs, um]; setMsgs(nm); setLoading(true); setStreaming('');
    try {
      let final = '';
      const sys = R.system + `\nExecute step ${wfStep+1}/${wfSteps.length}: "${step}". Be detailed and practical.`;
      await callClaude(nm.map(m=>({role:m.role==='user'?'user':'assistant',content:m.content})), sys, p=>{setStreaming(p);final=p;});
      const next=wfStep+1; const done=next>=wfSteps.length;
      const suffix = done?'\n\n**Workflow complete!**':`\n\n**Next: Step ${next+1} — ${wfSteps[next]}**`;
      const a = { id:Math.random().toString(36).slice(2), role:'assistant', content:final+suffix };
      setMsgs([...nm,a]); setStreaming('');
      if (!done) setWfStep(next); else { setWfSteps([]); setWfStep(0); setMode('chat'); }
    } catch(err) { setMsgs(p=>[...p,{id:Math.random().toString(36).slice(2),role:'assistant',content:`Error: ${err.message}`}]); setStreaming(''); }
    setLoading(false);
  };

  const starters = ['Build me a 30-day business plan','Critique my idea ruthlessly','Generate 5 startup ideas for 2025','Create a Midjourney prompt for a neon sunset','Help me write a confident cold outreach message'];
  const Btn = (bg,sm=false) => ({ background:bg, border:'none', borderRadius:sm?8:12, padding:sm?'5px 11px':'10px 18px', color:'#fff', cursor:'pointer', fontSize:sm?12:14, fontWeight:600, whiteSpace:'nowrap', transition:'all 0.15s', display:'flex', alignItems:'center', gap:5 });
  const Pill = (on,c) => ({ padding:'5px 13px', borderRadius:20, border:`1px solid ${on?c:HORIZON.border}`, background:on?c+'25':'rgba(26,23,48,0.55)', color:on?c:HORIZON.muted, cursor:'pointer', fontSize:12, fontWeight:600, transition:'all 0.15s', backdropFilter:'blur(8px)' });

  return (
    <div style={{ display:'flex', height:'100vh', color:HORIZON.text, fontFamily:"'Inter',system-ui,sans-serif", overflow:'hidden', position:'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:rgba(42,37,80,0.8);border-radius:4px}
        @keyframes hbounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
        @keyframes hfade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes twinkle{0%,100%{opacity:0.15;transform:scale(1)}50%{opacity:1;transform:scale(2)}}
        @keyframes pulseSun{0%,100%{box-shadow:0 0 40px 15px rgba(245,158,11,0.7),0 0 80px 30px rgba(249,115,22,0.4),0 0 140px 50px rgba(251,113,133,0.25)}50%{box-shadow:0 0 60px 25px rgba(245,158,11,0.9),0 0 110px 45px rgba(249,115,22,0.55),0 0 180px 70px rgba(251,113,133,0.35)}}
        @keyframes hglow{0%,100%{opacity:0.6}50%{opacity:1}}
        .hci:hover{background:rgba(26,23,48,0.85)!important}
        textarea:focus{outline:none!important}
        select:focus{outline:none}
        button:active{transform:scale(0.97)}
        .hbtn:hover{opacity:0.85}
        .starter:hover{background:rgba(42,37,80,0.6)!important}
      `}</style>

      {/* HORIZON BACKGROUND */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'#0c0a1a' }} />
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 130% 65% at 50% 100%, #f97316 0%, #fb7185 16%, #8b5cf6 38%, #1a0a3a 62%, #0c0a1a 100%)' }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(12,10,26,0.55) 0%, transparent 50%)' }} />
        <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:'960px', height:'440px', background:'radial-gradient(ellipse 80% 55% at 50% 100%, #fde68a 0%, #f59e0b 14%, #f97316 30%, #fb7185 52%, transparent 72%)', filter:'blur(40px)', opacity:0.8 }} />
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'2px', background:'linear-gradient(90deg,transparent 0%,#f59e0b 20%,#fde68a 50%,#f59e0b 80%,transparent 100%)', boxShadow:'0 0 20px 5px rgba(245,158,11,0.9), 0 0 55px 12px rgba(249,115,22,0.5), 0 0 110px 25px rgba(251,113,133,0.3)' }} />
        <div style={{ position:'absolute', bottom:'-1px', left:'50%', transform:'translateX(-50%)', width:'130px', height:'65px', borderRadius:'130px 130px 0 0', background:'radial-gradient(ellipse at 50% 100%, #fde68a 0%, #f59e0b 30%, #f97316 62%, transparent 100%)', animation:'pulseSun 4s ease-in-out infinite' }} />
        {STARS.map(([top,left,delay],i) => (
          <div key={i} style={{ position:'absolute', top:`${top}%`, left:`${left}%`, width:'2px', height:'2px', borderRadius:'50%', background:'#fff', animation:`twinkle 3s ${delay}s infinite ease-in-out` }} />
        ))}
      </div>

      {/* SIDEBAR */}
      <div style={{ width:sidebar?265:0, minWidth:sidebar?265:0, background:'rgba(8,6,22,0.88)', borderRight:`1px solid ${HORIZON.border}`, transition:'all 0.25s ease', overflow:'hidden', display:'flex', flexDirection:'column', flexShrink:0, zIndex:20, backdropFilter:'blur(24px)' }}>
        <div style={{ width:265, display:'flex', flexDirection:'column', height:'100%', padding:'18px 13px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:HORIZON.grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#fff' }}>H</div>
            <span style={{ fontWeight:800, fontSize:15, background:HORIZON.grad, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Horizon AI</span>
          </div>
          <button className="hbtn" style={{ ...Btn(HORIZON.gradBtn), justifyContent:'center', width:'100%', marginBottom:18 }} onClick={newChat}>+ New Chat</button>
          <div style={{ fontSize:10, color:HORIZON.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:1.2, marginBottom:8 }}>Conversations ({chats.length})</div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {chats.length===0 && <div style={{ color:HORIZON.muted, fontSize:13, textAlign:'center', marginTop:24 }}>No chats yet</div>}
            {chats.map(c => (
              <div key={c.id} className="hci" onClick={()=>loadChat(c)} style={{ padding:'8px 10px', borderRadius:9, cursor:'pointer', marginBottom:4, background:cid===c.id?'rgba(26,23,48,0.9)':'transparent', border:`1px solid ${cid===c.id?rc+'50':'transparent'}`, display:'flex', justifyContent:'space-between', alignItems:'center', transition:'all 0.15s' }}>
                <div style={{ flex:1, overflow:'hidden' }}>
                  <div style={{ fontSize:13, color:HORIZON.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.title}</div>
                  <div style={{ fontSize:11, color:HORIZON.muted, marginTop:1 }}>{ROLES[c.role]?.icon} {ROLES[c.role]?.label}</div>
                </div>
                <button onClick={e=>delChat(c.id,e)} style={{ background:'none', border:'none', color:HORIZON.muted, cursor:'pointer', fontSize:14, padding:'0 2px', flexShrink:0 }}>x</button>
              </div>
            ))}
          </div>
          <div style={{ paddingTop:12, borderTop:`1px solid ${HORIZON.border}`, textAlign:'center' }}>
            <div style={{ fontSize:11, color:HORIZON.muted }}>Horizon AI v2.0</div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0, zIndex:10, position:'relative' }}>
        {/* Header */}
        <div style={{ padding:'11px 16px', borderBottom:`1px solid ${HORIZON.border}`, display:'flex', alignItems:'center', gap:10, background:'rgba(8,6,22,0.75)', flexShrink:0, backdropFilter:'blur(24px)' }}>
          <button onClick={()=>setSidebar(s=>!s)} style={{ background:'none', border:'none', color:HORIZON.muted, cursor:'pointer', fontSize:20, lineHeight:1, padding:2 }}>|||</button>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:HORIZON.grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#fff' }}>H</div>
            <span style={{ fontSize:16, fontWeight:800, background:HORIZON.grad, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Horizon AI</span>
          </div>
          <div style={{ flex:1 }} />
          <select value={role} onChange={e=>setRole(e.target.value)} style={{ background:'rgba(18,16,42,0.8)', border:`1px solid ${HORIZON.border}`, color:HORIZON.text, borderRadius:9, padding:'6px 10px', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            {Object.entries(ROLES).map(([k,r]) => <option key={k} value={k}>{r.icon} {r.label}</option>)}
          </select>
          <div style={{ width:9, height:9, borderRadius:'50%', background:rc, boxShadow:`0 0 10px ${rc}`, flexShrink:0, animation:'hglow 2s infinite' }} />
        </div>

        {/* Mode pills */}
        <div style={{ padding:'8px 16px', display:'flex', gap:6, borderBottom:`1px solid ${HORIZON.border}`, background:'rgba(8,6,22,0.6)', flexWrap:'wrap', alignItems:'center' }}>
          {[['chat','Chat'],['agent','Multi-Agent'],['image','Image Prompt'],['workflow','Workflow']].map(([m,l]) => (
            <button key={m} style={Pill(mode===m,rc)} onClick={()=>setMode(m)}>{l}</button>
          ))}
          <div style={{ flex:1 }} />
          <button onClick={()=>{ if(srRef.current){setVoiceOn(true);srRef.current.start();} }} style={{ ...Pill(voiceOn,'#ec4899') }}>
            {voiceOn ? 'Listening...' : 'Voice'}
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'24px 20px' }}>
          {msgs.length===0 && (
            <div style={{ textAlign:'center', paddingTop:50 }}>
              <div style={{ width:80, height:80, borderRadius:'50%', background:HORIZON.grad, margin:'0 auto 18px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, fontWeight:800, color:'#fff', boxShadow:'0 0 50px rgba(249,115,22,0.55)' }}>H</div>
              <div style={{ fontSize:28, fontWeight:800, background:'linear-gradient(135deg,#fde68a,#f59e0b,#f97316,#fb7185,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:8 }}>Horizon AI</div>
              <div style={{ color:HORIZON.muted, fontSize:14, marginBottom:4 }}>
                <span style={{ color:rc, fontWeight:600 }}>{R.icon} {R.label}</span> · <span>{mode} mode</span>
              </div>
              <div style={{ color:HORIZON.muted, fontSize:13, maxWidth:380, margin:'12px auto 0', lineHeight:1.75 }}>
                {mode==='agent' && 'Multi-Agent: Planner, Executor, Critic pipeline.'}
                {mode==='image' && 'Describe your vision for a pro image prompt.'}
                {mode==='workflow' && 'Enter a goal and I will plan and guide execution.'}
                {mode==='chat' && 'Ask me anything. I adapt to your selected role.'}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginTop:24, maxWidth:500, margin:'24px auto 0' }}>
                {starters.map(s => (
                  <button key={s} className="starter" onClick={()=>{setInput(s);inputRef.current?.focus();}} style={{ background:'rgba(18,16,42,0.65)', border:`1px solid ${HORIZON.border}`, borderRadius:20, padding:'6px 14px', color:HORIZON.sub, cursor:'pointer', fontSize:12, fontWeight:500, transition:'all 0.15s' }}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {msgs.map(m => <Msg key={m.id} m={m} rc={rc} />)}
          {loading && streaming && (
            <div style={{ display:'flex', gap:10, marginBottom:18, alignItems:'flex-start' }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:`${rc}22`, border:`1.5px solid ${rc}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, color:rc, fontWeight:700, flexShrink:0 }}>H</div>
              <div style={{ maxWidth:'80%', background:'rgba(12,10,26,0.72)', border:`1px solid ${rc}35`, borderRadius:'3px 16px 16px 16px', padding:'11px 15px', color:HORIZON.text, fontSize:14, lineHeight:1.7 }} dangerouslySetInnerHTML={{ __html:fmt(streaming) }} />
            </div>
          )}
          {loading && !streaming && (
            <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:`${rc}22`, border:`1.5px solid ${rc}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, color:rc, fontWeight:700 }}>H</div>
              <div style={{ background:'rgba(12,10,26,0.72)', border:`1px solid ${rc}35`, borderRadius:'3px 16px 16px 16px' }}><Dots color={rc} /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Workflow bar */}
        {wfSteps.length>0 && (
          <div style={{ padding:'9px 16px', background:'rgba(8,6,22,0.75)', borderTop:`1px solid ${HORIZON.border}`, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ color:HORIZON.sub, fontSize:13, flexShrink:0 }}>Step {wfStep+1}/{wfSteps.length}</span>
            <div style={{ flex:1, background:'rgba(26,23,48,0.6)', borderRadius:4, height:5 }}>
              <div style={{ width:`${(wfStep/wfSteps.length)*100}%`, height:'100%', background:HORIZON.gradBtn, borderRadius:4, transition:'width 0.4s' }} />
            </div>
            <button className="hbtn" style={Btn(loading?'rgba(42,37,80,0.7)':HORIZON.gradBtn,true)} onClick={execStep} disabled={loading}>
              {loading ? 'Running...' : `Execute Step ${wfStep+1}`}
            </button>
          </div>
        )}

        {/* Input */}
        <div style={{ padding:'12px 16px', borderTop:`1px solid ${HORIZON.border}`, background:'rgba(8,6,22,0.75)', flexShrink:0 }}>
          <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();mode==='workflow'&&wfSteps.length===0?planWf():send();} }}
              placeholder={mode==='image'?'Describe what you want to visualise...':mode==='agent'?'Enter a complex task...':mode==='workflow'&&wfSteps.length===0?'Enter your goal...':`Ask ${R.label}...`}
              style={{ flex:1, background:'rgba(18,16,42,0.8)', border:`1.5px solid rgba(42,37,80,0.7)`, borderRadius:13, padding:'11px 15px', color:HORIZON.text, fontSize:14, resize:'none', fontFamily:'inherit', lineHeight:1.55, minHeight:46, maxHeight:130, transition:'border-color 0.2s' }}
              rows={1}
            />
            {mode==='workflow' && wfSteps.length===0 && (
              <button className="hbtn" style={Btn(HORIZON.gradCool)} onClick={planWf} disabled={loading||!input.trim()}>Plan</button>
            )}
            <button className="hbtn" style={{ ...Btn(loading?'rgba(42,37,80,0.7)':HORIZON.gradBtn), boxShadow:loading?'none':'0 0 18px rgba(249,115,22,0.4)' }} onClick={()=>send()} disabled={loading||!input.trim()}>
              {loading ? '...' : 'Send'}
            </button>
            <button className="hbtn" style={{ background:voiceOn?'#ec4899':'rgba(18,16,42,0.8)', border:`1.5px solid ${voiceOn?'#ec4899':HORIZON.border}`, borderRadius:12, padding:'11px 14px', color:'#fff', cursor:'pointer', fontSize:14, transition:'all 0.15s' }} onClick={()=>{ if(srRef.current){setVoiceOn(true);srRef.current.start();} }}>
              {voiceOn ? 'O' : 'V'}
            </button>
          </div>
          <div style={{ textAlign:'center', marginTop:6, color:HORIZON.muted, fontSize:11 }}>{R.icon} {R.label} · Enter to send · Shift+Enter new line</div>
        </div>
      </div>

      {/* Settings FAB */}
      <button onClick={()=>setSettings(true)} style={{ position:'fixed', bottom:20, right:20, background:'rgba(18,16,42,0.85)', border:`1px solid ${HORIZON.border}`, borderRadius:'50%', width:42, height:42, color:HORIZON.sub, cursor:'pointer', fontSize:17, display:'flex', alignItems:'center', justifyContent:'center', zIndex:40 }}>S</button>

      {/* Settings modal */}
      {settings && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setSettings(false)}>
          <div style={{ background:'rgba(12,10,26,0.96)', border:`1px solid ${HORIZON.border}`, borderRadius:18, padding:26, width:330, maxWidth:'90vw' }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:800, fontSize:17, background:HORIZON.grad, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:4 }}>Settings</div>
            <div style={{ color:HORIZON.muted, fontSize:13, marginBottom:18 }}>Manage your Horizon AI session.</div>
            <div style={{ fontSize:13, color:HORIZON.sub, marginBottom:6 }}>Version: <strong style={{ color:HORIZON.text }}>2.0</strong></div>
            <div style={{ fontSize:13, color:HORIZON.sub, marginBottom:18 }}>Saved chats: <strong style={{ color:HORIZON.text }}>{chats.length}</strong></div>
            <button className="hbtn" style={{ ...Btn('#ef4444'), width:'100%', justifyContent:'center' }} onClick={()=>{ setChats([]); setMsgs([]); setCid(null); setSettings(false); }}>Clear All History</button>
            <button className="hbtn" style={{ ...Btn('rgba(42,37,80,0.8)'), width:'100%', justifyContent:'center', marginTop:8 }} onClick={()=>setSettings(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
