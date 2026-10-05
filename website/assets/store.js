/* 24 HR Crossdock - shared config, icons and data layer.
 *
 * DEMO MODE: all data is saved in this browser (localStorage), so the customer
 * portal and the team page talk to each other when opened in the same browser.
 * To go live, replace the functions in the "DB" section with calls to a real
 * backend (Supabase, Firebase, or your WMS). The pages only use the functions
 * below, so nothing else has to change.
 */

/* ---------- Business settings: edit these ---------- */
var CONFIG = {
  company: '24 HR Crossdock',
  phone: '(775) 000-0000',
  phoneHref: 'tel:+17750000000',
  textHref: 'sms:+17750000000',
  email: 'sales@YOURDOMAIN.com',
  address: 'STREET ADDRESS, Sparks, NV 00000',
  payUrl: '',            // e.g. a QuickBooks or Stripe payment link. Leave '' to hide the "Pay online" button.
  paymentTermsDays: 15
};

/* Charges the team can put on a damage estimate (rates from current price sheet). */
var CHARGE_MENU = [
  {code:'rewrap',  label:'Re-wrap and re-stack pallet',        unit:'pallet',  rate:15},
  {code:'pallet',  label:'Replacement pallet',                  unit:'pallet',  rate:20},
  {code:'relabel', label:'Relabel cartons',                     unit:'label',   rate:2},
  {code:'labor',   label:'Extra labor (sort, repack, clean up)',unit:'hour',    rate:100},
  {code:'hold',    label:'Hold for inspection',                 unit:'pallet/day', rate:7.5},
  {code:'dispose', label:'Dispose of damaged product',          unit:'pallet',  rate:200}
];

var DAMAGE_TYPES = ['Crushed boxes','Broken wrap','Wet / water damage','Forklift damage','Came in damaged','Leaning / shifted load','Missing cartons','Other'];

/* Booking types and the steps each one goes through. */
var JOB_TYPES = {
  pickup:   {name:'Pickup from you',     short:'Pickup',   icon:'truck',    steps:['Booked','Truck on the way','Picked up','At our dock']},
  dropoff:  {name:'Drop-off at our dock',short:'Drop-off', icon:'download', steps:['Booked','Truck arrived','Unloaded & checked','At our dock']},
  outbound: {name:'Ship out from our dock',short:'Ship out',icon:'upload',  steps:['Booked','Loading','On the way','Delivered']}
};
var TIME_WINDOWS = [
  {id:'am',  label:'Morning',   hint:'6 am - 12 pm'},
  {id:'pm',  label:'Afternoon', hint:'12 pm - 6 pm'},
  {id:'eve', label:'Evening',   hint:'6 pm - 12 am'},
  {id:'ovn', label:'Overnight', hint:'12 am - 6 am'},
  {id:'any', label:'Any time',  hint:'First open slot'}
];

