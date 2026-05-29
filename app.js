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

/* ===================== STORAGE =====================
   Camada de persistência com fallback automático:
   - Se window.storage existir (ambiente Claude), usa ele.
   - Senão, usa localStorage do navegador.
   Resultado: os dados ficam salvos no PC entre sessões.
================================================== */
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
  if(view==='relatorios') renderReports();
}

/* ===================== DASHBOARD ===================== */
function renderDashboard(){
  const tasks = state.tasks;
  const posts = state.posts;
  const ideas = state.ideas;

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
    if(t==='Carrossel') return '';
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
    if(search){
      const blob = [t.titulo,t.area,t.responsavel,t.meta,t.observacoes].join(' ').toLowerCase();
      if(!blob.includes(search)) return false;
    }
    return true;
  });
  list.sort((a,b)=>{
    if(a.status==='Concluído' && b.status!=='Concluído') return 1;
    if(b.status==='Concluído' && a.status!=='Concluído') return -1;
    const ad=a.prazo?new Date(a.prazo).getTime():Infinity;
    const bd=b.prazo?new Date(b.prazo).getTime():Infinity;
    return ad-bd;
  });

  document.getElementById('taskCount').textContent =
    `${list.length} tarefa${list.length!==1?'s':''} · ${state.tasks.length} no total`;

  if(list.length===0){
    document.getElementById('taskTableWrap').innerHTML = state.tasks.length===0
      ? `<div class="empty">
          <h4>Sem tarefas registradas ainda</h4>
          <p>Comece criando sua primeira demanda do marketing.</p>
          <button class="btn btn-primary" onclick="document.getElementById('newTaskBtn').click()">+ Criar primeira tarefa</button>
        </div>`
      : `<div class="empty"><h4>Nenhuma tarefa encontrada</h4><p>Tente ajustar os filtros.</p></div>`;
    return;
  }

  const rows = list.map(t=>{
    const d = diffDays(t.prazo);
    let dayHtml = '<span style="color:var(--muted)">—</span>';
    if(t.prazo){
      const cls = t.status==='Concluído' ? 'ok' : (d<0?'atrasado':d===0?'hoje':'ok');
      const label = t.status==='Concluído' ? 'Concluído' : (d<0?`${Math.abs(d)}d atraso`:d===0?'Hoje':`em ${d}d`);
      dayHtml = `<div style="display:flex;flex-direction:column;gap:2px"><div style="font-size:12px">${fmtDate(t.prazo)}</div><div class="badge-dia ${cls}" style="font-size:11px">${label}</div></div>`;
    }
    const statusClass = 'badge-status-'+({'Não iniciado':'nao','Em andamento':'andamento','Pausado':'pausado','Concluído':'concluido'}[t.status]||'nao');
    const prioClass = 'badge-prio-'+({'Alta':'alta','Média':'media','Baixa':'baixa'}[t.prioridade]||'media');

    return `<tr data-id="${t.id}">
      <td><div class="task-title">${esc(t.titulo)}</div>${t.meta?`<div class="task-sub">${esc(t.meta)}</div>`:''}</td>
      <td>${esc(t.area||'—')}</td>
      <td>${esc(t.responsavel||'—')}</td>
      <td><span class="badge ${statusClass}">${esc(t.status)}</span></td>
      <td><span class="badge ${prioClass}">${esc(t.prioridade||'Média')}</span></td>
      <td>${dayHtml}</td>
      <td><div class="row-actions">
        <button data-act="toggle" title="Concluir/Reabrir">
          ${t.status==='Concluído'
            ? '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>'
            : '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'}
        </button>
        <button data-act="edit" title="Editar"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button data-act="delete" title="Excluir"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg></button>
      </div></td>
    </tr>`;
  }).join('');

  document.getElementById('taskTableWrap').innerHTML = `
    <table class="tasks">
      <thead><tr>
        <th>Tarefa</th><th>Área</th><th>Resp.</th><th>Status</th>
        <th>Prioridade</th><th>Prazo</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  document.querySelectorAll('table.tasks tbody tr').forEach(tr=>{
    const id = tr.dataset.id;
    tr.querySelector('[data-act=edit]').addEventListener('click', ()=> openTaskModal(id));
    tr.querySelector('[data-act=toggle]').addEventListener('click', async ()=>{
      const t = state.tasks.find(x=>x.id===id);
      if(!t) return;
      if(t.status==='Concluído'){ t.status='Em andamento'; t.dataConclusao=null; }
      else { t.status='Concluído'; t.dataConclusao=isoToday(); }
      await saveKey('tasks', state.tasks);
      renderTasks();
      toast(t.status==='Concluído'?'Tarefa concluída ✓':'Tarefa reaberta');
    });
    tr.querySelector('[data-act=delete]').addEventListener('click', async ()=>{
      if(!confirm('Excluir esta tarefa?')) return;
      state.tasks = state.tasks.filter(x=>x.id!==id);
      await saveKey('tasks', state.tasks);
      renderTasks();
      toast('Tarefa excluída','success');
    });
  });
}
['taskSearch','taskStatusFilter','taskPrioFilter','taskAreaFilter'].forEach(id=>{
  document.getElementById(id).addEventListener('input', renderTasks);
});

document.getElementById('newTaskBtn').addEventListener('click', ()=> openTaskModal());
document.getElementById('quickTaskBtn').addEventListener('click', ()=> openTaskModal());

function openTaskModal(id=null){
  state.editingTaskId = id;
  const t = id ? state.tasks.find(x=>x.id===id) : {};
  const isNew = !id;

  const opt = (arr,sel) => arr.map(o=>`<option value="${esc(o)}" ${o===sel?'selected':''}>${esc(o)}</option>`).join('');

  const html = `
    <div class="modal-backdrop" id="taskModal">
      <div class="modal">
        <div class="modal-head">
          <div>
            <h3>${isNew?'Nova tarefa':'Editar tarefa'}</h3>
            <div class="sub">${isNew?'Registre uma demanda do marketing':'Atualize as informações desta demanda'}</div>
          </div>
          <button class="close" id="taskModalClose">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form id="taskForm">
          <div class="form-grid">
            <div class="form-field full"><label>Tarefa / Projeto *</label><input name="titulo" value="${esc(t.titulo||'')}" required></div>
            <div class="form-field"><label>Área</label><select name="area">${opt(['',...AREA_LIST], t.area||'')}</select></div>
            <div class="form-field"><label>Responsável</label><input name="responsavel" value="${esc(t.responsavel||state.user.nome)}"></div>
            <div class="form-field"><label>Status</label><select name="status">${opt(STATUS_LIST, t.status||'Não iniciado')}</select></div>
            <div class="form-field"><label>Prioridade</label><select name="prioridade">${opt(PRIO_LIST, t.prioridade||'Média')}</select></div>
            <div class="form-field"><label>Data de início</label><input type="date" name="dataInicio" value="${t.dataInicio||''}"></div>
            <div class="form-field"><label>Prazo</label><input type="date" name="prazo" value="${t.prazo||''}"></div>
            <div class="form-field full"><label>Meta / Objetivo</label><input name="meta" value="${esc(t.meta||'')}" placeholder="Qual o resultado esperado?"></div>
            <div class="form-field full"><label>Por que foi feita (importância)</label><textarea name="porque" placeholder="Contexto, motivo e relevância">${esc(t.porque||'')}</textarea></div>
            <div class="form-field full"><label>Contribuição / Impacto</label><textarea name="contribuicao" placeholder="Resultado, números ou impacto gerado">${esc(t.contribuicao||'')}</textarea></div>
            <div class="form-field"><label>Stakeholders</label><input name="stakeholders" value="${esc(t.stakeholders||'')}" placeholder="Quem precisa saber"></div>
            <div class="form-field"><label>Treinamentos / refs.</label><input name="treinamentos" value="${esc(t.treinamentos||'')}"></div>
            <div class="form-field full"><label>Feedback (link)</label><input name="feedback" value="${esc(t.feedback||'')}" placeholder="URL de print, doc ou conversa"></div>
            <div class="form-field full"><label>Observações</label><textarea name="observacoes">${esc(t.observacoes||'')}</textarea></div>
          </div>
          <div class="modal-foot">
            ${!isNew?`<button type="button" class="btn btn-danger-text" id="taskDeleteBtn">Excluir</button>`:''}
            <button type="button" class="btn btn-soft" id="taskCancelBtn">Cancelar</button>
            <button type="submit" class="btn btn-primary">${isNew?'Criar tarefa':'Salvar alterações'}</button>
          </div>
        </form>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  const close = ()=> document.getElementById('taskModal').remove();
  document.getElementById('taskModalClose').addEventListener('click', close);
  document.getElementById('taskCancelBtn').addEventListener('click', close);
  if(!isNew){
    document.getElementById('taskDeleteBtn').addEventListener('click', async ()=>{
      if(!confirm('Excluir esta tarefa?')) return;
      state.tasks = state.tasks.filter(x=>x.id!==id);
      await saveKey('tasks', state.tasks);
      close(); renderTasks(); toast('Tarefa excluída');
    });
  }
  document.getElementById('taskForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    if(isNew){
      const newT = {id: uid(), ...data, dataConclusao: data.status==='Concluído'?isoToday():null, criadoEm: new Date().toISOString()};
      state.tasks.push(newT);
    } else {
      const idx = state.tasks.findIndex(x=>x.id===id);
      const prev = state.tasks[idx];
      state.tasks[idx] = {...prev, ...data, dataConclusao: data.status==='Concluído' ? (prev.dataConclusao||isoToday()) : null};
    }
    await saveKey('tasks', state.tasks);
    close(); renderTasks(); renderDashboard();
    toast(isNew?'Tarefa criada ✓':'Tarefa atualizada ✓');
  });
}

