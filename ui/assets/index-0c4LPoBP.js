(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const a of i.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function n(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(o){if(o.ep)return;o.ep=!0;const i=n(o);fetch(o.href,i)}})();const v={API_BASE:"",WS_BASE:`${location.protocol==="https:"?"wss":"ws"}://${location.host}`,ENDPOINTS:{COMMAND:"/command",REPLY:"/reply",STREAM:"/stream"},HTTP_TIMEOUT:8e3,WS_RECONNECT_DELAY:1e3,WS_MAX_RECONNECTS:3,HEALTH_CHECK_INTERVAL:3e4,REPLY_TIMEOUT:12e4,MAX_COMMAND_HISTORY:20,MAX_JOBS_DISPLAY:50};class A extends Error{constructor(t,n,s=null){super(n),this.type=t,this.details=s}}const k={NETWORK:"NETWORK",TIMEOUT:"TIMEOUT",SERVER:"SERVER",NOT_FOUND:"NOT_FOUND",UNAVAILABLE:"UNAVAILABLE"};function F(e){var t,n;return e instanceof A?{type:e.type,message:e.message,details:e.details}:(e==null?void 0:e.name)==="AbortError"||(t=e==null?void 0:e.message)!=null&&t.includes("timeout")?{type:k.TIMEOUT,message:"Request timed out. The backend may be busy.",details:null}:(e==null?void 0:e.name)==="TypeError"&&((n=e==null?void 0:e.message)!=null&&n.includes("fetch"))?{type:k.NETWORK,message:"Cannot reach ARC backend. Is the daemon running?",details:null}:(e==null?void 0:e.status)===503?{type:k.UNAVAILABLE,message:"ARC backend is still booting. Try again in a few seconds.",details:null}:(e==null?void 0:e.status)===404?{type:k.NOT_FOUND,message:"Resource not found on the server.",details:null}:(e==null?void 0:e.status)>=500?{type:k.SERVER,message:"ARC backend encountered an internal error.",details:e.statusText}:{type:k.SERVER,message:(e==null?void 0:e.message)||"An unexpected error occurred.",details:null}}class V{constructor(){this.connected=!1,this.backendBooted=!1,this.useMocks=!1,this.checking=!1,this.token=localStorage.getItem("arc_token")||null,this._listeners=new Set}subscribe(t){return this._listeners.add(t),()=>this._listeners.delete(t)}_notify(){for(const t of this._listeners)try{t()}catch(n){console.error("AppState listener error:",n)}}setConnected(t){this.connected!==t&&(this.connected=t,this._notify())}setBackendBooted(t){this.backendBooted!==t&&(this.backendBooted=t,this._notify())}setUseMocks(t){this.useMocks!==t&&(this.useMocks=t,this._notify())}toggleMocks(){this.useMocks=!this.useMocks,this._notify()}setToken(t){this.token!==t&&(this.token=t,t?localStorage.setItem("arc_token",t):localStorage.removeItem("arc_token"),this._notify())}}const m=new V;async function T(e,t,n=null){const s=new AbortController,o=setTimeout(()=>s.abort(),v.HTTP_TIMEOUT);try{const i={"Content-Type":"application/json"};m.token&&(i.Authorization=`Bearer ${m.token}`);const a={method:e,headers:i,signal:s.signal};n&&(a.body=JSON.stringify(n));const u=`${v.API_BASE}${t}`,l=await fetch(u,a);if(!l.ok){l.status===401&&m.setToken(null);const d=await l.text().catch(()=>l.statusText);throw Object.assign(new Error(d),{status:l.status,statusText:l.statusText})}return await l.json()}catch(i){throw i.name==="AbortError"?new A(k.TIMEOUT,"Request timed out"):i}finally{clearTimeout(o)}}async function O(e){return T("POST",v.ENDPOINTS.COMMAND,{text:e,source:"controller",user:"user"})}async function L(e,t){return T("POST",`${v.ENDPOINTS.REPLY}/${e}`,{answer:t})}async function P(e,t){return T("POST","/pair",{code:e,device_name:t})}async function H(){const e=new AbortController,t=setTimeout(()=>e.abort(),v.HTTP_TIMEOUT);try{const n=`${v.API_BASE}/health`,o=await(await fetch(n,{method:"GET",signal:e.signal})).json().catch(()=>({status:"ok",booted:!0}));if(m.token&&o.booted)try{(await fetch(`${v.API_BASE}/jobs/health_check_ping`,{method:"GET",headers:{Authorization:`Bearer ${m.token}`},signal:e.signal})).status===401&&m.setToken(null)}catch{}return{status:"ok",booted:o.booted}}catch(n){throw n.name==="AbortError"?new A(k.TIMEOUT,"Health check timed out"):n}finally{clearTimeout(t)}}async function W(){return T("GET","/suggestions")}const J=Object.freeze(Object.defineProperty({__proto__:null,checkHealth:H,fetchSuggestions:W,pairDevice:P,sendCommand:O,sendReply:L},Symbol.toStringTag,{value:"Module"}));function z(){const e=document.createElement("div");e.id="connection-status";function t(){let n,s;m.useMocks&&!m.connected?(n="connection-status--mock",s="Mock Mode"):m.connected&&m.backendBooted?(n="connection-status--connected",s="Connected"):m.connected&&!m.backendBooted?(n="connection-status--mock",s="Booting..."):m.useMocks?(n="connection-status--mock",s="Mock Mode"):(n="connection-status--disconnected",s="Disconnected"),e.className=`connection-status ${n}`,e.innerHTML=`<span class="connection-status__dot"></span><span>${s}</span>`}return t(),m.subscribe(t),e}function Y(){const e=document.createElement("header");e.className="header",e.id="app-header",e.innerHTML=`
    <div class="header__brand">
      <div class="header__logo">ARC</div>
      <div>
        <div class="header__title">ARC Controller</div>
        <div class="header__subtitle">Remote Desktop Assistant</div>
      </div>
    </div>
    <div class="header__actions" id="header-actions"></div>
  `;const t=e.querySelector("#header-actions"),n=document.createElement("button");return n.className="mock-toggle",n.id="mock-toggle-btn",n.textContent="Mock Mode",n.addEventListener("click",()=>{m.toggleMocks(),n.classList.toggle("active",m.useMocks)}),t.appendChild(n),t.appendChild(z()),e}const K="modulepreload",G=function(e){return"/"+e},$={},U=function(t,n,s){let o=Promise.resolve();if(n&&n.length>0){let a=function(d){return Promise.all(d.map(r=>Promise.resolve(r).then(f=>({status:"fulfilled",value:f}),f=>({status:"rejected",reason:f}))))};document.getElementsByTagName("link");const u=document.querySelector("meta[property=csp-nonce]"),l=(u==null?void 0:u.nonce)||(u==null?void 0:u.getAttribute("nonce"));o=a(n.map(d=>{if(d=G(d),d in $)return;$[d]=!0;const r=d.endsWith(".css"),f=r?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${d}"]${f}`))return;const c=document.createElement("link");if(c.rel=r?"stylesheet":K,r||(c.as="script"),c.crossOrigin="",c.href=d,l&&c.setAttribute("nonce",l),document.head.appendChild(c),r)return new Promise((p,y)=>{c.addEventListener("load",p),c.addEventListener("error",()=>y(new Error(`Unable to preload CSS for ${d}`)))})}))}function i(a){const u=new Event("vite:preloadError",{cancelable:!0});if(u.payload=a,window.dispatchEvent(u),!u.defaultPrevented)throw a}return o.then(a=>{for(const u of a||[])u.status==="rejected"&&i(u.reason);return t().catch(i)})};class X{constructor(){this._jobs=new Map,this._activeJobId=null,this._listeners=new Set}subscribe(t){return this._listeners.add(t),()=>this._listeners.delete(t)}_notify(){for(const t of this._listeners)try{t()}catch(n){console.error("JobStore listener error:",n)}}createJob(t,n){const s={id:t,command:n,status:"waiting",events:[],createdAt:Date.now()/1e3,completedAt:null,needsInput:!1,pendingEventType:null};return this._jobs.set(t,s),this._activeJobId=t,this._notify(),s}addEvent(t,n){const s=this._jobs.get(t);if(s){switch(s.events.push(n),n.type){case"ack":s.status="running",s.needsInput=!1;break;case"clarify":s.needsInput=!0,s.pendingEventType="clarify";break;case"confirm":s.needsInput=!0,s.pendingEventType="confirm";break;case"executing":case"progress":case"verify":s.status="running",s.needsInput=!1;break;case"result":s.status="completed",s.completedAt=Date.now()/1e3,s.needsInput=!1,s.pendingEventType=null;break;case"error":s.status="failed",s.completedAt=Date.now()/1e3,s.needsInput=!1,s.pendingEventType=null;break}this._notify()}}markReplied(t){const n=this._jobs.get(t);n&&(n.needsInput=!1,n.pendingEventType=null,this._notify())}async replyToJob(t,n){const{sendReply:s}=await U(async()=>{const{sendReply:o}=await Promise.resolve().then(()=>J);return{sendReply:o}},void 0);await s(t,n),this.markReplied(t)}getJob(t){return this._jobs.get(t)||null}getActiveJob(){return this._activeJobId&&this._jobs.get(this._activeJobId)||null}getActiveJobId(){return this._activeJobId}getAllJobs(){return Array.from(this._jobs.values()).reverse()}isJobDone(t){const n=this._jobs.get(t);return n?n.status==="completed"||n.status==="failed":!0}hasActiveInput(){const t=this.getActiveJob();return(t==null?void 0:t.needsInput)??!1}clearAllJobs(){this._jobs.clear(),this._activeJobId=null,this._notify()}}const h=new X;function w(e,t){const n={type:t.type||"progress",message:t.message||"",data:t.data||{},timestamp:t.timestamp||Date.now()/1e3,id:`${e}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`};return h.addEvent(e,n),n}function D(e){const t={ack:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.3 4.3L6 11.6L2.7 8.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',clarify:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 6.2a1.5 1.5 0 0 1 2.8.6c0 1-1.3 1.4-1.3 1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="11" r="0.5" fill="currentColor"/></svg>',confirm:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L9.5 5.5H13.5L10.5 8L11.5 12.5L8 10L4.5 12.5L5.5 8L2.5 5.5H6.5L8 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',progress:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v4l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/></svg>',executing:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 2l8 6-8 6V2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',verify:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',result:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 8l2 2 3.5-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',error:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v4M8 11h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'};return t[e]||t.progress}function Z(e){return{ack:"Acknowledged",clarify:"Clarification Needed",confirm:"Confirmation Required",progress:"In Progress",executing:"Executing",verify:"Verifying",result:"Completed",error:"Error"}[e]||e}function Q(){var e;return((e=crypto.randomUUID)==null?void 0:e.call(crypto))??"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,t=>{const n=Math.random()*16|0;return(t==="x"?n:n&3|8).toString(16)})}function I(e){const t=Date.now()/1e3,n=Math.max(0,t-e);return n<5?"just now":n<60?`${Math.floor(n)}s ago`:n<3600?`${Math.floor(n/60)}m ago`:n<86400?`${Math.floor(n/3600)}h ago`:new Date(e*1e3).toLocaleDateString()}function _(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}function ee(e,t){const n=[],s=/https?:\/\/[^\s"'<>]+/gi;if(typeof e=="string"){const o=e.match(s);o&&n.push(...o)}if(t){const i=JSON.stringify(t).match(s);i&&n.push(...i);for(const a of["file","file_url","download_url","path","attachment"])t[a]&&typeof t[a]=="string"&&n.push(t[a])}return[...new Set(n)]}function te(e,t){const n=Q();let s=!1;const o=[];function i(f,c){const p=setTimeout(()=>{s||t(c)},f);o.push(p)}const a=e.toLowerCase(),u=a.includes("find")||a.includes("search")||a.includes("which"),l=a.includes("delete")||a.includes("send")||a.includes("remove"),d=a.includes("fail")||a.includes("error")||a.includes("crash");let r=0;return r+=300,i(r,{type:"ack",message:`Command received: "${e}"`,data:{},timestamp:(Date.now()+r)/1e3}),u?(r+=1200,i(r,{type:"clarify",message:`Multiple matches found. Which file do you mean?
1. resume_2024.pdf
2. resume_draft.docx
3. resume_final.pdf`,data:{options:["resume_2024.pdf","resume_draft.docx","resume_final.pdf"]},timestamp:(Date.now()+r)/1e3}),{jobId:n,cancel:()=>{s=!0,o.forEach(clearTimeout)}}):l?(r+=800,i(r,{type:"progress",message:"Preparing action...",data:{},timestamp:(Date.now()+r)/1e3}),r+=1e3,i(r,{type:"confirm",message:`This will perform a destructive action: "${e}". Proceed?`,data:{action:e},timestamp:(Date.now()+r)/1e3}),{jobId:n,cancel:()=>{s=!0,o.forEach(clearTimeout)}}):d?(r+=800,i(r,{type:"executing",message:"Attempting to execute...",data:{},timestamp:(Date.now()+r)/1e3}),r+=1500,i(r,{type:"error",message:"Execution failed: simulated error for testing purposes.",data:{error_code:"MOCK_FAILURE"},timestamp:(Date.now()+r)/1e3}),{jobId:n,cancel:()=>{s=!0,o.forEach(clearTimeout)}}):(r+=600,i(r,{type:"executing",message:`Executing: ${e}`,data:{},timestamp:(Date.now()+r)/1e3}),r+=1200,i(r,{type:"progress",message:"Action in progress...",data:{progress:50},timestamp:(Date.now()+r)/1e3}),r+=800,i(r,{type:"verify",message:"Verifying outcome...",data:{},timestamp:(Date.now()+r)/1e3}),r+=700,i(r,{type:"result",message:`Successfully executed: "${e}". Action completed and verified.`,data:{verified:!0,elapsed_ms:r},timestamp:(Date.now()+r)/1e3}),{jobId:n,cancel:()=>{s=!0,o.forEach(clearTimeout)}})}function j(e,t,n){let s=0;s+=500,setTimeout(()=>n({type:"executing",message:`Proceeding with: "${t}"`,data:{},timestamp:(Date.now()+s)/1e3}),s),s+=1200,setTimeout(()=>n({type:"verify",message:"Verifying outcome...",data:{},timestamp:(Date.now()+s)/1e3}),s),s+=800,setTimeout(()=>n({type:"result",message:`Action completed with selection: "${t}". Verified successfully.`,data:{selection:t,verified:!0},timestamp:(Date.now()+s)/1e3}),s)}function ne(e,t){const n=document.createElement("div");n.className="clarify-prompt",n.innerHTML=`
    <div class="clarify-prompt__label">Your Response</div>
    <div class="clarify-prompt__input-row">
      <input type="text" class="clarify-prompt__input" placeholder="Type your answer..." id="clarify-input-${e}" autocomplete="off" />
      <button class="clarify-prompt__submit" id="clarify-submit-${e}">Send</button>
    </div>
  `;const s=n.querySelector(`#clarify-input-${e}`),o=n.querySelector(`#clarify-submit-${e}`);async function i(){const a=s.value.trim();if(a){o.disabled=!0,s.disabled=!0,o.textContent="Sending...";try{m.useMocks?j(e,a,u=>w(e,u)):await L(e,a),t==null||t(a)}catch(u){o.disabled=!1,s.disabled=!1,o.textContent="Retry",console.error("Failed to send reply:",u)}}}return o.addEventListener("click",i),s.addEventListener("keydown",a=>{a.key==="Enter"&&i()}),requestAnimationFrame(()=>s.focus()),n}function se(e,t,n={}){const s=document.createElement("div");s.className="confirm-prompt";const o=n.data||{};let i="";o.filename&&o.recipient&&(i=`
      <div class="confirm-prompt__details">
        <div class="confirm-prompt__detail">
          <span class="confirm-prompt__detail-label">File:</span>
          <span class="confirm-prompt__detail-value">${_(o.filename)}</span>
        </div>
        <div class="confirm-prompt__detail">
          <span class="confirm-prompt__detail-label">To:</span>
          <span class="confirm-prompt__detail-value">${_(o.recipient)}</span>
        </div>
      </div>
    `),s.innerHTML=`
    <div class="confirm-prompt__label">Action Required</div>
    ${i}
    <div class="confirm-prompt__actions">
      <button class="confirm-prompt__btn confirm-prompt__btn--yes" id="confirm-yes-${e}">✓ Yes, Proceed</button>
      <button class="confirm-prompt__btn confirm-prompt__btn--no" id="confirm-no-${e}">✕ Cancel</button>
    </div>
  `;const a=s.querySelector(`#confirm-yes-${e}`),u=s.querySelector(`#confirm-no-${e}`);async function l(r){a.disabled=!0,u.disabled=!0;try{m.useMocks?j(e,r,f=>w(e,f)):await L(e,r),t==null||t(r)}catch(f){a.disabled=!1,u.disabled=!1,console.error("Failed to send confirmation:",f)}}a.addEventListener("click",()=>l("yes")),u.addEventListener("click",()=>l("no"));function d(r){(r.key==="y"||r.key==="Y")&&(l("yes"),document.removeEventListener("keydown",d)),(r.key==="n"||r.key==="N")&&(l("no"),document.removeEventListener("keydown",d))}return document.addEventListener("keydown",d),s}function oe(e){var o;const t=document.createElement("a");t.className="file-download",t.href=e,t.target="_blank",t.rel="noopener noreferrer";const n=e.split("/"),s=((o=n[n.length-1])==null?void 0:o.split("?")[0])||"Download File";return t.innerHTML=`
    <span class="file-download__icon">📥</span>
    <span>${s}</span>
  `,t}function ie(e,t,n,s=!1){var c,p,y;const o=document.createElement("div");o.className=`event-card event-card--${e.type}`,o.id=`event-${e.id}`;const i=e.data&&Object.keys(e.data).length>0,a=ee(e.message,e.data),u=e.type==="result"||e.type==="error";if(e.type==="executing"||e.type==="progress"||e.type==="verify"){const b=((c=e.data)==null?void 0:c.step)||0,g=((p=e.data)==null?void 0:p.total_steps)||4;(y=e.data)!=null&&y.stage||e.type;const S=g>0?Math.round(b/g*100):0;o.innerHTML=`
      <div class="event-card__step-row">
        <div class="event-card__step-indicator event-card__step-indicator--${e.type}">
          <div class="event-card__step-icon">${D(e.type)}</div>
        </div>
        <div class="event-card__step-body">
          <span class="event-card__step-label">${_(e.message)}</span>
          ${g>0?`
            <div class="event-card__step-bar">
              <div class="event-card__step-bar-fill" style="width:${S}%"></div>
            </div>
            <span class="event-card__step-meta">Step ${b} of ${g}</span>
          `:""}
        </div>
      </div>
    `}else if(u){const b=ae(e),g=b?re(e):null;o.innerHTML=`
      <div class="event-card__chat-message">${B(e.message)}</div>
      ${b&&g?ce(g):""}
      ${i&&!b?`
        <div class="event-card__data-toggle" data-expanded="false">
          ▸ Details
        </div>
        <div class="event-card__data" style="display:none">
${JSON.stringify(e.data,null,2)}
        </div>
      `:""}
      <div class="event-card__time">${I(e.timestamp)}</div>
      <div class="event-card__attachments" id="attachments-${e.id}"></div>
      <div class="event-card__prompt" id="prompt-${e.id}"></div>
    `}else o.innerHTML=`
      <div class="event-card__header-row">
        <div class="event-card__icon">${D(e.type)}</div>
        <div class="event-card__type">${Z(e.type)}</div>
      </div>
      <div class="event-card__chat-message">${B(e.message)}</div>
      <div class="event-card__time">${I(e.timestamp)}</div>
      <div class="event-card__attachments" id="attachments-${e.id}"></div>
      <div class="event-card__prompt" id="prompt-${e.id}"></div>
    `;const d=o.querySelector(".event-card__data-toggle");d&&d.addEventListener("click",()=>{const b=o.querySelector(".event-card__data"),g=d.dataset.expanded==="true";d.dataset.expanded=String(!g),d.textContent=g?"▸ Details":"▾ Hide details",b.style.display=g?"none":"block"});const r=o.querySelector(`#attachments-${e.id}`);r&&a.length>0&&a.forEach(b=>{r.appendChild(oe(b))});const f=o.querySelector(`#prompt-${e.id}`);return f&&(s&&e.type==="clarify"?f.appendChild(ne(t,n)):s&&e.type==="confirm"&&f.appendChild(se(t,n,e))),o}function ae(e){if(e.type!=="result")return!1;const t=e.data||{};return(t.interpreted_action||"")==="search_file"||!!(t.path||t.filename)}function re(e){const t=e.data||{},n=t.path||t.filename||"";if(!n)return null;const s=n.replace(/\\/g,"/").split("/"),o=s[s.length-1]||n,i=o.includes(".")?o.split(".").pop().toLowerCase():"";return{filename:o,path:n,ext:i,icon:{pdf:"📕",doc:"📄",docx:"📄",txt:"📝",md:"📝",py:"🐍",js:"🟨",ts:"🔷",html:"🌐",css:"🎨",jpg:"🖼️",jpeg:"🖼️",png:"🖼️",gif:"🖼️",svg:"🖼️",mp3:"🎵",wav:"🎵",mp4:"🎬",mov:"🎬",zip:"📦",rar:"📦",tar:"📦",gz:"📦",xlsx:"📊",csv:"📊",json:"📋",xml:"📋",pptx:"📊",key:"📊"}[i]||"📄",folder:s.slice(0,-1).join("/")}}function ce(e){return`
    <div class="event-card__file-preview">
      <div class="event-card__file-icon">${e.icon}</div>
      <div class="event-card__file-details">
        <div class="event-card__file-name">${_(e.filename)}</div>
        <div class="event-card__file-path">${_(e.folder)}</div>
      </div>
      <div class="event-card__file-ext">.${_(e.ext)}</div>
    </div>
  `}function B(e){if(!e)return"";let t=_(e);return t=t.replace(/\n/g,"<br>"),t}let E=null,N=0;const le=300*1e3;async function de(){var e;if(m.connected&&m.token&&!m.useMocks){const t=Date.now();if(E&&t-N<le)return E;try{const{fetchSuggestions:n}=await U(async()=>{const{fetchSuggestions:o}=await Promise.resolve().then(()=>J);return{fetchSuggestions:o}},void 0),s=await n();if((e=s==null?void 0:s.suggestions)!=null&&e.length)return E=s.suggestions.slice(0,6),N=t,E}catch(n){console.warn("Could not fetch suggestions from backend:",n)}}return ue()}function ue(){const e=new Date().getHours(),t=[];e>=5&&e<12?t.push({cmd:"good morning",icon:"☀️",label:"Good morning"},{cmd:"read my emails",icon:"📧",label:"Check emails"},{cmd:"read the news",icon:"📰",label:"Today's news"}):e>=12&&e<17?t.push({cmd:"take a screenshot",icon:"📸",label:"Screenshot"},{cmd:"what time is it",icon:"🕐",label:"Check time"},{cmd:"search my emails",icon:"📧",label:"Search emails"}):e>=17&&e<22?t.push({cmd:"play some music",icon:"🎵",label:"Play music"},{cmd:"get battery level",icon:"🔋",label:"Battery"},{cmd:"lock screen",icon:"🔒",label:"Lock screen"}):t.push({cmd:"good night",icon:"🌙",label:"Good night"},{cmd:"lock screen",icon:"🔒",label:"Lock screen"},{cmd:"sleep",icon:"😴",label:"Sleep Mac"}),t.push({cmd:"open chrome",icon:"🌐",label:"Open Chrome"},{cmd:"find my files",icon:"📁",label:"Find files"},{cmd:"volume up",icon:"🔊",label:"Volume up"},{cmd:"what can you do",icon:"💡",label:"Help"},{cmd:"send an email",icon:"✉️",label:"Send email"},{cmd:"create a file",icon:"📄",label:"New file"});const n=t.slice(0,3),s=t.slice(3).sort(()=>Math.random()-.5).slice(0,3);return[...n,...s]}function me(e,t){return!e||!t?!1:Math.abs(e-t)>300}function pe(e){if(!e)return"";const t=new Date(e*1e3),n=new Date,s=t.toDateString()===n.toDateString(),o=new Date(n);o.setDate(o.getDate()-1);const i=t.toDateString()===o.toDateString(),a=t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});return s?`Today at ${a}`:i?`Yesterday at ${a}`:`${t.toLocaleDateString([],{month:"short",day:"numeric"})} at ${a}`}function fe(e){const t=document.createElement("div");t.id="event-timeline";async function n(){const s=h.getAllJobs();if(s.length===0){const l=await de();t.innerHTML=`
        <div class="empty-state">
          <div class="empty-state__icon">⚡</div>
          <h2 class="empty-state__title">Ready to Command</h2>
          <p class="empty-state__desc">
            Type a natural language command below to control your desktop remotely.
          </p>
          <div class="empty-state__hints" id="hint-buttons">
            ${(Array.isArray(l)?l:[]).map(d=>`
              <button class="empty-state__hint" data-cmd="${_(d.cmd)}">
                <span class="empty-state__hint-icon">${d.icon}</span>
                <span>${_(d.label)}</span>
              </button>
            `).join("")}
          </div>
        </div>
      `,t.querySelectorAll(".empty-state__hint").forEach(d=>{d.addEventListener("click",()=>{const r=document.getElementById("command-input-field");r&&(r.value=d.dataset.cmd,r.focus(),r.dispatchEvent(new Event("input")))})});return}const o=document.createDocumentFragment(),i=document.createElement("div");i.className="timeline__clear-row",i.innerHTML=`
      <button class="timeline__clear-btn" id="clear-history-btn" title="Clear conversation history">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <path d="M2 4h12M5.3 4V2.7a.7.7 0 0 1 .7-.7h4a.7.7 0 0 1 .7.7V4M6.5 7v4.5M9.5 7v4.5M3.5 4l.7 9.3a1.4 1.4 0 0 0 1.4 1.2h4.8a1.4 1.4 0 0 0 1.4-1.2L12.5 4"/>
        </svg>
        Clear
      </button>
    `,o.appendChild(i);const a=[...s].reverse();a.forEach((l,d)=>{if(d>0){const c=a[d-1];if(me(c.createdAt,l.createdAt)){const p=document.createElement("div");p.className="job-separator",p.innerHTML=`
            <div class="job-separator__line"></div>
            <span class="job-separator__text">${pe(l.createdAt)}</span>
            <div class="job-separator__line"></div>
          `,o.appendChild(p)}}const r=document.createElement("div");r.className="chat-bubble chat-bubble--user",r.innerHTML=`
        <div class="chat-bubble__content">
          <div class="chat-bubble__text">${_(l.command)}</div>
          <div class="chat-bubble__meta">${he(l.createdAt)}</div>
        </div>
        <div class="chat-bubble__avatar chat-bubble__avatar--user">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
      `,o.appendChild(r);const f=l.events.filter(c=>c.type!=="ack");if(f.length===0&&l.status==="running"){const c=document.createElement("div");c.className="chat-bubble chat-bubble--arc",c.innerHTML=`
          <div class="chat-bubble__avatar chat-bubble__avatar--arc">
            <span>A</span>
          </div>
          <div class="chat-bubble__content">
            <div class="chat-typing">
              <div class="chat-typing__dot"></div>
              <div class="chat-typing__dot"></div>
              <div class="chat-typing__dot"></div>
            </div>
          </div>
        `,o.appendChild(c)}else if(f.forEach((c,p)=>{const b=p===f.length-1&&l.needsInput&&(c.type==="clarify"||c.type==="confirm"),g=document.createElement("div");g.className=`chat-bubble chat-bubble--arc chat-bubble--${c.type}`;const S=ie(c,l.id,q=>{h.markReplied(l.id),e==null||e(l.id,q)},b);g.innerHTML=`
            <div class="chat-bubble__avatar chat-bubble__avatar--arc">
              <span>A</span>
            </div>
          `;const M=document.createElement("div");M.className="chat-bubble__content",M.appendChild(S),g.appendChild(M),o.appendChild(g)}),l.status==="running"&&!l.needsInput){const c=document.createElement("div");c.className="chat-bubble chat-bubble--arc",c.innerHTML=`
            <div class="chat-bubble__avatar chat-bubble__avatar--arc">
              <span>A</span>
            </div>
            <div class="chat-bubble__content">
              <div class="chat-typing">
                <div class="chat-typing__dot"></div>
                <div class="chat-typing__dot"></div>
                <div class="chat-typing__dot"></div>
              </div>
            </div>
          `,o.appendChild(c)}}),t.innerHTML="",t.appendChild(o);const u=t.querySelector("#clear-history-btn");u&&u.addEventListener("click",()=>{h.clearAllJobs?h.clearAllJobs():(h._jobs.clear(),h._activeJobId=null,h._notify())}),requestAnimationFrame(()=>{const l=document.getElementById("main-content");l&&(l.scrollTop=l.scrollHeight)})}return n(),h.subscribe(n),t}function he(e){return e?new Date(e*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}function ge(e){const t=document.createElement("div");t.className="command-input-wrapper",t.innerHTML=`
    <div class="command-input" id="command-input-container" style="display:flex; gap:0.5rem;">
      <button class="command-input__mic" id="command-mic-btn" title="Voice Input" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;padding:0.5rem;display:flex;align-items:center;justify-content:center;">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="22"/>
        </svg>
      </button>
      <input
        type="text"
        class="command-input__field"
        id="command-input-field"
        placeholder="Type or speak a command..."
        autocomplete="off"
        spellcheck="false"
        style="flex:1;"
      />
      <button class="command-input__send" id="command-send-btn" title="Send Command" style="background:none;border:none;color:var(--accent-color);cursor:pointer;padding:0.5rem;display:flex;align-items:center;justify-content:center;">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>
      </button>
    </div>
  `;const n=t.querySelector("#command-input-field"),s=t.querySelector("#command-send-btn");let o=!1;const i=[];let a=-1;async function u(){const c=n.value.trim();if(!c||o)return;const p=h.getActiveJob();if(p&&p.needsInput){o=!0,n.disabled=!0;try{await h.replyToJob(p.id,c),n.value=""}catch(y){console.error("Failed to reply to job:",y)}finally{o=!1,n.disabled=!1,n.focus()}return}i.unshift(c),i.length>20&&i.pop(),a=-1,o=!0,s.disabled=!0,n.disabled=!0;try{await e(c),n.value=""}catch(y){console.error("Command failed:",y)}finally{o=!1,s.disabled=!1,n.disabled=!1,n.focus()}}const l=t.querySelector("#command-mic-btn");let d=null,r=!1;const f=window.SpeechRecognition||window.webkitSpeechRecognition;return f?(d=new f,d.continuous=!1,d.interimResults=!0,d.onresult=c=>{let p="";for(let y=c.resultIndex;y<c.results.length;y++)p+=c.results[y][0].transcript;n.value=p},d.onend=()=>{r=!1,l.style.color="var(--text-secondary)",n.value.trim()&&u()},d.onerror=c=>{console.error("Speech recognition error:",c),r=!1,l.style.color="var(--text-secondary)"},l.addEventListener("click",()=>{r?d.stop():(n.value="",d.start(),r=!0,l.style.color="var(--error-color)")})):l.style.display="none",s.addEventListener("click",u),n.addEventListener("keydown",c=>{c.key==="Enter"&&!c.shiftKey&&(c.preventDefault(),u()),c.key==="ArrowUp"&&i.length>0&&(c.preventDefault(),a=Math.min(a+1,i.length-1),n.value=i[a]),c.key==="ArrowDown"&&(c.preventDefault(),a=Math.max(a-1,-1),n.value=a>=0?i[a]:"")}),h.subscribe(()=>{const c=h.getActiveJob();(c==null?void 0:c.needsInput)??!1?(n.placeholder=`Reply to: ${c.pendingEventType==="confirm"?"Confirm Action":"Clarification Request"}...`,t.querySelector(".command-input").style.borderColor="var(--accent-orange)"):(n.placeholder="Type a command... (e.g., open chrome, find resume.txt)",t.querySelector(".command-input").style.borderColor="var(--border-default)")}),t}function ye(e,t={}){const{onEvent:n,onError:s,onClose:o,onOpen:i}=t;let a=null,u=0,l=!1,d=!1;function r(){if(l)return;const f=`${v.WS_BASE}${v.ENDPOINTS.STREAM}/${e}`;a=new WebSocket(f),a.onopen=()=>{d=!0,u=0,i==null||i()},a.onmessage=c=>{try{const p=JSON.parse(c.data);n==null||n(p),(p.type==="result"||p.type==="error")&&(l=!0,d=!1)}catch(p){s==null||s(new Error(`Failed to parse event: ${p.message}`))}},a.onerror=c=>{s==null||s(new Error("WebSocket connection error"))},a.onclose=c=>{if(d=!1,l){o==null||o({clean:!0});return}if(u<v.WS_MAX_RECONNECTS){u++;const p=v.WS_RECONNECT_DELAY*Math.pow(2,u-1);setTimeout(r,p)}else l=!0,o==null||o({clean:!1,reason:"Max reconnection attempts reached"})}}return r(),{close(){l=!0,d=!1,a&&a.readyState<=WebSocket.OPEN&&a.close()},isConnected(){return d}}}const R=new Map;async function ve(e){return m.useMocks?_e(e):be(e)}async function be(e){try{const t=await O(e);if(!(t!=null&&t.job_id)){const o=`direct-${Date.now()}`;h.createJob(o,e),w(o,{type:(t==null?void 0:t.status)==="completed"?"result":"error",message:(t==null?void 0:t.final_result)||"The backend did not return a job id.",data:t||{},timestamp:Date.now()/1e3});return}const n=t.job_id;h.createJob(n,e);const s=ye(n,{onEvent(o){w(n,o)},onError(o){console.error(`WS error for job ${n}:`,o)},onClose({clean:o,reason:i}){R.delete(n),o||(console.warn(`WS closed unexpectedly for job ${n}: ${i}`),h.isJobDone(n)||w(n,{type:"error",message:`Connection lost: ${i||"Unknown"}. The command may still be running on the server.`,data:{},timestamp:Date.now()/1e3}))}});R.set(n,s)}catch(t){const n=`local-${Date.now()}`;if(h.createJob(n,e),t.status===503)w(n,{type:"error",message:"ARC runtime is still loading (initializing models and actions). This can take 30-60 seconds on first start. Please try again shortly, or use Mock Mode to test the UI.",data:{error_type:"BOOTING",hint:"The server is running but the AI pipeline is still initializing."},timestamp:Date.now()/1e3});else{const s=F(t);w(n,{type:"error",message:s.message,data:{error_type:s.type,details:s.details},timestamp:Date.now()/1e3})}}}function _e(e){const{jobId:t}=te(e,n=>{w(t,n)});h.createJob(t,e)}function ke(e,t){console.log(`Reply sent for job ${e}: "${t}"`)}function we(){const e=document.getElementById("app");if(!e)return;e.innerHTML="",e.appendChild(Y());const t=document.createElement("main");t.className="main-content",t.id="main-content",t.appendChild(fe(ke)),e.appendChild(t),e.appendChild(ge(ve))}function Ee(){const e=document.getElementById("app");e.innerHTML=`
    <div class="pairing-screen" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;padding:2rem;">
      <h1 style="font-size:2rem;margin-bottom:1rem;color:var(--text-primary);">Pair ARC Device</h1>
      <p style="text-align:center;color:var(--text-secondary);margin-bottom:2rem;">Enter the 6-digit code shown on your ARC desktop terminal to connect.</p>
      
      <input type="text" id="pairing-code" placeholder="000000" maxlength="6" style="font-size:2rem;text-align:center;letter-spacing:0.5rem;padding:1rem;border-radius:12px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);width:100%;max-width:300px;margin-bottom:1rem;" />
      <input type="text" id="device-name" placeholder="Device Name (e.g. My iPhone)" style="padding:1rem;border-radius:12px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);width:100%;max-width:300px;margin-bottom:2rem;" />
      
      <button id="pair-btn" style="background:var(--accent-color);color:white;border:none;padding:1rem 2rem;border-radius:12px;font-size:1.1rem;font-weight:600;cursor:pointer;width:100%;max-width:300px;">Connect</button>
      <div id="pair-error" style="color:var(--error-color);margin-top:1rem;height:1.5rem;font-weight:500;"></div>
    </div>
  `;const t=document.getElementById("pair-btn"),n=document.getElementById("pairing-code"),s=document.getElementById("device-name"),o=document.getElementById("pair-error");t.addEventListener("click",async()=>{const i=n.value.trim();let a=s.value.trim();if(!i||i.length!==6){o.textContent="Please enter a valid 6-digit code.";return}a||(a="Mobile Device");try{t.disabled=!0,t.textContent="Connecting...",o.textContent="";const u=await P(i,a);u.token&&m.setToken(u.token)}catch(u){console.error("Pairing failed:",u),o.textContent="Pairing failed: Invalid code or server unreachable."}finally{t.disabled=!1,t.textContent="Connect"}})}let C=null;async function x(){try{const e=await H();if(m.setConnected(!0),m.setBackendBooted(e.booted===!0),e.booted&&m.useMocks){m.setUseMocks(!1);const t=document.getElementById("mock-toggle-btn");t&&t.classList.remove("active"),console.log("ARC backend is ready — switching to live mode.")}}catch{m.setConnected(!1),m.setBackendBooted(!1)}}async function Ce(){await x(),(!m.connected||!m.backendBooted)&&(m.setUseMocks(!0),m.connected?console.log("ARC backend still booting — mock mode enabled until ready."):console.log("ARC backend not reachable — mock mode enabled."));let e=null;function t(){const s=!m.token;s&&e!=="pairing"?(Ee(),e="pairing"):!s&&e!=="main"&&(we(),e="main")}t(),m.subscribe(t);const n=document.getElementById("mock-toggle-btn");n&&n.classList.toggle("active",m.useMocks),C=setInterval(x,v.HEALTH_CHECK_INTERVAL),document.addEventListener("visibilitychange",()=>{document.hidden?(clearInterval(C),C=null):(x(),C=setInterval(x,v.HEALTH_CHECK_INTERVAL))}),console.log("ARC Controller initialized.")}document.addEventListener("DOMContentLoaded",Ce);
