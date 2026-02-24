// ═══════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════
const STORAGE_KEY = 'disciplina-60day-v3';
const CAT_COLORS  = ['#00d4ff','#f5b942','#a78bfa','#22d59b','#f87171','#fb923c','#94a3b8'];
const DAY_COUNT   = 60;

let appData = null;   // { startDate: ISO, days: { [1..60]: { tasks:[] } } }
let activeDay = 1;
let chartInstance = null;
let currentChart = 'bar';

// ─── INIT ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupNavigation();
  setupDayNav();
  setupChartTabs();
});

// ─── STORAGE ────────────────────────────────────────────
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      appData = JSON.parse(raw);
    } else {
      appData = { startDate: new Date().toISOString(), days: {} };
      saveData();
    }
  } catch(e) {
    appData = { startDate: new Date().toISOString(), days: {} };
  }
  renderAll();
}

function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(appData)); }
  catch(e) { showToast('Saqlashda xato! ⚠️'); }
}

// ─── HELPERS ────────────────────────────────────────────
function currentDayNumber() {
  const start = new Date(appData.startDate);
  const now   = new Date();
  const diff  = Math.floor((now - start) / 86400000) + 1;
  return Math.min(Math.max(diff, 1), 60);
}

function getDayTasks(d) {
  return appData.days[d]?.tasks || [];
}

function getDayStatus(d) {
  const tasks = getDayTasks(d);
  if (!tasks.length) return 'empty';
  const done = tasks.filter(t => t.done).length;
  if (done === tasks.length) return 'complete';
  if (done > 0) return 'partial';
  return 'pending';
}

function uid() { return Math.random().toString(36).slice(2,9); }

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 2600);
}

// ─── NAVIGATION ─────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      const viewId = 'view-' + btn.dataset.view;
      document.getElementById(viewId).classList.add('active');
      if (btn.dataset.view === 'day') { activeDay = currentDayNumber(); renderDayView(); }
      if (btn.dataset.view === 'analytics') renderAnalytics();
    });
  });
}

function switchToDay(d) {
  activeDay = d;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelector('[data-view="day"]').classList.add('active');
  document.getElementById('view-day').classList.add('active');
  renderDayView();
}

// ─── RENDER ALL ─────────────────────────────────────────
function renderAll() {
  const cur = currentDayNumber();
  document.getElementById('hdr-day').textContent = cur;
  renderGrid();
}

// ─── GRID ────────────────────────────────────────────────
function renderGrid() {
  const cur = currentDayNumber();
  const grid = document.getElementById('days-grid');
  grid.innerHTML = '';
  for (let d = 1; d <= DAY_COUNT; d++) {
    const status  = getDayStatus(d);
    const isToday = d === cur;
    const isFuture= d > cur;
    const tasks   = getDayTasks(d);
    const done    = tasks.filter(t => t.done).length;

    const btn = document.createElement('button');
    btn.className = 'day-cell';
    if (isToday) btn.classList.add('today');
    if (isFuture) btn.classList.add('future');
    if (status !== 'empty' && status !== 'pending') btn.classList.add(status);
    if (status === 'pending') btn.classList.add('pending');

    btn.innerHTML = `
      <span class="dn">${d}</span>
      ${tasks.length ? `<span class="dc">${done}/${tasks.length}</span>` : ''}
    `;

    if (!isFuture) btn.addEventListener('click', () => switchToDay(d));
    grid.appendChild(btn);
  }
}

// ─── DAY VIEW ────────────────────────────────────────────
function setupDayNav() {
  document.getElementById('btn-prev').addEventListener('click', () => {
    if (activeDay > 1) { activeDay--; renderDayView(); }
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    if (activeDay < 60) { activeDay++; renderDayView(); }
  });
}

function renderDayView() {
  const cur = currentDayNumber();
  document.getElementById('day-title').textContent = `Kun ${activeDay}`;
  document.getElementById('today-tag').style.display = (activeDay === cur) ? '' : 'none';
  document.getElementById('btn-prev').disabled = activeDay <= 1;
  document.getElementById('btn-next').disabled = activeDay >= 60;
  renderTaskList();
}