/* ===================== CALENDÁRIO ===================== */
document.getElementById('calPrev').addEventListener('click', ()=>{
  state.calDate.setMonth(state.calDate.getMonth()-1); renderCalendar();
});
document.getElementById('calNext').addEventListener('click', ()=>{
  state.calDate.setMonth(state.calDate.getMonth()+1); renderCalendar();
});
document.getElementById('calToday').addEventListener('click', ()=>{
  state.calDate = new Date(); renderCalendar();
});
document.getElementById('newPostBtn').addEventListener('click', ()=> openPostModal());

function renderCalendar(){
  const d = state.calDate;
  const year = d.getFullYear(), month = d.getMonth();
  const monthName = d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  document.getElementById('calMonth').textContent = monthName.charAt(0).toUpperCase()+monthName.slice(1);

  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0=dom
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const daysPrev = new Date(year, month, 0).getDate();

  const today = new Date(); today.setHours(0,0,0,0);
  const cells = [];

  // prev month padding
  for(let i=startDay-1;i>=0;i--){
    const day = daysPrev-i;
    const date = new Date(year, month-1, day);
    cells.push({date, day, other:true});
  }
  // current month
  for(let day=1; day<=daysInMonth; day++){
    const date = new Date(year, month, day);
    cells.push({date, day, other:false, isToday: date.getTime()===today.getTime()});
  }
  // next month padding to complete 42 cells (6 weeks)
  const total = cells.length;
  const remaining = (Math.ceil(total/7)*7) - total;
  for(let i=1;i<=remaining;i++){
    const date = new Date(year, month+1, i);
    cells.push({date, day:i, other:true});
  }

  const grid = cells.map(c=>{
    const iso = c.date.toISOString().slice(0,10);
    const events = state.posts.filter(p=>p.data===iso);
    const evHtml = events.slice(0,3).map(p=>{
      const cls = 'tipo-'+(p.tipo||'').toLowerCase().replace('í','i').replace(/[^a-z]/g,'');
      return `<div class="ev ${cls}" title="${esc(p.titulo)} (${esc(p.plataforma)})">${esc(p.titulo)}</div>`;
    }).join('') + (events.length>3?`<div class="ev" style="background:var(--beige-2);border-color:var(--muted)">+${events.length-3} mais</div>`:'');
    return `<div class="cal-cell ${c.other?'other':''} ${c.isToday?'today':''}" data-date="${iso}">
      <div class="num">${c.day}</div>
      <div class="events">${evHtml}</div>
    </div>`;
  }).join('');
  document.getElementById('calGrid').innerHTML = grid;

  document.querySelectorAll('.cal-cell').forEach(cell=>{
    cell.addEventListener('click', ()=> openPostModal(null, cell.dataset.date));
  });
}

