
const firebaseConfig={apiKey:"AIzaSyAQ5nko7F7jTXZIcgJvaCVjVFDqJ3f06wA",authDomain:"leave-system-router.firebaseapp.com",databaseURL:"https://leave-system-router-default-rtdb.asia-southeast1.firebasedatabase.app",projectId:"leave-system-router",storageBucket:"leave-system-router.firebasestorage.app",messagingSenderId:"890248694626",appId:"1:890248694626:web:8782cbc2a0ef3aa3a07a3b",measurementId:"G-386BNJ1MXV"};
if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
try{if(firebase.analytics)firebase.analytics();}catch(e){console.warn('Analytics unavailable',e);}
const db=firebase.database();
const EMPLOYEE_LIST=["นายพิชิตพงษ์ ศรีเขตร์","นายแสงอรุณ สุวรรณโคตร","นายปัญญาเลิศ จรรยากรณ์","นายธวัชชัย จันทร์จำนงค์","นายวรายุทธ์ แข็งตะโนด","นางสาวปาริฉัตร ปวนยา","นายสามารถ โสพิศ","นายอภิชาติ วันลา","นายกมล พงษ์กิ่ง","นายอัถธสิทธิ์ อสิพงษ์","นายประมวล เลิศยะโส","นายธวัชชัย บุญเสริม","นายชัยยนต์ พุทธนาวงค์","นายบรรหาร บุสสานาม","นางสาวนิตยา มนตะราช","นายธวัชชัย สันพี","นายพีระพล ชะอุ่มเกตุ"];
let leaveRequests=[],currentUser=null,firebaseListener=null,connectionListener=null,toastTimer=null,managerMode=false,adminMode=false;

// ===== Theme System - Auto dark/light mode by time =====
function applyThemeByTime(forceTheme){
  try{
    if(forceTheme){
      document.documentElement.setAttribute('data-theme', forceTheme);
      localStorage.setItem('router_theme_mode', forceTheme);
      return;
    }
    const savedMode = localStorage.getItem('router_theme_mode') || 'auto';
    if(savedMode === 'light'){
      document.documentElement.setAttribute('data-theme', 'light');
      return;
    }
    if(savedMode === 'dark'){
      document.documentElement.setAttribute('data-theme', 'dark');
      return;
    }
    // Auto mode: 19:00-05:59 = dark, 06:00-18:59 = light
    const hour = new Date().getHours();
    const isDark = hour >= 19 || hour < 6;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }catch(e){
    console.warn('Theme apply error:', e);
  }
}

function initThemeSystem(){
  applyThemeByTime();
  // Update theme every minute to check time
  setInterval(() => {
    const savedMode = localStorage.getItem('router_theme_mode') || 'auto';
    if(savedMode === 'auto'){
      const before=document.documentElement.getAttribute('data-theme');
      applyThemeByTime();
      if(document.documentElement.getAttribute('data-theme')!==before) refreshChartsForTheme();
    }
  }, 60000);
}

function updateThemeUI(){
  try{
    const savedMode = localStorage.getItem('router_theme_mode') || 'auto';
    const icon1 = document.getElementById('themeIcon');
    const text1 = document.getElementById('themeText');
    const icon2 = document.getElementById('themeIconMgr');
    const text2 = document.getElementById('themeTextMgr');
    
    if(savedMode === 'light'){
      if(icon1) icon1.className = 'fa fa-sun mr-1';
      if(text1) text1.textContent = 'สว่าง';
      if(icon2) icon2.className = 'fa fa-sun mr-1';
      if(text2) text2.textContent = 'สว่าง';
    }else if(savedMode === 'dark'){
      if(icon1) icon1.className = 'fa fa-moon mr-1';
      if(text1) text1.textContent = 'มืด';
      if(icon2) icon2.className = 'fa fa-moon mr-1';
      if(text2) text2.textContent = 'มืด';
    }else{ // auto
      if(icon1) icon1.className = 'fa fa-clock mr-1';
      if(text1) text1.textContent = 'อัตโนมัติ';
      if(icon2) icon2.className = 'fa fa-clock mr-1';
      if(text2) text2.textContent = 'อัตโนมัติ';
    }
  }catch(e){
    console.warn('Update theme UI error:', e);
  }
}

function toggleThemeMode(){
  try{
    const savedMode = localStorage.getItem('router_theme_mode') || 'auto';
    if(savedMode === 'auto'){
      localStorage.setItem('router_theme_mode', 'light');
      applyThemeByTime('light');
    }else if(savedMode === 'light'){
      localStorage.setItem('router_theme_mode', 'dark');
      applyThemeByTime('dark');
    }else{ // dark
      localStorage.setItem('router_theme_mode', 'auto');
      applyThemeByTime();
    }
    updateThemeUI();
    refreshChartsForTheme();
    showToast('เปลี่ยนธีมเรียบร้อย');
  }catch(e){
    console.warn('Toggle theme error:', e);
  }
}

// ให้กราฟทั้งหมดวาดสีใหม่เมื่อสลับธีม เพื่อให้อ่านค่าและชื่อได้ชัด
function refreshChartsForTheme(){
  try{
    const statsPage=document.getElementById('statsPage');
    if(statsPage&&!statsPage.classList.contains('hidden')&&typeof renderStatsCharts==='function'){
      setTimeout(renderStatsCharts,60);
    }
  }catch(e){
    console.warn('Refresh charts theme error:', e);
  }
}

// Initialize theme on load
if(typeof document !== 'undefined'){
  initThemeSystem();
  document.addEventListener('DOMContentLoaded', () => {
    updateThemeUI();
  });
}
const DEFAULT_EMPLOYEE_PASSWORD='123456';
const ADMIN_BUTTON_LABEL='Admin';
const APPROVER_GATE={salt:'router-approver-gate-v1',hash:'nHbI32tt7n0zHF+np91EPwpn3VIQITL5d4VULrswspc='};
const monthCursor={employee:new Date(new Date().getFullYear(),new Date().getMonth(),1),manager:new Date(new Date().getFullYear(),new Date().getMonth(),1)};
const $=id=>document.getElementById(id);
function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function showPage(pageId){['loginPage','employeePage','managerPage','statsPage'].forEach(id=>{const el=$(id);if(el)el.classList.add('hidden');});const target=$(pageId);if(target)target.classList.remove('hidden');}
function showToast(msg,isError=false){const t=$('toast');t.textContent=msg;t.classList.toggle('bg-red-600',isError);t.classList.toggle('bg-green-600',!isError);t.classList.remove('translate-y-32','opacity-0');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add('translate-y-32','opacity-0'),3500);}const NOTIFY_BASE='https://router-leave-notify.pages.dev';
function notifyLeave(action,data){
  try{
    fetch(NOTIFY_BASE+'/api/line-notify',{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(Object.assign({action},data||{}))})
    .then(async r=>{let res=null;try{res=await r.json();}catch(e){}
      if(!r.ok||!res||res.ok!==true){console.warn('[LINE Notify] ส่งแจ้งเตือนไม่สำเร็จ:',action,'HTTP',r.status,res);}
      else if(res.skipped){console.warn('[LINE Notify] ข้ามการส่ง:',action,res);}
      else{console.info('[LINE Notify] ส่งแจ้งเตือนสำเร็จ:',action,res);}
    })
    .catch(err=>{console.warn('[LINE Notify] เชื่อมต่อเซิร์ฟเวอร์แจ้งเตือนล้มเหลว:',action,err);});
  }catch(e){console.warn('[LINE Notify] error:',action,e);}
}
const DEFAULT_GSHEET_WEBAPP_URL='';
const GSHEET_TOKEN='';
function getGSheetUrl(){return (localStorage.getItem('router_gsheet_url')||DEFAULT_GSHEET_WEBAPP_URL||'').trim();}
function promptConfigGSheet(){
  const curr=getGSheetUrl();
  const input=prompt(curr?`URL Google Sheet Web App ปัจจุบัน:\n${curr}\n\nกรุณากรอก Web App URL ใหม่ (หรือพิมพ์ "clear" เพื่อล้างค่า):`:'กรุณากรอก Web App URL ที่ได้จาก Google Apps Script (Deploy > Web app):',curr);
  if(input===null)return;
  const trimmed=input.trim();
  if(trimmed.toLowerCase()==='clear'){localStorage.removeItem('router_gsheet_url');showToast('ล้างการตั้งค่า URL Google Sheet แล้ว');return;}
  if(!trimmed)return;
  if(!trimmed.startsWith('https://script.google.com/macros/s/')){alert('URL ไม่ถูกต้อง! ต้องขึ้นต้นด้วย https://script.google.com/macros/s/...');return;}
  localStorage.setItem('router_gsheet_url',trimmed);
  showToast('บันทึก URL Google Sheet สำเร็จ');
}
function backupToGoogleSheet(action,data){
  const url=getGSheetUrl();
  if(!url)return;
  try{
    fetch(url,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=UTF-8'},
      body:JSON.stringify({action:action,data:data,token:GSHEET_TOKEN,timestamp:new Date().toISOString()}),
      mode:'no-cors'
    }).catch(e=>console.warn('GSheet backup warning:',e));
  }catch(e){console.warn('GSheet backup error:',e);}
}
async function handleSyncAllGoogleSheet(){
  let url=getGSheetUrl();
  if(!url){
    promptConfigGSheet();
    url=getGSheetUrl();
    if(!url)return;
  }
  if(!leaveRequests||!leaveRequests.length){showToast('ไม่มีข้อมูลคำขอลาสำหรับซิงค์',true);return;}
  const btn=$('btnSyncGoogleSheet');
  const orig=btn?btn.innerHTML:'';
  if(btn){btn.disabled=true;btn.innerHTML='<i class="fa fa-spinner fa-spin mr-1"></i> กำลังซิงค์...';}
  showToast('กำลังส่งข้อมูลไปยัง Google Sheet...');
  try{
    await fetch(url,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=UTF-8'},
      body:JSON.stringify({action:'sync_all',records:leaveRequests,token:GSHEET_TOKEN,timestamp:new Date().toISOString()}),
      mode:'no-cors',
      signal:AbortSignal.timeout(30000)
    });
    showToast(`ส่งข้อมูล ${leaveRequests.length} รายการไปยัง Google Sheet แล้ว (โปรดตรวจสอบผลใน Sheet อีกครั้ง)`);
  }catch(err){
    console.error('Google Sheet sync error:',err);
    showToast('เกิดข้อผิดพลาดในการซิงค์ข้อมูล: '+(err.message||err),true);
  }finally{
    if(btn){btn.disabled=false;btn.innerHTML=orig;}
  }
}
function stopDataListener(){if(firebaseListener){db.ref('leaveRequests').off('value',firebaseListener);firebaseListener=null;}}
function logout(){stopDataListener();stopUsersListener();stopActivityListener();activityLogs=[];managerMode=false;adminMode=false;currentUser=null;const empSel=$('empName');if(empSel){empSel.disabled=false;empSel.innerHTML='<option value="">-- กรุณาเลือกชื่อ-นามสกุล --</option>';getEmployeeList().forEach(n=>{const o=document.createElement('option');o.value=n;o.textContent=n;empSel.appendChild(o);});}const myReq=$('myRequests');if(myReq)myReq.innerHTML='<p class="text-gray-500 text-center py-4">ยังไม่มีประวัติของคุณ</p>';const loginUserSel=$('loginUsername');if(loginUserSel){loginUserSel.value='';}const loginPw=$('loginPassword');if(loginPw){loginPw.value='';}if($('loginError'))$('loginError').classList.add('hidden');if($('adminPanel'))$('adminPanel').classList.add('hidden');hideAdminLogin();showPage('loginPage');showToast('ออกจากระบบเรียบร้อย');}

async function hashUserPassword(password,salt){
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:120000,hash:'SHA-256'},material,256);
  return bytesToBase64(bits);
}
async function ensureUser(username, password, empName, role){
  const key=await userKey(username);
  const snap=await db.ref('users/'+key).once('value');
  if(snap.val()) return false;
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const hash=await hashUserPassword(password,salt);
  await db.ref('users/'+key).set({
    username:username.trim(),
    empName:empName,
    displayName:empName,
    role:role,
    salt:bytesToBase64(salt),
    hash:hash,
    createdAt:new Date().toISOString()
  });
}
async function ensureEmployeeAccounts(){
  for(const name of EMPLOYEE_LIST){
    try{ await ensureUser(name, DEFAULT_EMPLOYEE_PASSWORD, name, 'user'); }
    catch(e){ console.warn('ensure user failed', name, e); }
  }
}
async function bootstrapDefaultUsers(){
  try{
    await ensureEmployeeAccounts();
    const snap=await db.ref('users').once('value');
    const data=snap.val()||{};
    const seen=new Map();const updates={};
    for(const [k,u] of Object.entries(data)){
      if(!u||typeof u!=='object')continue;
      if(u.plainPassword!=null)updates[k+'/plainPassword']=null;
      const ident=String(u.username||u.empName||'').trim().toLowerCase();
      if(!ident)continue;
      if(seen.has(ident))updates[k]=null;else seen.set(ident,k);
    }
    if(Object.keys(updates).length)await db.ref('users').update(updates);
  }
  catch(e){ console.warn('bootstrap users failed', e); }
}

