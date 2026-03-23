import { useState, useRef, useEffect, useCallback } from 'react'

const GROQ_KEY = 'import.meta.env.VITE'

const H = {
  grad: 'linear-gradient(135deg,#f59e0b,#f97316,#fb7185)',
  gBtn: 'linear-gradient(135deg,#f97316,#fb7185)',
  gCool:'linear-gradient(135deg,#8b5cf6,#38bdf8)',
  bdr:  'rgba(42,37,80,0.7)',
  mut:  '#6b6890',
  txt:  '#e8e6f0',
  sub:  '#9896b0',
}

const ROLES = {
  general:    { label:'General Assistant',  icon:'*', color:'#38bdf8', system:'You are Horizon AI, a balanced helpful assistant. Give clear structured responses.' },
  mentor:     { label:'Ruthless Mentor',    icon:'!', color:'#fb7185', system:'You are Horizon AI in RUTHLESS MENTOR mode. Be brutally honest and direct. High standards. No fluff. End with a challenge.' },
  strategist: { label:'Strategist',         icon:'#', color:'#f59e0b', system:'You are Horizon AI in STRATEGIST mode. Think in systems. Structure: Situation, Options, Action, Risks.' },
  business:   { label:'Business Advisor',   icon:'$', color:'#34d399', system:'You are Horizon AI in BUSINESS ADVISOR mode. Focus on revenue and growth. Structure: Opportunity, Strategy, Execution, Outcome.' },
  creative:   { label:'Creative Generator', icon:'+', color:'#f97316', system:'You are Horizon AI in CREATIVE mode. Generate bold ideas. Give 3-5 diverse options. Be inspiring.' },
  wingman:    { label:'Virtual Wingman',    icon:'@', color:'#8b5cf6', system:'You are Horizon AI in WINGMAN mode. Social advice and confidence coaching. Give real scripts to use.' },
}

const AGENT = 'You are Horizon AI. Simulate three agents:\nPLANNER: numbered steps\nEXECUTOR: detailed solution\nCRITIC: evaluation\n\nFormat:\n---\nPLANNER\n[steps]\n\nEXECUTOR\n[solution]\n\nCRITIC\n[evaluation]\n---'
const IMGPROMPT = 'Generate a detailed image prompt for Midjourney or DALL-E. Include subject, style, lighting, mood, color palette, and parameters like --ar 16:9.'

async function ask(messages, system, onChunk) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + GROQ_KEY,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1000,
      stream: true,
      messages: [{ role: 'system', content: system }].concat(messages),
    }),
  })
  if (!res.ok) throw new Error('API error ' + res.status)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const lines = dec.decode(value).split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.indexOf('data: ') === 0 && line.indexOf('[DONE]') === -1) {
        try {
          const d = JSON.parse(line.slice(6))
          const t = d.choices && d.choices[0] && d.choices[0].delta && d.choices[0].delta.content
          if (t) { full += t; onChunk(full) }
        } catch(e) {}
      }
    }
  }
  return full
}

function clean(t) {
  return t
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br/>')
}

function uid() { return Math.random().toString(36).slice(2) }

function Bubble(props) {
  var m = props.m
  var rc = props.rc
  var u = m.role === 'user'
  return React.createElement('div', {
    style: { display:'flex', flexDirection:u?'row-reverse':'row', gap:10, marginBottom:16, alignItems:'flex-start' }
  },
    React.createElement('div', {
      style: { width:32, height:32, borderRadius:'50%', background:u?'rgba(26,23,48,0.9)':rc+'33', border:'1.5px solid '+(u?'rgba(42,37,80,0.8)':rc), display:'flex', alignItems:'center', justifyContent:'center', color:u?H.sub:rc, fontWeight:700, fontSize:13, flexShrink:0 }
    }, u?'U':'H'),
    React.createElement('div', {
      style: { maxWidth:'78%', background:u?'rgba(26,23,48,0.75)':'rgba(12,10,26,0.75)', border:'1px solid '+(u?'rgba(42,37,80,0.6)':rc+'30'), borderRadius:u?'14px 3px 14px 14px':'3px 14px 14px 14px', padding:'10px 14px', color:H.txt, fontSize:14, lineHeight:1.7, backdropFilter:'blur(12px)' },
      dangerouslySetInnerHTML: { __html: clean(m.content) }
    })
  )
}

