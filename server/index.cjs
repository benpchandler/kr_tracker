const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const db = new Database(path.join(__dirname, 'kr.sqlite'));

function init() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT
    );
    CREATE TABLE IF NOT EXISTS pods (
      id TEXT PRIMARY KEY,
      teamId TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY(teamId) REFERENCES teams(id)
    );
    CREATE TABLE IF NOT EXISTS individuals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      teamId TEXT NOT NULL,
      podId TEXT,
      role TEXT NOT NULL,
      discipline TEXT
    );
    CREATE TABLE IF NOT EXISTS objectives (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS objective_teams (
      objectiveId TEXT NOT NULL,
      teamId TEXT NOT NULL,
      PRIMARY KEY(objectiveId, teamId)
    );
    CREATE TABLE IF NOT EXISTS krs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      aggregation TEXT NOT NULL,
      objectiveId TEXT,
      teamId TEXT,
      podId TEXT,
      driId TEXT
    );
    CREATE TABLE IF NOT EXISTS plan_values (
      krId TEXT NOT NULL,
      weekKey TEXT NOT NULL,
      value REAL,
      lastModifiedAt TEXT,
      lastModifiedBy TEXT,
      PRIMARY KEY(krId, weekKey)
    );
    CREATE TABLE IF NOT EXISTS actual_values (
      krId TEXT NOT NULL,
      weekKey TEXT NOT NULL,
      value REAL,
      lastModifiedAt TEXT,
      lastModifiedBy TEXT,
      PRIMARY KEY(krId, weekKey)
    );
    CREATE TABLE IF NOT EXISTS baselines (
      id TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      lockedAt TEXT NOT NULL,
      lockedBy TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS baseline_plan_values (
      baselineId TEXT NOT NULL,
      krId TEXT NOT NULL,
      weekKey TEXT NOT NULL,
      value REAL,
      PRIMARY KEY(baselineId, krId, weekKey)
    );
    CREATE TABLE IF NOT EXISTS initiatives (
      id TEXT PRIMARY KEY,
      krId TEXT NOT NULL,
      name TEXT NOT NULL,
      impact REAL NOT NULL,
      confidence REAL NOT NULL,
      isPlaceholder INTEGER NOT NULL,
      status TEXT
    );
    CREATE TABLE IF NOT EXISTS initiative_weekly (
      initiativeId TEXT NOT NULL,
      weekKey TEXT NOT NULL,
      impact REAL,
      confidence REAL,
      lastModifiedAt TEXT,
      lastModifiedBy TEXT,
      PRIMARY KEY(initiativeId, weekKey)
    );
  `);

  dedupeTeams();
  try {
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_name_unique ON teams(lower(name))');
  } catch (err) {
    console.warn('Failed to enforce unique team names index', err.message);
  }

  // Best-effort migration for older DBs missing columns
  try { db.exec(`ALTER TABLE plan_values ADD COLUMN lastModifiedAt TEXT`); } catch {}
  try { db.exec(`ALTER TABLE plan_values ADD COLUMN lastModifiedBy TEXT`); } catch {}
  try { db.exec(`ALTER TABLE actual_values ADD COLUMN lastModifiedAt TEXT`); } catch {}
  try { db.exec(`ALTER TABLE actual_values ADD COLUMN lastModifiedBy TEXT`); } catch {}
  try { db.exec(`ALTER TABLE initiatives ADD COLUMN status TEXT`); } catch {}
  try { db.exec(`CREATE TABLE initiative_weekly (initiativeId TEXT NOT NULL, weekKey TEXT NOT NULL, impact REAL, confidence REAL, lastModifiedAt TEXT, lastModifiedBy TEXT, PRIMARY KEY(initiativeId, weekKey))`); } catch {}
}

function getSetting(key, dflt) {
  const row = db.prepare('SELECT value FROM app_settings WHERE key=?').get(key);
  return row ? JSON.parse(row.value) : dflt;
}
function setSetting(key, val) {
  db.prepare('INSERT INTO app_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, JSON.stringify(val));
}

function dedupeTeams() {
  const teams = db.prepare('SELECT id, name, color FROM teams ORDER BY rowid').all();
  const seen = new Map();
  const remaps = [];

  teams.forEach((team) => {
    if (!team || !team.name) return;
    const key = team.name.trim().toLowerCase();

    if (!seen.has(key)) {
      seen.set(key, { ...team });
      return;
    }

    remaps.push({ duplicate: team, canonical: seen.get(key) });
    const canonical = seen.get(key);
    if (canonical && (!canonical.color || !canonical.color.trim()) && team.color) {
      canonical.color = team.color;
    }
  });

  if (remaps.length === 0) return;

  const updatePods = db.prepare('UPDATE pods SET teamId=? WHERE teamId=?');
  const updateIndividuals = db.prepare('UPDATE individuals SET teamId=? WHERE teamId=?');
  const updateObjectiveTeams = db.prepare('UPDATE objective_teams SET teamId=? WHERE teamId=?');
  const updateKrs = db.prepare('UPDATE krs SET teamId=? WHERE teamId=?');
  const updateTeamColor = db.prepare('UPDATE teams SET color=? WHERE id=?');
  const deleteTeam = db.prepare('DELETE FROM teams WHERE id=?');

  db.transaction(() => {
    remaps.forEach(({ duplicate, canonical }) => {
      if (!canonical) return;

      if ((!canonical.color || !canonical.color.trim()) && duplicate.color) {
        updateTeamColor.run(duplicate.color, canonical.id);
        canonical.color = duplicate.color;
      }

      updatePods.run(canonical.id, duplicate.id);
      updateIndividuals.run(canonical.id, duplicate.id);
      updateObjectiveTeams.run(canonical.id, duplicate.id);
      updateKrs.run(canonical.id, duplicate.id);
      deleteTeam.run(duplicate.id);
    });
  })();
}

function seedIfEmpty() {
  const teamCount = db.prepare('SELECT COUNT(*) as c FROM teams').get().c;
  if (teamCount > 0) return;
  // Minimal seed; mirror current app defaults
  db.prepare('INSERT INTO organizations(id,name) VALUES(?,?)').run('org-merchant','Merchant');
  const teams = [
    {id:'team-live-order-experience', name:'Live Order Experience', color:'#2E86AB'},
    {id:'team-go-to-market', name:'Go-To-Market', color:'#8E44AD'},
    {id:'team-support', name:'Support', color:'#27AE60'},
  ];
  const pods = [
    {id:'pod-dasher-handoff', teamId:'team-live-order-experience', name:'Dasher Handoff Pod'},
    {id:'pod-cancellations', teamId:'team-live-order-experience', name:'Cancellations Pod'},
    {id:'pod-workforce-management', teamId:'team-support', name:'Workforce Management Pod'},
    {id:'pod-support-reduction', teamId:'team-support', name:'Support Reduction Pod'},
    {id:'pod-menu', teamId:'team-go-to-market', name:'Menu Pod'},
    {id:'pod-profitability', teamId:'team-go-to-market', name:'Profitability Pod'},
    {id:'pod-new-bets', teamId:'team-go-to-market', name:'New Bets Pod'},
  ];
  const inds = [
    {id:'ind-ashley-tran', name:'Ashley Tran', email:'ashley.tran@example.com', teamId:'team-live-order-experience', podId:null, role:'team_lead', discipline:'product'},
    {id:'ind-sonha-breidenbach', name:'Sonha Breidenbach', email:'sonha.breidenbach@example.com', teamId:'team-go-to-market', podId:null, role:'team_lead', discipline:'strategy'},
    {id:'ind-shreya-thacker', name:'Shreya Thacker', email:'shreya.thacker@example.com', teamId:'team-support', podId:null, role:'team_lead', discipline:'operations'},
    {id:'ind-jamie-li', name:'Jamie Li', email:null, teamId:'team-live-order-experience', podId:'pod-dasher-handoff', role:'pod_lead', discipline:'engineering'},
    {id:'ind-carlos-mendes', name:'Carlos Mendes', email:null, teamId:'team-live-order-experience', podId:'pod-cancellations', role:'pod_lead', discipline:'engineering'},
    {id:'ind-priya-patel', name:'Priya Patel', email:null, teamId:'team-support', podId:'pod-workforce-management', role:'pod_lead', discipline:'operations'},
    {id:'ind-ethan-zhang', name:'Ethan Zhang', email:null, teamId:'team-support', podId:'pod-support-reduction', role:'pod_lead', discipline:'analytics'},
    {id:'ind-lena-kim', name:'Lena Kim', email:null, teamId:'team-go-to-market', podId:'pod-menu', role:'pod_lead', discipline:'design'},
    {id:'ind-mark-rossi', name:'Mark Rossi', email:null, teamId:'team-go-to-market', podId:'pod-profitability', role:'pod_lead', discipline:'analytics'},
    {id:'ind-ava-nguyen', name:'Ava Nguyen', email:null, teamId:'team-go-to-market', podId:'pod-new-bets', role:'pod_lead', discipline:'product'},
  ];
  const objectives = [
    {id:'obj-loe', name:'Deliver reliable live order flows'},
    {id:'obj-gtm', name:'Grow merchant performance and adoption'},
    {id:'obj-support', name:'Elevate support efficiency & quality'},
  ];
  const objectiveTeams = [
    ['obj-loe','team-live-order-experience'],
    ['obj-gtm','team-go-to-market'],
    ['obj-support','team-support'],
  ];
  const krs = [
    {id:'kr-handoff-failure-rate', name:'Reduce handoff failure rate: 3.5 → 2.0 (%)', unit:'percent', aggregation:'snapshot', objectiveId:'obj-loe', teamId:'team-live-order-experience', podId:'pod-dasher-handoff', driId:'ind-jamie-li'},
    {id:'kr-customer-cancellations', name:'Reduce customer-initiated cancellations: 320 → 200 (weekly avg)', unit:'count', aggregation:'average', objectiveId:'obj-loe', teamId:'team-live-order-experience', podId:'pod-cancellations', driId:'ind-carlos-mendes'},
    {id:'kr-schedule-adherence', name:'Improve schedule adherence: 87 → 93 (%)', unit:'percent', aggregation:'average', objectiveId:'obj-support', teamId:'team-support', podId:'pod-workforce-management', driId:'ind-priya-patel'},
    {id:'kr-contacts-per-order', name:'Reduce contacts per order: 0.065 → 0.045', unit:'count', aggregation:'average', objectiveId:'obj-support', teamId:'team-support', podId:'pod-support-reduction', driId:'ind-ethan-zhang'},
    {id:'kr-menu-coverage', name:'Increase menu completeness coverage: 78 → 92 (%)', unit:'percent', aggregation:'average', objectiveId:'obj-gtm', teamId:'team-go-to-market', podId:'pod-menu', driId:'ind-lena-kim'},
    {id:'kr-merchant-profitability', name:'Improve merchant profitability: 14 → 18 (%)', unit:'percent', aggregation:'average', objectiveId:'obj-gtm', teamId:'team-go-to-market', podId:'pod-profitability', driId:'ind-mark-rossi'},
    {id:'kr-upsell-conversion', name:'Increase upsell conversion: 2.8 → 4.0 (%)', unit:'percent', aggregation:'snapshot', objectiveId:'obj-gtm', teamId:'team-go-to-market', podId:'pod-new-bets', driId:'ind-ava-nguyen'},
  ];
  const initiatives = [
    {id:'i-loe-handoff-retries', krId:'kr-handoff-failure-rate', name:'Optimize retries & backoff', impact:-0.6, confidence:0.8, isPlaceholder:0, status:'at_risk'},
    {id:'i-loe-handoff-timeouts', krId:'kr-handoff-failure-rate', name:'Reduce handoff timeouts', impact:-0.5, confidence:0.7, isPlaceholder:0, status:'needs_support'},
    {id:'i-loe-handoff-placeholder', krId:'kr-handoff-failure-rate', name:'Driver-side SDK uplift (placeholder)', impact:-0.4, confidence:0.5, isPlaceholder:1, status:'on_track'},
  ];

  const insTeam = db.prepare('INSERT INTO teams(id,name,color) VALUES(?,?,?)');
  teams.forEach(t=>insTeam.run(t.id,t.name,t.color));
  const insPod = db.prepare('INSERT INTO pods(id,teamId,name) VALUES(?,?,?)');
  pods.forEach(p=>insPod.run(p.id,p.teamId,p.name));
  const insInd = db.prepare('INSERT INTO individuals(id,name,email,teamId,podId,role,discipline) VALUES(?,?,?,?,?,?,?)');
  inds.forEach(i=>insInd.run(i.id,i.name,i.email,i.teamId,i.podId,i.role,i.discipline));
  const insObj = db.prepare('INSERT INTO objectives(id,name) VALUES(?,?)');
  objectives.forEach(o=>insObj.run(o.id,o.name));
  const insObjTeam = db.prepare('INSERT INTO objective_teams(objectiveId,teamId) VALUES(?,?)');
  objectiveTeams.forEach(([o,t])=>insObjTeam.run(o,t));
  const insKr = db.prepare('INSERT INTO krs(id,name,unit,aggregation,objectiveId,teamId,podId,driId) VALUES(?,?,?,?,?,?,?,?)');
  krs.forEach(kr=>insKr.run(kr.id,kr.name,kr.unit,kr.aggregation,kr.objectiveId,kr.teamId,kr.podId,kr.driId));
  const insInit = db.prepare('INSERT INTO initiatives(id,krId,name,impact,confidence,isPlaceholder,status) VALUES(?,?,?,?,?,?,?)');
  initiatives.forEach(i=>insInit.run(i.id,i.krId,i.name,i.impact,i.confidence,i.isPlaceholder,i.status||'on_track'));

  setSetting('period',{startISO:'2025-09-01', endISO:'2025-11-30'});
  setSetting('phase','execution');
  setSetting('reportingDateISO','2025-09-13');
}

function mapRows(stmt) { return stmt.all(); }

function getState() {
  const org = db.prepare('SELECT * FROM organizations LIMIT 1').get();
  const teams = mapRows(db.prepare('SELECT * FROM teams'));
  const pods = mapRows(db.prepare('SELECT * FROM pods'));
  const individuals = mapRows(db.prepare('SELECT * FROM individuals'));
  const objectives = mapRows(db.prepare('SELECT * FROM objectives'));
  const ot = mapRows(db.prepare('SELECT * FROM objective_teams'));
  const krs = mapRows(db.prepare('SELECT * FROM krs'));
  const planRows = mapRows(db.prepare('SELECT * FROM plan_values'));
  const actualRows = mapRows(db.prepare('SELECT * FROM actual_values'));
  const baselines = mapRows(db.prepare('SELECT * FROM baselines'));
  const bPlanRows = mapRows(db.prepare('SELECT * FROM baseline_plan_values'));
  const initiatives = mapRows(db.prepare('SELECT * FROM initiatives'));
  const initWeeklyRows = mapRows(db.prepare('SELECT * FROM initiative_weekly'));
  const period = getSetting('period',{startISO:'', endISO:''});
  const phase = getSetting('phase','planning');
  const reportingDateISO = getSetting('reportingDateISO','');
  const theme = getSetting('theme','light');

  const planDraft = {};
  planRows.forEach(r=>{ (planDraft[r.krId] ||= {})[r.weekKey] = r.value; });
  const planMeta = {};
  planRows.forEach(r=>{ (planMeta[r.krId] ||= {})[r.weekKey] = { at: r.lastModifiedAt || null, by: r.lastModifiedBy || null }; });
  const actuals = {};
  actualRows.forEach(r=>{ (actuals[r.krId] ||= {})[r.weekKey] = r.value; });
  const actualMeta = {};
  actualRows.forEach(r=>{ (actualMeta[r.krId] ||= {})[r.weekKey] = { at: r.lastModifiedAt || null, by: r.lastModifiedBy || null }; });
  const initiativeWeekly = {};
  initWeeklyRows.forEach(r=>{ (initiativeWeekly[r.initiativeId] ||= {})[r.weekKey] = { impact: r.impact, confidence: r.confidence }; });
  const initiativeWeeklyMeta = {};
  initWeeklyRows.forEach(r=>{ (initiativeWeeklyMeta[r.initiativeId] ||= {})[r.weekKey] = { at: r.lastModifiedAt || null, by: r.lastModifiedBy || null }; });
  const baselinesOut = baselines.map(b=>({ id:b.id, version:b.version, lockedAt:b.lockedAt, lockedBy:b.lockedBy, data:{} }));
  bPlanRows.forEach(r=>{
    const bl = baselinesOut.find(b=>b.id===r.baselineId); if (!bl) return;
    (bl.data[r.krId] ||= {})[r.weekKey] = r.value;
  });

  return {
    organization: org || null,
    objectives,
    objectiveTeams: ot,
    krs,
    teams,
    pods,
    individuals,
    period,
    planDraft,
    planMeta,
    actuals,
    actualMeta,
    baselines: baselinesOut,
    currentBaselineId: baselinesOut[0]?.id,
    initiatives,
    initiativeWeekly,
    initiativeWeeklyMeta,
    phase,
    reportingDateISO,
    theme,
  };
}

function server() {
  init();
  seedIfEmpty();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/state', (req,res)=>{
    res.json(getState());
  });

  app.post('/api/period', (req,res)=>{
    const { startISO, endISO } = req.body || {};
    setSetting('period',{startISO, endISO});
    res.json({ ok:true });
  });

  app.post('/api/team', (req,res)=>{
    const { id, name, color } = req.body;
    db.prepare('INSERT INTO teams(id,name,color) VALUES(?,?,?)').run(id,name,color||null);
    res.json({ ok:true });
  });

  app.post('/api/pod', (req,res)=>{
    const { id, teamId, name } = req.body;
    db.prepare('INSERT INTO pods(id,teamId,name) VALUES(?,?,?)').run(id,teamId,name);
    res.json({ ok:true });
  });

  app.put('/api/pod', (req,res)=>{
    const { id, teamId, name } = req.body;
    db.prepare('UPDATE pods SET teamId=?, name=? WHERE id=?').run(teamId,name,id);
    res.json({ ok:true });
  });

  app.delete('/api/pod/:id', (req,res)=>{
    db.prepare('DELETE FROM pods WHERE id=?').run(req.params.id);
    res.json({ ok:true });
  });

  app.post('/api/objective', (req,res)=>{
    const { id, name } = req.body;
    db.prepare('INSERT INTO objectives(id,name) VALUES(?,?)').run(id,name);
    res.json({ ok:true });
  });

  app.post('/api/objective/teams', (req,res)=>{
    const { objectiveId, teamIds } = req.body;
    const del = db.prepare('DELETE FROM objective_teams WHERE objectiveId=?');
    del.run(objectiveId);
    const ins = db.prepare('INSERT INTO objective_teams(objectiveId,teamId) VALUES(?,?)');
    db.transaction(()=>{ teamIds.forEach(t=>ins.run(objectiveId,t)); })();
    res.json({ ok:true });
  });

  app.post('/api/kr', (req,res)=>{
    const { id, name, unit, aggregation, objectiveId, teamId, podId, driId } = req.body;
    db.prepare('INSERT INTO krs(id,name,unit,aggregation,objectiveId,teamId,podId,driId) VALUES(?,?,?,?,?,?,?,?)')
      .run(id,name,unit,aggregation,objectiveId||null,teamId||null,podId||null,driId||null);
    res.json({ ok:true });
  });

  app.post('/api/plan', (req,res)=>{
    const { krId, weekKey, value, by } = req.body;
    const now = new Date().toISOString();
    db.prepare('INSERT INTO plan_values(krId,weekKey,value,lastModifiedAt,lastModifiedBy) VALUES(?,?,?,?,?) ON CONFLICT(krId,weekKey) DO UPDATE SET value=excluded.value, lastModifiedAt=excluded.lastModifiedAt, lastModifiedBy=excluded.lastModifiedBy')
      .run(krId, weekKey, value, now, by || 'user');
    res.json({ ok:true, meta: { at: now, by: by || 'user' } });
  });

  app.post('/api/actual', (req,res)=>{
    const { krId, weekKey, value, by } = req.body;
    const now = new Date().toISOString();
    db.prepare('INSERT INTO actual_values(krId,weekKey,value,lastModifiedAt,lastModifiedBy) VALUES(?,?,?,?,?) ON CONFLICT(krId,weekKey) DO UPDATE SET value=excluded.value, lastModifiedAt=excluded.lastModifiedAt, lastModifiedBy=excluded.lastModifiedBy')
      .run(krId, weekKey, value, now, by || 'user');
    res.json({ ok:true, meta: { at: now, by: by || 'user' } });
  });

  app.post('/api/actual/paste', (req,res)=>{
    const { updates, by } = req.body;
    const stmt = db.prepare('INSERT INTO actual_values(krId,weekKey,value,lastModifiedAt,lastModifiedBy) VALUES(?,?,?,?,?) ON CONFLICT(krId,weekKey) DO UPDATE SET value=excluded.value, lastModifiedAt=excluded.lastModifiedAt, lastModifiedBy=excluded.lastModifiedBy');
    const now = new Date().toISOString();
    let count = 0;
    db.transaction(()=>{ (updates||[]).forEach(u=>{ stmt.run(u.krId,u.weekKey,u.value, now, by || 'user'); count++; }); })();
    res.json({ ok:true, count, metaAt: now, by: by || 'user' });
  });

  app.post('/api/plan/bulk', (req,res)=>{
    const { updates, by } = req.body;
    const stmt = db.prepare('INSERT INTO plan_values(krId,weekKey,value,lastModifiedAt,lastModifiedBy) VALUES(?,?,?,?,?) ON CONFLICT(krId,weekKey) DO UPDATE SET value=excluded.value, lastModifiedAt=excluded.lastModifiedAt, lastModifiedBy=excluded.lastModifiedBy');
    const now = new Date().toISOString();
    let count = 0;
    db.transaction(()=>{ (updates||[]).forEach(u=>{ stmt.run(u.krId,u.weekKey,u.value, now, by || 'user'); count++; }); })();
    res.json({ ok:true, count, metaAt: now, by: by || 'user' });
  });

  app.post('/api/import/csv', (req,res)=>{
    const { type, data } = req.body;
    if (!type || !data || !Array.isArray(data)) {
      return res.status(400).json({ ok:false, error:'Invalid import data' });
    }

    const now = new Date().toISOString();
    const by = req.body.by || 'import';
    const results = { created: {}, updated: {}, errors: [] };

    try {
      db.transaction(()=>{
        if (type === 'goals-plan') {
          const teamStmt = db.prepare('INSERT OR IGNORE INTO teams(id,name,color) VALUES(?,?,?)');
          const podStmt = db.prepare('INSERT OR IGNORE INTO pods(id,teamId,name) VALUES(?,?,?)');
          const objStmt = db.prepare('INSERT OR IGNORE INTO objectives(id,name) VALUES(?,?)');
          const krStmt = db.prepare('INSERT OR REPLACE INTO krs(id,name,unit,aggregation,objectiveId,teamId,podId,driId) VALUES(?,?,?,?,?,?,?,?)');
          const planStmt = db.prepare('INSERT INTO plan_values(krId,weekKey,value,lastModifiedAt,lastModifiedBy) VALUES(?,?,?,?,?) ON CONFLICT(krId,weekKey) DO UPDATE SET value=excluded.value, lastModifiedAt=excluded.lastModifiedAt, lastModifiedBy=excluded.lastModifiedBy');

          const teamIds = {};
          const podIds = {};
          const objIds = {};

          data.forEach(row => {
            const teamSlug = row.team ? row.team.toLowerCase().replace(/\s+/g,'-') : null;
            if (row.team && !teamIds[teamSlug]) {
              teamIds[teamSlug] = `team-${teamSlug}`;
              teamStmt.run(teamIds[teamSlug], row.team, null);
              results.created.teams = (results.created.teams || 0) + 1;
            }

            const podSlug = row.pod ? row.pod.toLowerCase().replace(/\s+/g,'-') : null;
            if (row.pod && teamSlug && !podIds[`${teamSlug}-${podSlug}`]) {
              podIds[`${teamSlug}-${podSlug}`] = `pod-${teamSlug}-${podSlug}`;
              podStmt.run(podIds[`${teamSlug}-${podSlug}`], teamIds[teamSlug], row.pod);
              results.created.pods = (results.created.pods || 0) + 1;
            }

            if (row.objective) {
              const objSlug = row.objective.toLowerCase().replace(/\s+/g,'-');
              if (!objIds[objSlug]) {
                objIds[objSlug] = `obj-${objSlug}`;
                objStmt.run(objIds[objSlug], row.objective);
                results.created.objectives = (results.created.objectives || 0) + 1;
              }
            }

            const krId = row.kr_id || `kr-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
            const teamId = teamSlug ? teamIds[teamSlug] : null;
            const podId = podSlug && teamSlug ? podIds[`${teamSlug}-${podSlug}`] : null;
            const objectiveId = row.objective ? objIds[row.objective.toLowerCase().replace(/\s+/g,'-')] : null;

            krStmt.run(krId, row.kr_name, row.unit, row.aggregation, objectiveId, teamId, podId, null);
            results.created.krs = (results.created.krs || 0) + 1;

            Object.entries(row).forEach(([key, value]) => {
              if (key.startsWith('plan_') && value !== null && value !== '') {
                const weekKey = key.replace('plan_', '');
                planStmt.run(krId, weekKey, parseFloat(value), now, by);
                results.created.planValues = (results.created.planValues || 0) + 1;
              }
            });
          });
        } else if (type === 'initiatives') {
          const initStmt = db.prepare('INSERT OR REPLACE INTO initiatives(id,krId,name,impact,confidence,isPlaceholder,status) VALUES(?,?,?,?,?,?,?)');
          const weeklyStmt = db.prepare('INSERT INTO initiative_weekly(initiativeId,weekKey,impact,confidence,lastModifiedAt,lastModifiedBy) VALUES(?,?,?,?,?,?) ON CONFLICT(initiativeId,weekKey) DO UPDATE SET impact=excluded.impact, confidence=excluded.confidence, lastModifiedAt=excluded.lastModifiedAt, lastModifiedBy=excluded.lastModifiedBy');

          data.forEach(row => {
            const krLookup = db.prepare('SELECT id FROM krs WHERE name = ?').get(row.kr_name);
            if (!krLookup) {
              results.errors.push(`KR not found: ${row.kr_name}`);
              return;
            }

            const initId = row.initiative_id || `init-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
            initStmt.run(initId, krLookup.id, row.initiative_name, row.impact, row.confidence, row.is_placeholder ? 1 : 0, row.status || 'on_track');
            results.created.initiatives = (results.created.initiatives || 0) + 1;

            Object.entries(row).forEach(([key, value]) => {
              if ((key.startsWith('impact_') || key.startsWith('confidence_')) && value !== null && value !== '') {
                const weekKey = key.replace(/^(impact|confidence)_/, '');
                const field = key.startsWith('impact_') ? 'impact' : 'confidence';
                const existingRow = db.prepare('SELECT * FROM initiative_weekly WHERE initiativeId=? AND weekKey=?').get(initId, weekKey);
                const impact = field === 'impact' ? parseFloat(value) : (existingRow ? existingRow.impact : row.impact);
                const confidence = field === 'confidence' ? parseFloat(value) : (existingRow ? existingRow.confidence : row.confidence);
                weeklyStmt.run(initId, weekKey, impact, confidence, now, by);
                results.updated.initiativeWeekly = (results.updated.initiativeWeekly || 0) + 1;
              }
            });
          });
        }
      })();

      if (req.body.lockBaseline) {
        const lockedBy = by;
        const id = `bl-${Date.now()}`;
        const version = (db.prepare('SELECT COALESCE(MAX(version),0) v FROM baselines').get().v) + 1;
        db.prepare('INSERT INTO baselines(id,version,lockedAt,lockedBy) VALUES(?,?,?,?)')
          .run(id, version, new Date().toISOString(), lockedBy);
        const planRows = db.prepare('SELECT * FROM plan_values').all();
        const ins = db.prepare('INSERT INTO baseline_plan_values(baselineId,krId,weekKey,value) VALUES(?,?,?,?)');
        db.transaction(()=>{
          planRows.forEach(r => ins.run(id, r.krId, r.weekKey, r.value));
        })();
        setSetting('phase', 'execution');
        results.baselineId = id;
        results.baselineVersion = version;
      }

      res.json({ ok:true, ...results });
    } catch(err) {
      res.status(500).json({ ok:false, error: err.message });
    }
  });

  app.post('/api/lock-plan', (req,res)=>{
    const { lockedBy, data } = req.body;
    const id = `bl-${Date.now()}`;
    const version = (db.prepare('SELECT COALESCE(MAX(version),0) v FROM baselines').get().v) + 1;
    db.prepare('INSERT INTO baselines(id,version,lockedAt,lockedBy) VALUES(?,?,?,?)')
      .run(id, version, new Date().toISOString(), lockedBy || 'user');
    const ins = db.prepare('INSERT INTO baseline_plan_values(baselineId,krId,weekKey,value) VALUES(?,?,?,?)');
    db.transaction(()=>{
      Object.entries(data||{}).forEach(([krId, weeks])=>{
        Object.entries(weeks).forEach(([wk, val])=> ins.run(id, krId, wk, val));
      })
    })();
    res.json({ ok:true, baselineId:id, version });
  });

  app.post('/api/initiative', (req,res)=>{
    const { id, krId, name, impact, confidence, isPlaceholder, status } = req.body;
    db.prepare('INSERT INTO initiatives(id,krId,name,impact,confidence,isPlaceholder,status) VALUES(?,?,?,?,?,?,?)')
      .run(id,krId,name,impact,confidence,isPlaceholder?1:0,status||'on_track');
    res.json({ ok:true });
  });
  app.put('/api/initiative', (req,res)=>{
    const { id, krId, name, impact, confidence, isPlaceholder, status } = req.body;
    db.prepare('UPDATE initiatives SET krId=?, name=?, impact=?, confidence=?, isPlaceholder=?, status=? WHERE id=?')
      .run(krId,name,impact,confidence,isPlaceholder?1:0,status||'on_track',id);
    res.json({ ok:true });
  });
  app.delete('/api/initiative/:id', (req,res)=>{
    db.prepare('DELETE FROM initiatives WHERE id=?').run(req.params.id);
    res.json({ ok:true });
  });

  app.post('/api/initiative/weekly', (req,res)=>{
    const { initiativeId, weekKey, patch, by } = req.body || {};
    if (!initiativeId || !weekKey) return res.status(400).json({ ok:false, error:'missing ids' })
    const now = new Date().toISOString();
    const row = db.prepare('SELECT impact, confidence FROM initiative_weekly WHERE initiativeId=? AND weekKey=?').get(initiativeId, weekKey) || {};
    const impact = (patch && patch.impact !== undefined) ? patch.impact : row.impact;
    const confidence = (patch && patch.confidence !== undefined) ? patch.confidence : row.confidence;
    db.prepare('INSERT INTO initiative_weekly(initiativeId,weekKey,impact,confidence,lastModifiedAt,lastModifiedBy) VALUES(?,?,?,?,?,?) ON CONFLICT(initiativeId,weekKey) DO UPDATE SET impact=excluded.impact, confidence=excluded.confidence, lastModifiedAt=excluded.lastModifiedAt, lastModifiedBy=excluded.lastModifiedBy')
      .run(initiativeId, weekKey, impact, confidence, now, by || 'user');
    res.json({ ok:true, meta: { at: now, by: by || 'user' } });
  });

  app.post('/api/settings/phase', (req,res)=>{
    const { phase } = req.body; setSetting('phase', phase); res.json({ ok:true });
  });
  app.post('/api/settings/reporting-date', (req,res)=>{
    const { dateISO } = req.body; setSetting('reportingDateISO', dateISO); res.json({ ok:true });
  });
  app.post('/api/settings/theme', (req,res)=>{
    const { theme } = req.body; setSetting('theme', theme || 'light'); res.json({ ok:true });
  });

  const port = process.env.PORT || 3001;
  app.listen(port, ()=> console.log(`API listening on http://localhost:${port}`));
}

server();