function hideAdminLogin(){ if($('adminLoginForm')) $('adminLoginForm').classList.add('hidden'); if($('adminPassword')) $('adminPassword').value=''; if($('adminLoginError')) $('adminLoginError').classList.add('hidden'); }
function toggleAdminLogin(){
  const form=$('adminLoginForm'); if(!form) return;
  const willShow=form.classList.contains('hidden');
  if(willShow){
    form.classList.remove('hidden');
    if($('adminLoginError')) $('adminLoginError').classList.add('hidden');
    const pw=$('adminPassword'); if(pw){ pw.focus(); }
  }else{
    hideAdminLogin();
  }
}
async function verifyAdminGate(){
  const pw=$('adminPassword')?$('adminPassword').value.trim():'';
  if(!pw){ showToast('กรุณากรอกรหัสผ่านหัวหน้างาน',true); return; }
  try{
    const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);
    const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(APPROVER_GATE.salt),iterations:120000,hash:'SHA-256'},material,256);
    const candidate=bytesToBase64(bits);
    if(candidate!==APPROVER_GATE.hash){ if($('adminLoginError')) $('adminLoginError').classList.remove('hidden'); showToast('รหัสผ่านหัวหน้างานไม่ถูกต้อง',true); return; }
    managerMode=true; adminMode=true;
    hideAdminLogin();
    if($('adminPassword')) $('adminPassword').value='';
    const info=$('mgrUserInfo');
    if(info) info.textContent='ผู้ใช้งาน: ผู้ดูแลระบบ (approver)';
    $('adminPanel').classList.remove('hidden');
    showPage('managerPage');
    showToast('เข้าสู่ระบบผู้ดูแลเรียบร้อย');
    setPasswordPanelVisibility(false);
    subscribeToLeaveData();
    subscribeToActivityLog();
  }catch(err){ console.error(err); showToast('ตรวจสอบรหัสผ่านไม่สำเร็จ: '+(err.message||err.code),true); }
}
let usersListener=null;
function stopUsersListener(){ if(usersListener){ db.ref('users').off('value',usersListener); usersListener=null; } }
function setPasswordPanelVisibility(show){
  const body=$('passwordPanelBody'),btn=$('btnTogglePasswordPanel'),label=$('passwordPanelToggleLabel'),icon=$('passwordPanelToggleIcon');
  if(!body)return;
  body.classList.toggle('hidden',!show);
  if(btn)btn.setAttribute('aria-expanded',show?'true':'false');
  if(label)label.textContent=show?'ซ่อนข้อมูล':'แสดงข้อมูล';
  if(icon)icon.className=show?'fa fa-chevron-up mr-1':'fa fa-chevron-down mr-1';
  if(show)loadPasswordTable(); else stopUsersListener();
}
function togglePasswordPanel(){
  const body=$('passwordPanelBody');
  if(!body)return;
  setPasswordPanelVisibility(body.classList.contains('hidden'));
}
function renderPasswordTable(data){
  const body=$('passwordTableBody'); if(!body) return;
  const entries=Object.entries(data||{}).filter(([,v])=>v&&typeof v==='object');
  const rows=entries.map(([key,u])=>({
    key,
    name: u.displayName||u.empName||'-',
    empName: u.empName||u.displayName||'-',
    username: u.username||'-',
    password:'(เก็บแบบเข้ารหัส ไม่แสดง)',
    role: u.role||'user',
    updatedAt: u.passwordUpdatedAt||'',
    raw: u
  })).sort((a,b)=>a.name.localeCompare(b.name,'th'));
  if(!rows.length){ body.innerHTML='<p class="text-gray-500 text-center py-2">ยังไม่มีบัญชีผู้ใช้</p>'; return; }
  body.innerHTML=rows.map(r=>`<div class="p-2 rounded bg-white border border-gray-200"><div class="flex flex-wrap justify-between items-center gap-2 mb-1"><span class="font-semibold">👤 ${escapeHTML(r.name)}</span><div class="flex items-center gap-2"><span class="text-xs font-bold text-teal-700">${escapeHTML(r.role)}</span><button type="button" data-action="edit-user" data-key="${escapeHTML(r.key)}" class="px-2 py-1 text-xs bg-white border border-gray-300 rounded">แก้ไข</button><button type="button" data-action="delete-user" data-key="${escapeHTML(r.key)}" data-name="${escapeHTML(r.name)}" class="px-2 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded">ลบ</button></div></div><div class="space-y-1 pl-2"><div class="text-xs flex flex-wrap justify-between gap-1"><span>🔑 Username: <span class="font-mono">${escapeHTML(r.username)}</span></span><span>รหัสผ่าน: <span class="font-mono font-semibold">${escapeHTML(r.password)}</span></span></div>${r.updatedAt?`<div class="text-xs text-gray-500">อัปเดต: ${escapeHTML(new Date(r.updatedAt).toLocaleString('th-TH'))}</div>`:''}</div></div>`).join('');
}
function loadPasswordTable(){
  const body=$('passwordTableBody'); if(!body) return;
  body.innerHTML='<p class="text-gray-500 text-center py-2">กำลังโหลดข้อมูล...</p>';
  stopUsersListener();
  usersListener=db.ref('users').on('value',snap=>{
    renderPasswordTable(snap.val()||{});
    updateEmployeeListFromUsers(snap.val()||{});
  },err=>{ console.error(err); body.innerHTML='<p class="text-red-500 text-center py-2">โหลดข้อมูลไม่สำเร็จ</p>'; });
}

let DYNAMIC_EMPLOYEE_LIST = [...EMPLOYEE_LIST];
function getEmployeeList(){ return DYNAMIC_EMPLOYEE_LIST.length? DYNAMIC_EMPLOYEE_LIST : EMPLOYEE_LIST; }
function updateEmployeeListFromUsers(users){
  const set = new Set([...EMPLOYEE_LIST]);
  Object.values(users||{}).forEach(u=>{
    const name = u?.empName || u?.displayName || u?.username;
    if(name && String(name).trim()) set.add(String(name).trim());
  });
  DYNAMIC_EMPLOYEE_LIST = Array.from(set).sort((a,b)=>a.localeCompare(b,'th'));
  initEmployeeOptions();
}

async function addEmployee(){
  const nameEl=$('newEmpName'), userEl=$('newEmpUsername'), passEl=$('newEmpPassword'), roleEl=$('newEmpRole');
  const name = nameEl?.value?.trim()||'';
  const username = (userEl?.value?.trim()||name)||'';
  const password = passEl?.value||'';
  const role = roleEl?.value||'user';
  if(!name){ showToast('กรุณากรอกชื่อ-นามสกุลพนักงาน',true); return; }
  if(!password){ showToast('กรุณากรอกรหัสผ่านเริ่มต้น',true); return; }
  try{
    await ensureUser(username, password, name, role);
    if(nameEl) nameEl.value='';
    if(userEl) userEl.value='';
    if(passEl) passEl.value='';
    if(roleEl) roleEl.value='user';
    $('addEmployeePanel')?.classList.add('hidden');
    showToast('เพิ่มพนักงานเรียบร้อย และอัปเดตใน Firebase แล้ว');
    loadPasswordTable();
  }catch(e){
    console.error(e);
    showToast('เพิ่มพนักงานไม่สำเร็จ: '+(e.message||e.code),true);
  }
}

function toggleAddEmployeePanel(){
  const panel=$('addEmployeePanel');
  if(!panel) return;
  panel.classList.toggle('hidden');
}

async function editEmployeeUser(key, current){
  if(!managerMode && !adminMode){ showToast('ไม่มีสิทธิ์',true); return; }
  const newName = prompt('แก้ไขชื่อ-นามสกุล', current.empName || current.displayName || current.username || '');
  if(newName===null) return;
  const newUsername = prompt('แก้ไขชื่อผู้ใช้งาน', current.username || newName || '');
  if(newUsername===null) return;
  const newRole = prompt('แก้ไขสิทธิ์ (user/approver/manager/admin)', current.role || 'user');
  if(newRole===null) return;
  const newPass = prompt('ตั้งรหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)', '');
  if(newPass===null) return;
  try{
    const updates={ empName:newName.trim(), username:(newUsername.trim()||newName.trim()), displayName:newName.trim(), role:newRole.trim() };
    if(newPass && newPass.trim()){
      const salt=crypto.getRandomValues(new Uint8Array(16));
      const hash=await hashUserPassword(newPass.trim(), salt);
      updates.salt=bytesToBase64(salt);
      updates.hash=hash;
      updates.passwordUpdatedAt=new Date().toISOString();
    }
    await db.ref('users/'+key).update(updates);
    showToast('แก้ไขข้อมูลพนักงานเรียบร้อย');
    loadPasswordTable();
  }catch(e){
    console.error(e);
    showToast('แก้ไขไม่สำเร็จ: '+(e.message||e.code),true);
  }
}

async function deleteEmployeeUser(key, name){
  if(!managerMode && !adminMode){ showToast('ไม่มีสิทธิ์',true); return; }
  if(!confirm(`ยืนยันลบผู้ใช้ ${name} ออกจากระบบหลังบ้านหรือไม่?\nการกระทำนี้ไม่สามารถกู้คืนได้`)) return;
  try{
    await db.ref('users/'+key).remove();
    showToast('ลบผู้ใช้งานเรียบร้อย');
    loadPasswordTable();
  }catch(e){
    console.error(e);
    showToast('ลบไม่สำเร็จ: '+(e.message||e.code),true);
  }
}
async function changeOwnPassword(){
  if(!currentUser||typeof currentUser!=='string'){ showToast('กรุณาเข้าสู่ระบบก่อน',true); return; }
  const current=prompt('กรอกรหัสผ่านปัจจุบันของ '+currentUser);
  if(current===null) return;
  const next=prompt('กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)');
  if(next===null) return;
  if(next.length<6){ showToast('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร',true); return; }
  const confirmPw=prompt('กรอกรหัสผ่านใหม่อีกครั้งเพื่อยืนยัน');
  if(confirmPw===null) return;
  if(next!==confirmPw){ showToast('รหัสผ่านใหม่ทั้งสองครั้งไม่ตรงกัน',true); return; }
  try{
    const key=await userKey(currentUser);
    const snap=await db.ref('users/'+key).once('value');
    let userData=snap.val();let recKey=key;
    if(!userData){
      const all=await db.ref('users').once('value');
      for(const [k,u] of Object.entries(all.val()||{})){ if(u&&(u.empName===currentUser||u.username===currentUser)){userData=u;recKey=k;break;} }
    }
    if(!userData||!userData.salt||!userData.hash){ showToast('ไม่พบบัญชีผู้ใช้ของคุณ',true); return; }
    const candidate=await hashUserPassword(current,base64ToBytes(userData.salt));
    if(candidate!==userData.hash){ showToast('รหัสผ่านปัจจุบันไม่ถูกต้อง',true); return; }
    const salt=crypto.getRandomValues(new Uint8Array(16));
    const hash=await hashUserPassword(next,salt);
    const realKey=recKey;
    await db.ref('users/'+realKey).update({
      username: userData.username||currentUser,
      empName: userData.empName||currentUser,
      displayName: userData.displayName||currentUser,
      role: userData.role||'user',
      salt:bytesToBase64(salt),
      hash:hash,
      passwordUpdatedAt:new Date().toISOString()
    });
    showToast('เปลี่ยนรหัสผ่านเรียบร้อย ระบบหลังบ้านอัปเดตแล้ว');
  }catch(err){ console.error(err); showToast('เปลี่ยนรหัสผ่านไม่สำเร็จ: '+(err.message||err.code),true); }
}

function userKey(username){
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode('router-user:'+String(username||'').trim().toLowerCase())).then(d=>{
    return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,'0')).join('');
  });
}
async function deriveUserPassword(password,salt){
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:120000,hash:'SHA-256'},material,256);
  return bytesToBase64(bits);
}
async function handleLogin(e){
  if(e) e.preventDefault();
  const usernameEl=$('loginUsername'), passwordEl=$('loginPassword');
  const username=usernameEl?usernameEl.value.trim():'';
  const password=passwordEl?passwordEl.value:'';
  if(!username||!password){showToast('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน',true);return;}
  if(!window.crypto||!crypto.subtle){showToast('เบราว์เซอร์นี้ไม่รองรับการเข้าสู่ระบบ กรุณาเปิดผ่าน HTTPS',true);return;}
  try{
    let userData=null;
    const key=await userKey(username);
    const snap=await db.ref('users/'+key).once('value');
    userData=snap.val();
    if(!userData){
      const allSnap=await db.ref('users').once('value');
      const all=allSnap.val()||{};
      const found=Object.values(all).find(u=>u && (u.username===username || u.empName===username || u.displayName===username));
      if(found && found.username){
        const k2=await userKey(found.username);
        const s2=await db.ref('users/'+k2).once('value');
        userData=s2.val()||found;
      }else if(found){
        userData=found;
      }
    }
    if(!userData||!userData.salt||!userData.hash){showToast('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง',true);if($('loginError'))$('loginError').classList.remove('hidden');return;}
    const candidate=await deriveUserPassword(password,base64ToBytes(userData.salt));
    if(candidate!==userData.hash){showToast('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง',true);if($('loginError'))$('loginError').classList.remove('hidden');return;}
    const role=String(userData.role||'user').toLowerCase();
    currentUser={
      username: userData.username||username,
      empName: userData.empName||'',
      role: role,
      displayName: userData.displayName||userData.empName||userData.username||username
    };
    managerMode=(role==='approver'||role==='manager'||role==='admin');
    if($('loginError'))$('loginError').classList.add('hidden');
    if(role==='approver'||role==='manager'||role==='admin'){
      const info=$('mgrUserInfo');
      if(info) info.textContent = `ผู้ใช้งาน: ${currentUser.displayName} (${currentUser.role})`;
      showPage('managerPage');
      showToast('เข้าสู่ระบบในโหมดผู้อนุมัติ');
    }else{
      if(currentUser.empName){
        const empSel=$('empName');
        if(empSel){
          empSel.innerHTML = '';
          const opt=document.createElement('option');
          opt.value=currentUser.empName;
          opt.textContent=currentUser.empName;
          empSel.appendChild(opt);
          empSel.value=currentUser.empName;
          empSel.disabled=true;
        }
        currentUser = currentUser.empName;
      }else{
        currentUser = null;
      }
      const info=$('empUserInfo');
      if(info) info.textContent = currentUser?`พนักงาน: ${currentUser}` : `ผู้ใช้งาน: ${userData.username||username}`;
      showPage('employeePage');
      showToast('เข้าสู่ระบบสำเร็จ');
      renderEmployeeRequests();
    }
    subscribeToLeaveData();
    if(managerMode)subscribeToActivityLog();
  }catch(err){
    console.error(err);
    showToast('เข้าสู่ระบบไม่สำเร็จ: '+(err.message||err.code),true);
    if($('loginError'))$('loginError').classList.remove('hidden');
  }
}
function reqTS(r){return (Date.parse((r&&r.submittedAtISO)||'')||parseThDateTime(r&&r.submittedAt)||0);}
function subscribeToLeaveData(){stopDataListener();firebaseListener=snapshot=>{const data=snapshot.val();leaveRequests=data?Object.entries(data).filter(([,v])=>v&&typeof v==='object').map(([id,val])=>({id,...val})).sort((a,b)=>(reqTS(b)-reqTS(a))||String(b.id||'').localeCompare(String(a.id||''))):[];renderAllVisiblePages();};db.ref('leaveRequests').on('value',firebaseListener,error=>{console.error(error);showToast('โหลดข้อมูลไม่สำเร็จ: '+(error.message||error.code),true);});}