/* ---------- Icons (inline SVG sprite) ---------- */
var ICONS = {
  truck:'<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  home:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  box:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  alert:'<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  bill:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  chat:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  phone:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  help:'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  check:'<polyline points="20 6 9 17 4 12"/>',
  x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  camera:'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  layers:'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  printer:'<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  dollar:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  mail:'<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  pin:'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  arrowleft:'<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  arrowright:'<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  send:'<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  repeat:'<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
};
function ico(name){ return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[name]||'')+'</svg>'; }
/* Static pages use <svg class="ico"><use href="#i-NAME"/></svg>; inject the sprite they reference. */
(function(){
  var s='<svg xmlns="http://www.w3.org/2000/svg" style="display:none">';
  for(var k in ICONS) s+='<symbol id="i-'+k+'" viewBox="0 0 24 24">'+ICONS[k]+'</symbol>';
  s+='</svg>';
  function add(){ document.body.insertAdjacentHTML('afterbegin', s); }
  if(document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();

/* ---------- Small helpers ---------- */
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function money(n){ return '$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtDate(iso){ return new Date(iso).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); }
function fmtDateLong(iso){ return new Date(iso).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}); }
function fmtTime(iso){ return new Date(iso).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}); }
function fmtDT(iso){ return fmtDate(iso)+', '+fmtTime(iso); }
function ago(iso){
  var m=Math.round((Date.now()-new Date(iso))/60000);
  if(m<1) return 'just now'; if(m<60) return m+' min ago';
  var h=Math.round(m/60); if(h<24) return h+' hr ago';
  var d=Math.round(h/24); return d===1?'yesterday':d+' days ago';
}
function daysBetween(a,b){ return Math.floor((new Date(b)-new Date(a))/86400000); }
function dayKey(d){ d=new Date(d); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function chargeLine(c){ var m=CHARGE_MENU.find(function(x){return x.code===c.code;})||{label:c.code,unit:'',rate:0}; return {label:m.label,unit:m.unit,rate:m.rate,qty:c.qty,total:m.rate*c.qty}; }
function chargesTotal(list){ return (list||[]).reduce(function(s,c){return s+chargeLine(c).total;},0); }
function invTotal(inv){ return inv.lines.reduce(function(s,l){return s+l.qty*l.rate;},0); }
function invState(inv){
  if(inv.status==='paid') return {cls:'ok',text:'Paid'};
  var d=daysBetween(new Date(),inv.due);
  if(d<0) return {cls:'no',text:'Overdue '+(-d)+(d===-1?' day':' days')};
  if(d===0) return {cls:'wait',text:'Due today'};
  return {cls:'wait',text:'Due in '+d+(d===1?' day':' days')};
}
function toast(text){
  var t=document.getElementById('toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
  t.innerHTML=ico('check')+'<span>'+esc(text)+'</span>';
  t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(function(){t.classList.remove('show');},3200);
}

/* ---------- DB (swap this section for a real backend) ---------- */
var DB_KEY='hrx_db_v1', SESSION_KEY='hrx_session', TEAM_KEY='hrx_team';

function seed(){
  var now=Date.now(), H=3600000, D=86400000;
  function t(ms){ return new Date(now-ms).toISOString(); }
  function f(ms){ return new Date(now+ms).toISOString(); }
  var ph1=photoSVG('Crushed corner - pallet 3','#8a6d3b'), ph2=photoSVG('Torn wrap - pallet 3','#6b7b83'), ph3=photoSVG('Close-up of cartons','#7a5c3e');
  return {
    nextId:{S:1048,D:2003,INV:1008,L:310,M:1,E:1},
    customers:[
      {id:'c1',name:'Sierra Freight Co.',contact:'Jordan Miller',email:'demo@sierrafreight.com',phone:'(775) 555-0142',
       addresses:['1200 Industrial Way, Sparks, NV 89431','455 Kietzke Ln, Reno, NV 89502']},
      {id:'c2',name:'Tahoe Home Goods',contact:'Casey Nguyen',email:'casey@tahoehome.com',phone:'(530) 555-0199',
       addresses:['88 Lake Blvd, Truckee, CA 96161']}
    ],
    shipments:[
      {id:'S-1047',customerId:'c1',type:'pickup',ref:'PO 88213',pallets:6,weight:'2,000 - 5,000 lb',from:'1200 Industrial Way, Sparks, NV 89431',to:'Our Sparks dock',date:dayKey(f(0)),window:'pm',liftgate:false,notes:'Call when 30 min out',step:1,history:[{step:0,at:t(20*H)},{step:1,at:t(1*H)}],createdAt:t(20*H)},
      {id:'S-1046',customerId:'c1',type:'outbound',ref:'Order 5521',pallets:4,weight:'',from:'Our Sparks dock',to:'455 Kietzke Ln, Reno, NV 89502',date:dayKey(f(D)),window:'am',liftgate:true,notes:'',step:0,lots:['L-305'],history:[{step:0,at:t(5*H)}],createdAt:t(5*H)},
      {id:'S-1044',customerId:'c1',type:'dropoff',ref:'BOL 77120',pallets:12,weight:'',from:'XPO carrier',to:'Our Sparks dock',date:dayKey(t(2*D)),window:'ovn',liftgate:false,notes:'',step:3,history:[{step:0,at:t(3*D)},{step:1,at:t(2*D)},{step:2,at:t(2*D-H)},{step:3,at:t(2*D-2*H)}],createdAt:t(3*D)},
      {id:'S-1041',customerId:'c1',type:'outbound',ref:'Order 5490',pallets:8,weight:'',from:'Our Sparks dock',to:'Carson City, NV',date:dayKey(t(6*D)),window:'am',liftgate:false,notes:'',step:3,history:[{step:0,at:t(7*D)},{step:3,at:t(6*D)}],createdAt:t(7*D)},
      {id:'S-1045',customerId:'c2',type:'pickup',ref:'TH-204',pallets:3,weight:'Under 2,000 lb',from:'88 Lake Blvd, Truckee, CA 96161',to:'Our Sparks dock',date:dayKey(f(D)),window:'am',liftgate:true,notes:'',step:0,history:[{step:0,at:t(3*H)}],createdAt:t(3*H)}
    ],
    lots:[
      {id:'L-305',customerId:'c1',desc:'BOL 77120 - mixed retail',pallets:4,inSince:t(2*D),reservedBy:'S-1046'},
      {id:'L-306',customerId:'c1',desc:'BOL 77120 - mixed retail',pallets:8,inSince:t(2*D),reservedBy:null},
      {id:'L-301',customerId:'c1',desc:'PO 87990 - furniture',pallets:10,inSince:t(9*D),reservedBy:null},
      {id:'L-302',customerId:'c2',desc:'TH-199 - decor',pallets:5,inSince:t(4*D),reservedBy:null}
    ],
    damages:[
      {id:'D-2002',customerId:'c1',shipmentId:'S-1044',pallets:1,types:['Crushed boxes','Broken wrap'],notes:'Pallet 3 of 12 arrived with the top corner crushed and wrap torn. 4 cartons dented, product inside looks OK. Re-wrapped and set aside for you to decide.',photos:[ph1,ph2,ph3],charges:[{code:'rewrap',qty:1},{code:'relabel',qty:4},{code:'labor',qty:0.5}],status:'waiting',reportedBy:'Alex (dock)',createdAt:t(2*H),response:null},
      {id:'D-2001',customerId:'c1',shipmentId:'S-1041',pallets:1,types:['Leaning / shifted load'],notes:'Load shifted on one pallet. Restacked before loading out.',photos:[photoSVG('Leaning pallet','#6b7b83')],charges:[{code:'rewrap',qty:1}],status:'accepted',reportedBy:'Sam (driver)',createdAt:t(7*D),response:{at:t(7*D-3*H),by:'Jordan Miller',reason:'',note:''},billed:true}
    ],
    invoices:[
      {id:'INV-1007',customerId:'c1',date:t(4*D),due:f(11*D),status:'open',lines:[{desc:'Pallet-in (BOL 77120)',qty:12,rate:15},{desc:'Storage, Sept 28 - Oct 4',qty:42,rate:1.5},{desc:'Outbound order build (Order 5490)',qty:1,rate:60}]},
      {id:'INV-1006',customerId:'c1',date:t(20*D),due:t(5*D),status:'open',lines:[{desc:'Pallet-in (PO 87990)',qty:10,rate:15},{desc:'Storage, Sept 14 - 27',qty:120,rate:1.5},{desc:'Damage: re-wrap pallet (D-2001)',qty:1,rate:15}]},
      {id:'INV-1003',customerId:'c1',date:t(40*D),due:t(25*D),status:'paid',lines:[{desc:'Cross-dock, 3 loads',qty:3,rate:180},{desc:'After-hours receiving',qty:1,rate:150}]}
    ],
    messages:[
      {id:'M-0',customerId:'c1',from:'team',name:'24 HR Crossdock',text:'Welcome to your customer portal! Message us here any time. For anything urgent, call 24/7.',at:t(10*D),about:null,readCustomer:true,readTeam:true}
    ],
    events:[
      {customerId:'c1',at:t(2*H),text:'Damage reported on S-1044. Needs your answer.',kind:'alert'},
      {customerId:'c1',at:t(1*H),text:'S-1047: Truck on the way to pick up 6 pallets.',kind:'truck'},
      {customerId:'c1',at:t(5*H),text:'You booked S-1046: ship out 4 pallets to Reno.',kind:'calendar'},
      {customerId:'c1',at:t(2*D-2*H),text:'S-1044: 12 pallets received and stored on our dock.',kind:'box'},
      {customerId:'c1',at:t(4*D),text:'New bill INV-1007 is ready.',kind:'bill'}
    ]
  };
}
/* Placeholder "photo" for demo data only. */
function photoSVG(label,color){
  var svg='<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#e9eef0"/><rect x="70" y="60" width="260" height="170" fill="'+color+'" opacity=".85"/><rect x="70" y="230" width="260" height="22" fill="#b38b5d"/><polygon points="250,60 330,60 330,140" fill="#e9eef0"/><text x="200" y="285" font-family="Arial" font-size="18" text-anchor="middle" fill="#333">'+label+'</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}

var DB = {
  load: function(){
    try{ var d=JSON.parse(localStorage.getItem(DB_KEY)); if(d&&d.customers) return d; }catch(e){}
    var s=seed(); DB.save(s); return s;
  },
  save: function(d){
    try{ localStorage.setItem(DB_KEY, JSON.stringify(d)); return true; }
    catch(e){ alert('Could not save. Photos may be too large. Try fewer photos.'); return false; }
  },
  reset: function(){ localStorage.removeItem(DB_KEY); },
  id: function(d,prefix){ var n=d.nextId[prefix]++; return prefix==='M'||prefix==='E'?prefix+'-'+n:prefix+'-'+n; },
  customer: function(d,id){ return d.customers.find(function(c){return c.id===id;}); },
  event: function(d,customerId,text,kind){ d.events.unshift({customerId:customerId,at:new Date().toISOString(),text:text,kind:kind||'clock'}); },

  /* Customer books a job. */
  book: function(customerId, b){
    var d=DB.load(), id=DB.id(d,'S');
    var job={id:id,customerId:customerId,type:b.type,ref:b.ref||'',pallets:b.pallets,weight:b.weight||'',from:b.from,to:b.to,date:b.date,window:b.window,liftgate:!!b.liftgate,floorLoaded:!!b.floorLoaded,notes:b.notes||'',step:0,lots:b.lots||[],history:[{step:0,at:new Date().toISOString()}],createdAt:new Date().toISOString()};
    d.shipments.unshift(job);
    (b.lots||[]).forEach(function(lid){ var l=d.lots.find(function(x){return x.id===lid;}); if(l) l.reservedBy=id; });
    DB.event(d,customerId,'You booked '+id+': '+JOB_TYPES[b.type].name.toLowerCase()+', '+b.pallets+' pallets.','calendar');
    DB.save(d); return job;
  },
  /* Customer cancels a job that has not started. */
  cancel: function(jobId){
    var d=DB.load(), j=d.shipments.find(function(x){return x.id===jobId;});
    if(!j||j.step>0) return false;
    d.lots.forEach(function(l){ if(l.reservedBy===jobId) l.reservedBy=null; });
    d.shipments=d.shipments.filter(function(x){return x.id!==jobId;});
    DB.event(d,j.customerId,'You canceled '+jobId+'.','x');
    DB.save(d); return true;
  },
  /* Team moves a job to its next step. */
  advance: function(jobId){
    var d=DB.load(), j=d.shipments.find(function(x){return x.id===jobId;});
    if(!j) return null; var steps=JOB_TYPES[j.type].steps;
    if(j.step>=steps.length-1) return j;
    j.step++; j.history.push({step:j.step,at:new Date().toISOString()});
    var done=j.step===steps.length-1;
    if(done && (j.type==='pickup'||j.type==='dropoff')){
      d.lots.unshift({id:DB.id(d,'L'),customerId:j.customerId,desc:(j.ref||j.id)+' - received',pallets:j.pallets,inSince:new Date().toISOString(),reservedBy:null});
    }
    if(done && j.type==='outbound'){ d.lots=d.lots.filter(function(l){return l.reservedBy!==j.id;}); }
    DB.event(d,j.customerId,j.id+': '+steps[j.step]+'.',done?'check':JOB_TYPES[j.type].icon);
    DB.save(d); return j;
  },
  /* Team/driver reports damage -> goes to customer for an answer. */
  reportDamage: function(r){
    var d=DB.load(), id=DB.id(d,'D');
    var dm={id:id,customerId:r.customerId,shipmentId:r.shipmentId,pallets:r.pallets,types:r.types,notes:r.notes,photos:r.photos,charges:r.charges,status:'waiting',reportedBy:r.reportedBy,createdAt:new Date().toISOString(),response:null};
    d.damages.unshift(dm);
    DB.event(d,r.customerId,'Damage reported on '+r.shipmentId+'. Needs your answer.','alert');
    if(!DB.save(d)) return null; return dm;
  },
  /* Customer answers a damage report: accepted | declined | call */
  answerDamage: function(damageId, status, by, reason, note){
    var d=DB.load(), dm=d.damages.find(function(x){return x.id===damageId;});
    if(!dm) return null;
    dm.status=status; dm.response={at:new Date().toISOString(),by:by,reason:reason||'',note:note||''};
    var words={accepted:'You accepted '+money(chargesTotal(dm.charges))+' in charges for '+dm.id+'.',declined:'You declined the charges for '+dm.id+'. We will call you.',call:'You asked to talk about '+dm.id+'.'};
    DB.event(d,dm.customerId,words[status],status==='accepted'?'check':status==='declined'?'x':'phone');
    if(note || status!=='accepted'){
      var label={accepted:'Accepted charges',declined:'Declined charges',call:'Wants to talk'}[status];
      d.messages.push({id:DB.id(d,'M'),customerId:dm.customerId,from:'customer',name:by,text:label+(reason?' - '+reason:'')+(note?': '+note:''),at:new Date().toISOString(),about:dm.id,readCustomer:true,readTeam:false});
    }
    DB.save(d); return dm;
  },
  sendMessage: function(customerId, from, name, text, about){
    var d=DB.load();
    d.messages.push({id:DB.id(d,'M'),customerId:customerId,from:from,name:name,text:text,at:new Date().toISOString(),about:about||null,readCustomer:from==='customer',readTeam:from==='team'});
    DB.save(d);
  },
  markRead: function(customerId, side){
    var d=DB.load(), k=side==='customer'?'readCustomer':'readTeam', changed=false;
    d.messages.forEach(function(m){ if(m.customerId===customerId && !m[k]){ m[k]=true; changed=true; } });
    if(changed) DB.save(d);
  }
};

/* ---------- Sessions (demo) ---------- */
var Auth = {
  current: function(){ try{ return JSON.parse(localStorage.getItem(SESSION_KEY)); }catch(e){ return null; } },
  login: function(email){
    var d=DB.load(), c=d.customers.find(function(x){return x.email.toLowerCase()===String(email).trim().toLowerCase();}) || d.customers[0];
    localStorage.setItem(SESSION_KEY, JSON.stringify({customerId:c.id}));
    return c;
  },
  logout: function(){ localStorage.removeItem(SESSION_KEY); },
  team: function(){ try{ return JSON.parse(localStorage.getItem(TEAM_KEY)); }catch(e){ return null; } },
  teamLogin: function(name){ localStorage.setItem(TEAM_KEY, JSON.stringify({name:name})); },
  teamLogout: function(){ localStorage.removeItem(TEAM_KEY); }
};

/* ---------- Shared modal ---------- */
function openModal(html, opts){
  var bg=document.getElementById('modal');
  if(!bg){ bg=document.createElement('div'); bg.id='modal'; bg.className='modal-bg'; document.body.appendChild(bg);
    bg.addEventListener('click',function(e){ if(e.target===bg) closeModal(); });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeModal(); });
  }
  bg.innerHTML='<div class="modal'+(opts&&opts.cls?' '+opts.cls:'')+'" role="dialog" aria-modal="true"><button class="x" aria-label="Close" onclick="closeModal()">'+ico('x')+'</button>'+html+'</div>';
  bg.classList.add('open'); document.body.style.overflow='hidden';
  var first=bg.querySelector('input:not([type=hidden]),textarea,select'); if(first&&!(opts&&opts.noFocus)) setTimeout(function(){first.focus();},50);
  return bg.firstChild;
}
function closeModal(){ var bg=document.getElementById('modal'); if(bg){ bg.classList.remove('open'); bg.innerHTML=''; } document.body.style.overflow=''; document.body.classList.remove('printing'); }
function showPhoto(src){ openModal('<div class="lightbox"><img src="'+src+'" alt="Damage photo"></div>',{noFocus:true}); }
