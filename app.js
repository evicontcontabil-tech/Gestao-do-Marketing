/* ====================================================
   EVICONT · Plataforma de Marketing — Application
   Persistência: window.storage (key/value local)
   ==================================================== */

/* ===================== CONSTANTES ===================== */
const STATUS_LIST = ['Não iniciado','Em andamento','Pausado','Concluído'];
const PRIO_LIST   = ['Alta','Média','Baixa'];
const AREA_LIST   = ['Conteúdo','Design','Vídeo','Estratégia','Análise'];
const TIPO_POST   = ['Carrossel','Reels','Story','Vídeo','Feed'];
const PLAT_LIST   = ['Instagram','TikTok','YouTube','LinkedIn'];
const STATUS_POST = ['Planejado','Em produção','Aprovado','Publicado'];
const CAT_IDEIA   = ['Carrossel','Reels','Stories','Vídeo YouTube','Campanha','Newsletter'];

/* ===================== ESTADO ===================== */
let state = {
  user: null,
  tasks: [],
  posts: [],
  ideas: [],
  calDate: new Date(),
  currentView: 'dashboard',
  editingTaskId: null,
  editingPostId: null,
  editingIdeaId: null,
};
let charts = {};

/* ===================== STORAGE ===================== */
const Storage = {
  hasClaudeStorage(){ return typeof window !== 'undefined' && window.storage && typeof window.storage.set === 'function'; },
  async list(prefix){
    if(this.hasClaudeStorage()) return await window.storage.list(prefix);
    const keys = [];
    for(let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i);
      if(k && k.startsWith(prefix)) keys.push(k);
    }
    return { keys };
  },
  async get(key){
    if(this.hasClaudeStorage()) return await window.storage.get(key);
    const value = localStorage.getItem(key);
    return value !== null ? { value } : null;
  },
  async set(key, value){
    if(this.hasClaudeStorage()) return await window.storage.set(key, value);
    localStorage.setItem(key, value);
    return { value };
  },
  async delete(key){
    if(this.hasClaudeStorage()) return await window.storage.delete(key);
    localStorage.removeItem(key);
    return { deleted: true };
  }
};

async function loadState(){
  try{
    // Carregar dados salvos no Storage
    const res = await Storage.list('evicont:');
    if(res && res.keys){
      for(const k of res.keys){
        try{
          const r = await Storage.get(k);
          if(r && r.value){
            const data = JSON.parse(r.value);
            if(k === 'evicont:user') state.user = data;
            if(k === 'evicont:tasks') state.tasks = data;
            if(k === 'evicont:posts') state.posts = data;
            if(k === 'evicont:ideas') state.ideas = data;
          }
        }catch(e){}
      }
    }

    // Se não houver dados no storage, tenta carregar do window.NOTION_DATA (importado via script)
    if(state.tasks.length === 0 && window.NOTION_DATA){
      state.tasks = window.NOTION_DATA.tasks || [];
      state.posts = window.NOTION_DATA.posts || [];
      state.ideas = window.NOTION_DATA.ideas || [];
    }

    if(state.user){
      showApp();
    }
  }catch(e){ console.warn('Load failed', e); }
}

async function saveKey(key, value){
  try{ await Storage.set('evicont:'+key, JSON.stringify(value)); }
  catch(e){ console.warn('Save failed', e); }
}

/* ===================== UTILS ===================== */
const uid = () => 't_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
const fmtDate = (d) => {
  if(!d) return '—';
  const dt = (d instanceof Date) ? d : new Date(d+'T00:00:00');
  return dt.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
};
const isoToday = () => new Date().toISOString().slice(0,10);
const diffDays = (target) => {
  if(!target) return null;
  const t = new Date(target+'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((t - today) / (1000*60*60*24));
};
function toast(msg, type='success'){
  const t = document.createElement('div');
  t.className = 'toast '+type;
  const icon = type==='success'
    ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  t.innerHTML = icon + '<span>'+msg+'</span>';
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2600);
}

/* ===================== LOGIN ===================== */
document.getElementById('loginForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const nome = document.getElementById('liNome').value.trim();
  if(!nome) return;
  state.user = {nome, role:'SOCIAL MEDIA', loggedAt: new Date().toISOString()};
  await saveKey('user', state.user);
  showApp();
  toast('Bem-vindo, '+nome.split(' ')[0]+'!');
});

function showApp(){
  document.getElementById('login').classList.add('hide');
  document.getElementById('app').classList.remove('hide');
  document.getElementById('userName').textContent = state.user.nome;
  document.getElementById('userAvatar').textContent = state.user.nome.charAt(0).toUpperCase();
  document.getElementById('dashName').textContent = state.user.nome.split(' ')[0];
  const d = new Date();
  document.getElementById('dashDate').textContent =
    d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  renderDashboard();
}

document.getElementById('logoutBtn').addEventListener('click', async ()=>{
  state.user = null;
  await saveKey('user', null);
  document.getElementById('app').classList.add('hide');
  document.getElementById('login').classList.remove('hide');
  document.getElementById('loginForm').reset();
});

/* ===================== NAV ===================== */
document.querySelectorAll('aside nav button[data-view]').forEach(btn=>{
  btn.addEventListener('click', ()=> switchView(btn.dataset.view));
});
document.querySelectorAll('[data-jump]').forEach(btn=>{
  btn.addEventListener('click', ()=> switchView(btn.dataset.jump));
});