function Dots(props) {
  return React.createElement('div', { style:{ display:'flex', gap:4, padding:'10px 14px' } },
    [0,1,2].map(function(i) {
      return React.createElement('div', {
        key: i,
        style: { width:7, height:7, borderRadius:'50%', background:props.color, animation:'hb 1.2s '+(i*0.2)+'s infinite ease-in-out' }
      })
    })
  )
}

var STARS = [[8,12,0],[5,28,0.4],[12,45,0.8],[4,63,1.1],[9,78,0.2],[18,8,1.4],[15,55,0.6],[22,88,1.8],[3,92,0.9],[25,35,1.2]]

export default function App() {
  var roleKey = useState('general')
  var role = roleKey[0]; var setRole = roleKey[1]
  var modeS = useState('chat')
  var mode = modeS[0]; var setMode = modeS[1]
  var msgsS = useState([])
  var msgs = msgsS[0]; var setMsgs = msgsS[1]
  var inputS = useState('')
  var input = inputS[0]; var setInput = inputS[1]
  var loadS = useState(false)
  var loading = loadS[0]; var setLoading = loadS[1]
  var strmS = useState('')
  var streaming = strmS[0]; var setStreaming = strmS[1]
  var chatsS = useState(function() { try { return JSON.parse(localStorage.getItem('hzchats')||'[]') } catch(e) { return [] } })
  var chats = chatsS[0]; var setChats = chatsS[1]
  var cidS = useState(null)
  var cid = cidS[0]; var setCid = cidS[1]
  var sideS = useState(false)
  var sidebar = sideS[0]; var setSidebar = sideS[1]
  var settS = useState(false)
  var settings = settS[0]; var setSettings = settS[1]
  var wfS = useState([])
  var wfSteps = wfS[0]; var setWfSteps = wfS[1]
  var wfStepS = useState(0)
  var wfStep = wfStepS[0]; var setWfStep = wfStepS[1]

  var bottomRef = useRef(null)
  var inputRef = useRef(null)

  var R = ROLES[role]
  var rc = R.color

  useEffect(function() { localStorage.setItem('hzchats', JSON.stringify(chats)) }, [chats])
  useEffect(function() { if(bottomRef.current) bottomRef.current.scrollIntoView({behavior:'smooth'}) }, [msgs, streaming])

  function getSys(m) {
    if (m === 'agent') return AGENT
    if (m === 'image') return R.system + '\n\n' + IMGPROMPT
    return R.system
  }

  function newChat() {
    var id = uid()
    setChats(function(p) { return [{id:id,title:'New Chat',messages:[],role:role,ts:Date.now()}].concat(p) })
    setCid(id); setMsgs([]); setWfSteps([]); setWfStep(0); setSidebar(false)
    setTimeout(function() { if(inputRef.current) inputRef.current.focus() }, 80)
  }

  function loadChat(c) { setCid(c.id); setMsgs(c.messages); setRole(c.role||'general'); setSidebar(false) }

  function delChat(id, e) {
    e.stopPropagation()
    setChats(function(p) { return p.filter(function(c) { return c.id !== id }) })
    if (cid === id) { setCid(null); setMsgs([]) }
  }

  var send = useCallback(function(txt) {
    var text = (txt || input).trim()
    if (!text || loading) return
    setInput('')
    var am = mode
    var l = text.toLowerCase()
    if (mode === 'chat') {
      if (l.indexOf('image') !== -1 || l.indexOf('midjourney') !== -1) am = 'image'
      else if (l.indexOf('multi-agent') !== -1) am = 'agent'
    }
    var um = { id:uid(), role:'user', content:text }
    var nm = msgs.concat([um])
    setMsgs(nm); setLoading(true); setStreaming('')
    var apiMsgs = nm.map(function(x) { return { role: x.role === 'user' ? 'user' : 'assistant', content: x.content } })
    ask(apiMsgs, getSys(am), function(p) { setStreaming(p) }).then(function(final) {
      var a = { id:uid(), role:'assistant', content:final }
      var done = nm.concat([a])
      setMsgs(done); setStreaming('')
      var chatId = cid || uid()
      if (!cid) setCid(chatId)
      setChats(function(p) {
        var ex = p.find(function(c) { return c.id === chatId })
        if (ex) return p.map(function(c) { return c.id === chatId ? Object.assign({}, c, {messages:done, title:c.title==='New Chat'?text.slice(0,38):c.title}) : c })
        return [{id:chatId, title:text.slice(0,38), messages:done, role:role, ts:Date.now()}].concat(p)
      })
      setLoading(false)
    }).catch(function(err) {
      setMsgs(function(p) { return p.concat([{id:uid(), role:'assistant', content:'Error: '+err.message}]) })
      setStreaming(''); setLoading(false)
    })
  }, [input, msgs, loading, mode, role, cid])

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function btn(bg, sm) {
    return { background:bg, border:'none', borderRadius:sm?8:12, padding:sm?'5px 10px':'10px 16px', color:'#fff', cursor:'pointer', fontSize:sm?12:14, fontWeight:600, display:'flex', alignItems:'center', gap:4, transition:'all 0.15s', whiteSpace:'nowrap' }
  }
  function pill(on, c) {
    return { padding:'5px 12px', borderRadius:20, border:'1px solid '+(on?c:H.bdr), background:on?c+'22':'rgba(26,23,48,0.5)', color:on?c:H.mut, cursor:'pointer', fontSize:12, fontWeight:600 }
  }

  return React.createElement('div', { style:{ display:'flex', height:'100vh', color:H.txt, fontFamily:"'Inter',system-ui,sans-serif", overflow:'hidden', position:'relative' } },

    React.createElement('style', {}, [
      "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');",
      "*{box-sizing:border-box;margin:0;padding:0}",
      "::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(42,37,80,0.8);border-radius:4px}",
      "@keyframes hb{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}",
      "@keyframes tw{0%,100%{opacity:0.15}50%{opacity:1}}",
      "@keyframes ps{0%,100%{box-shadow:0 0 40px 15px rgba(245,158,11,0.7),0 0 80px 30px rgba(249,115,22,0.4)}50%{box-shadow:0 0 60px 25px rgba(245,158,11,0.9),0 0 110px 45px rgba(249,115,22,0.55)}}",
      "@keyframes gl{0%,100%{opacity:0.5}50%{opacity:1}}",
      ".hci:hover{background:rgba(26,23,48,0.85)!important}",
      "textarea:focus{outline:none!important}select:focus{outline:none}button:active{transform:scale(0.97)}",
    ].join('')),

    // BACKGROUND
    React.createElement('div', { style:{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' } },
      React.createElement('div', { style:{ position:'absolute', inset:0, background:'#0c0a1a' } }),
      React.createElement('div', { style:{ position:'absolute', inset:0, background:'radial-gradient(ellipse 130% 65% at 50% 100%,#f97316 0%,#fb7185 16%,#8b5cf6 38%,#1a0a3a 62%,#0c0a1a 100%)' } }),
      React.createElement('div', { style:{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(12,10,26,0.5) 0%,transparent 50%)' } }),
      React.createElement('div', { style:{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:'900px', height:'420px', background:'radial-gradient(ellipse 80% 55% at 50% 100%,#fde68a 0%,#f59e0b 14%,#f97316 30%,#fb7185 52%,transparent 72%)', filter:'blur(38px)', opacity:0.8 } }),
      React.createElement('div', { style:{ position:'absolute', bottom:0, left:0, right:0, height:'2px', background:'linear-gradient(90deg,transparent,#f59e0b 20%,#fde68a 50%,#f59e0b 80%,transparent)', boxShadow:'0 0 20px 5px rgba(245,158,11,0.9),0 0 55px 12px rgba(249,115,22,0.5)' } }),
      React.createElement('div', { style:{ position:'absolute', bottom:'-1px', left:'50%', transform:'translateX(-50%)', width:'120px', height:'60px', borderRadius:'120px 120px 0 0', background:'radial-gradient(ellipse at 50% 100%,#fde68a 0%,#f59e0b 30%,#f97316 62%,transparent 100%)', animation:'ps 4s ease-in-out infinite' } }),
      STARS.map(function(s, i) {
        return React.createElement('div', { key:i, style:{ position:'absolute', top:s[0]+'%', left:s[1]+'%', width:'2px', height:'2px', borderRadius:'50%', background:'#fff', animation:'tw 3s '+s[2]+'s infinite ease-in-out' } })
      })
    ),

    // SIDEBAR
    React.createElement('div', { style:{ width:sidebar?260:0, minWidth:sidebar?260:0, background:'rgba(8,6,22,0.9)', borderRight:'1px solid '+H.bdr, transition:'all 0.25s', overflow:'hidden', flexShrink:0, zIndex:20, backdropFilter:'blur(24px)' } },
      React.createElement('div', { style:{ width:260, display:'flex', flexDirection:'column', height:'100%', padding:'16px 12px' } },
        React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:8, marginBottom:18 } },
          React.createElement('div', { style:{ width:28, height:28, borderRadius:8, background:H.grad, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#fff', fontSize:13 } }, 'H'),
          React.createElement('span', { style:{ fontWeight:800, fontSize:14, background:H.grad, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' } }, 'Horizon AI')
        ),
        React.createElement('button', { style:Object.assign({}, btn(H.gBtn), {justifyContent:'center',width:'100%',marginBottom:16}), onClick:newChat }, '+ New Chat'),
        React.createElement('div', { style:{ fontSize:10, color:H.mut, fontWeight:700, textTransform:'uppercase', letterSpacing:1.2, marginBottom:8 } }, 'Chats ('+chats.length+')'),
        React.createElement('div', { style:{ flex:1, overflowY:'auto' } },
          chats.length === 0
            ? React.createElement('div', { style:{ color:H.mut, fontSize:13, textAlign:'center', marginTop:20 } }, 'No chats yet')
            : chats.map(function(c) {
                return React.createElement('div', { key:c.id, className:'hci', onClick:function(){loadChat(c)}, style:{ padding:'7px 9px', borderRadius:8, cursor:'pointer', marginBottom:3, background:cid===c.id?'rgba(26,23,48,0.9)':'transparent', border:'1px solid '+(cid===c.id?rc+'40':'transparent'), display:'flex', justifyContent:'space-between', alignItems:'center', transition:'all 0.15s' } },
                  React.createElement('div', { style:{ flex:1, overflow:'hidden' } },
                    React.createElement('div', { style:{ fontSize:12, color:H.txt, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' } }, c.title),
                    React.createElement('div', { style:{ fontSize:11, color:H.mut } }, ROLES[c.role] ? ROLES[c.role].label : '')
                  ),
                  React.createElement('button', { onClick:function(e){delChat(c.id,e)}, style:{ background:'none', border:'none', color:H.mut, cursor:'pointer', fontSize:13 } }, 'x')
                )
              })
        ),
        React.createElement('div', { style:{ paddingTop:10, borderTop:'1px solid '+H.bdr, textAlign:'center' } },
          React.createElement('div', { style:{ fontSize:11, color:H.mut } }, 'Horizon AI v2.0')
        )
      )
    ),

    // MAIN
    React.createElement('div', { style:{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0, zIndex:10, position:'relative' } },

      // HEADER
      React.createElement('div', { style:{ padding:'10px 14px', borderBottom:'1px solid '+H.bdr, display:'flex', alignItems:'center', gap:10, background:'rgba(8,6,22,0.75)', flexShrink:0, backdropFilter:'blur(20px)' } },
        React.createElement('button', { onClick:function(){setSidebar(function(s){return !s})}, style:{ background:'none', border:'none', color:H.mut, cursor:'pointer', fontSize:18 } }, '='),
        React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:7 } },
          React.createElement('div', { style:{ width:24, height:24, borderRadius:6, background:H.grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff' } }, 'H'),
          React.createElement('span', { style:{ fontSize:15, fontWeight:800, background:H.grad, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' } }, 'Horizon AI')
        ),
        React.createElement('div', { style:{ flex:1 } }),
        React.createElement('select', { value:role, onChange:function(e){setRole(e.target.value)}, style:{ background:'rgba(18,16,42,0.8)', border:'1px solid '+H.bdr, color:H.txt, borderRadius:8, padding:'5px 8px', fontSize:12, cursor:'pointer' } },
          Object.entries(ROLES).map(function(entry) {
            return React.createElement('option', { key:entry[0], value:entry[0] }, entry[1].label)
          })
        ),
        React.createElement('div', { style:{ width:8, height:8, borderRadius:'50%', background:rc, boxShadow:'0 0 8px '+rc, animation:'gl 2s infinite' } })
      ),

      // MODE PILLS
      React.createElement('div', { style:{ padding:'7px 14px', display:'flex', gap:6, borderBottom:'1px solid '+H.bdr, background:'rgba(8,6,22,0.55)', flexWrap:'wrap', alignItems:'center', backdropFilter:'blur(16px)' } },
        [['chat','Chat'],['agent','Multi-Agent'],['image','Image'],['workflow','Workflow']].map(function(item) {
          return React.createElement('button', { key:item[0], style:pill(mode===item[0],rc), onClick:function(){setMode(item[0])} }, item[1])
        })
      ),

      // MESSAGES
      React.createElement('div', { style:{ flex:1, overflowY:'auto', padding:'20px 16px' } },
        msgs.length === 0
          ? React.createElement('div', { style:{ textAlign:'center', paddingTop:48 } },
              React.createElement('div', { style:{ width:72, height:72, borderRadius:'50%', background:H.grad, margin:'0 auto 14px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:800, color:'#fff', boxShadow:'0 0 44px rgba(249,115,22,0.5)' } }, 'H'),
              React.createElement('div', { style:{ fontSize:26, fontWeight:800, background:'linear-gradient(135deg,#fde68a,#f59e0b,#f97316,#fb7185,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:6 } }, 'Horizon AI'),
              React.createElement('div', { style:{ color:H.mut, fontSize:13, marginBottom:3 } },
                React.createElement('span', { style:{ color:rc, fontWeight:600 } }, R.label),
                ' - '+mode+' mode'
              ),
              React.createElement('div', { style:{ color:H.mut, fontSize:12, maxWidth:340, margin:'10px auto 0', lineHeight:1.7 } },
                mode==='agent' ? 'Multi-Agent: Planner, Executor, Critic.' :
                mode==='image' ? 'Describe your vision for an image prompt.' :
                mode==='workflow' ? 'Enter a goal to plan and execute.' :
                'Ask anything. I adapt to your role.'
              ),
              React.createElement('div', { style:{ display:'flex', flexWrap:'wrap', gap:7, justifyContent:'center', marginTop:20, maxWidth:460, margin:'20px auto 0' } },
                ['Build a 30-day business plan','Critique my idea ruthlessly','5 startup ideas for 2025','Midjourney prompt for neon sunset','Write a cold outreach message'].map(function(s) {
                  return React.createElement('button', { key:s, onClick:function(){setInput(s);if(inputRef.current)inputRef.current.focus()}, style:{ background:'rgba(18,16,42,0.6)', border:'1px solid '+H.bdr, borderRadius:16, padding:'5px 12px', color:H.sub, cursor:'pointer', fontSize:11 } }, s)
                })
              )
            )
          : null,
        msgs.map(function(m) { return React.createElement(Bubble, { key:m.id, m:m, rc:rc }) }),
        loading && streaming
          ? React.createElement('div', { style:{ display:'flex', gap:10, marginBottom:16, alignItems:'flex-start' } },
              React.createElement('div', { style:{ width:32, height:32, borderRadius:'50%', background:rc+'33', border:'1.5px solid '+rc, display:'flex', alignItems:'center', justifyContent:'center', color:rc, fontWeight:700, fontSize:13, flexShrink:0 } }, 'H'),
              React.createElement('div', { style:{ maxWidth:'78%', background:'rgba(12,10,26,0.75)', border:'1px solid '+rc+'30', borderRadius:'3px 14px 14px 14px', padding:'10px 14px', color:H.txt, fontSize:14, lineHeight:1.7, backdropFilter:'blur(12px)' }, dangerouslySetInnerHTML:{ __html: clean(streaming) } })
            )
          : null,
        loading && !streaming
          ? React.createElement('div', { style:{ display:'flex', gap:10, alignItems:'flex-start' } },
              React.createElement('div', { style:{ width:32, height:32, borderRadius:'50%', background:rc+'33', border:'1.5px solid '+rc, display:'flex', alignItems:'center', justifyContent:'center', color:rc, fontWeight:700, fontSize:13 } }, 'H'),
              React.createElement('div', { style:{ background:'rgba(12,10,26,0.75)', border:'1px solid '+rc+'30', borderRadius:'3px 14px 14px 14px', backdropFilter:'blur(12px)' } },
                React.createElement(Dots, { color:rc })
              )
            )
          : null,
        React.createElement('div', { ref:bottomRef })
      ),

      // WORKFLOW BAR
      wfSteps.length > 0
        ? React.createElement('div', { style:{ padding:'8px 14px', background:'rgba(8,6,22,0.75)', borderTop:'1px solid '+H.bdr, display:'flex', alignItems:'center', gap:10, backdropFilter:'blur(16px)' } },
            React.createElement('span', { style:{ color:H.sub, fontSize:12, flexShrink:0 } }, 'Step '+(wfStep+1)+'/'+wfSteps.length),
            React.createElement('div', { style:{ flex:1, background:'rgba(26,23,48,0.6)', borderRadius:4, height:4 } },
              React.createElement('div', { style:{ width:(wfStep/wfSteps.length*100)+'%', height:'100%', background:H.gBtn, borderRadius:4, transition:'width 0.4s' } })
            ),
            React.createElement('button', { style:btn(loading?'rgba(42,37,80,0.7)':H.gBtn, true), onClick:function(){
              if (wfStep >= wfSteps.length || loading) return
              var step = wfSteps[wfStep]
              var um = { id:uid(), role:'user', content:'Execute Step '+(wfStep+1)+': '+step }
              var nm = msgs.concat([um])
              setMsgs(nm); setLoading(true); setStreaming('')
              var sys = R.system + '\nExecute step '+(wfStep+1)+'/'+wfSteps.length+': '+step+'. Be detailed.'
              ask(nm.map(function(x){return{role:x.role==='user'?'user':'assistant',content:x.content}}), sys, function(p){setStreaming(p)})
              .then(function(final) {
                var next = wfStep+1; var done = next >= wfSteps.length
                var suffix = done ? '\n\nWorkflow complete!' : '\n\nNext: Step '+(next+1)+' - '+wfSteps[next]
                setMsgs(nm.concat([{id:uid(),role:'assistant',content:final+suffix}])); setStreaming('')
                if (!done) setWfStep(next); else { setWfSteps([]); setWfStep(0); setMode('chat') }
                setLoading(false)
              }).catch(function(err){ setMsgs(function(p){return p.concat([{id:uid(),role:'assistant',content:'Error: '+err.message}])}); setStreaming(''); setLoading(false) })
            }, disabled:loading }, loading?'Running...':'Execute Step '+(wfStep+1))
          )
        : null,

      // INPUT
      React.createElement('div', { style:{ padding:'10px 14px', borderTop:'1px solid '+H.bdr, background:'rgba(8,6,22,0.75)', flexShrink:0, backdropFilter:'blur(20px)' } },
        React.createElement('div', { style:{ display:'flex', gap:7, alignItems:'flex-end' } },
          React.createElement('textarea', {
            ref: inputRef,
            value: input,
            onChange: function(e){setInput(e.target.value)},
            onKeyDown: handleKey,
            placeholder: mode==='image'?'Describe your image...':mode==='agent'?'Enter a complex task...':mode==='workflow'&&wfSteps.length===0?'Enter your goal...':'Ask '+R.label+'...',
            rows: 1,
            style: { flex:1, background:'rgba(18,16,42,0.8)', border:'1.5px solid rgba(42,37,80,0.7)', borderRadius:12, padding:'10px 13px', color:H.txt, fontSize:14, resize:'none', fontFamily:'inherit', lineHeight:1.5, minHeight:44, maxHeight:120, transition:'border-color 0.2s' }
          }),
          mode==='workflow' && wfSteps.length===0
            ? React.createElement('button', { style:btn(H.gCool), onClick:function(){
                var goal = input.trim(); if(!goal) return; setInput('')
                var um = {id:uid(),role:'user',content:'Workflow Goal: '+goal}
                var nm = msgs.concat([um]); setMsgs(nm); setLoading(true); setStreaming('')
                ask([{role:'user',content:'Break into 3-5 numbered steps (list only): "'+goal+'"'}], R.system, function(p){setStreaming(p)})
                .then(function(plan){
                  var steps = plan.split('\n').filter(function(l){return /^\d+\./.test(l.trim())}).map(function(l){return l.replace(/^\d+\.\s*/,'').trim()})
                  if (!steps.length) { setMsgs(nm.concat([{id:uid(),role:'assistant',content:'Could not parse steps. Try rephrasing.'}])); setStreaming(''); setLoading(false); return }
                  setWfSteps(steps); setWfStep(0)
                  setMsgs(nm.concat([{id:uid(),role:'assistant',content:'Workflow Plan ('+steps.length+' steps):\n\n'+steps.map(function(s,i){return (i+1)+'. '+s}).join('\n')+'\n\nStep 1 ready - hit Execute!'}]))
                  setStreaming(''); setMode('workflow'); setLoading(false)
                }).catch(function(err){ setMsgs(nm.concat([{id:uid(),role:'assistant',content:'Error: '+err.message}])); setStreaming(''); setLoading(false) })
              }, disabled:loading||!input.trim() }, 'Plan')
            : null,
          React.createElement('button', { style:Object.assign({}, btn(loading?'rgba(42,37,80,0.7)':H.gBtn), {boxShadow:loading?'none':'0 0 16px rgba(249,115,22,0.35)'}), onClick:function(){send()}, disabled:loading||!input.trim() }, loading?'...':'Send'),
          React.createElement('button', { style:{ background:'rgba(18,16,42,0.8)', border:'1.5px solid rgba(42,37,80,0.7)', borderRadius:11, padding:'10px 13px', color:H.txt, cursor:'pointer', fontSize:13 } }, 'V')
        ),
        React.createElement('div', { style:{ textAlign:'center', marginTop:5, color:H.mut, fontSize:11 } }, R.label+' - Enter to send - 100% free')
      )
    ),

    // SETTINGS FAB
    React.createElement('button', { onClick:function(){setSettings(true)}, style:{ position:'fixed', bottom:18, right:18, background:'rgba(18,16,42,0.85)', border:'1px solid '+H.bdr, borderRadius:'50%', width:40, height:40, color:H.mut, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', zIndex:40 } }, 'S'),

    // SETTINGS MODAL
    settings
      ? React.createElement('div', { style:{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' }, onClick:function(){setSettings(false)} },
          React.createElement('div', { style:{ background:'rgba(12,10,26,0.97)', border:'1px solid '+H.bdr, borderRadius:16, padding:24, width:300, maxWidth:'90vw' }, onClick:function(e){e.stopPropagation()} },
            React.createElement('div', { style:{ fontWeight:800, fontSize:16, background:H.grad, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:14 } }, 'Settings'),
            React.createElement('div', { style:{ fontSize:12, color:H.sub, marginBottom:6 } }, 'Saved chats: '+chats.length),
            React.createElement('button', { style:Object.assign({},btn('#ef4444'),{width:'100%',justifyContent:'center'}), onClick:function(){setChats([]);setMsgs([]);setCid(null);setSettings(false)} }, 'Clear All History'),
            React.createElement('button', { style:Object.assign({},btn('rgba(42,37,80,0.8)'),{width:'100%',justifyContent:'center',marginTop:8}), onClick:function(){setSettings(false)} }, 'Close')
          )
        )
      : null
  )
}