function renderTaskList() {
  const tasks = getDayTasks(activeDay);
  const listEl = document.getElementById('task-list');
  listEl.innerHTML = '';

  if (!tasks.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="ei">📋</div>
        <p>Hali vazifa yo'q. Quyidagi tugma bilan qo'shing!</p>
      </div>`;
  } else {
    tasks.forEach(task => {
      const card = document.createElement('div');
      card.className = 'task-card' + (task.done ? ' done' : '');
      card.innerHTML = `
        <button class="cb${task.done?' checked':''}" onclick="toggleTask('${task.id}')">${task.done ? '✓' : ''}</button>
        <div class="task-info">
          <span class="task-name${task.done?' done':''}">${escHtml(task.name)}</span>
          ${task.desc ? `<span class="task-desc">${escHtml(task.desc)}</span>` : ''}
          <div class="task-meta">
            <span class="task-cat">${task.cat}</span>
            <span class="task-time">⏱ ${task.time} daqiqa</span>
          </div>
        </div>
        <button class="del-btn" onclick="deleteTask('${task.id}')" title="O'chirish">✕</button>
      `;
      listEl.appendChild(card);
    });
  }
  renderSummary();
}

function renderSummary() {
  const tasks = getDayTasks(activeDay);
  const sumCard = document.getElementById('summary-card');
  if (!tasks.length) { sumCard.style.display = 'none'; return; }
  sumCard.style.display = '';
  const done     = tasks.filter(t => t.done).length;
  const total    = tasks.length;
  const pct      = Math.round(done / total * 100);
  const doneTime = tasks.filter(t => t.done).reduce((s,t) => s + (+t.time||0), 0);
  const totalTime= tasks.reduce((s,t) => s + (+t.time||0), 0);

  document.getElementById('sum-done').textContent = `${done}/${total}`;
  document.getElementById('sum-bar').style.width   = pct + '%';
  document.getElementById('sum-pct').textContent   = pct + '%';
  document.getElementById('sum-time').textContent  = `${doneTime}d`;
  document.getElementById('sum-time').title         = `Jami: ${totalTime} daqiqa`;
}

// ─── TASK ACTIONS ────────────────────────────────────────
function openForm() {
  document.getElementById('add-form').style.display = '';
  document.getElementById('add-main-btn').style.display = 'none';
  document.getElementById('inp-name').focus();
}

function closeForm() {
  document.getElementById('add-form').style.display = 'none';
  document.getElementById('add-main-btn').style.display = '';
  document.getElementById('inp-name').value = '';
  document.getElementById('inp-desc').value = '';
  document.getElementById('inp-time').value = 30;
}

function submitTask() {
  const name = document.getElementById('inp-name').value.trim();
  if (!name) { showToast('Vazifa nomini kiriting! ⚠️'); return; }
  const task = {
    id: uid(),
    name,
    desc: document.getElementById('inp-desc').value.trim(),
    cat:  document.getElementById('inp-cat').value,
    time: +document.getElementById('inp-time').value || 30,
    done: false,
    createdAt: new Date().toISOString()
  };
  if (!appData.days[activeDay]) appData.days[activeDay] = { tasks: [] };
  appData.days[activeDay].tasks.push(task);
  saveData();
  closeForm();
  renderTaskList();
  renderGrid();
  showToast('Vazifa qo\'shildi! ✅');
}

// Enter key submit
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('add-form').style.display !== 'none') {
    submitTask();
  }
});

function toggleTask(taskId) {
  const dayData = appData.days[activeDay];
  if (!dayData) return;
  const task = dayData.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.done = !task.done;
  task.doneAt = task.done ? new Date().toISOString() : null;
  saveData();
  renderTaskList();
  renderGrid();
}

function deleteTask(taskId) {
  const dayData = appData.days[activeDay];
  if (!dayData) return;
  dayData.tasks = dayData.tasks.filter(t => t.id !== taskId);
  saveData();
  renderTaskList();
  renderGrid();
  showToast('O\'chirildi 🗑️');
}

// ─── ANALYTICS ───────────────────────────────────────────
const CATS = ['📚 O\'qish','💪 Sport','💼 Ish','🎯 Maqsad','🧘 Salomatlik','🎨 Kreativ','🔧 Boshqa'];

function computeStats() {
  const catMap = {};
  CATS.forEach(c => { catMap[c] = { time: 0, count: 0, done: 0 }; });
  const dayProgress = [];
  let totalTasks=0, doneTasks=0, totalTime=0, doneTime=0, activeDays=0;

  for (let d = 1; d <= 60; d++) {
    const tasks = getDayTasks(d);
    if (tasks.length) activeDays++;
    let dt=0, dd=0;
    tasks.forEach(t => {
      const c = t.cat || CATS[6];
      if (!catMap[c]) catMap[c] = {time:0, count:0, done:0};
      catMap[c].count++; catMap[c].time += +t.time||0;
      if (t.done) { catMap[c].done++; dd++; dt += +t.time||0; }
      totalTasks++; totalTime += +t.time||0;
      if (t.done) { doneTasks++; doneTime += +t.time||0; }
    });
    if (tasks.length) dayProgress.push({ day: `K${d}`, time: dt, done: dd, total: tasks.length });
  }

  const catData = Object.entries(catMap)
    .filter(([,v]) => v.count > 0)
    .map(([name, v]) => ({
      name, shortName: name.split(' ').slice(1).join(' '),
      time: v.time, count: v.count, done: v.done,
      rate: v.count ? Math.round(v.done / v.count * 100) : 0
    }))
    .sort((a,b) => b.time - a.time);

  return { catData, dayProgress, totalTasks, doneTasks, totalTime, doneTime, activeDays };
}

function renderAnalytics() {
  const { catData, dayProgress, totalTasks, doneTasks, totalTime, doneTime, activeDays } = computeStats();

  // Stats cards
  const sg = document.getElementById('stats-grid');
  const overallPct = totalTasks ? Math.round(doneTasks/totalTasks*100) : 0;
  sg.innerHTML = [
    { label:'Faol kunlar', val: activeDays, sub:`/ 60 kun`, color:'#00d4ff' },
    { label:'Bajarilgan', val: doneTasks, sub:`/ ${totalTasks} vazifa`, color:'#22d59b' },
    { label:'Sarflangan vaqt', val: Math.round(doneTime/60)+'s', sub:`/ ${Math.round(totalTime/60)} soat`, color:'#f5b942' },
    { label:'Umumiy foiz', val: overallPct+'%', sub:'bajarildi', color:'#a78bfa' },
  ].map(s => `
    <div class="stat-card" style="border-top-color:${s.color}">
      <span class="sv" style="color:${s.color}">${s.val}</span>
      <span class="ss">${s.sub}</span>
      <span class="sk">${s.label}</span>
    </div>
  `).join('');

  if (!catData.length) {
    document.getElementById('analytics-empty').style.display = '';
    document.getElementById('analytics-content').style.display = 'none';
    return;
  }

  document.getElementById('analytics-empty').style.display = 'none';
  document.getElementById('analytics-content').style.display = '';

  renderChart(currentChart, catData, dayProgress);
  renderTable(catData);
  renderInsights(catData);
}

function setupChartTabs() {
  document.querySelectorAll('.chart-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentChart = btn.dataset.chart;
      const { catData, dayProgress } = computeStats();
      renderChart(currentChart, catData, dayProgress);
    });
  });
}

function renderChart(type, catData, dayProgress) {
  const canvas = document.getElementById('main-chart');
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  const gridColor = 'rgba(26,45,71,0.6)';
  const tickColor = '#4a6280';
  const tooltipBg = '#0c1829';

  Chart.defaults.color = tickColor;

  if (type === 'bar') {
    chartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: catData.map(c => c.shortName),
        datasets: [{
          label: 'Vaqt (daqiqa)',
          data: catData.map(c => c.time),
          backgroundColor: CAT_COLORS.slice(0, catData.length).map(c => c+'bb'),
          borderColor: CAT_COLORS.slice(0, catData.length),
          borderWidth: 1, borderRadius: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: tooltipBg, borderColor: '#1a2d47', borderWidth: 1,
            callbacks: { label: ctx => `${ctx.parsed.y} daqiqa (${Math.round(ctx.parsed.y/60*10)/10} soat)` }
          }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: tickColor, maxRotation: 30 } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor } }
        }
      }
    });
  } else if (type === 'line') {
    chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: dayProgress.map(d => d.day),
        datasets: [{
          label: 'Vaqt (daqiqa)',
          data: dayProgress.map(d => d.time),
          borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,0.08)',
          borderWidth: 2, fill: true, tension: 0.4,
          pointBackgroundColor: '#00d4ff', pointRadius: 3,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: tooltipBg, borderColor: '#1a2d47', borderWidth: 1 }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: tickColor, maxTicksLimit: 12 } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor } }
        }
      }
    });
  } else if (type === 'pie') {
    chartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: catData.map(c => c.shortName),
        datasets: [{
          data: catData.map(c => c.time),
          backgroundColor: CAT_COLORS.slice(0, catData.length).map(c => c+'cc'),
          borderColor: CAT_COLORS.slice(0, catData.length),
          borderWidth: 1, hoverOffset: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '55%',
        plugins: {
          legend: { position: 'right', labels: { color: tickColor, boxWidth: 12, padding: 14, font:{size:12} } },
          tooltip: {
            backgroundColor: tooltipBg, borderColor: '#1a2d47', borderWidth: 1,
            callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} daq (${ctx.formattedValue}%)` }
          }
        }
      }
    });
  }
}

