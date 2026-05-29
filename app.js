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
  }catch(e){ console.warn('Load failed', e); }
}
async function saveKey(key, value){
  try{ await Storage.set('evicont:'+key, JSON.stringify(value)); }
  catch(e){ console.warn('Save failed', e); }
}
async function saveAll(){
  await Promise.all([
    state.user && saveKey('user', state.user),
    saveKey('tasks', state.tasks),
    saveKey('posts', state.posts),
    saveKey('ideas', state.ideas),
  ]);
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
const esc = s => String(s??'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

/* ===================== LOGIN ===================== */
document.getElementById('loginForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const nome = document.getElementById('liNome').value.trim();
  if(!nome) return;
  state.user = {nome, role:'Social Media', loggedAt: new Date().toISOString()};
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
  if(view==='relatorios') {
    renderReports();
    renderFunnel();
  }
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

  const upcoming = tasks.filter(t=>t.status!=='Concluído' && t.prazo).sort((a,b)=> new Date(a.prazo) - new Date(b.prazo)).slice(0, 6);
  document.getElementById('dashUpcoming').innerHTML = upcoming.length ? upcoming.map(t=>{
    const d = diffDays(t.prazo);
    const cls = d<0 ? 'atrasado' : (d===0 ? 'hoje' : 'ok');
    return `<div class="recent-item">
      <div class="dot ${d<0?'red':(t.prioridade==='Alta'?'red':'')}"></div>
      <div><div class="title">${esc(t.titulo)}</div><div class="meta">${esc(t.area||'—')} · ${fmtDate(t.prazo)}</div></div>
      <div class="badge-dia ${cls}">${d<0?`${Math.abs(d)}d atraso`:d===0?'Hoje':`em ${d}d`}</div>
    </div>`;
  }).join('') : '<p style="padding:20px;color:var(--muted)">Sem prazos próximos</p>';

  const today = new Date(); today.setHours(0,0,0,0);
  const weekPosts = posts.filter(p=>p.data && new Date(p.data+'T00:00:00') >= today).sort((a,b)=> new Date(a.data) - new Date(b.data)).slice(0,6);
  document.getElementById('dashPosts').innerHTML = weekPosts.length ? weekPosts.map(p=>`
    <div class="recent-item">
      <div class="dot"></div>
      <div><div class="title">${esc(p.titulo)}</div><div class="meta">${esc(p.plataforma)} · ${esc(p.tipo)}</div></div>
      <div class="badge-dia ok">${fmtDate(p.data)}</div>
    </div>
  `).join('') : '<p style="padding:20px;color:var(--muted)">Sem postagens agendadas</p>';
}

/* ===================== TAREFAS ===================== */
function renderTasks(){
  const search = (document.getElementById('taskSearch').value||'').toLowerCase();
  const fStatus = document.getElementById('taskStatusFilter').value;
  const fPrio = document.getElementById('taskPrioFilter').value;
  const fArea = document.getElementById('taskAreaFilter').value;

  let list = state.tasks.filter(t=>{
    if(fStatus && t.status!==fStatus) return false;
    if(fPrio && t.prioridade!==fPrio) return false;
    if(fArea && t.area!==fArea) return false;
    if(search && ![t.titulo,t.area,t.responsavel].join(' ').toLowerCase().includes(search)) return false;
    return true;
  });

  document.getElementById('taskCount').textContent = `${list.length} tarefas`;
  const rows = list.map(t=>{
    const d = diffDays(t.prazo);
    const statusClass = 'badge-status-'+({'Não iniciado':'nao','Em andamento':'andamento','Pausado':'pausado','Concluído':'concluido'}[t.status]||'nao');
    return `<tr data-id="${t.id}">
      <td><div class="task-title">${esc(t.titulo)}</div></td>
      <td>${esc(t.area||'—')}</td>
      <td>${esc(t.responsavel||'—')}</td>
      <td><span class="badge ${statusClass}">${esc(t.status)}</span></td>
      <td>${fmtDate(t.prazo)}</td>
      <td><div class="row-actions">
        <button data-act="edit">Editar</button>
        <button data-act="delete">Excluir</button>
      </div></td>
    </tr>`;
  }).join('');
  document.getElementById('taskTableWrap').innerHTML = `<table class="tasks"><thead><tr><th>Tarefa</th><th>Área</th><th>Resp.</th><th>Status</th><th>Prazo</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  
  document.querySelectorAll('table.tasks tbody tr').forEach(tr=>{
    const id = tr.dataset.id;
    tr.querySelector('[data-act=edit]').addEventListener('click', ()=> openTaskModal(id));
    tr.querySelector('[data-act=delete]').addEventListener('click', async ()=>{
      if(confirm('Excluir?')){ state.tasks = state.tasks.filter(x=>x.id!==id); await saveKey('tasks', state.tasks); renderTasks(); }
    });
  });
}
['taskSearch','taskStatusFilter','taskPrioFilter','taskAreaFilter'].forEach(id=>{
  document.getElementById(id).addEventListener('input', renderTasks);
});
document.getElementById('newTaskBtn').addEventListener('click', ()=> openTaskModal());

function openTaskModal(id=null){
  state.editingTaskId = id;
  const t = id ? state.tasks.find(x=>x.id===id) : {};
  const isNew = !id;
  const html = `<div class="modal-backdrop" id="taskModal"><div class="modal">
    <h3>${isNew?'Nova Tarefa':'Editar Tarefa'}</h3>
    <form id="taskForm">
      <input name="titulo" value="${esc(t.titulo||'')}" required placeholder="Título">
      <select name="status">${STATUS_LIST.map(s=>`<option ${t.status===s?'selected':''}>${s}</option>`).join('')}</select>
      <select name="area">${AREA_LIST.map(a=>`<option ${t.area===a?'selected':''}>${a}</option>`).join('')}</select>
      <input type="date" name="prazo" value="${t.prazo||''}">
      <button type="submit">Salvar</button>
      <button type="button" onclick="document.getElementById('taskModal').remove()">Cancelar</button>
    </form>
  </div></div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('taskForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    if(isNew) state.tasks.push({id: uid(), ...data});
    else { const idx = state.tasks.findIndex(x=>x.id===id); state.tasks[idx] = {...state.tasks[idx], ...data}; }
    await saveKey('tasks', state.tasks);
    document.getElementById('taskModal').remove();
    renderTasks();
  });
}

/* ===================== CALENDÁRIO ===================== */
document.getElementById('calPrev').addEventListener('click', ()=>{ state.calDate.setMonth(state.calDate.getMonth()-1); renderCalendar(); });
document.getElementById('calNext').addEventListener('click', ()=>{ state.calDate.setMonth(state.calDate.getMonth()+1); renderCalendar(); });
document.getElementById('calToday').addEventListener('click', ()=>{ state.calDate = new Date(); renderCalendar(); });

function renderCalendar(){
  const d = state.calDate;
  const year = d.getFullYear(), month = d.getMonth();
  document.getElementById('calMonth').textContent = d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  
  let grid = "";
  for(let i=0; i<firstDay; i++) grid += '<div class="cal-cell other"></div>';
  for(let day=1; day<=daysInMonth; day++){
    const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const evs = state.posts.filter(p=>p.data===iso);
    grid += `<div class="cal-cell" data-date="${iso}">
      <div class="num">${day}</div>
      <div class="events">${evs.map(e=>`<div class="ev">${esc(e.titulo)}</div>`).join('')}</div>
    </div>`;
  }
  document.getElementById('calGrid').innerHTML = grid;
  document.querySelectorAll('.cal-cell[data-date]').forEach(c=> c.addEventListener('click', ()=> openPostModal(null, c.dataset.date)));
}

function openPostModal(id=null, dataPre=null){
  const p = id ? state.posts.find(x=>x.id===id) : {};
  const html = `<div class="modal-backdrop" id="postModal"><div class="modal">
    <h3>Agendar Postagem</h3>
    <form id="postForm">
      <input name="titulo" value="${esc(p.titulo||'')}" required placeholder="Título">
      <input type="date" name="data" value="${p.data||dataPre||''}" required>
      <select name="tipo">${TIPO_POST.map(t=>`<option>${t}</option>`).join('')}</select>
      <button type="submit">Salvar</button>
      <button type="button" onclick="document.getElementById('postModal').remove()">Cancelar</button>
    </form>
  </div></div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('postForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    state.posts.push({id: uid(), ...data});
    await saveKey('posts', state.posts);
    document.getElementById('postModal').remove();
    renderCalendar();
  });
}

/* ===================== IDEIAS ===================== */
function renderIdeas(){
  const list = state.ideas;
  document.getElementById('ideasWrap').innerHTML = `<div class="ideas-grid">${list.map(i=>`
    <div class="idea-card">
      <span class="cat">${esc(i.categoria)}</span>
      <h4>${esc(i.titulo)}</h4>
      <p>${esc(i.descricao)}</p>
    </div>
  `).join('')}</div>`;
}
document.getElementById('newIdeaBtn').addEventListener('click', ()=> openIdeaModal());

function openIdeaModal(){
  const html = `<div class="modal-backdrop" id="ideaModal"><div class="modal">
    <h3>Nova Ideia</h3>
    <form id="ideaForm">
      <input name="titulo" required placeholder="Título">
      <textarea name="descricao" placeholder="Descrição"></textarea>
      <button type="submit">Salvar</button>
      <button type="button" onclick="document.getElementById('ideaModal').remove()">Cancelar</button>
    </form>
  </div></div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('ideaForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    state.ideas.push({id: uid(), ...Object.fromEntries(fd.entries()), criadoEm: new Date().toISOString()});
    await saveKey('ideas', state.ideas);
    document.getElementById('ideaModal').remove();
    renderIdeas();
  });
}