function openPostModal(id=null, dataPre=null){
  state.editingPostId = id;
  const p = id ? state.posts.find(x=>x.id===id) : {};
  const isNew = !id;
  const opt = (arr,sel) => arr.map(o=>`<option value="${esc(o)}" ${o===sel?'selected':''}>${esc(o)}</option>`).join('');

  // listar postagens da data se houver várias
  let dayPostsHtml = '';
  if(isNew && dataPre){
    const others = state.posts.filter(x=>x.data===dataPre);
    if(others.length){
      dayPostsHtml = `<div style="margin-bottom:20px;padding:14px;background:var(--beige);border-radius:10px">
        <div style="font-size:11px;letter-spacing:.16em;color:var(--muted);text-transform:uppercase;font-weight:600;margin-bottom:10px">${others.length} postagem(ns) já agendada(s) em ${fmtDate(dataPre)}</div>
        ${others.map(o=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px dashed var(--line)">
            <div style="font-size:13px"><strong>${esc(o.titulo)}</strong> <span style="color:var(--muted)">· ${esc(o.tipo)} · ${esc(o.plataforma)}</span></div>
            <button type="button" class="btn btn-soft" style="padding:4px 10px;font-size:11px" onclick="document.getElementById('postModal').remove(); openPostModal('${o.id}')">editar</button>
          </div>
        `).join('')}
      </div>`;
    }
  }

  const html = `
    <div class="modal-backdrop" id="postModal">
      <div class="modal">
        <div class="modal-head">
          <div>
            <h3>${isNew?'Agendar postagem':'Editar postagem'}</h3>
            <div class="sub">Calendário editorial da EVICONT</div>
          </div>
          <button class="close" id="postModalClose">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        ${dayPostsHtml}
        <form id="postForm">
          <div class="form-grid">
            <div class="form-field full"><label>Título da postagem *</label><input name="titulo" value="${esc(p.titulo||'')}" required placeholder="Ex: Carrossel Reforma Tributária"></div>
            <div class="form-field"><label>Data *</label><input type="date" name="data" value="${p.data||dataPre||''}" required></div>
            <div class="form-field"><label>Tipo</label><select name="tipo">${opt(TIPO_POST, p.tipo||'Carrossel')}</select></div>
            <div class="form-field"><label>Plataforma</label><select name="plataforma">${opt(PLAT_LIST, p.plataforma||'Instagram')}</select></div>
            <div class="form-field"><label>Status</label><select name="status">${opt(STATUS_POST, p.status||'Planejado')}</select></div>
            <div class="form-field full"><label>Legenda / descrição</label><textarea name="legenda" placeholder="Texto do post">${esc(p.legenda||'')}</textarea></div>
            <div class="form-field full"><label>Link / referência</label><input name="link" value="${esc(p.link||'')}" placeholder="URL do post publicado ou referência"></div>
          </div>
          <div class="modal-foot">
            ${!isNew?`<button type="button" class="btn btn-danger-text" id="postDeleteBtn">Excluir</button>`:''}
            <button type="button" class="btn btn-soft" id="postCancelBtn">Cancelar</button>
            <button type="submit" class="btn btn-primary">${isNew?'Agendar':'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  const close = ()=> document.getElementById('postModal').remove();
  document.getElementById('postModalClose').addEventListener('click', close);
  document.getElementById('postCancelBtn').addEventListener('click', close);
  if(!isNew){
    document.getElementById('postDeleteBtn').addEventListener('click', async ()=>{
      if(!confirm('Excluir esta postagem?')) return;
      state.posts = state.posts.filter(x=>x.id!==id);
      await saveKey('posts', state.posts);
      close(); renderCalendar(); toast('Postagem excluída');
    });
  }
  document.getElementById('postForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    if(isNew){
      state.posts.push({id: uid(), ...data, criadoEm: new Date().toISOString()});
    } else {
      const idx = state.posts.findIndex(x=>x.id===id);
      state.posts[idx] = {...state.posts[idx], ...data};
    }
    await saveKey('posts', state.posts);
    close(); renderCalendar(); renderDashboard();
    toast(isNew?'Postagem agendada ✓':'Postagem atualizada ✓');
  });
}