// ===== ประวัติการทำรายการ (Activity Log) — บันทึกทุกการกระทำ แสดงในโหมดหัวหน้างาน =====
let activityLogs=[],activityListener=null,activitySeeded=false;
const ACTIVITY_META={
 'submit':{icon:'📤',label:'ส่งคำขอลา',cls:'bg-amber-50 border-amber-200'},
 'manager-enter':{icon:'📝',label:'หัวหน้างานลงลางานให้',cls:'bg-indigo-50 border-indigo-200'},
 'approve':{icon:'✅',label:'อนุมัติคำขอลา',cls:'bg-green-50 border-green-200'},
 'reject':{icon:'❌',label:'ไม่อนุมัติคำขอลา',cls:'bg-red-50 border-red-200'},
 'cancel-request':{icon:'🔄',label:'ขอยกเลิกวันลา',cls:'bg-orange-50 border-orange-200'},
 'approve-cancel':{icon:'🆗',label:'อนุมัติยกเลิกวันลา',cls:'bg-teal-50 border-teal-200'},
 'reject-cancel':{icon:'⛔',label:'ไม่อนุมัติการยกเลิกวันลา',cls:'bg-rose-50 border-rose-200'},
 'delete-history':{icon:'🗑️',label:'ลบประวัติรายการ',cls:'bg-gray-100 border-gray-300'}
};
function stopActivityListener(){if(activityListener){db.ref('activityLog').off('value',activityListener);activityListener=null;}}
function parseThDateTime(str){const s=String(str||'').trim();if(!s)return 0;const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(s);if(m){let y=+m[3];if(y>2400)y-=543;return new Date(y,+m[2]-1,+m[1],+m[4],+m[5],+(m[6]||0)).getTime();}const t=Date.parse(s);return isNaN(t)?0:t;}
function logActivity(empName,action,details,by,reqId){
 try{
  const now=new Date();
  return db.ref('activityLog').push({empName:empName||'ไม่ระบุชื่อ',action,label:(ACTIVITY_META[action]||{}).label||action,details:details||'',by:by||'',reqId:reqId||'',at:now.toLocaleString('th-TH'),atISO:now.toISOString(),ts:now.getTime()}).then(()=>{}).catch(e=>{console.warn('logActivity failed',e);});
 }catch(e){console.warn('logActivity failed',e);}
}
function backfillActivityLog(){
 return Promise.all([db.ref('activityLog').once('value'),db.ref('leaveRequests').once('value')]).then(([logSnap,reqSnap])=>{
  if(logSnap.val())return;
  const reqs=Object.entries(reqSnap.val()||{}).filter(([,r])=>r&&typeof r==='object');
  const entries=[];
  const add=(r,action,when,iso,details,by,rid)=>{entries.push({empName:r.empName||'ไม่ระบุชื่อ',action,label:(ACTIVITY_META[action]||{}).label||action,details:details||'',by:by||'',reqId:rid||'',at:when||'',atISO:iso||'',ts:(iso?Date.parse(iso):0)||parseThDateTime(when)||0,backfilled:true});};
  reqs.forEach(([rid,r])=>{
   const detail=`${r.leaveType||'ไม่ระบุประเภท'} · ${r.startDate||'-'} ถึง ${r.endDate||'-'} (${r.leaveDays??'-'} วัน) · เหตุผล: ${r.reason||'ไม่ระบุ'}`;
   if(r.submittedAt||r.submittedAtISO) add(r,'submit',r.submittedAt,r.submittedAtISO,detail,r.managerEntered?'หัวหน้างาน':'พนักงาน',rid);
   if(r.processedAt&&(normalizeStatus(r.status)===STATUS.APPROVED||normalizeStatus(r.status)===STATUS.REJECTED)) add(r,normalizeStatus(r.status)===STATUS.APPROVED?'approve':'reject',r.processedAt,r.processedAtISO,detail,'หัวหน้างาน',rid);
   if(r.cancelRequestedAt) add(r,'cancel-request',r.cancelRequestedAt,r.cancelRequestedAtISO,`${r.leaveType||'ไม่ระบุประเภท'} · ${r.startDate||'-'} ถึง ${r.endDate||'-'} · เหตุผลขอยกเลิก: ${r.cancelReason||'ไม่ระบุ'}`,'พนักงาน',rid);
   if(r.cancelProcessedAt) add(r,normalizeStatus(r.cancelStatus)===STATUS.CANCELLED?'approve-cancel':'reject-cancel',r.cancelProcessedAt,r.cancelProcessedAtISO,`${r.leaveType||'ไม่ระบุประเภท'} · ${r.startDate||'-'} ถึง ${r.endDate||'-'} · เหตุผลขอยกเลิก: ${r.cancelReason||'ไม่ระบุ'}`,'หัวหน้างาน',rid);
  });
  if(!entries.length)return;
  const updates={};entries.forEach(e=>{updates[db.ref('activityLog').push().key]=e;});
  return db.ref('activityLog').update(updates);
 }).catch(e=>console.warn('backfill activity failed',e));
}
function subscribeToActivityLog(){
 stopActivityListener();
 const attach=()=>{
  activityListener=snapshot=>{
   const data=snapshot.val();
   activityLogs=data?Object.entries(data).filter(([,v])=>v&&typeof v==='object').map(([id,val])=>({id,...val})).sort((a,b)=>(Number(b.ts)||0)-(Number(a.ts)||0)||String(b.atISO||'').localeCompare(String(a.atISO||''))):[];
   renderActivityLog();
   if(!$('managerPage').classList.contains('hidden'))renderManagerRequests();
  };
  db.ref('activityLog').on('value',activityListener,error=>{console.error(error);});
 };
 if(activitySeeded){attach();return;}
 backfillActivityLog().finally(()=>{activitySeeded=true;attach();});
}
function renderActivityLog(){
 const container=$('activityLogList');if(!container)return;
 const filter=$('activityFilter');
 if(filter&&filter.options.length<=1){getEmployeeList().forEach(n=>{const o=document.createElement('option');o.value=n;o.textContent=n;filter.appendChild(o);});}
 const current=filter?filter.value:'';
 const rows=activityLogs.filter(e=>!current||e.empName===current);
 const count=$('activityCount');if(count)count.textContent=rows.length?`ทั้งหมด ${rows.length} รายการ`:'ไม่มีรายการ';
 container.innerHTML=rows.length?rows.map(e=>{const m=ACTIVITY_META[e.action]||{icon:'•',label:'ทำรายการ',cls:'bg-white border-gray-200'};return `<div class="p-2 rounded selectable-item ${m.cls}" data-select-key="log:${escapeHTML(e.id)}"><div class="flex flex-wrap justify-between items-center mb-1 gap-2"><span class="font-semibold text-xs">${m.icon} ${escapeHTML(e.empName)} — ${escapeHTML(e.label||m.label)}</span><span class="text-xs opacity-70 whitespace-nowrap">${escapeHTML(e.at||'-')}</span></div><div class="space-y-1 pl-2">${e.details?`<div class="text-xs break-words">${escapeHTML(e.details)}</div>`:''}<div class="text-xs opacity-70">โดย: ${escapeHTML(e.by||'-')}${e.backfilled?' · ข้อมูลย้อนหลัง':''}</div></div><div class="item-delete mt-2 pt-2 border-t"><button type="button" data-action="delete-log" data-id="${escapeHTML(e.id)}" class="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-xs"><i class="fa fa-trash mr-1"></i> ลบรายการนี้</button></div></div>`;}).join(''):'<p class="text-gray-500 text-center py-2">ยังไม่มีประวัติการทำรายการ</p>';
}