function renderTable(catData) {
  const tbody = document.getElementById('analytics-table');
  tbody.innerHTML = catData.map((row, i) => {
    const isTop = i === 0;
    const isLow = i === catData.length - 1 && catData.length > 1;
    const barColor = row.rate > 70 ? '#22d59b' : row.rate > 40 ? '#f5b942' : '#f87171';
    return `
      <tr>
        <td>${row.name}</td>
        <td style="color:#00d4ff; font-family:'JetBrains Mono',monospace">
          ${row.time} daq <span style="color:#4a6280; font-size:11px">(${Math.round(row.time/60*10)/10} soat)</span>
        </td>
        <td>${row.count}</td>
        <td style="color:#22d59b">${row.done}</td>
        <td>
          <div class="mini-bar">
            <div class="mini-bar-bg"><div class="mini-bar-fill" style="width:${row.rate}%; background:${barColor}"></div></div>
            <span style="color:#8da1bc; font-size:11px; font-family:'JetBrains Mono',monospace">${row.rate}%</span>
          </div>
        </td>
        <td>
          <span class="badge ${isTop?'top':isLow?'low':'normal'}">
            ${isTop ? '🔥 Eng ko\'p' : isLow ? '⚠️ Kam' : 'Normal'}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

function renderInsights(catData) {
  const ig = document.getElementById('insights-grid');
  const best = catData.reduce((b,c) => c.rate > b.rate ? c : b, catData[0]);
  const items = [
    { icon:'🔥', title:"Eng ko'p vaqt", val: catData[0].name, sub:`${catData[0].time} daqiqa (${Math.round(catData[0].time/60*10)/10} soat)`, border:'#00d4ff' },
    catData.length > 1 ? { icon:'⚠️', title:"Kam e'tibor", val: catData[catData.length-1].name, sub:`Faqat ${catData[catData.length-1].time} daqiqa`, border:'#f87171' } : null,
    { icon:'⭐', title:"Eng samarali", val: best.name, sub:`${best.rate}% vazifalar bajarildi`, border:'#22d59b' },
    { icon:'📅', title:"Faol kunlar", val: (() => { let a=0; for(let d=1;d<=60;d++) if(getDayTasks(d).length) a++; return a+' kun'; })(), sub:'Vazifa qo\'shilgan kunlar', border:'#a78bfa' },
  ].filter(Boolean);

  ig.innerHTML = items.map(item => `
    <div class="insight-card" style="border-left-color:${item.border}">
      <div class="ii">${item.icon}</div>
      <div class="it">${item.title}</div>
      <div class="iv">${item.val}</div>
      <div class="is">${item.sub}</div>
    </div>
  `).join('');
}

// ─── UTILS ───────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}