/* ===================== RELATÓRIOS & FUNIL ===================== */
function renderReports(){
  document.getElementById('insightStrip').innerHTML = `
    <div class="ig"><div class="label">Total Tarefas</div><div class="value">${state.tasks.length}</div></div>
    <div class="ig"><div class="label">Concluídas</div><div class="value">${state.tasks.filter(t=>t.status==='Concluído').length}</div></div>
  `;
}

function renderFunnel() {
  const tasks = state.tasks;
  const topo = tasks.filter(t => ['Conteúdo', 'Redes Sociais'].includes(t.area)).length;
  const meio = tasks.filter(t => ['Vídeo', 'Design'].includes(t.area)).length;
  const fundo = tasks.filter(t => ['Estratégia', 'Análise'].includes(t.area)).length;
  const conv1 = topo > 0 ? Math.round((meio / topo) * 100) : 0;
  const conv2 = meio > 0 ? Math.round((fundo / meio) * 100) : 0;
  
  document.getElementById('funnelWrap').innerHTML = `
    <div class="funnel-wrap">
      <div class="funnel-container">
        <div class="funnel-stage topo"><div class="funnel-info"><div class="val">${topo}</div></div><span>ATRAÇÃO</span><div class="conversion-rate">${conv1}% conv.</div></div>
        <div class="funnel-stage meio"><div class="funnel-info"><div class="val">${meio}</div></div><span>ENGAJAMENTO</span><div class="conversion-rate">${conv2}% conv.</div></div>
        <div class="funnel-stage fundo"><div class="funnel-info"><div class="val">${fundo}</div></div><span>CONVERSÃO</span></div>
      </div>
    </div>
  `;
  document.getElementById('strategyAdvice').innerHTML = `<div style="background:var(--orange-soft);padding:20px;border-radius:12px;border-left:4px solid var(--orange);">Análise: Equilíbrio de funil processado.</div>`;
}

/* ===================== INIT ===================== */
async function init(){
  await loadState();
  if(typeof window.NOTION_DATA !== 'undefined' && state.tasks.length === 0){
    state.tasks = window.NOTION_DATA.tasks || [];
    state.posts = window.NOTION_DATA.posts || [];
    state.ideas = window.NOTION_DATA.ideas || [];
    await saveAll();
  }
  if(state.user) showApp();
  else {
    // Fallback para demo se não houver login
    state.user = {nome: "Usuário Demo"};
    showApp();
  }
}
init();