// Employee-specific password verification. Passwords are stored as salted PBKDF2 hashes, never as plain text.
function bytesToBase64(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes)));}
function base64ToBytes(value){return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}
let connCloud=null;
function renderConnStatus(){
 const el=$('connStatus');if(!el)return;
 const dot=el.firstElementChild;if(!dot)return;
 const online=navigator.onLine!==false;
 let color='bg-orange-500',label='สัญญาณติดขัด';
 if(!online){color='bg-red-500';label='ขาดการเชื่อมต่อ';}
 else if(connCloud===true){color='bg-green-500';label='เชื่อมต่อระบบสำเร็จ';}
 dot.className='block w-4 h-4 rounded-full animate-pulse '+color;
 el.title=label;el.setAttribute('aria-label',label);
}
function checkConnection(){connectionListener=snap=>{connCloud=snap.val()===true;renderConnStatus();};db.ref('.info/connected').on('value',connectionListener, error=>{console.warn(error);});window.addEventListener('online',renderConnStatus);window.addEventListener('offline',renderConnStatus);renderConnStatus();}
function initEmployeeOptions(){
  const select=$('empName'),managerSelect=$('managerEmpName'),loginSelect=$('loginUsername');
  const list=getEmployeeList();
  if(select) select.innerHTML='<option value="">-- กรุณาเลือกชื่อ-นามสกุล --</option>';
  if(managerSelect) managerSelect.innerHTML='<option value="">-- เลือกพนักงาน --</option>';
  list.forEach(name=>{
    if(select){const opt=document.createElement('option');opt.value=name;opt.textContent=name;select.appendChild(opt);}
    if(managerSelect){const managerOpt=document.createElement('option');managerOpt.value=name;managerOpt.textContent=name;managerSelect.appendChild(managerOpt);}
  });
  if(select){select.onchange=()=>{currentUser=select.value||null;renderEmployeeRequests();};}
  // Login dropdown: every employee
  if(loginSelect){
    loginSelect.innerHTML='<option value="">-- กรุณาเลือกชื่อพนักงาน --</option>';
    list.forEach(name=>{const opt=document.createElement('option');opt.value=name;opt.textContent=name;loginSelect.appendChild(opt);});
  }
  if($('btnAdminLogin')) $('btnAdminLogin').textContent=ADMIN_BUTTON_LABEL;
}
function parseLocalDate(dateStr){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr||'')))return null;const [y,m,d]=dateStr.split('-').map(Number);const date=new Date(y,m-1,d);return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d?date:null;}
function dateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function calculateDays(){const s=parseLocalDate($('startDate').value),e=parseLocalDate($('endDate').value);if(!s||!e||e<s){$('leaveDays').value='';if($('startDate').value&&$('endDate').value)showToast('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มลา',true);return false;}const days=Math.round((Date.UTC(e.getFullYear(),e.getMonth(),e.getDate())-Date.UTC(s.getFullYear(),s.getMonth(),s.getDate()))/86400000)+1;$('leaveDays').value=days;return true;}
const STATUS={PENDING:'รออนุมัติ',APPROVED:'อนุมัติ',REJECTED:'ไม่อนุมัติ',IN_PROGRESS:'รอการดำเนินการ',CANCELLED:'ยกเลิกแล้ว',CANCEL_APPROVED:'อนุมัติยกเลิกแล้ว',CANCEL_PENDING:'รอยกเลิก',CANCEL_REJECTED:'ไม่อนุมัติยกเลิก'};
function normalizeStatus(value){const v=String(value??'').trim();return v||STATUS.PENDING;}
function isCancelled(req){return normalizeStatus(req.status)===STATUS.CANCELLED||normalizeStatus(req.cancelStatus)===STATUS.CANCELLED;}
function isActiveRequest(req){return normalizeStatus(req.status)!==STATUS.REJECTED&&normalizeStatus(req.cancelStatus)!==STATUS.CANCELLED&&parseLocalDate(req.startDate)&&parseLocalDate(req.endDate);}
function getLeaveCountByDate(targetDate,excludeId=null){return leaveRequests.filter(req=>req.id!==excludeId&&isActiveRequest(req)).filter(req=>req.startDate<=targetDate&&req.endDate>=targetDate).length;}
function checkLeaveAvailability(startDate,endDate,excludeId=null){const s=parseLocalDate(startDate),e=parseLocalDate(endDate);if(!s||!e||e<s)return ['วันที่ไม่ถูกต้อง'];const conflicts=[];for(let d=new Date(s);d<=e;d.setDate(d.getDate()+1)){const key=dateKey(d);if(getLeaveCountByDate(key,excludeId)>=2)conflicts.push(key);}return conflicts;}
function rangesOverlap(aStart,aEnd,bStart,bEnd){const as=parseLocalDate(aStart),ae=parseLocalDate(aEnd),bs=parseLocalDate(bStart),be=parseLocalDate(bEnd);if(!as||!ae||!bs||!be)return false;return as<=be&&bs<=ae;}
function findOwnOverlaps(empName,startDate,endDate,excludeId=null){if(!empName)return [];return leaveRequests.filter(req=>req.id!==excludeId&&req.empName===empName&&isActiveRequest(req)&&rangesOverlap(startDate,endDate,req.startDate,req.endDate));}
function findDuplicateRequest(empName,startDate,endDate){return leaveRequests.filter(req=>req.empName===empName&&req.startDate===startDate&&req.endDate===endDate&&isActiveRequest(req));}
function groupLeavesByDate(){const groups={};leaveRequests.forEach(req=>{if(!isActiveRequest(req))return;const s=parseLocalDate(req.startDate),e=parseLocalDate(req.endDate);for(let d=new Date(s);d<=e;d.setDate(d.getDate()+1)){const key=dateKey(d);(groups[key]||(groups[key]=[])).push({name:req.empName,type:req.leaveType,status:req.status||'รออนุมัติ'});}});return Object.entries(groups).sort((a,b)=>a[0].localeCompare(b[0]));}
function formatDateTh(dateStr){const d=parseLocalDate(dateStr);return d?d.toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'}):escapeHTML(dateStr);}
function statusClass(status){return status==='อนุมัติ'?'text-green-700':status==='รออนุมัติ'?'text-yellow-700':'text-red-700';}
// ===== วันหยุดราชการ & วันสำคัญ (แสดงในปฏิทินเท่านั้น ไม่กระทบการนับจำนวนวันลา) =====
// t: 'h' = วันหยุดราชการ | 's' = วันสำคัญ (เช่น วันตรุษจีน, วันเข้าพรรษา) ซึ่งไม่ใช่วันหยุดราชการ
// กลุ่มที่ 1 : วันที่คงที่ทุกปี — คำนวณอัตโนมัติตามปี พ.ศ. ที่เลือกในปฏิทิน
const HOLIDAYS_FIXED=[
  {m:1,d:1,n:'วันขึ้นปีใหม่สากล',s:'ขึ้นปีใหม่',t:'h'},
  {m:1,d:16,n:'วันครูแห่งชาติ',s:'วันครู',t:'s'},
  {m:2,d:3,n:'วันทหารผ่านศึก',s:'ทหารผ่านศึก',t:'s'},
  {m:4,d:6,n:'วันจักรี',s:'วันจักรี',t:'h'},
  {m:4,d:13,n:'วันสงกรานต์',s:'สงกรานต์',t:'h'},
  {m:4,d:14,n:'วันสงกรานต์',s:'สงกรานต์',t:'h'},
  {m:4,d:15,n:'วันสงกรานต์',s:'สงกรานต์',t:'h'},
  {m:5,d:1,n:'วันแรงงานแห่งชาติ',s:'แรงงาน',t:'h'},
  {m:6,d:3,n:'วันคล้ายวันเฉลิมพระชนมพรรษา พระราชินี',s:'พระราชินี',t:'h'},
  {m:7,d:28,n:'วันคล้ายวันเฉลิมพระชนมพรรษาสมเด็จพระเจ้าอยู่หัว ร.10',s:'พระราชินี ร.10',t:'h'},
  {m:8,d:12,n:'วันแม่แห่งชาติ',s:'วันแม่',t:'h'},
  {m:9,d:24,n:'วันมหิดล',s:'วันมหิดล',t:'s'},
  {m:11,d:21,n:'วันปฐมศนาราช และวันสังคมสงเคราะห์แห่งชาติ',s:'ปฐมศนาราช',t:'s'},
  {m:10,d:13,n:'วันคล้ายวันสวรรคตพระบรมราชชนมพรรษา',s:'สวรรคต',t:'h'},
  {m:10,d:14,n:'วันตั้งธรรมา',s:'ตั้งธรรมา',t:'s'},
  {m:12,d:5,n:'วันคล้ายวันเฉลิมพระชนมพรรษา ร.9 และวันพ่อแห่งชาติ',s:'วันพ่อ',t:'h'},
  {m:12,d:10,n:'วันพระราชทานรัฐธรรมนูญ',s:'รัฐธรรมนูญ',t:'h'},
  {m:12,d:25,n:'วันคริสต์มาส',s:'คริสต์มาส',t:'s'},
  {m:12,d:31,n:'วันสิ้นสุดของปี',s:'สิ้นปี',t:'h'}
];
// กลุ่มที่ 2 : วันที่เปลี่ยนตามจันทรคติ / มติ ครม. (คีย์ = ปี ค.ศ. ของวันที่) — เพิ่มปีใหม่ได้ที่นี่
const HOLIDAYS_BY_YEAR={
  2024:[
    {md:'01-13',n:'วันเด็กแห่งชาติ',s:'วันเด็ก',t:'s'},
    {md:'02-10',n:'วันตรุษจีน',s:'ตรุษจีน',t:'s'},
    {md:'02-24',n:'วันมาฆบูชา',s:'มาฆบูชา',t:'h',b:1},
    {md:'02-26',n:'ชดเชยวันมาฆบูชา',s:'ชดเชยมาฆบูชา',t:'h'},
    {md:'04-08',n:'ชดเชยวันจักรี',s:'ชดเชยจักรี',t:'h'},
    {md:'04-16',n:'ชดเชยวันสงกรานต์',s:'ชดเชยสงกรานต์',t:'h'},
    {md:'05-04',n:'วันฉัตรมงคล',s:'ฉัตรมงคล',t:'h'},
    {md:'05-06',n:'ชดเชยวันฉัตรมงคล',s:'ชดเชยฉัตรมงคล',t:'h'},
    {md:'05-10',n:'วันพืชมงคล',s:'พืชมงคล',t:'h'},
    {md:'05-22',n:'วันวิสาขบูชา',s:'วิสาขบูชา',t:'h',b:1},
    {md:'07-20',n:'วันอาสาฬหบูชา',s:'อาสาฬหบูชา',t:'h',b:1},
    {md:'07-21',n:'วันเข้าพรรษา',s:'เข้าพรรษา',t:'b'},
    {md:'07-22',n:'ชดเชยวันอาสาฬหบูชา',s:'ชดเชยอาสาฬ',t:'h'},
    {md:'07-29',n:'ชดเชยวันคล้ายวันเฉลิมพระชนมพรรษาสมเด็จพระเจ้าอยู่หัว ร.10',s:'ชดเชย ร.10',t:'h'},
    {md:'10-14',n:'ชดเชยวันคล้ายวันสวรรคตพระบรมราชชนมพรรษา',s:'ชดเชยสวรรคต',t:'h'},
    {md:'10-18',n:'วันปวารณาออกพรรษา (วันออกพรรษา)',s:'ออกพรรษา',t:'b'},
    {md:'10-23',n:'วันปิยมหาราช',s:'ปิยมหาราช',t:'h'},
    {md:'12-30',n:'วันสิ้นสุดของปี',s:'สิ้นปี',t:'h'}
  ],
  2025:[
    {md:'01-11',n:'วันเด็กแห่งชาติ',s:'วันเด็ก',t:'s'},
    {md:'01-29',n:'วันตรุษจีน',s:'ตรุษจีน',t:'s'},
    {md:'02-12',n:'วันมาฆบูชา',s:'มาฆบูชา',t:'h',b:1},
    {md:'04-07',n:'ชดเชยวันจักรี',s:'ชดเชยจักรี',t:'h'},
    {md:'04-16',n:'ชดเชยวันสงกรานต์',s:'ชดเชยสงกรานต์',t:'h'},
    {md:'05-04',n:'วันฉัตรมงคล',s:'ฉัตรมงคล',t:'h'},
    {md:'05-05',n:'ชดเชยวันฉัตรมงคล',s:'ชดเชยฉัตรมงคล',t:'h'},
    {md:'05-09',n:'วันพืชมงคล',s:'พืชมงคล',t:'h'},
    {md:'05-11',n:'วันวิสาขบูชา',s:'วิสาขบูชา',t:'h',b:1},
    {md:'05-12',n:'ชดเชยวันวิสาขบูชา',s:'ชดเชยวิสาขบูชา',t:'h'},
    {md:'06-02',n:'วันหยุดพิเศษ ตาม มติ ครม.',s:'วันหยุดพิเศษ',t:'h'},
    {md:'07-10',n:'วันอาสาฬหบูชา',s:'อาสาฬหบูชา',t:'h',b:1},
    {md:'07-11',n:'วันเข้าพรรษา',s:'เข้าพรรษา',t:'b'},
    {md:'08-11',n:'วันหยุดพิเศษ ตาม มติ ครม.',s:'วันหยุดพิเศษ',t:'h'},
    {md:'10-07',n:'วันปวารณาออกพรรษา (วันออกพรรษา)',s:'ออกพรรษา',t:'b'},
    {md:'10-23',n:'วันปิยมหาราช',s:'ปิยมหาราช',t:'h'}
  ],
  2026:[
    {md:'01-02',n:'วันหยุดพิเศษ ตาม มติ ครม.',s:'วันหยุดพิเศษ',t:'h'},
    {md:'01-10',n:'วันเด็กแห่งชาติ',s:'วันเด็ก',t:'s'},
    {md:'02-17',n:'วันตรุษจีน',s:'ตรุษจีน',t:'s'},
    {md:'03-03',n:'วันมาฆบูชา',s:'มาฆบูชา',t:'h',b:1},
    {md:'05-04',n:'วันฉัตรมงคล',s:'ฉัตรมงคล',t:'h'},
    {md:'05-13',n:'วันพืชมงคล',s:'พืชมงคล',t:'h'},
    {md:'05-31',n:'วันวิสาขบูชา',s:'วิสาขบูชา',t:'h',b:1},
    {md:'06-01',n:'ชดเชยวันวิสาขบูชา',s:'ชดเชยวิสาขบูชา',t:'h'},
    {md:'07-29',n:'วันอาสาฬหบูชา',s:'อาสาฬหบูชา',t:'h',b:1},
    {md:'07-30',n:'วันเข้าพรรษา',s:'เข้าพรรษา',t:'b'},
    {md:'10-23',n:'วันปิยมหาราช',s:'ปิยมหาราช',t:'h'},
    {md:'10-26',n:'วันปวารณาออกพรรษา (วันออกพรรษา)',s:'ออกพรรษา',t:'b'},
    {md:'12-07',n:'ชดเชยวันคล้ายวันเฉลิมพระชนมพรรษา ร.9 และวันพ่อแห่งชาติ',s:'ชดเชยวันพ่อ',t:'h'}
  ],
  2027:[
    {md:'01-09',n:'วันเด็กแห่งชาติ',s:'วันเด็ก',t:'s'},
    {md:'02-06',n:'วันตรุษจีน',s:'ตรุษจีน',t:'s'},
    {md:'02-21',n:'วันมาฆบูชา',s:'มาฆบูชา',t:'h',b:1},
    {md:'02-22',n:'ชดเชยวันมาฆบูชา',s:'ชดเชยมาฆบูชา',t:'h'},
    {md:'05-03',n:'วันฉัตรมงคล',s:'ฉัตรมงคล',t:'h'},
    {md:'05-20',n:'วันวิสาขบูชา',s:'วิสาขบูชา',t:'h',b:1},
    {md:'07-18',n:'วันอาสาฬหบูชา',s:'อาสาฬหบูชา',t:'h',b:1},
    {md:'07-19',n:'ชดเชยวันอาสาฬหบูชา และวันเข้าพรรษา',s:'ชดเชยอาสาฬ',t:'h',b:1},
    {md:'10-15',n:'วันปวารณาออกพรรษา (วันออกพรรษา)',s:'ออกพรรษา',t:'b'},
    {md:'10-23',n:'วันปิยมหาราช',s:'ปิยมหาราช',t:'h'},
    {md:'10-25',n:'ชดเชยวันปิยมหาราช',s:'ชดเชยปิยมหาราช',t:'h'},
    {md:'11-13',n:'วันลอยกระทง (วันสุดท้ายของกฐินกาล)',s:'ลอยกระทง',t:'s'},
    {md:'12-06',n:'ชดเชยวันคล้ายวันเฉลิมพระชนมพรรษา ร.9 และวันพ่อแห่งชาติ',s:'ชดเชยวันพ่อ',t:'h'}
  ]
};
const HOLIDAY_TYPE_LABEL={h:'วันหยุดราชการ',s:'วันสำคัญ',b:'วันพระ'};
const HOLIDAY_TYPE_ICON={h:'🎉',s:'📌',b:'🌕'};
const _holidayCache={};
function holidayMapForYear(gy){
  if(_holidayCache[gy])return _holidayCache[gy];
  const map={},pad=n=>String(n).padStart(2,'0');
  HOLIDAYS_FIXED.forEach(h=>{map[`${gy}-${pad(h.m)}-${pad(h.d)}`]={name:h.n,short:h.s,type:h.t,b:!!h.b};});
  (HOLIDAYS_BY_YEAR[gy]||[]).forEach(h=>{map[`${gy}-${h.md}`]={name:h.n,short:h.s,type:h.t,b:!!h.b};});
  _holidayCache[gy]=map;
  return map;
}
function getHoliday(dateStr){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr||'')))return null;
  return holidayMapForYear(Number(dateStr.slice(0,4)))[dateStr]||null;
}
function holidayTagHtml(hol){
  if(!hol)return '';
  let out=`<span class="holiday-tag ${hol.type}" title="${escapeHTML(hol.name)}">${HOLIDAY_TYPE_LABEL[hol.type]||''}</span>`;
  if(hol.b&&hol.type!=='b')out+=' <span class="holiday-tag b" title="วันพระ">วันพระ</span>';
  return out;
}
function renderMonthCalendar(containerId,mode){
 const container=$(containerId);if(!container)return;
 const month=new Date(monthCursor[mode].getFullYear(),monthCursor[mode].getMonth(),1);
 const year=month.getFullYear(),monthIndex=month.getMonth(),firstDay=month.getDay(),daysInMonth=new Date(year,monthIndex+1,0).getDate();
 const grouped=Object.fromEntries(groupLeavesByDate());
 const holidays=holidayMapForYear(year);
 const monthNameTh=month.toLocaleDateString('th-TH',{month:'long'});
 const title=month.toLocaleDateString('th-TH',{month:'long',year:'numeric'});
 let html=`<div class="month-nav"><button type="button" data-month-nav="${mode}" data-step="-1" aria-label="เดือนก่อนหน้า"><i class="fa fa-chevron-left"></i></button><strong>${title}</strong><button type="button" data-month-nav="${mode}" data-step="1" aria-label="เดือนถัดไป"><i class="fa fa-chevron-right"></i></button></div>`;
 html+='<div class="month-grid mb-2">'+['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'].map((d,i)=>`<div class="month-weekday ${i===6?'sat':i===0?'sun':''} text-center text-xs font-bold py-1">${d}</div>`).join('')+'</div><div class="month-grid">';
 for(let i=0;i<firstDay;i++)html+='<div class="month-day empty"></div>';
 const today=dateKey(new Date());
 for(let day=1;day<=daysInMonth;day++){
  const key=`${year}-${String(monthIndex+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const list=grouped[key]||[],count=list.length,weekday=new Date(year,monthIndex,day).getDay(),weekendClass=weekday===6?'weekend-sat':weekday===0?'weekend-sun':'',classes=['month-day',weekendClass,count>=2?'leave-full':count===1?'leave-one':'',key===today?'today':''].filter(Boolean).join(' ');
  const names=list.slice(0,2).map(x=>escapeHTML(x.name.replace(/^(นาย|นางสาว|นาง)/,''))).join('<br>');
  const hol=holidays[key]||null;
  const holBadge=hol?`<span class="day-holiday ${hol.type==='s'?'special':hol.type==='b'?'buddhist':''}" title="${escapeHTML(hol.name)}">${HOLIDAY_TYPE_ICON[hol.type]||'🎉'} ${escapeHTML(hol.short)}</span>`:'';
  const tip=[hol?`🎉 ${hol.name} (${hol.b&&hol.type!=='b'?'วันหยุดราชการ/วันพระ':(HOLIDAY_TYPE_LABEL[hol.type]||'')})`:'',count?list.map(x=>x.name+' — '+x.type+' ('+x.status+')').join('\n'):'ไม่มีรายการลา'].filter(Boolean).join('\n');
  html+=`<button type="button" class="${classes}" data-calendar-date="${key}" data-calendar-mode="${mode}" title="${escapeHTML(tip)}"><span class="day-num">${day}</span>${holBadge}${count?`<span class="day-count ${count>=2?'text-red-700':'text-yellow-800'}">${count}/2 คน</span><span class="day-names">${names}${count>2?'<br>…':''}</span>`:'<span class="day-count text-gray-300">—</span>'}</button>`;
 }
 const monthHolidays=[];
 for(let day=1;day<=daysInMonth;day++){
  const h=holidays[`${year}-${String(monthIndex+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`];
  if(h)monthHolidays.push({day,h});
 }
 const holidayPanel=`<div class="holiday-list"><h4>🎉 วันหยุด วันพระ และวันสำคัญ — ${monthNameTh} พ.ศ. ${year+543}</h4>${monthHolidays.length?'<ul>'+monthHolidays.map(x=>`<li><strong>${x.day}</strong> ${monthNameTh} · ${holidayTagHtml(x.h)} ${escapeHTML(x.h.name)}</li>`).join('')+'</ul>':'<ul><li>ไม่มีวันหยุด วันพระ หรือวันสำคัญในเดือนนี้</li></ul>'}</div>`;
 html+='</div><div class="flex flex-wrap gap-3 text-xs mt-3"><span class="px-2 py-1 rounded bg-sky-100 text-sky-800">🟦 วันเสาร์</span><span class="px-2 py-1 rounded bg-rose-100 text-rose-800">🟥 วันอาทิตย์</span><span class="px-2 py-1 rounded bg-amber-100 text-amber-800">🟨 มีผู้ลา 1 คน</span><span class="px-2 py-1 rounded bg-red-100 text-red-800">🔴 ครบ 2 คนขึ้นไป</span><span class="px-2 py-1 rounded bg-white border text-blue-700">🔵 วันนี้</span><span class="px-2 py-1 rounded bg-violet-100 text-violet-800">🎉 วันหยุดราชการ</span><span class="px-2 py-1 rounded bg-orange-100 text-orange-800">🌕 วันพระ</span><span class="px-2 py-1 rounded bg-emerald-100 text-emerald-800">📌 วันสำคัญ</span></div>'+holidayPanel+'<p class="text-xs text-gray-500 mt-2">หมายเหตุ: หากวันเสาร์/อาทิตย์มีผู้ลา สีจะแสดงตามสถานะโควตาการลาเป็นหลัก · ป้าย 🎉 = วันหยุดราชการ, 🌕 = วันพระ, 📌 = วันสำคัญ (แสดงอย่างเดียว ไม่กระทบการนับจำนวนวันลา)</p><div id="'+mode+'CalendarDetail" class="calendar-detail mt-3 p-3 bg-white border rounded-lg"><span class="text-gray-500">เลือกวันที่ในปฏิทินเพื่อดูรายละเอียดผู้ลา</span></div>';
 container.innerHTML=html;
}
function showCalendarDate(date,mode){
 const target=$(mode+'CalendarDetail');if(!target)return;
 const list=Object.fromEntries(groupLeavesByDate())[date]||[];
 const hol=getHoliday(date);
 const holHtml=hol?`<p class="mt-1">${holidayTagHtml(hol)} ${HOLIDAY_TYPE_ICON[hol.type]||'🎉'} ${escapeHTML(hol.name)}</p>`:'';
 if(!list.length){target.innerHTML=`<strong>${formatDateTh(date)}</strong>${holHtml}<p class="text-gray-500 mt-1">ไม่มีรายการลาในวันนี้</p>`;return;}
 target.innerHTML=`<strong>${formatDateTh(date)} · ${list.length} คน</strong>${holHtml}<div class="mt-2 space-y-2">${list.map(x=>`<div class="flex flex-wrap justify-between gap-2 border-t pt-2"><span>👤 ${escapeHTML(x.name)} — ${escapeHTML(x.type)}</span><span class="${statusClass(x.status)} font-semibold">${escapeHTML(x.status)}</span></div>`).join('')}</div>`;
}
function renderLeaveCalendar(containerId){const container=$(containerId),grouped=groupLeavesByDate();if(!grouped.length){container.innerHTML='<p class="text-gray-500 text-center py-2">ยังไม่มีรายการลา</p>';return;}container.innerHTML=grouped.map(([date,list])=>{const full=list.length>=2;const hol=getHoliday(date);const holBadge=hol?` <span class="holiday-tag ${hol.type}" title="${escapeHTML(hol.name)}">${HOLIDAY_TYPE_ICON[hol.type]||'🎉'} ${escapeHTML(hol.short)}</span>`:'';return `<div class="p-2 rounded ${full?'bg-red-100 border border-red-200':'bg-white border border-gray-200'}"><div class="flex justify-between items-center mb-1 gap-2"><span class="font-semibold">📆 ${formatDateTh(date)}${holBadge}</span><span class="text-xs font-bold ${full?'text-red-600':'text-green-600'}">${list.length}/2 คน ${full?'เต็ม':''}</span></div><div class="space-y-1 pl-2">${list.map(i=>`<div class="text-xs flex flex-wrap justify-between gap-1"><span>👤 ${escapeHTML(i.name)} — ${escapeHTML(i.type)}</span><span class="${statusClass(i.status)}">${escapeHTML(i.status)}</span></div>`).join('')}</div></div>`;}).join('');}
function renderEmployeeRequests(){const container=$('myRequests');if(!currentUser){container.innerHTML='<p class="text-gray-500 text-center py-4">เลือกชื่อแล้วจะแสดงประวัติของคุณที่นี่</p>';return;}const my=leaveRequests.filter(r=>r.empName===currentUser);if(!my.length){container.innerHTML=`<p class="text-gray-500 text-center py-4">ยังไม่มีประวัติของคุณ (${escapeHTML(currentUser)})</p>`;return;}container.innerHTML=my.map(r=>{const cancelStatus=r.cancelStatus||'';const canRequestCancel=normalizeStatus(r.status)!==STATUS.REJECTED&&!isCancelled(r)&&normalizeStatus(r.cancelStatus)!==STATUS.CANCEL_PENDING&&String(r.endDate||'')>=dateKey(new Date());const cancelInfo=cancelStatus?`<p class="text-sm mt-2 ${cancelStatus==='ยกเลิกแล้ว'?'text-green-700':cancelStatus==='รอยกเลิก'?'text-orange-700': 'text-red-700'}"><strong>สถานะยกเลิก:</strong> ${escapeHTML(cancelStatus)}${r.cancelReason?' · เหตุผล: '+escapeHTML(r.cancelReason):''}</p>`:'';return `<div class="border rounded-lg p-3 ${r.cancelStatus==='ยกเลิกแล้ว'?'border-gray-300 bg-gray-50':r.cancelStatus==='ไม่อนุมัติยกเลิก'?'border-red-300 bg-red-50':r.status==='อนุมัติ'?'border-green-300 bg-green-50':r.status==='ไม่อนุมัติ'?'border-red-300 bg-red-50':'border-yellow-300 bg-yellow-50'}"><div class="flex justify-between items-start gap-3"><div class="min-w-0"><p class="font-medium">${escapeHTML(r.leaveType)}</p><p class="text-sm text-gray-600">${escapeHTML(r.startDate)} ถึง ${escapeHTML(r.endDate)} (${escapeHTML(r.leaveDays)} วัน)</p><p class="text-sm text-gray-600">เหตุผลการลา: ${escapeHTML(r.reason)}</p><p class="text-sm text-gray-500">ส่งเมื่อ: ${escapeHTML(r.submittedAt)}</p>${cancelInfo}</div><span class="status-pill px-2 py-1 text-xs rounded-full font-medium ${r.status===STATUS.CANCEL_APPROVED||r.cancelStatus==='ยกเลิกแล้ว'?'bg-teal-600 text-white':r.cancelStatus==='ไม่อนุมัติยกเลิก'?'bg-red-500 text-white':r.status==='อนุมัติ'?'bg-green-500 text-white':r.status==='ไม่อนุมัติ'?'bg-red-500 text-white':'bg-yellow-400 text-yellow-900'}">${escapeHTML(r.status===STATUS.CANCEL_APPROVED||r.cancelStatus==='ยกเลิกแล้ว'?STATUS.CANCEL_APPROVED:r.cancelStatus==='ไม่อนุมัติยกเลิก'?STATUS.CANCEL_REJECTED:(r.status||'รออนุมัติ'))}</span></div>${canRequestCancel?`<div class="mt-3 pt-3 border-t"><button type="button" data-action="request-cancel" data-id="${escapeHTML(r.id)}" class="px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm"><i class="fa fa-calendar-xmark mr-1"></i> ขอยกเลิกวันลา</button></div>`:''}</div>`;}).join('');}
function renderManagerDashboard(){
 const rows=leaveRequests;
 const cancelled=r=>isCancelled(r);
 const approved=r=>!cancelled(r)&&normalizeStatus(r.status)===STATUS.APPROVED;
 const rejected=r=>!cancelled(r)&&normalizeStatus(r.status)===STATUS.REJECTED;
 const cancelPending=r=>normalizeStatus(r.cancelStatus)===STATUS.CANCEL_PENDING;
 const cancelRejected=r=>normalizeStatus(r.cancelStatus)===STATUS.CANCEL_REJECTED;
 const pending=r=>!cancelled(r)&&!cancelPending(r)&&!cancelRejected(r)&&(normalizeStatus(r.status)===STATUS.PENDING||normalizeStatus(r.status)===STATUS.IN_PROGRESS);
 const outstanding=r=>pending(r)||cancelPending(r);
 const set=(id,n)=>{const el=$(id);if(el)el.textContent=String(n);};
 set('dashTotal',rows.length);set('dashApproved',rows.filter(approved).length);set('dashPending',rows.filter(pending).length);set('dashRejected',rows.filter(rejected).length);set('dashCancelled',rows.filter(cancelled).length);set('dashCancelPending',rows.filter(cancelPending).length);set('dashCancelRejected',rows.filter(cancelRejected).length);set('dashOutstanding',rows.filter(outstanding).length);
 const types=[...new Set(['ลาพักร้อน (AN)','ลากิจ (P)','ลาป่วย (S)','ลากิจพิเศษ (PN)','Thank You Day',...rows.map(r=>r.leaveType||'ไม่ระบุประเภท')])];
 const typeBody=$('dashTypeRows');if(typeBody)typeBody.innerHTML=types.map(t=>{const a=rows.filter(r=>(r.leaveType||'ไม่ระบุประเภท')===t);return `<tr><td>${escapeHTML(t)}</td><td>${a.length}</td><td>${a.filter(approved).length}</td><td>${a.filter(pending).length}</td><td>${a.filter(rejected).length}</td><td>${a.filter(cancelled).length}</td></tr>`;}).join('');
 const list=$('dashOutstandingList');if(list){const a=rows.filter(outstanding);list.innerHTML=a.length?a.map(r=>`<div class="summary-item border rounded-lg p-3 bg-white"><p class="font-semibold">${escapeHTML(r.empName||'ไม่ระบุชื่อ')} — ${escapeHTML(r.leaveType||'ไม่ระบุประเภท')}</p><p>${escapeHTML(r.startDate||'-')} ถึง ${escapeHTML(r.endDate||'-')} · ${escapeHTML(r.leaveDays??'-')} วัน</p><p>สถานะ: ${escapeHTML(r.cancelStatus==='รอยกเลิก'?'รออนุมัติยกเลิก':r.status||'รออนุมัติ')}</p><p>เหตุผล: ${escapeHTML(r.cancelStatus==='รอยกเลิก'?(r.cancelReason||'ไม่ระบุ'):r.reason||'ไม่ระบุ')}</p></div>`).join(''):'<p class="summary-item text-green-700">ไม่มีรายการค้างดำเนินการ</p>';}
}
const statsCharts={byEmployee:null,byStatus:null,topDays:null};
const statsState={monthFrom:'',monthTo:'',empName:'',leaveType:'',scope:'approved',workdayOnly:false};
const STATS_BUCKETS=[
  {key:'อนุมัติ',label:'อนุมัติแล้ว',color:'#16a34a'},
  {key:'รออนุมัติ',label:'รออนุมัติ',color:'#f59e0b'},
  {key:'ไม่อนุมัติ',label:'ไม่อนุมัติ',color:'#dc2626'},
  {key:'รอยกเลิก',label:'รออนุมัติยกเลิก',color:'#ea580c'},
  {key:'ไม่อนุมัติยกเลิก',label:'ไม่อนุมัติยกเลิก',color:'#6366f1'},
  {key:'ยกเลิกแล้ว',label:'ยกเลิกแล้ว',color:'#94a3b8'}
];
const STATS_SCOPES={approved:'อนุมัติแล้วเท่านั้น',withPending:'รวมที่รออนุมัติ',active:'รวมทุกสถานะ (ยังไม่ยกเลิก)'};
const LEAVE_TYPE_COLORS={'ลาพักร้อน (AN)':'#2563eb','ลากิจ (P)':'#16a34a','ลาป่วย (S)':'#f59e0b','ลากิจพิเศษ (PN)':'#dc2626','Thank You Day':'#9333ea'};
const EXTRA_TYPE_COLORS=['#0891b2','#db2777','#65a30d','#ea580c','#4f46e5','#0d9488','#be123c','#7c3aed','#a16207','#0f766e','#64748b','#475569'];
// จัดสีประเภทการลาให้แต่ละประเภทได้สีที่ "ไม่ซ้ำกัน" เสมอ (กันสีชนกับประเภทอื่น)
function leaveTypeColorMap(types){
  const map={},used=new Set(Object.values(LEAVE_TYPE_COLORS));
  let extra=0;
  (types||[]).forEach(t=>{
    if(map[t])return;
    if(LEAVE_TYPE_COLORS[t]){map[t]=LEAVE_TYPE_COLORS[t];used.add(map[t]);return;}
    let color=EXTRA_TYPE_COLORS.find(c=>!used.has(c));
    if(!color){const hue=Math.round((extra*137.508)%360);extra++;color=`hsl(${hue},65%,45%)`;}
    used.add(color);map[t]=color;
  });
  return map;
}
// จัดกลุ่มสถานะแบบ "หนึ่งคำขอ = หนึ่งสถานะ" เพื่อให้ตัวเลขทุกการ์ด/ทุกกราฟสอดคล้องกัน
function statsBucket(req){const status=normalizeStatus(req.status);const cancelStatus=String(req.cancelStatus??'').trim();if(status===STATUS.CANCELLED||cancelStatus===STATUS.CANCELLED)return 'ยกเลิกแล้ว';if(cancelStatus===STATUS.CANCEL_PENDING)return 'รอยกเลิก';if(cancelStatus===STATUS.CANCEL_REJECTED)return 'ไม่อนุมัติยกเลิก';if(status===STATUS.APPROVED)return 'อนุมัติ';if(status===STATUS.REJECTED)return 'ไม่อนุมัติ';return 'รออนุมัติ';}
function statsWorkdayCount(startDate,endDate){const s=parseLocalDate(startDate),e=parseLocalDate(endDate);if(!s||!e||e<s)return 0;let n=0;for(let d=new Date(s);d<=e;d.setDate(d.getDate()+1)){const day=d.getDay();if(day!==0&&day!==6)n++;}return n;}
function statsDaysOf(r,from,to){const s=parseLocalDate(r.startDate),e=parseLocalDate(r.endDate);if(!s||!e||e<s)return Number(r.leaveDays)||0;let n=0;for(let d=new Date(s);d<=e;d.setDate(d.getDate()+1)){const k=dateKey(d);if(from&&k<from)continue;if(to&&k>to)continue;if(statsState.workdayOnly){const w=d.getDay();if(w===0||w===6)continue;}n++;}return n;}
function statsMonthStart(month){const m=/^(\d{4})-(\d{2})$/.exec(String(month||''));if(!m)return '';const y=+m[1],mo=+m[2];if(mo<1||mo>12)return '';return `${y}-${String(mo).padStart(2,'0')}-01`;}
function statsMonthEnd(month){const m=/^(\d{4})-(\d{2})$/.exec(String(month||''));if(!m)return '';const y=+m[1],mo=+m[2];if(mo<1||mo>12)return '';const last=new Date(y,mo,0).getDate();return `${y}-${String(mo).padStart(2,'0')}-${String(last).padStart(2,'0')}`;}
function formatDateShort(key){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key||''));if(!m)return String(key||'');return `${m[3]}/${m[2]}/${+m[1]+543}`;}
function statsScopeRows(rows){if(statsState.scope==='withPending')return rows.filter(r=>r.bucket==='อนุมัติ'||r.bucket==='รออนุมัติ');if(statsState.scope==='active')return rows.filter(r=>r.bucket!=='ยกเลิกแล้ว');return rows.filter(r=>r.bucket==='อนุมัติ');}
function statsFilteredRows(){
  const all=leaveRequests||[];
  let from=statsMonthStart(statsState.monthFrom);
  let to=statsMonthEnd(statsState.monthTo);
  if(from&&to&&from>to){const t=from;from=to;to=t;}
  return all.filter(r=>{
    if(statsState.empName&&r.empName!==statsState.empName)return false;
    if(statsState.leaveType&&(r.leaveType||'ไม่ระบุประเภท')!==statsState.leaveType)return false;
    if(from||to){
      const s=parseLocalDate(r.startDate),e=parseLocalDate(r.endDate);
      if(!s||!e)return false;
      const sk=dateKey(s),ek=dateKey(e);
      if(from&&ek<from)return false;
      if(to&&sk>to)return false;
    }
    return true;
  }).map(r=>({...r,bucket:statsBucket(r),statsDays:statsDaysOf(r,from,to)}));
}
function syncStatsControls(){
  if($('statsMonthFrom'))statsState.monthFrom=$('statsMonthFrom').value||'';
  if($('statsMonthTo'))statsState.monthTo=$('statsMonthTo').value||'';
  if($('statsEmpFilter'))statsState.empName=$('statsEmpFilter').value||'';
  if($('statsTypeFilter'))statsState.leaveType=$('statsTypeFilter').value||'';
  if($('statsScope'))statsState.scope=$('statsScope').value||'approved';
  if($('statsWorkdayOnly'))statsState.workdayOnly=!!$('statsWorkdayOnly').checked;
}
function buildStatsFilterOptions(){
  const empSel=$('statsEmpFilter'),typeSel=$('statsTypeFilter');
  const curEmp=empSel?empSel.value:'';
  const curType=typeSel?typeSel.value:'';
  const names=[...new Set([...EMPLOYEE_LIST,...(leaveRequests||[]).map(r=>r.empName).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,'th'));
  if(empSel){
    empSel.innerHTML='<option value="">-- ทุกคน --</option>'+names.map(n=>`<option value="${escapeHTML(n)}">${escapeHTML(n)}</option>`).join('');
    empSel.value=names.indexOf(curEmp)>=0?curEmp:'';
  }
  const types=[...new Set((leaveRequests||[]).map(r=>r.leaveType||'ไม่ระบุประเภท'))].sort((a,b)=>a.localeCompare(b,'th'));
  if(typeSel){
    typeSel.innerHTML='<option value="">-- ทุกประเภท --</option>'+types.map(t=>`<option value="${escapeHTML(t)}">${escapeHTML(t)}</option>`).join('');
    typeSel.value=types.indexOf(curType)>=0?curType:'';
  }
}
function statsDailyActiveCounts(rows,from,to){
  const map={};
  rows.forEach(r=>{
    if(!isActiveRequest(r))return;
    const s=parseLocalDate(r.startDate),e=parseLocalDate(r.endDate);
    if(!s||!e)return;
    for(let d=new Date(s);d<=e;d.setDate(d.getDate()+1)){
      const key=dateKey(d);
      if(from&&key<from)continue;
      if(to&&key>to)continue;
      map[key]=(map[key]||0)+1;
    }
  });
  return map;
}
function statsDestroyCharts(){['byEmployee','byStatus','topDays'].forEach(k=>{if(statsCharts[k]){statsCharts[k].destroy();statsCharts[k]=null;}});}
// วาดชื่อพนักงานไว้เหนือแท่งกราฟของแต่ละแถว (แทนการใช้แกนชื่อด้านข้าง)
const statsEmployeeNamePlugin={
  id:'statsEmployeeNames',
  afterDatasetsDraw(chart){
    const opts=chart.options.plugins&&chart.options.plugins.statsEmployeeNames;
    if(!opts||opts.enabled===false)return;
    const ctx=chart.ctx,y=chart.scales.y,x=chart.scales.x;
    if(!y||!x||!chart.data.labels.length)return;
    const fontSize=opts.fontSize||12;
    const left=Math.round(x.getPixelForValue(x.min));
    const maxW=Math.max(20,x.right-x.left-8);
    ctx.save();
    ctx.font=`${fontSize}px Prompt, sans-serif`;
    ctx.fillStyle=document.documentElement.getAttribute('data-theme')==='dark'?'#e2e8f0':'#1e293b';
    ctx.textAlign='left';
    ctx.textBaseline='bottom';
    chart.data.labels.forEach((label,i)=>{
      let top=Infinity;
      for(let d=0;d<chart.data.datasets.length;d++){
        const el=chart.getDatasetMeta(d).data[i];
        if(el&&el.height)top=Math.min(top,el.y-el.height/2);
      }
      if(!isFinite(top))return;
      let text=String(label);
      if(ctx.measureText(text).width>maxW){
        while(text.length>1&&ctx.measureText(text+'…').width>maxW)text=text.slice(0,-1);
        text+='…';
      }
      ctx.fillText(text,left,top-4);
    });
    ctx.restore();
  }
};
function setStatsFilterVisibility(show){
  const body=$('statsFilterBody'),btn=$('btnToggleStatsFilters'),label=$('statsFilterToggleLabel'),icon=$('statsFilterToggleIcon');
  if(!body)return;
  body.classList.toggle('hidden',!show);
  if(btn)btn.setAttribute('aria-expanded',show?'true':'false');
  if(label)label.textContent=show?'ซ่อนตัวกรอง':'แสดงตัวกรอง';
  if(icon)icon.className=show?'fa fa-chevron-up mr-1':'fa fa-chevron-down mr-1';
}
function toggleStatsFilters(){
  const body=$('statsFilterBody');
  if(!body)return;
  setStatsFilterVisibility(body.classList.contains('hidden'));
}
function openStatsPage(){
  if(!managerMode){showToast('เฉพาะโหมดหัวหน้างานเท่านั้น',true);return;}
  showPage('statsPage');
  setStatsFilterVisibility(false);
  buildStatsFilterOptions();
  renderStatsCharts();
  window.scrollTo({top:0,behavior:'smooth'});
}
function closeStatsPage(){
  showPage('managerPage');
  renderManagerDashboard();
  renderMonthCalendar('managerMonthCalendar','manager');
  renderLeaveCalendar('allLeaveCalendar');
  renderManagerRequests();
  renderActivityLog();
}
function resetStatsFilters(){
  if($('statsMonthFrom'))$('statsMonthFrom').value='';
  if($('statsMonthTo'))$('statsMonthTo').value='';
  if($('statsEmpFilter'))$('statsEmpFilter').value='';
  if($('statsTypeFilter'))$('statsTypeFilter').value='';
  if($('statsScope'))$('statsScope').value='approved';
  if($('statsWorkdayOnly'))$('statsWorkdayOnly').checked=false;
  statsState.monthFrom='';statsState.monthTo='';statsState.empName='';statsState.leaveType='';statsState.scope='approved';statsState.workdayOnly=false;
  renderStatsCharts();
  showToast('ล้างตัวกรองสถิติแล้ว');
}
function renderStatsCharts(){
  const page=$('statsPage');
  if(!page||page.classList.contains('hidden'))return;
  if(typeof Chart==='undefined'){showToast('โหลดไลบรารีกราฟไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต',true);return;}
  syncStatsControls();
  const rows=statsFilteredRows();
  const scoped=statsScopeRows(rows);
  const set=(id,n)=>{const el=$(id);if(el)el.textContent=String(n);};
  const counts={};STATS_BUCKETS.forEach(b=>{counts[b.key]=0;});
  rows.forEach(r=>{counts[r.bucket]=(counts[r.bucket]||0)+1;});
  const scopedDays=scoped.reduce((s,r)=>s+r.statsDays,0);
  set('statTotal',rows.length);
  set('statApproved',counts['อนุมัติ']);
  set('statPending',counts['รออนุมัติ']);
  set('statRejected',counts['ไม่อนุมัติ']);
  set('statCancelled',counts['ยกเลิกแล้ว']);
  set('statCancelPending',counts['รอยกเลิก']);
  set('statCancelRejected',counts['ไม่อนุมัติยกเลิก']);
  set('statDays',scopedDays);

  let from=statsMonthStart(statsState.monthFrom);
  let to=statsMonthEnd(statsState.monthTo);
  if(from&&to&&from>to){const t=from;from=to;to=t;}
  const daily=statsDailyActiveCounts(rows,from,to);
  const dailyEntries=Object.entries(daily);
  const fullDays=dailyEntries.filter(([,c])=>c>=2).length;
  let busiest=null;
  dailyEntries.forEach(([d,c])=>{if(!busiest||c>busiest[1]||(c===busiest[1]&&d<busiest[0]))busiest=[d,c];});
  set('statQuotaFullDays',fullDays);
  set('statDaysWithLeave',dailyEntries.length);
  set('statBusiestDay',busiest?busiest[1]:0);
  const bd=$('statBusiestDayDate');if(bd)bd.textContent=busiest?formatDateShort(busiest[0]):'ไม่มีข้อมูล';

  const scopeText=STATS_SCOPES[statsState.scope]||STATS_SCOPES.approved;
  const mFrom=statsState.monthFrom&&statsMonthStart(statsState.monthFrom)?statsState.monthFrom:'';
  const mTo=statsState.monthTo&&statsMonthEnd(statsState.monthTo)?statsState.monthTo:'';
  const rangeText=(mFrom||mTo)?((mFrom||'เริ่มแรก')+' ถึง '+(mTo||'ปัจจุบัน')):'ทั้งหมด';
  const summary=$('statsFilterSummary');
  if(summary)summary.textContent=`ขอบเขตการนับวันลา: ${scopeText} · ช่วงเวลา: ${rangeText} · พนักงาน: ${statsState.empName||'ทุกคน'} · ประเภทการลา: ${statsState.leaveType||'ทุกประเภท'}${statsState.workdayOnly?' · นับเฉพาะวันทำงาน':''} · พบ ${rows.length} รายการ`;
  const updated=$('statsUpdatedAt');if(updated)updated.textContent='อัปเดตล่าสุด: '+new Date().toLocaleString('th-TH');
  const empNote=$('chartByEmployeeNote');if(empNote)empNote.textContent='นับตามขอบเขต: '+scopeText+' · เรียงจากมากไปน้อย · แต่ละสี = ประเภทการลา (ดูคีย์สีด้านล่าง)';

  const emptyState=$('statsEmptyState'),chartsSec=$('statsChartsSection');
  if(!rows.length){
    statsDestroyCharts();
    if(emptyState)emptyState.classList.remove('hidden');
    if(chartsSec)chartsSec.classList.add('hidden');
    return;
  }
  if(emptyState)emptyState.classList.add('hidden');
  if(chartsSec)chartsSec.classList.remove('hidden');

  const empMap=new Map();
  scoped.forEach(r=>{
    const name=r.empName||'ไม่ระบุชื่อ';
    const t=r.leaveType||'ไม่ระบุประเภท';
    const entry=empMap.get(name)||{name,days:0,count:0,types:{}};
    entry.days+=r.statsDays;entry.count+=1;
    entry.types[t]=(entry.types[t]||0)+r.statsDays;
    empMap.set(name,entry);
  });
  const empTotals=[...empMap.values()].sort((a,b)=>b.days-a.days||b.count-a.count||a.name.localeCompare(b.name,'th'));
  const empTypes=[...new Set(empTotals.flatMap(e=>Object.keys(e.types)))];
  const empTypeColors=leaveTypeColorMap(empTypes);
  const statusLabels=STATS_BUCKETS.map(b=>b.label);
  const statusValues=STATS_BUCKETS.map(b=>counts[b.key]||0);
  const statusColors=STATS_BUCKETS.map(b=>b.color);
  const topDays=dailyEntries.slice().sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,10);

  const darkTheme=document.documentElement.getAttribute('data-theme')==='dark';
  const chartText=darkTheme?'#cbd5e1':'#334155';
  const chartGrid=darkTheme?'rgba(148,163,184,.22)':'rgba(100,116,139,.16)';
  if(typeof Chart!=='undefined'){Chart.defaults.color=chartText;Chart.defaults.borderColor=chartGrid;}
  const baseOpts={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{family:'Prompt'},color:chartText}}}};
  statsDestroyCharts();

  const empCtx=$('chartByEmployee');
  if(empCtx&&empTotals.length){
    const isNarrow=window.innerWidth<=640;
    const empFontSize=isNarrow?11:12;
    const rowH=isNarrow?34:38;
    const wrapEl=$('chartByEmployeeWrap');
    if(wrapEl)wrapEl.style.height=Math.max(isNarrow?240:280,empTotals.length*rowH+130)+'px';
    statsCharts.byEmployee=new Chart(empCtx,{
      type:'bar',
      data:{labels:empTotals.map(e=>e.name),datasets:empTypes.map(t=>({
        label:t,
        data:empTotals.map(e=>e.types[t]||0),
        backgroundColor:empTypeColors[t],
        stack:'s',
        borderRadius:3,
        borderSkipped:false
      }))},
      options:Object.assign({},baseOpts,{
        indexAxis:'y',
        categoryPercentage:0.9,
        barPercentage:0.55,
        layout:{padding:{top:26,left:2,right:6,bottom:0}},
        plugins:{
          legend:{position:'bottom',labels:{font:{family:'Prompt',size:isNarrow?10:11},boxWidth:isNarrow?10:12,padding:isNarrow?8:12,usePointStyle:true,pointStyle:'rectRounded'}},
          tooltip:{mode:'index',callbacks:{
            title:items=>String(items[0].label),
            label:c=>`${c.dataset.label}: ${c.parsed.x} วัน`,
            footer:items=>{
              const e=empTotals[items[0].dataIndex];
              return `รวม: ${e.days} วัน · ${e.count} ใบ`;
            }
          }},
          statsEmployeeNames:{enabled:true,fontSize:empFontSize}
        },
        scales:{
          x:{beginAtZero:true,stacked:true,ticks:{precision:0,color:chartText,font:{family:'Prompt',size:isNarrow?10:11}},grid:{color:chartGrid}},
          y:{stacked:true,ticks:{display:false},grid:{display:false}}
        }
      }),
      plugins:[statsEmployeeNamePlugin]
    });
  }
  const statusCtx=$('chartByStatus');
  if(statusCtx)statsCharts.byStatus=new Chart(statusCtx,{type:'pie',data:{labels:statusLabels,datasets:[{data:statusValues,backgroundColor:statusColors}]},options:Object.assign({},baseOpts,{plugins:{legend:{position:'bottom',labels:{font:{family:'Prompt'}}},tooltip:{callbacks:{label:c=>`${c.label}: ${c.parsed} รายการ`}}}})});
  const topCtx=$('chartTopDays');
  if(topCtx&&topDays.length){
    const topOpts=Object.assign({},baseOpts,{
      indexAxis:'y',
      plugins:{
        legend:{display:false},
        tooltip:{callbacks:{
          title:items=>formatDateShort(topDays[items[0].dataIndex][0]),
          label:c=>`${c.parsed.x} คน`
        }}
      },
      scales:{
        x:{beginAtZero:true,ticks:{precision:0,stepSize:1,color:chartText,font:{family:'Prompt',size:11}},grid:{color:chartGrid}},
        y:{ticks:{font:{family:'Prompt',size:11},color:chartText},grid:{color:chartGrid}}
      }
    });
    statsCharts.topDays=new Chart(topCtx,{
      type:'bar',
      data:{labels:topDays.map(d=>formatDateShort(d[0])),datasets:[{
        label:'จำนวนคนที่ลา',
        data:topDays.map(d=>d[1]),
        backgroundColor:topDays.map(d=>d[1]>=2?'#dc2626':'#f59e0b'),
        borderRadius:4
      }]},
      options:topOpts
    });
  }
}
function downloadStatsCSV(){
  syncStatsControls();
  const rows=statsFilteredRows();
  const scoped=statsScopeRows(rows);
  const counts={};STATS_BUCKETS.forEach(b=>{counts[b.key]=0;});
  rows.forEach(r=>{counts[r.bucket]=(counts[r.bucket]||0)+1;});
  const scopedDays=scoped.reduce((s,r)=>s+r.statsDays,0);
  const header=['หมวด','รายการ','จำนวนใบ','จำนวนวัน','อนุมัติ(ใบ)','รออนุมัติ(ใบ)','ไม่อนุมัติ(ใบ)','ยกเลิก(ใบ)','รออนุมัติยกเลิก(ใบ)','ไม่อนุมัติยกเลิก(ใบ)','สัดส่วนวันลา(%)'];
  const lines=[header];
  lines.push(['สรุปรวม','รายการทั้งหมด',rows.length,scopedDays,counts['อนุมัติ'],counts['รออนุมัติ'],counts['ไม่อนุมัติ'],counts['ยกเลิกแล้ว'],counts['รอยกเลิก'],counts['ไม่อนุมัติยกเลิก'],scopedDays?100:0]);
  STATS_BUCKETS.forEach(b=>lines.push(['สถานะ',b.label,counts[b.key]||0,'','','','','','','','']));
  const empMap=new Map();
  scoped.forEach(r=>{const n=r.empName||'ไม่ระบุชื่อ';empMap.set(n,(empMap.get(n)||0)+r.statsDays);});
  [...new Set(rows.map(r=>r.empName||'ไม่ระบุชื่อ'))].forEach(name=>{
    const list=rows.filter(r=>(r.empName||'ไม่ระบุชื่อ')===name);
    const days=empMap.get(name)||0;
    lines.push(['รายพนักงาน',name,list.length,days,list.filter(r=>r.bucket==='อนุมัติ').length,list.filter(r=>r.bucket==='รออนุมัติ').length,list.filter(r=>r.bucket==='ไม่อนุมัติ').length,list.filter(r=>r.bucket==='ยกเลิกแล้ว').length,list.filter(r=>r.bucket==='รอยกเลิก').length,list.filter(r=>r.bucket==='ไม่อนุมัติยกเลิก').length,scopedDays?Math.round(days/scopedDays*1000)/10:0]);
  });
  [...new Set(rows.map(r=>r.leaveType||'ไม่ระบุประเภท'))].forEach(t=>{
    const list=rows.filter(r=>(r.leaveType||'ไม่ระบุประเภท')===t);
    const days=scoped.filter(r=>(r.leaveType||'ไม่ระบุประเภท')===t).reduce((s,r)=>s+r.statsDays,0);
    lines.push(['รายประเภท',t,list.length,days,list.filter(r=>r.bucket==='อนุมัติ').length,'','','','','',scopedDays?Math.round(days/scopedDays*1000)/10:0]);
  });
  const csv='\uFEFF'+lines.map(row=>row.map(c=>'"'+String(c??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`สถิติการลา_${dateKey(new Date())}.csv`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  showToast('สร้างไฟล์สถิติ CSV แล้ว');
}
function clearEmployeeForm(){const name=$('empName').value;$('leaveForm').reset();$('empName').value=name;$('leaveDays').value='';showToast('ล้างข้อมูลที่ยังไม่ได้ส่งแล้ว');}function renderManagerRequests(){const pending=$('allRequests'),processed=$('processedRequests'),cancelContainer=$('cancelRequests');const undoPending=leaveRequests.filter(r=>normalizeStatus(r.status)===STATUS.IN_PROGRESS&&normalizeStatus(r.cancelStatus)!==STATUS.CANCEL_PENDING);const waiting=leaveRequests.filter(r=>normalizeStatus(r.status)===STATUS.PENDING&&normalizeStatus(r.cancelStatus)!==STATUS.CANCELLED&&normalizeStatus(r.cancelStatus)!==STATUS.CANCEL_PENDING);const done=leaveRequests.filter(r=>!waiting.includes(r)&&!(normalizeStatus(r.cancelStatus)===STATUS.CANCEL_PENDING)&&(!undoPending.includes(r)||isCancelled(r)));pending.innerHTML=waiting.length?waiting.map(r=>{const conflicts=checkLeaveAvailability(r.startDate,r.endDate,r.id);return `<div class="border rounded-lg p-4 border-blue-200 bg-blue-50"><div class="mb-3"><p class="font-bold text-lg">👤 ${escapeHTML(r.empName)}</p><p class="text-sm"><strong>ประเภท:</strong> ${escapeHTML(r.leaveType)} | <strong>จำนวน:</strong> ${escapeHTML(r.leaveDays)} วัน</p><p class="text-sm"><strong>ช่วงวันที่:</strong> ${escapeHTML(r.startDate)} ถึง ${escapeHTML(r.endDate)}</p><p class="text-sm break-words"><strong>เหตุผล:</strong> ${escapeHTML(r.reason)}</p><p class="text-xs text-gray-500">ส่งเมื่อ: ${escapeHTML(r.submittedAt)}</p>${conflicts.length?'<p class="text-xs text-orange-700 mt-1">⚠️ หากอนุมัติจะเกินโควตาในบางวัน</p>':''}</div><div class="flex gap-2"><button data-action="approve" data-id="${escapeHTML(r.id)}" class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm"><i class="fa fa-check mr-1"></i> อนุมัติ</button><button data-action="reject" data-id="${escapeHTML(r.id)}" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"><i class="fa fa-times mr-1"></i> ไม่อนุมัติ</button></div></div>`;}).join(''):'<p class="text-gray-500 text-center py-4">ยังไม่มีคำขอลารอการอนุมัติ</p>';
const cancelWaiting=leaveRequests.filter(r=>normalizeStatus(r.cancelStatus)===STATUS.CANCEL_PENDING);cancelContainer.innerHTML=cancelWaiting.length?cancelWaiting.map(r=>`<div class="border rounded-lg p-4 border-orange-200 bg-orange-50"><p class="font-bold text-lg">👤 ${escapeHTML(r.empName)}</p><p class="text-sm mt-1"><strong>ประเภท:</strong> ${escapeHTML(r.leaveType)} · ${escapeHTML(r.leaveDays)} วัน</p><p class="text-sm"><strong>ช่วงวันที่ลา:</strong> ${escapeHTML(r.startDate)} ถึง ${escapeHTML(r.endDate)}</p><p class="text-sm"><strong>สถานะคำขอลาเดิม:</strong> ${escapeHTML(r.statusBeforeCancelRequest||'รออนุมัติ')}</p><p class="text-sm break-words"><strong>เหตุผลขอยกเลิก:</strong> ${escapeHTML(r.cancelReason||'ไม่ได้ระบุ')}</p><p class="text-xs text-gray-500">ส่งคำขอยกเลิกเมื่อ: ${escapeHTML(r.cancelRequestedAt||'')}</p><div class="flex flex-wrap gap-2 mt-3"><button data-action="approve-cancel" data-id="${escapeHTML(r.id)}" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"><i class="fa fa-check mr-1"></i> อนุมัติยกเลิก</button><button data-action="reject-cancel" data-id="${escapeHTML(r.id)}" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"><i class="fa fa-times mr-1"></i> ไม่อนุมัติยกเลิก</button></div></div>`).join(''):'<p class="text-gray-500 text-center py-3">ไม่มีคำขอยกเลิกวันลารออนุมัติ</p>';
processed.innerHTML=(done.length?done.map(r=>{const canDelete=isCancelled(r)||normalizeStatus(r.status)===STATUS.REJECTED;return `<div class="p-2 rounded ${canDelete?'selectable-item':''} ${normalizeStatus(r.status)===STATUS.APPROVED&&!r.cancelStatus?'bg-green-50 border border-green-200':'bg-red-50 border border-red-200'}" ${canDelete?`data-select-key="req:${escapeHTML(r.id)}"`:''}><div class="flex flex-wrap justify-between items-center mb-1 gap-2"><span class="font-semibold text-xs">${escapeHTML(r.empName)} — ${escapeHTML(r.leaveType)}</span><span class="text-xs font-semibold ${r.cancelStatus==='ยกเลิกแล้ว'?'text-green-700':r.cancelStatus==='ไม่อนุมัติยกเลิก'?'text-red-700':statusClass(r.status)} whitespace-nowrap">${escapeHTML(r.cancelStatus?'ยกเลิก: '+r.cancelStatus:r.status)}</span></div><div class="space-y-1 pl-2">${escapeHTML(r.startDate)} ถึง ${escapeHTML(r.endDate)} (${escapeHTML(r.leaveDays)} วัน)</div>${r.managerEntered?'<div class="text-xs text-indigo-700">ลงรายการโดยหัวหน้างาน</div>'+(r.quotaOverride?'<div class="text-xs text-orange-700">ยกเว้นโควตา: '+escapeHTML(r.quotaOverrideReason||'ไม่ระบุเหตุผล')+'</div>':''):''}${r.cancelStatus?`<div class="text-xs ${r.cancelStatus==='ยกเลิกแล้ว'?'text-green-700':r.cancelStatus==='ไม่อนุมัติยกเลิก'?'text-red-700':'text-orange-700'}">สถานะยกเลิก: ${escapeHTML(r.cancelStatus)}${r.cancelReason?' · เหตุผล: '+escapeHTML(r.cancelReason):''}</div>`:''}</div>${canDelete?`<div class="item-delete mt-2 pt-2 border-t"><button type="button" data-action="delete-history" data-id="${escapeHTML(r.id)}" class="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-xs"><i class="fa fa-trash mr-1"></i> ลบประวัติ</button></div>`:''}</div>`;}).join(''):'<p class="text-sm text-gray-500 text-center py-2">ยังไม่มีรายการที่ดำเนินการแล้ว</p>');const pcCard=$('processedCardCount');if(pcCard)pcCard.textContent=done.length?`${done.length} ใบ`:'0 ใบ';}
async function handleEmployeeCancel(btn){if(managerMode){showToast('กรุณาใช้โหมดพนักงานเพื่อขอยกเลิก',true);return;}const req=leaveRequests.find(r=>r.id===btn.dataset.id);if(!req||req.empName!==currentUser){showToast('กรุณาเลือกชื่อพนักงานเจ้าของรายการ',true);return;}if(normalizeStatus(req.status)===STATUS.REJECTED||isCancelled(req)||normalizeStatus(req.cancelStatus)===STATUS.CANCEL_PENDING){showToast('รายการนี้ไม่สามารถส่งคำขอยกเลิกซ้ำได้',true);return;}if(String(req.endDate||'')<dateKey(new Date())){showToast('ไม่สามารถขอยกเลิกได้ เนื่องจากวันที่ลาเลยวันปัจจุบันมาแล้ว',true);return;}const reason=prompt('ระบุเหตุผลที่ต้องการยกเลิกวันลา (กด Cancel เพื่อยกเลิกการทำรายการ):');if(reason===null)return;if(!reason.trim()){showToast('กรุณาระบุเหตุผลการยกเลิก',true);return;}if(!confirm(`ยืนยันส่งคำขอยกเลิกวันลา ${req.startDate} ถึง ${req.endDate} ให้หัวหน้างานพิจารณาหรือไม่?`))return;btn.disabled=true;try{const now=new Date();const updates={cancelStatus:STATUS.CANCEL_PENDING,cancelReason:reason.trim(),cancelRequestedAt:now.toLocaleString('th-TH'),cancelRequestedAtISO:now.toISOString()};if(normalizeStatus(req.status)===STATUS.APPROVED){updates.statusBeforeCancelRequest=STATUS.APPROVED;updates.status=STATUS.IN_PROGRESS;}await db.ref('leaveRequests/'+req.id).update(updates);logActivity(req.empName,'cancel-request',`${req.leaveType} · ${req.startDate} ถึง ${req.endDate} · เหตุผลขอยกเลิก: ${reason.trim()}`,'พนักงาน',req.id);notifyLeave('cancel-requested',{empName:req.empName,leaveType:req.leaveType,startDate:req.startDate,endDate:req.endDate,leaveDays:req.leaveDays,reason:req.reason,cancelReason:reason.trim()});backupToGoogleSheet('upsert',Object.assign({},req,updates,{id:req.id}));showToast(normalizeStatus(req.status)===STATUS.APPROVED?'ส่งคำขอยกเลิกแล้ว สถานะเปลี่ยนเป็น “รอการดำเนินการ” จนกว่าหัวหน้างานจะพิจารณา':'ส่งคำขอยกเลิกแล้ว โดยคำขอเดิมยังรอหัวหน้างานพิจารณา');}catch(err){console.error(err);showToast('ส่งคำขอยกเลิกไม่สำเร็จ: '+(err.message||err.code),true);}finally{btn.disabled=false;}}
function renderAllVisiblePages(){if(!$('employeePage').classList.contains('hidden')){renderMonthCalendar('employeeMonthCalendar','employee');renderLeaveCalendar('leaveCalendar');renderEmployeeRequests();}if(!$('managerPage').classList.contains('hidden')){renderManagerDashboard();renderMonthCalendar('managerMonthCalendar','manager');renderLeaveCalendar('allLeaveCalendar');renderManagerRequests();renderActivityLog();}if($('statsPage')&&!$('statsPage').classList.contains('hidden')){renderStatsCharts();}}

function calculateManagerLeaveDays(){const s=parseLocalDate($('managerStartDate').value),e=parseLocalDate($('managerEndDate').value);if(!s||!e||e<s){$('managerLeaveDays').value='';return false;}const days=Math.round((Date.UTC(e.getFullYear(),e.getMonth(),e.getDate())-Date.UTC(s.getFullYear(),s.getMonth(),s.getDate()))/86400000)+1;$('managerLeaveDays').value=days;return true;}
function clearManagerLeaveForm(){if(!$('managerLeaveForm'))return;$('managerLeaveForm').reset();$('managerLeaveDays').value='';}
function closeManagerLeaveForm(){clearManagerLeaveForm();$('managerLeaveForm').classList.add('hidden');$('btnShowManagerLeaveForm').classList.remove('hidden');}
function openManagerLeaveForm(){if(!managerMode){showToast('กรุณาเข้าสู่โหมดหัวหน้างานก่อน',true);return;}$('managerLeaveForm').classList.remove('hidden');$('btnShowManagerLeaveForm').classList.add('hidden');$('managerLeaveForm').scrollIntoView({behavior:'smooth',block:'start'});}
async function handleManagerLeaveSubmit(e){
 e.preventDefault();
 if(!managerMode){showToast('ไม่มีสิทธิ์ใช้งานฟังก์ชันนี้',true);return;}
 const empName=$('managerEmpName').value,leaveType=$('managerLeaveType').value,startDate=$('managerStartDate').value,endDate=$('managerEndDate').value,reason=$('managerLeaveReason').value.trim(),overrideReason=$('managerOverrideReason').value.trim();
 if(!empName||!leaveType||!startDate||!endDate||!reason){showToast('กรอกข้อมูลลงลางานให้ครบถ้วน',true);return;}
 if(!getEmployeeList().includes(empName)){showToast('ชื่อพนักงานไม่ถูกต้อง',true);return;}
 if(!calculateManagerLeaveDays()){showToast('กรุณาตรวจสอบวันที่เริ่มและสิ้นสุด',true);return;}
 const conflicts=checkLeaveAvailability(startDate,endDate);
 if(conflicts.length&&!overrideReason){showToast('วันที่ลาเต็มโควตาแล้ว กรุณาระบุเหตุผลอนุญาตเกินโควตา',true);$('managerOverrideReason').focus();return;}
 const ownOverlap=findOwnOverlaps(empName,startDate,endDate);if(ownOverlap.length&&!overrideReason){showToast(`ช่วงวันที่ลาทับซ้อนกับคำขอเดิมของ ${empName} กรุณาระบุเหตุผลหรือแก้ช่วงวันที่`,true);$('managerOverrideReason').focus();return;}
 const detail=conflicts.length?`\\n\\n⚠️ วันที่เกินโควตา: ${conflicts.join(', ')}\\nเหตุผลอนุญาตเกินโควตา: ${overrideReason}`:'';
 if(!confirm(`ยืนยันลงลาให้ ${empName} และอนุมัติทันทีหรือไม่?\\nประเภท: ${leaveType}\\nวันที่: ${startDate} ถึง ${endDate}\\nจำนวน: ${$('managerLeaveDays').value} วัน${detail}`))return;
 const btn=$('btnSubmitManagerLeave');btn.disabled=true;btn.innerHTML='<i class="fa fa-spinner fa-spin mr-2"></i> กำลังบันทึก...';
 try{
  const now=new Date(),nowISO=now.toISOString();
  const newRequest={empName,leaveType,startDate,endDate,leaveDays:Number($('managerLeaveDays').value),reason,status:STATUS.APPROVED,submittedAt:now.toLocaleString('th-TH'),submittedAtISO:nowISO,processedAt:now.toLocaleString('th-TH'),processedAtISO:nowISO,managerEntered:true,createdBy:'หัวหน้างาน',quotaOverride:(conflicts.length>0||ownOverlap.length>0),quotaOverrideDates:conflicts,quotaOverrideReason:(conflicts.length||ownOverlap.length)?overrideReason:'',managerActionAt:now.toLocaleString('th-TH')};
  const reqRef=db.ref('leaveRequests').push(newRequest);
  logActivity(empName,'manager-enter',`${leaveType} · ${startDate} ถึง ${endDate} (${$('managerLeaveDays').value} วัน) · เหตุผล: ${reason}`+(conflicts.length?` · อนุญาตเกินโควตา: ${overrideReason||'ไม่ระบุเหตุผล'}`:''),'หัวหน้างาน',reqRef.key);
   notifyLeave('approved',{empName,leaveType,startDate,endDate,leaveDays:Number($('managerLeaveDays').value),reason,processedAt:now.toLocaleString('th-TH'),managerEntered:true});
   backupToGoogleSheet('upsert',Object.assign({id:reqRef.key},newRequest));
  showToast(conflicts.length?'ลงลาและอนุมัติสำเร็จ โดยบันทึกการยกเว้นโควตาแล้ว':'ลงลาและอนุมัติสำเร็จ');
  closeManagerLeaveForm();
 }catch(err){console.error(err);showToast('ลงลาไม่สำเร็จ: '+(err.message||err.code),true);}
 finally{btn.disabled=false;btn.innerHTML='<i class="fa fa-calendar-plus mr-2"></i> บันทึกและอนุมัติวันลา';}
}

function downloadAllRecords(){if(!leaveRequests.length){showToast('ไม่มีข้อมูลสำหรับดาวน์โหลด',true);return;}const headers=['ชื่อ','ประเภท','วันที่เริ่ม','วันที่สิ้นสุด','จำนวนวัน','เหตุผล','สถานะ','วันที่ส่ง','สถานะยกเลิก','เหตุผลขอยกเลิก','วันที่ดำเนินการ','ลงโดยหัวหน้างาน','เกินโควตา','เหตุผลเกินโควตา'];const rows=leaveRequests.map(r=>[r.empName,r.leaveType,r.startDate,r.endDate,r.leaveDays,r.reason,r.status,r.submittedAt,r.cancelStatus||'',r.cancelReason||'',r.processedAt||r.cancelProcessedAt||'',r.managerEntered?'หัวหน้างาน':'',r.quotaOverride?'ใช่':'',r.quotaOverrideReason||'']);const csv='\uFEFF'+[headers,...rows].map(row=>row.map(c=>'"'+String(c??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`รายงานการลา_${dateKey(new Date())}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('สร้างรายงาน CSV แล้ว');}
async function handleSubmit(e){e.preventDefault();const empName=$('empName').value,leaveType=$('leaveType').value,startDate=$('startDate').value,endDate=$('endDate').value,reason=$('reason').value.trim();if(!empName||!leaveType||!startDate||!endDate||!reason){showToast('กรอกข้อมูลให้ครบถ้วน',true);return;}if(!calculateDays()){showToast('กรุณาตรวจสอบวันที่เริ่มและสิ้นสุด',true);return;}if(!getEmployeeList().includes(empName)){showToast('ชื่อพนักงานไม่ถูกต้อง',true);return;}if(findDuplicateRequest(empName,startDate,endDate).length){showToast('คุณมีคำขอในช่วงวันนี้อยู่แล้ว กรุณาตรวจสอบรายการของคุณ',true);return;}const own=findOwnOverlaps(empName,startDate,endDate);if(own.length){showToast(`ช่วงวันที่ลาทับซ้อนกับคำขอเดิมของคุณ (${own[0].startDate} ถึง ${own[0].endDate})`,true);return;}const conflicts=checkLeaveAvailability(startDate,endDate);if(conflicts.length){showToast(`วันที่ ${conflicts[0]} มีผู้ลาเต็มโควตาแล้ว (2 คน/วัน)`,true);return;}const btn=$('submitBtn');btn.disabled=true;btn.innerHTML='<i class="fa fa-spinner fa-spin mr-2"></i> กำลังบันทึก...';try{const newRequest={empName,leaveType,startDate,endDate,leaveDays:Number($('leaveDays').value),reason,status:STATUS.PENDING,submittedAt:new Date().toLocaleString('th-TH'),submittedAtISO:new Date().toISOString()};const reqRef=db.ref('leaveRequests').push(newRequest);logActivity(empName,'submit',`${leaveType} · ${startDate} ถึง ${endDate} (${$('leaveDays').value} วัน) · เหตุผล: ${reason}`,'พนักงาน',reqRef.key);notifyLeave('new-request',newRequest);backupToGoogleSheet('upsert',Object.assign({id:reqRef.key},newRequest));currentUser=empName;showToast('ส่งคำขอลาสำเร็จ');$('leaveType').value='';$('startDate').value='';$('endDate').value='';$('leaveDays').value='';$('reason').value='';$('empName').value=empName;renderEmployeeRequests();}catch(err){console.error(err);showToast('บันทึกไม่สำเร็จ: '+(err.message||err.code),true);}finally{btn.disabled=false;btn.innerHTML='<i class="fa fa-paper-plane mr-2"></i> ส่งคำขอลา';}}
async function handleManagerAction(btn){const id=btn.dataset.id,action=btn.dataset.action;if(action==='request-cancel'){await handleEmployeeCancel(btn);return;}if(action==='delete-log'){if(!managerMode && !adminMode){showToast('ไม่มีสิทธิ์ลบรายการ',true);return;}const logEntry=activityLogs.find(l=>l.id===id);if(!logEntry){showToast('ไม่พบรายการที่ต้องการลบ',true);return;}if(!confirm(`ยืนยันลบรายการประวัติของ ${logEntry.empName||'ไม่ระบุชื่อ'} หรือไม่?\n\nข้อมูลจะถูกลบออกจากระบบและไม่สามารถกู้คืนได้`))return;btn.disabled=true;try{await db.ref('activityLog/'+id).remove();showToast('ลบรายการประวัติเรียบร้อย');}catch(err){console.error(err);showToast('ลบรายการไม่สำเร็จ: '+(err.message||err.code),true);}finally{btn.disabled=false;}return;}if(action==='edit-user'){if(!(managerMode || adminMode)){showToast('ไม่มีสิทธิ์',true);return;}const key=btn.dataset.key;if(!key){showToast('ไม่พบข้อมูลผู้ใช้',true);return;}btn.disabled=true;try{const snap=await db.ref('users/'+key).once('value');const data=snap.val()||{};await editEmployeeUser(key,data);}catch(e){console.error(e);showToast('แก้ไขไม่สำเร็จ: '+(e.message||e.code),true);}finally{btn.disabled=false;}return;}if(action==='delete-user'){if(!(managerMode || adminMode)){showToast('ไม่มีสิทธิ์',true);return;}const key=btn.dataset.key;const name=btn.dataset.name||'';if(!key){showToast('ไม่พบข้อมูลผู้ใช้',true);return;}await deleteEmployeeUser(key,name);return;}const req=leaveRequests.find(r=>r.id===id);if(!managerMode && !adminMode){showToast('ไม่มีสิทธิ์ใช้งานโหมดหัวหน้างาน',true);return;}if(!req)return;let updates={},message='';if(action==='approve'){const conflicts=checkLeaveAvailability(req.startDate,req.endDate,req.id);if(conflicts.length){showToast(`ไม่สามารถอนุมัติได้: ${conflicts[0]} เต็มโควตาแล้ว`,true);return;}updates={status:STATUS.APPROVED,processedAt:new Date().toLocaleString('th-TH'),processedAtISO:new Date().toISOString()};message='อนุมัติคำขอลาสำเร็จ';}else if(action==='reject'){updates={status:STATUS.REJECTED,processedAt:new Date().toLocaleString('th-TH'),processedAtISO:new Date().toISOString()};message='บันทึกสถานะไม่อนุมัติแล้ว';}else if(action==='approve-cancel'){if(normalizeStatus(req.cancelStatus)!==STATUS.CANCEL_PENDING){showToast('คำขอยกเลิกนี้ถูกดำเนินการแล้ว',true);return;}updates={status:STATUS.CANCEL_APPROVED,cancelStatus:STATUS.CANCELLED,cancelProcessedAt:new Date().toLocaleString('th-TH'),cancelProcessedAtISO:new Date().toISOString()};message='อนุมัติยกเลิกวันลาแล้ว และคืนโควตาวันลาให้ระบบ';}else if(action==='reject-cancel'){if(normalizeStatus(req.cancelStatus)!==STATUS.CANCEL_PENDING){showToast('คำขอยกเลิกนี้ถูกดำเนินการแล้ว',true);return;}updates={cancelStatus:STATUS.CANCEL_REJECTED,cancelProcessedAt:new Date().toLocaleString('th-TH'),cancelProcessedAtISO:new Date().toISOString()};if(normalizeStatus(req.status)===STATUS.IN_PROGRESS){updates.status=STATUS.APPROVED;}message='ไม่อนุมัติการยกเลิกวันลา';}else if(action==='delete-history'){if(!managerMode && !adminMode){showToast('ไม่มีสิทธิ์ลบประวัติ',true);return;}if(!(normalizeStatus(req.status)===STATUS.REJECTED||isCancelled(req))){showToast('รายการนี้ไม่สามารถลบจากประวัติได้',true);return;}if(!confirm(`ยืนยันลบประวัติรายการของ ${req.empName} หรือไม่?\n\nข้อมูลจะถูกลบออกจากระบบและไม่สามารถกู้คืนได้`))return;btn.disabled=true;try{await db.ref('leaveRequests/'+id).remove();backupToGoogleSheet('delete',{id:id});logActivity(req.empName,'delete-history',`${req.leaveType||'ไม่ระบุประเภท'} · ${req.startDate||'-'} ถึง ${req.endDate||'-'} · สถานะเดิม: ${req.status||'-'}${req.cancelStatus?' (ยกเลิก: '+req.cancelStatus+')':''}`,'หัวหน้างาน',id);showToast('ลบประวัติเรียบร้อยแล้ว');}catch(err){console.error(err);showToast('ลบประวัติไม่สำเร็จ: '+(err.message||err.code),true);}finally{btn.disabled=false;}return;}else{return;}const question=action==='approve'?`ยืนยันอนุมัติคำขอลาของ ${req.empName} หรือไม่?`:action==='reject'?`ยืนยันไม่อนุมัติคำขอลาของ ${req.empName} หรือไม่?`:action==='approve-cancel'?`ยืนยันอนุมัติการยกเลิกวันลาของ ${req.empName} หรือไม่? เมื่ออนุมัติแล้วระบบจะไม่นับวันลาดังกล่าวในโควตา`: `ยืนยันไม่อนุมัติการยกเลิกวันลาของ ${req.empName} หรือไม่?`;if(!confirm(question))return;btn.disabled=true;try{await db.ref('leaveRequests/'+id).update(updates);backupToGoogleSheet('upsert',Object.assign({},req,updates,{id:id}));const actDetail=`${req.leaveType||'ไม่ระบุประเภท'} · ${req.startDate||'-'} ถึง ${req.endDate||'-'} (${req.leaveDays??'-'} วัน)`;logActivity(req.empName,action,((action==='approve-cancel'||action==='reject-cancel')?`คำขอยกเลิก: ${req.cancelReason||'ไม่ระบุ'}`:`เหตุผล: ${req.reason||'ไม่ระบุ'}`)+` · ${actDetail}`,'หัวหน้างาน',id);
if(action==='approve')notifyLeave('approved',{empName:req.empName,leaveType:req.leaveType,startDate:req.startDate,endDate:req.endDate,leaveDays:req.leaveDays,reason:req.reason,processedAt:updates.processedAt});else if(action==='reject')notifyLeave('rejected',{empName:req.empName,leaveType:req.leaveType,startDate:req.startDate,endDate:req.endDate,leaveDays:req.leaveDays,reason:req.reason,processedAt:updates.processedAt});showToast(message);}catch(err){console.error(err);showToast('อัปเดตไม่สำเร็จ: '+(err.message||err.code),true);}finally{btn.disabled=false;}}
document.addEventListener('DOMContentLoaded',async()=>{
  checkConnection();
  initEmployeeOptions();
  bootstrapDefaultUsers().catch(()=>{});
  try{ db.ref('users').once('value').then(s=>updateEmployeeListFromUsers(s.val()||{})); }catch(e){}
  if($('loginForm')) $('loginForm').addEventListener('submit',handleLogin);
  if($('empLogout')) $('empLogout').addEventListener('click',logout);
  if($('mgrLogout')) $('mgrLogout').addEventListener('click',logout);
  if($('btnChangePassword')) $('btnChangePassword').addEventListener('click',changeOwnPassword);
  if($('btnAdminLogin')) $('btnAdminLogin').addEventListener('click',toggleAdminLogin);
  if($('btnAdminCancel')) $('btnAdminCancel').addEventListener('click',hideAdminLogin);
  if($('btnAdminVerify')) $('btnAdminVerify').addEventListener('click',verifyAdminGate);
  if($('adminLoginForm')) $('adminLoginForm').addEventListener('submit',e=>{e.preventDefault();verifyAdminGate();});
  if($('btnRefreshPasswords')) $('btnRefreshPasswords').addEventListener('click',loadPasswordTable);
  if($('btnTogglePasswordPanel')) $('btnTogglePasswordPanel').addEventListener('click',togglePasswordPanel);
  if($('btnShowAddEmployee')) $('btnShowAddEmployee').addEventListener('click',toggleAddEmployeePanel);
  if($('btnCancelAddEmployee')) $('btnCancelAddEmployee').addEventListener('click',()=>{$('addEmployeePanel')?.classList.add('hidden');});
  if($('btnAddEmployee')) $('btnAddEmployee').addEventListener('click',addEmployee);
  const pwBody2=$('passwordTableBody');
  if(pwBody2){
    pwBody2.addEventListener('click',e=>{
      const btn=e.target.closest('button[data-action="edit-user"], button[data-action="delete-user"]');
      if(!btn) return;
      e.preventDefault();
      e.stopPropagation();
      handleManagerAction(btn);
    });
  }
  $('startDate')?.addEventListener('change',calculateDays);
  $('endDate')?.addEventListener('change',calculateDays);
  $('leaveForm')?.addEventListener('submit',handleSubmit);
  $('btnClearLeaveForm')?.addEventListener('click',clearEmployeeForm);
  $('managerLeaveForm')?.addEventListener('submit',handleManagerLeaveSubmit);
  $('btnShowManagerLeaveForm')?.addEventListener('click',openManagerLeaveForm);
  $('btnCloseManagerLeaveForm')?.addEventListener('click',closeManagerLeaveForm);
  $('managerStartDate')?.addEventListener('change',calculateManagerLeaveDays);
  $('managerEndDate')?.addEventListener('change',calculateManagerLeaveDays);
  $('btnClearManagerLeaveForm')?.addEventListener('click',clearManagerLeaveForm);
  $('btnDownload')?.addEventListener('click',downloadAllRecords);
  $('btnSyncGoogleSheet')?.addEventListener('click',handleSyncAllGoogleSheet);
  $('btnConfigGSheet')?.addEventListener('click',promptConfigGSheet);
  if($('btnOpenStats'))$('btnOpenStats').addEventListener('click',openStatsPage);
  if($('btnCloseStats'))$('btnCloseStats').addEventListener('click',closeStatsPage);
  if($('btnToggleStatsFilters'))$('btnToggleStatsFilters').addEventListener('click',toggleStatsFilters);
  if($('statsMonthFrom'))$('statsMonthFrom').addEventListener('change',renderStatsCharts);
  if($('statsMonthTo'))$('statsMonthTo').addEventListener('change',renderStatsCharts);
  if($('statsEmpFilter'))$('statsEmpFilter').addEventListener('change',renderStatsCharts);
  if($('statsTypeFilter'))$('statsTypeFilter').addEventListener('change',renderStatsCharts);
  if($('statsScope'))$('statsScope').addEventListener('change',renderStatsCharts);
  if($('statsWorkdayOnly'))$('statsWorkdayOnly').addEventListener('change',renderStatsCharts);
  if($('btnStatsRefresh'))$('btnStatsRefresh').addEventListener('click',()=>{renderStatsCharts();showToast('รีเฟรชข้อมูลสถิติแล้ว');});
  if($('btnStatsReset'))$('btnStatsReset').addEventListener('click',resetStatsFilters);
  if($('btnStatsDownload'))$('btnStatsDownload').addEventListener('click',downloadStatsCSV);
  if($('activityFilter'))$('activityFilter').addEventListener('change',renderActivityLog);
  document.addEventListener('click',e=>{
    const nav=e.target.closest('button[data-month-nav]');
    if(nav){const mode=nav.dataset.monthNav,step=Number(nav.dataset.step)||0;monthCursor[mode]=new Date(monthCursor[mode].getFullYear(),monthCursor[mode].getMonth()+step,1);renderMonthCalendar(mode==='employee'?'employeeMonthCalendar':'managerMonthCalendar',mode);return;}
    const day=e.target.closest('button[data-calendar-date]');
    if(day){showCalendarDate(day.dataset.calendarDate,day.dataset.calendarMode);return;}
    const delBtn=e.target.closest('button[data-action]');
    if(delBtn){handleManagerAction(delBtn);return;}
    const item=e.target.closest('.selectable-item');
    if(item){const wasSelected=item.classList.contains('is-selected');document.querySelectorAll('.selectable-item.is-selected').forEach(el=>el.classList.remove('is-selected'));if(!wasSelected)item.classList.add('is-selected');return;}
    document.querySelectorAll('.selectable-item.is-selected').forEach(el=>el.classList.remove('is-selected'));
  });
});
let statsResizeTimer=null;
window.addEventListener('resize',()=>{const page=$('statsPage');if(!page||page.classList.contains('hidden'))return;clearTimeout(statsResizeTimer);statsResizeTimer=setTimeout(()=>{renderStatsCharts();},250);});