/* ===================== IDEIAS ===================== */
document.getElementById('newIdeaBtn').addEventListener('click', ()=> openIdeaModal());
document.getElementById('quickIdeiaBtn').addEventListener('click', ()=> openIdeaModal());
['ideaSearch','ideaCatFilter'].forEach(id=>{
  document.getElementById(id).addEventListener('input', renderIdeas);
});

function renderIdeas(){
  const search = (document.getElementById('ideaSearch').value||'').toLowerCase();
  const fCat = document.getElementById('ideaCatFilter').value;
  let list = state.ideas.filter(i=>{
    if(fCat && i.categoria!==fCat) return false;
    if(search){
      const blob = [i.titulo,i.descricao,i.categoria].join(' ').toLowerCase();
      if(!blob.includes(search)) return false;
    }
    return true;
  });
  list.sort((a,b)=> new Date(b.criadoEm||0) - new Date(a.criadoEm||0));
  document.getElementById('ideaCount').textContent = `${list.length} ideia${list.length!==1?'s':''} · ${state.ideas.length} no total`;

  if(list.length===0){
    document.getElementById('ideasWrap').innerHTML = state.ideas.length===0
      ? `<div class="empty">
          <h4>O banco de ideias está vazio</h4>
          <p>Registre aqui aquela pauta que pulou na sua cabeça antes que ela suma.</p>
          <button class="btn btn-primary" onclick="document.getElementById('newIdeaBtn').click()">+ Anotar primeira ideia</button>
        </div>`
      : `<div class="empty"><h4>Nenhuma ideia encontrada</h4><p>Tente outra busca.</p></div>`;
    return;
  }

  document.getElementById('ideasWrap').innerHTML = `<div class="ideas-grid">${list.map(i=>`
    <div class="idea-card" data-id="${i.id}">
      <span class="cat">${esc(i.categoria||'GERAL')}</span>
      <h4>${esc(i.titulo)}</h4>
      <p>${esc(i.descricao||'').slice(0,180)}${(i.descricao||'').length>180?'…':''}</p>
      <div class="ifoot">
        <span>${fmtDate(i.criadoEm)}</span>
        <div class="iactions">
          <button data-act="edit" title="Editar"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button data-act="toTask" title="Virar tarefa"><svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></button>
          <button data-act="del" title="Excluir"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg></button>
        </div>
      </div>
    </div>
  `).join('')}</div>`;

  document.querySelectorAll('.idea-card').forEach(card=>{
    const id = card.dataset.id;
    card.querySelector('[data-act=edit]').addEventListener('click', e=>{e.stopPropagation(); openIdeaModal(id);});
    card.querySelector('[data-act=del]').addEventListener('click', async e=>{
      e.stopPropagation();
      if(!confirm('Excluir esta ideia?')) return;
      state.ideas = state.ideas.filter(x=>x.id!==id);
      await saveKey('ideas', state.ideas);
      renderIdeas(); toast('Ideia excluída');
    });
    card.querySelector('[data-act=toTask]').addEventListener('click', async e=>{
      e.stopPropagation();
      const i = state.ideas.find(x=>x.id===id);
      if(!i) return;
      const newT = {
        id: uid(), titulo: i.titulo, area: 'Conteúdo', responsavel: state.user.nome,
        status:'Não iniciado', prioridade:'Média', meta: i.descricao,
        porque: 'Pauta originada do banco de ideias', criadoEm: new Date().toISOString()
      };
      state.tasks.push(newT);
      await saveKey('tasks', state.tasks);
      toast('Ideia virou tarefa ✓');
    });
    card.addEventListener('click', ()=> openIdeaModal(id));
  });
}