function switchView(view){
  state.currentView = view;
  document.querySelectorAll('aside nav button[data-view]').forEach(b=>{
    b.classList.toggle('active', b.dataset.view===view);
  });
  document.querySelectorAll('main > section').forEach(s=>{
    s.classList.toggle('hide', s.id !== 'view-'+view);
  });
  if(view==='dashboard') renderDashboard();
  if(view==='tarefas') renderTasks();
  if(view==='calendario') renderCalendar();
  if(view==='ideias') renderIdeas();
  if(view==='relatorios') renderReports();
}

/* ===================== DASHBOARD ===================== */
function renderDashboard(){
  const tasks = state.tasks;
  const posts = state.posts;

  const total = tasks.length;
  const done = tasks.filter(t=>t.status==='Concluído').length;
  const andamento = tasks.filter(t=>t.status==='Em andamento').length;
  const atrasadas = tasks.filter(t=>{
    if(t.status==='Concluído') return false;
    const d = diffDays(t.prazo);
    return d!==null && d<0;
  }).length;
  const taxa = total>0 ? Math.round((done/total)*100) : 0;

  const stats = [
    {label:'Tarefas ativas', value: total-done, sub:`${done} concluídas no total`, accent:true},
    {label:'Em andamento', value: andamento, sub:`${atrasadas} em atraso`, trend: atrasadas>0?`${atrasadas} atrasada(s)`:'Tudo em dia', trendDown: atrasadas>0},
    {label:'Postagens agendadas', value: posts.filter(p=>p.status!=='Publicado').length, sub:`${posts.filter(p=>p.status==='Publicado').length} publicadas`},
    {label:'Taxa de conclusão', value: taxa, unit:'%', sub:'Sobre tudo registrado'},
  ];

  document.getElementById('dashStats').innerHTML = stats.map(s=>`
    <div class="stat-card ${s.accent?'accent':''}">
      ${!s.accent?'<div class="stat-bar"></div>':''}
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${s.value}${s.unit?`<sup>${s.unit}</sup>`:''}</div>
      <div class="stat-trend ${s.trendDown?'down':''}">${s.trend || s.sub}</div>
    </div>
  `).join('');

  // Próximos prazos
  const upcoming = tasks
    .filter(t=>t.status!=='Concluído' && t.prazo)
    .sort((a,b)=> new Date(a.prazo) - new Date(b.prazo))
    .slice(0, 6);

  const upcomingHtml = upcoming.length ? upcoming.map(t=>{
    const d = diffDays(t.prazo);
    const cls = d<0 ? 'atrasado' : (d===0 ? 'hoje' : 'ok');
    const label = d<0 ? `${Math.abs(d)}d atraso` : (d===0 ? 'Hoje' : `em ${d}d`);
    const dotCls = d<0 ? 'red' : (d===0 ? '' : (t.prioridade==='Alta'?'red':t.prioridade==='Média'?'gold':'green'));
    return `<div class="recent-item">
      <div class="dot ${dotCls}"></div>
      <div><div class="title">${esc(t.titulo)}</div><div class="meta">${esc(t.area||'—')} · ${fmtDate(t.prazo)}</div></div>
      <div class="pill">${esc(t.status)}</div>
      <div class="badge-dia ${cls}">${label}</div>
    </div>`;
  }).join('') : emptyMini('Sem prazos próximos','Crie tarefas com data de entrega para ver aqui.');
  document.getElementById('dashUpcoming').innerHTML = upcomingHtml;

  // Postagens da semana
  const today = new Date(); today.setHours(0,0,0,0);
  const end = new Date(today); end.setDate(end.getDate()+7);
  const weekPosts = posts
    .filter(p=>{
      if(!p.data) return false;
      const d = new Date(p.data+'T00:00:00');
      return d>=today && d<=end;
    })
    .sort((a,b)=> new Date(a.data) - new Date(b.data))
    .slice(0,6);

  const colorOf = t => {
    if(t==='Reels') return 'green';
    if(t==='Story') return 'gold';
    if(t==='Vídeo') return 'blue';
    return '';
  };
  const postsHtml = weekPosts.length ? weekPosts.map(p=>`
    <div class="recent-item">
      <div class="dot ${colorOf(p.tipo)}"></div>
      <div><div class="title">${esc(p.titulo)}</div><div class="meta">${esc(p.plataforma)} · ${esc(p.tipo)}</div></div>
      <div class="pill">${esc(p.status)}</div>
      <div class="badge-dia ok">${fmtDate(p.data)}</div>
    </div>
  `).join('') : emptyMini('Sem postagens nessa semana','Agende postagens no calendário.');
  document.getElementById('dashPosts').innerHTML = postsHtml;
}

function emptyMini(t,s){
  return `<div style="padding:24px 0;text-align:center;color:var(--muted)">
    <div style="font-family:'Instrument Serif',serif;font-size:18px;color:var(--ink);margin-bottom:4px">${t}</div>
    <div style="font-size:12px">${s}</div>
  </div>`;
}
const esc = s => String(s??'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

/* Inicialização */
window.addEventListener('DOMContentLoaded', loadState);

/* (Restante das funções de renderização omitidas para brevidade, mas devem ser mantidas no seu arquivo original) */
function renderTasks(){ console.log('Render Tasks'); }
function renderCalendar(){ console.log('Render Calendar'); }
function renderIdeas(){ console.log('Render Ideas'); }
function renderReports(){ console.log('Render Reports'); }