function openIdeaModal(id=null){
  state.editingIdeaId = id;
  const i = id ? state.ideas.find(x=>x.id===id) : {};
  const isNew = !id;
  const opt = (arr,sel) => arr.map(o=>`<option value="${esc(o)}" ${o===sel?'selected':''}>${esc(o)}</option>`).join('');

  const html = `
    <div class="modal-backdrop" id="ideaModal">
      <div class="modal">
        <div class="modal-head">
          <div>
            <h3>${isNew?'Nova ideia':'Editar ideia'}</h3>
            <div class="sub">Pauta para conteúdo futuro</div>
          </div>
          <button class="close" id="ideaModalClose">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form id="ideaForm">
          <div class="form-grid">
            <div class="form-field full"><label>Título da ideia *</label><input name="titulo" value="${esc(i.titulo||'')}" required></div>
            <div class="form-field full"><label>Categoria</label><select name="categoria">${opt(CAT_IDEIA, i.categoria||'Carrossel')}</select></div>
            <div class="form-field full"><label>Descrição</label><textarea name="descricao" placeholder="Gancho, ângulo da pauta, referências…" style="min-height:140px">${esc(i.descricao||'')}</textarea></div>
          </div>
          <div class="modal-foot">
            ${!isNew?`<button type="button" class="btn btn-danger-text" id="ideaDeleteBtn">Excluir</button>`:''}
            <button type="button" class="btn btn-soft" id="ideaCancelBtn">Cancelar</button>
            <button type="submit" class="btn btn-primary">${isNew?'Salvar ideia':'Atualizar'}</button>
          </div>
        </form>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  const close = ()=> document.getElementById('ideaModal').remove();
  document.getElementById('ideaModalClose').addEventListener('click', close);
  document.getElementById('ideaCancelBtn').addEventListener('click', close);
  if(!isNew){
    document.getElementById('ideaDeleteBtn').addEventListener('click', async ()=>{
      if(!confirm('Excluir esta ideia?')) return;
      state.ideas = state.ideas.filter(x=>x.id!==id);
      await saveKey('ideas', state.ideas);
      close(); renderIdeas(); toast('Ideia excluída');
    });
  }
  document.getElementById('ideaForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    if(isNew){
      state.ideas.push({id: uid(), ...data, criadoEm: new Date().toISOString()});
    } else {
      const idx = state.ideas.findIndex(x=>x.id===id);
      state.ideas[idx] = {...state.ideas[idx], ...data};
    }
    await saveKey('ideas', state.ideas);
    close(); renderIdeas(); toast(isNew?'Ideia salva ✓':'Ideia atualizada ✓');
  });
}

/* ===================== RELATÓRIOS ===================== */
document.getElementById('reportPeriod').addEventListener('change', renderReports);

function filterByPeriod(items, dateKey){
  const days = parseInt(document.getElementById('reportPeriod').value||'0');
  if(!days) return items;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-days);
  return items.filter(x=>{
    const v = x[dateKey] || x.criadoEm;
    if(!v) return true;
    return new Date(v) >= cutoff;
  });
}

function renderReports(){
  const tasks = filterByPeriod(state.tasks, 'criadoEm');
  const posts = filterByPeriod(state.posts, 'data');

  const total = tasks.length;
  const done = tasks.filter(t=>t.status==='Concluído').length;
  const taxa = total>0 ? Math.round((done/total)*100) : 0;

  // tempo médio de conclusão
  const concluded = tasks.filter(t=>t.dataInicio && t.dataConclusao);
  let avgDays = 0;
  if(concluded.length){
    const sum = concluded.reduce((s,t)=>{
      const d = (new Date(t.dataConclusao)-new Date(t.dataInicio))/(1000*60*60*24);
      return s + Math.max(0,d);
    },0);
    avgDays = (sum/concluded.length).toFixed(1);
  }

  document.getElementById('insightStrip').innerHTML = `
    <div class="ig"><div class="label">Tarefas no período</div><div class="value">${total}</div></div>
    <div class="ig"><div class="label">Concluídas</div><div class="value">${done}</div></div>
    <div class="ig"><div class="label">Taxa de conclusão</div><div class="value">${taxa}<span class="unit">%</span></div></div>
    <div class="ig"><div class="label">Tempo médio</div><div class="value">${avgDays}<span class="unit">dias</span></div></div>
  `;

  // chart cores
  const ORANGE = '#E8811A', INK = '#1A1A1A', GREEN = '#4A7C59', BLUE = '#3A6E8F', GOLD = '#C99A3F', RED = '#B8453A', MUTED = '#9B9389';
  const fontDefault = "'DM Sans', sans-serif";
  Chart.defaults.font.family = fontDefault;
  Chart.defaults.color = '#5C5448';

  // STATUS DONUT
  const statusCount = STATUS_LIST.map(s=> tasks.filter(t=>t.status===s).length);
  if(charts.status) charts.status.destroy();
  charts.status = new Chart(document.getElementById('chartStatus'), {
    type:'doughnut',
    data:{
      labels: STATUS_LIST,
      datasets:[{data: statusCount, backgroundColor:[MUTED, ORANGE, GOLD, GREEN], borderColor:'#FAF8F5', borderWidth:3}]
    },
    options:{
      cutout:'62%', plugins:{
        legend:{position:'bottom', labels:{padding:14, font:{size:11}, boxWidth:10, boxHeight:10}}
      },
      maintainAspectRatio:false
    }
  });

  // MONTHLY BAR (concluídas)
  const months = {};
  tasks.filter(t=>t.dataConclusao).forEach(t=>{
    const key = t.dataConclusao.slice(0,7);
    months[key] = (months[key]||0) + 1;
  });
  const sortedM = Object.keys(months).sort();
  const labels = sortedM.map(k=>{
    const [y,m] = k.split('-');
    return new Date(parseInt(y), parseInt(m)-1, 1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
  });
  if(charts.monthly) charts.monthly.destroy();
  charts.monthly = new Chart(document.getElementById('chartMonthly'), {
    type:'bar',
    data:{labels, datasets:[{data: sortedM.map(k=>months[k]), backgroundColor:ORANGE, borderRadius:6, barThickness:24}]},
    options:{
      plugins:{legend:{display:false}},
      scales:{
        y:{beginAtZero:true, ticks:{precision:0}, grid:{color:'#EFEAE2'}},
        x:{grid:{display:false}}
      },
      maintainAspectRatio:false
    }
  });

  // AREA BAR HORIZONTAL
  const areaCount = AREA_LIST.map(a=> tasks.filter(t=>t.area===a).length);
  if(charts.area) charts.area.destroy();
  charts.area = new Chart(document.getElementById('chartArea'), {
    type:'bar',
    data:{labels: AREA_LIST, datasets:[{data: areaCount, backgroundColor:[ORANGE, BLUE, GREEN, GOLD, RED], borderRadius:6}]},
    options:{
      indexAxis:'y',
      plugins:{legend:{display:false}},
      scales:{
        x:{beginAtZero:true, ticks:{precision:0}, grid:{color:'#EFEAE2'}},
        y:{grid:{display:false}}
      },
      maintainAspectRatio:false
    }
  });

  // POST TYPE PIE
  const typeCount = TIPO_POST.map(t=> posts.filter(p=>p.tipo===t).length);
  if(charts.postType) charts.postType.destroy();
  charts.postType = new Chart(document.getElementById('chartPostType'), {
    type:'pie',
    data:{
      labels: TIPO_POST,
      datasets:[{data: typeCount, backgroundColor:[ORANGE, GREEN, GOLD, BLUE, RED], borderColor:'#FAF8F5', borderWidth:3}]
    },
    options:{
      plugins:{legend:{position:'bottom', labels:{padding:14, font:{size:11}, boxWidth:10, boxHeight:10}}},
      maintainAspectRatio:false
    }
  });
}

/* ===================== EXPORTAR ===================== */
function downloadXlsx(filename, sheets){
  const wb = XLSX.utils.book_new();
  for(const [name, data] of Object.entries(sheets)){
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  XLSX.writeFile(wb, filename);
}

document.getElementById('exportTasksBtn').addEventListener('click', ()=>{
  if(state.tasks.length===0){ toast('Sem tarefas para exportar','error'); return; }
  const rows = state.tasks.map((t,i)=>({
    ID: i+1,
    'Tarefa / Projeto': t.titulo||'',
    'Responsável': t.responsavel||'',
    'Área': t.area||'',
    'Status': t.status||'',
    'Prioridade': t.prioridade||'',
    'Meta / Objetivo': t.meta||'',
    'Por que foi feita (importância)': t.porque||'',
    'Stakeholders': t.stakeholders||'',
    'Data de início': t.dataInicio||'',
    'Prazo': t.prazo||'',
    'Data de conclusão': t.dataConclusao||'',
    'Contribuição / Impacto': t.contribuicao||'',
    'Treinamentos': t.treinamentos||'',
    'Feedback (link)': t.feedback||'',
    'Observações': t.observacoes||'',
  }));
  downloadXlsx(`EVICONT_Tarefas_${isoToday()}.xlsx`, {'Registro de Trabalho': rows});
  toast('XLSX exportado ✓');
});

document.getElementById('exportPostsBtn').addEventListener('click', ()=>{
  if(state.posts.length===0){ toast('Sem postagens para exportar','error'); return; }
  const rows = state.posts.map((p,i)=>({
    ID: i+1, Data: p.data, Plataforma: p.plataforma, Tipo: p.tipo,
    Título: p.titulo, Status: p.status, Legenda: p.legenda||'', Link: p.link||''
  }));
  downloadXlsx(`EVICONT_Calendario_${isoToday()}.xlsx`, {'Postagens': rows});
  toast('XLSX exportado ✓');
});

document.getElementById('exportReportBtn').addEventListener('click', ()=>{
  const tasks = filterByPeriod(state.tasks, 'criadoEm');
  const posts = filterByPeriod(state.posts, 'data');
  const total = tasks.length;
  const done = tasks.filter(t=>t.status==='Concluído').length;
  const taxa = total>0 ? Math.round((done/total)*100) : 0;

  const resumo = [
    {Indicador:'Tarefas no período', Valor: total},
    {Indicador:'Concluídas', Valor: done},
    {Indicador:'Taxa de conclusão (%)', Valor: taxa},
    {Indicador:'Em andamento', Valor: tasks.filter(t=>t.status==='Em andamento').length},
    {Indicador:'Atrasadas', Valor: tasks.filter(t=>{if(t.status==='Concluído')return false; const d=diffDays(t.prazo); return d!==null && d<0;}).length},
    {Indicador:'Postagens no período', Valor: posts.length},
  ];
  const porStatus = STATUS_LIST.map(s=>({Status:s, Quantidade: tasks.filter(t=>t.status===s).length}));
  const porArea = AREA_LIST.map(a=>({Área:a, Quantidade: tasks.filter(t=>t.area===a).length}));
  const porTipo = TIPO_POST.map(t=>({Tipo:t, Quantidade: posts.filter(p=>p.tipo===t).length}));

  downloadXlsx(`EVICONT_Relatorio_${isoToday()}.xlsx`, {
    'Resumo': resumo,
    'Por status': porStatus,
    'Por área': porArea,
    'Postagens por tipo': porTipo,
  });
  toast('Relatório XLSX exportado ✓');
});

/* ===================== SEED & INIT ===================== */
async function maybeSeed(){
  // Só popula se o estado estiver vazio (primeira execução)
  if(state.tasks.length===0 && state.posts.length===0 && state.ideas.length===0){
    if(typeof window.NOTION_DATA !== 'undefined'){
      // Importa do arquivo data/notion-data.js
      state.tasks = window.NOTION_DATA.tasks || [];
      state.posts = window.NOTION_DATA.posts || [];
      state.ideas = window.NOTION_DATA.ideas || [];
      await saveAll();
      const total = state.tasks.length + state.posts.length + state.ideas.length;
      console.log(`✓ Importado do Notion: ${state.tasks.length} tarefas, ${state.posts.length} postagens, ${state.ideas.length} ideias (${total} itens)`);
      if(total > 0 && state.user){
        toast(`${total} itens importados do Notion ✓`);
      }
    }
  }
}

(async function init(){
  await loadState();
  if(state.user){
    showApp();
    await maybeSeed();
    renderDashboard();
  }
})();
