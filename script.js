const fail = m => { const d = document.createElement("div"); d.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;background:#b3261e;color:#fff;padding:12px 16px;border-radius:10px;font:14px system-ui;z-index:99"; d.textContent = m; document.body.appendChild(d); };
if (typeof THREE === "undefined") { fail("three.js did not load. Check your internet connection, or the three.js script tag in index.html."); throw new Error("three.js missing"); }
addEventListener("error", e => fail("Script error: " + e.message + " (line " + e.lineno + ")"));
const PARTS = {
  block:["Cylinder block","The strong body with four smooth bores. Each piston slides inside one bore, and the walls carry heat away."],
  head:["Cylinder head","Seals the top of the cylinders and holds the valves, spark plugs and the passages for air in and exhaust out."],
  chamber:["Combustion chamber","The space above each piston. It shrinks as the piston rises and grows as it falls. This is where fuel burns."],
  piston:["Pistons and rings","Four pistons take the push from burning gas. Rings seal the gap to the wall, and a wrist pin joins each piston to its rod."],
  rod:["Connecting rods","Link each piston to the crankshaft and turn straight up-and-down motion into rotation."],
  crankshaft:["Crankshaft","A shaft with one offset throw per cylinder. Pistons 1 and 4 rise while 2 and 3 fall, which keeps the engine smooth. Counterweights balance each throw."],
  flywheel:["Flywheel","A heavy disc that stores spin energy so the engine runs smoothly between power strokes. Its toothed rim meshes with the starter motor."],
  crankcase:["Crankcase","The housing around the crankshaft. It holds oil and keeps the bottom end aligned."],
  camshaft:["Camshaft","Its lobes push the valves open at the right moment. It turns at half crank speed, so each valve opens once every two crank turns."],
  valveIn:["Intake valves","Open during the intake stroke to let air and fuel in, then seal the chamber for compression and power."],
  valveEx:["Exhaust valves","Open at the end of the power stroke so the rising piston can push burnt gas out."],
  plug:["Spark plugs","Fire a spark just before the top of compression. They fire in the order 1-3-4-2, so power arrives every half turn."],
  throttle:["Throttle plate","A flap in the intake pipe. Closed, little air gets in and the engine idles. Open, more air and fuel arrive, so each power stroke is stronger and rpm climbs."],
  intake:["Intake manifold","Shares fresh air between the four cylinders through one runner each. The throttle plate sits at its entrance, after the air filter."],
  exhaust:["Exhaust manifold","Collects burnt gas from all four cylinders into one pipe that leads to the tailpipe."],
  clutch:["Clutch","A friction disc pressed against the flywheel by a spring plate. Pressing the pedal pulls the plate away, so the gearbox can change gear without grinding. It opens briefly on every shift."],
  gearbox:["Gearbox (transmission)","Holds the input shaft from the clutch, a second shaft below it, and the gears that link them. Picking a gear changes how fast the wheels turn for a given engine speed."],
  gears:["Gear pair","A small gear driving a big one multiplies torque but slows the wheel (1st gear). A big driving a small one is faster but weaker (5th gear). The pair shown is the one selected."],
  shaft:["Driveshaft and final drive","Carries power from the gearbox to the rear axle and reduces speed once more by a fixed ratio of 4.1 to 1."],
  wheel:["Wheels","Turn the engine's rotation into motion along the road. Speed is engine rpm divided by the gear ratio and the final drive. The front wheels steer."]
};
const $ = s => document.querySelector(s), T = THREE, PI = Math.PI;
const X = [-3.3,-1.1,1.1,3.3], OFF = [0,540,180,360], RC = .55, LR = 2, FD = 4.1, RAT = [0,3.6,2.1,1.4,1,.75];
const NAMES = ["Intake","Compression","Power","Exhaust"], FILL = [0x6fb7d6,0x4f8fb0,0xe4572e,0x7d868c];
const cv = $("#view"); let ren;
try { ren = new T.WebGLRenderer({canvas:cv, antialias:true}); } catch (e) { fail("Your browser could not start WebGL, which this 3D page needs."); throw e; }
ren.setPixelRatio(Math.min(2, devicePixelRatio));
const scene = new T.Scene(); scene.background = new T.Color(0x0c1720); scene.fog = new T.Fog(0x0c1720, 160, 650);
const cam = new T.PerspectiveCamera(45, 1, .5, 2000);
scene.add(new T.HemisphereLight(0xcfe6f5, 0x1a2630, .95));
const sun = new T.DirectionalLight(0xffffff, .9); sun.position.set(30,60,40); scene.add(sun);

// ---------- helpers ----------
const ALL = [], Y = new T.Vector3(0,1,0);
const mat = (c,o={}) => new T.MeshStandardMaterial(Object.assign({color:c, metalness:.6, roughness:.35}, o));
const glass = (c,op,o={}) => mat(c,Object.assign({transparent:true, opacity:op, metalness:.2, roughness:.3, depthWrite:false, side:T.DoubleSide}, o));
const cylX = (r,l,s=28) => { const g = new T.CylinderGeometry(r,r,l,s); g.rotateZ(PI/2); return g; };
function reg(k,o){ o.traverse(m => { if (m.material){ m.userData.k = k; m.material.userData = Object.assign({o:m.material.opacity, tr:m.material.transparent}, m.material.userData); ALL.push(m); } }); return o; }
function mesh(geo,m,k,par,x=0,y=0,z=0){ const o = new T.Mesh(geo,m); o.position.set(x,y,z); par.add(o); if (k) reg(k,o); return o; }
function box(w,h,d,m,k,par,x,y,z,edge){
  const o = mesh(new T.BoxGeometry(w,h,d),m,null,par,x,y,z);
  if (edge) o.add(new T.LineSegments(new T.EdgesGeometry(o.geometry), new T.LineBasicMaterial({color:0x8fa3b0, transparent:true, opacity:.55})));
  if (k) reg(k,o); return o;
}
function link(o,a,b){ const d = b.clone().sub(a); o.position.copy(a).addScaledVector(d,.5); o.scale.y = d.length(); o.quaternion.setFromUnitVectors(Y,d.normalize()); }
const V = (x,y,z) => new T.Vector3(x,y,z);
const grp = (par,x=0,y=0,z=0) => { const g = new T.Group(); g.position.set(x,y,z); par.add(g); return g; };

// ---------- car and engine ----------
const car = new T.Group(); scene.add(car);
const eng = grp(car);
const BR = 0xc79a3d;
// crankcase, block, head (see-through so you can watch the inside)
box(9.2,2.1,2.6,glass(0x5b6b76,.16),"crankcase",eng,0,-.15,0,true);
box(9.2,2.4,2.6,glass(0x5b6b76,.14),"block",eng,0,2.1,0,true);
box(9.2,.8,2.6,glass(0x3b4954,.35),"head",eng,0,3.7,0,true);
X.forEach(x => mesh(new T.CylinderGeometry(.95,.95,2.4,32,1,true), glass(0x6fb7d6,.2), "block", eng, x,2.1,0));
// crankshaft: main shaft and one throw per cylinder
mesh(cylX(.25,10.4), mat(BR), "crankshaft", eng, .4,0,0);
const crk = [], pist = [], rodM = [], bigM = [], gas = [], vi = [], ve = [], ci = [], ce = [], spk = [], runI = [], gasM = [];
X.forEach((x,i) => {
  const c = grp(eng,x,0,0); crk.push(c);
  mesh(cylX(.9,.2,40), mat(0x34495a), "crankshaft", c);
  mesh(cylX(.2,.9), mat(0xe6bf62), "crankshaft", c, 0,RC,0);
  box(.3,.7,.9,mat(0x8a6a28),"crankshaft",c,0,-.55,0);
  // piston
  const p = grp(eng,x,0,0); pist.push(p);
  mesh(new T.CylinderGeometry(.85,.85,.9,32), mat(0xcfd8de,{metalness:.8,roughness:.25}), "piston", p, 0,.1,0);
  [.3,.17].forEach(h => { const rg = new T.TorusGeometry(.85,.035,8,32); rg.rotateX(PI/2); mesh(rg, mat(0x52626d), "piston", p, 0,h,0); });
  mesh(cylX(.12,.9), mat(BR), "piston", p);
  rodM.push(mesh(new T.CylinderGeometry(.09,.09,1,12), mat(0xaab4ba), "rod", eng));
  bigM.push(mesh(cylX(.24,.45), mat(0xaab4ba), "rod", eng));
  // gas in the chamber
  const gm = glass(0x6fb7d6,0,{emissive:0x000000}); gm.userData.anim = 1; gasM.push(gm);
  gas.push(mesh(new T.CylinderGeometry(.85,.85,1,32), gm, "chamber", eng, x,3,0));
  // valves
  [[-.45,"valveIn",vi],[.45,"valveEx",ve]].forEach(([dx,k,arr]) => {
    const v = grp(eng,x+dx,0,0); arr.push(v);
    mesh(new T.CylinderGeometry(.06,.06,1.65,10), mat(0xd6dde1), k, v, 0,4.125,0);
    mesh(new T.CylinderGeometry(.3,.3,.07,24), mat(0xd6dde1), k, v, 0,3.28,0);
  });
  // cams
  [[-.45,ci],[.45,ce]].forEach(([dx,arr]) => {
    const cg = grp(eng,x+dx,5.3,0); arr.push(cg);
    mesh(cylX(.22,.3), mat(BR), "camshaft", cg); box(.3,.5,.28,mat(BR),"camshaft",cg,0,-.4,0);
  });
  // spark plug
  mesh(cylX(.11,1.1,12).rotateZ(-PI/2), mat(0xefe9dc), "plug", eng, x,4.4,0);
  mesh(new T.CylinderGeometry(.2,.2,.25,6), mat(BR), "plug", eng, x,3.85,0);
  mesh(new T.CylinderGeometry(.03,.03,.5,8), mat(0xcfd6da), "plug", eng, x,3.2,0);
  const sm = mat(0xfff3b0,{emissive:0xffd45a,emissiveIntensity:1.5,transparent:true,opacity:0}); sm.userData.anim = 1;
  spk.push(mesh(new T.SphereGeometry(.25,12,12), sm, "plug", eng, x,3.1,0));
  // intake runner
  const rm = glass(0x8fa3b0,.3,{emissive:0x3a8fb7,emissiveIntensity:0}); rm.userData.anim = 1;
  const rn = mesh(new T.CylinderGeometry(.28,.28,1,16), rm, "intake", eng); link(rn,V(x-.45,3.75,.3),V(x-.45,3.9,2.4)); runI.push(rm);
  // exhaust runner
  const re = mesh(new T.CylinderGeometry(.28,.28,1,16), glass(0x9a6b4a,.4), "exhaust", eng); link(re,V(x+.45,3.75,-.3),V(x+.45,3.9,-2.4));
});
mesh(cylX(.1,9.4), mat(0x3b4954), "camshaft", eng, 0,5.3,0);
// intake manifold, air filter, throttle plate
const plenM = glass(0x8fa3b0,.3,{emissive:0x3a8fb7,emissiveIntensity:0}); plenM.userData.anim = 1;
mesh(cylX(.55,9.6), plenM, "intake", eng, 0,3.9,2.4);
mesh(cylX(.5,1.6), glass(0x8fa3b0,.3), "intake", eng, -5.6,3.9,2.4);
box(1.4,1.4,1.4,mat(0xb8893b,{metalness:.1,roughness:.8}),"intake",eng,-7.1,3.9,2.4);
const plate = mesh(new T.CircleGeometry(.5,24), mat(BR,{side:T.DoubleSide}), "throttle", eng, -5.6,3.9,2.4);
const exM = glass(0x9a6b4a,.4,{emissive:0xe4572e,emissiveIntensity:0}); exM.userData.anim = 1;
mesh(cylX(.5,19.4), exM, "exhaust", eng, 5.8,3.9,-2.4);
// flywheel and clutch
const fw = grp(eng,5.2,0,0);
mesh(cylX(1.5,.45,48), mat(0x2b3a45), "flywheel", fw);
{ const g = new T.TorusGeometry(1.5,.07,6,48); g.rotateY(PI/2); mesh(g, mat(0xaab4ba), "flywheel", fw); }
for (let j = 0; j < 5; j++) { const a = j/5*PI*2; mesh(cylX(.22,.5,12), mat(0x0b1620), "flywheel", fw, 0,Math.cos(a),Math.sin(a)); }
const cl = grp(eng,5.75,0,0); mesh(cylX(1.2,.08,40), mat(BR), "clutch", cl);
const pp = grp(eng,5.98,0,0); mesh(cylX(1.25,.18,40), mat(0x52626d), "clutch", pp);
[0,1,2].forEach(j => { const a = j*PI*2/3; mesh(cylX(.09,.3,8), mat(0xe6bf62), "clutch", pp, .24,Math.cos(a)*.9,Math.sin(a)*.9); });
// gearbox, shafts, gear pair
box(4.4,5.4,3.4,glass(0x5b6b76,.16),"gearbox",eng,9.4,-1.3,0,true);
mesh(cylX(.2,4), mat(0x8f9ca5), "gearbox", eng, 8.1,0,0);
mesh(cylX(.2,3.6), mat(0x8f9ca5), "gearbox", eng, 9.4,-2.2,0);
function mkGear(y){
  const w = grp(eng,9.4,y,0); w.rotation.z = PI/2; const sp = grp(w);
  mesh(new T.CylinderGeometry(1,1,.7,40), mat(0x2f4352), "gears", sp);
  for (let j = 0; j < 28; j++){ const a = j/28*PI*2, t = mesh(new T.BoxGeometry(.2,.7,.22), mat(0xc9d3d9), "gears", sp, Math.cos(a),0,Math.sin(a)); t.rotation.y = -a; }
  box(.15,.72,.8,mat(BR),"gears",sp,.55,0,0); return {w,sp};
}
const gI = mkGear(0), gC = mkGear(-2.2);
// driveshaft, rear axle, wheels
const ds = grp(eng,14.7,-2.2,0); mesh(cylX(.18,8.6), mat(0x8f9ca5), "shaft", ds); box(.5,.1,.1,mat(BR),"shaft",ds,0,.2,0);
{ const g = new T.CylinderGeometry(.15,.15,7.2,12); g.rotateX(PI/2); mesh(g, mat(0x8f9ca5), "shaft", car, 19,-2,0); mesh(g.clone(), mat(0x8f9ca5), "shaft", car, -9,-2,0); }
const wheels = [], fpiv = [];
[[19,3.6],[19,-3.6],[-9,3.6],[-9,-3.6]].forEach(([x,z]) => {
  const front = x < 0, piv = grp(car,x,-2,z); if (front) fpiv.push(piv);
  const w = grp(piv); wheels.push(w);
  mesh(new T.TorusGeometry(1.45,.55,16,40), mat(0x1c252b,{metalness:.1,roughness:.9}), "wheel", w);
  const rim = new T.CylinderGeometry(1.1,1.1,.5,32); rim.rotateX(PI/2); mesh(rim, mat(0xaab4ba), "wheel", w);
  for (let j = 0; j < 5; j++){ const s = box(.2,2.1,.3,mat(0x52626d),"wheel",w,0,0,0); s.rotation.z = j*PI*2/5; }
});
// see-through body, lights, floor
const shell = box(32,10,7.6,glass(0xe4572e,.07),null,car,5,2.6,0,true);
shell.children[0].material.color.setHex(0xe4572e); shell.visible = false;
mesh(new T.BoxGeometry(32,.3,8), mat(0x1c252b), null, car, 5,-3.4,0);
[[-11,2.6],[-11,-2.6]].forEach(([x,z]) => mesh(new T.BoxGeometry(.4,.8,1.4), mat(0xfff3d0,{emissive:0xffe9a8,emissiveIntensity:1.4}), null, shell, x-5,-1.5,z));
[[21,2.6],[21,-2.6]].forEach(([x,z]) => mesh(new T.BoxGeometry(.4,.8,1.4), mat(0xff3b30,{emissive:0xff3b30,emissiveIntensity:1}), null, shell, x-5,-1.5,z));

// flowing particles
function pts(n,c){ const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(new Float32Array(n*3),3));
  const p = new T.Points(g, new T.PointsMaterial({color:c,size:.45})); p.frustumCulled = false; eng.add(p); return p; }
const NP = 8, pIn = pts(4*NP,0x8fd0ee), pEx = pts(4*NP,0xff9a5c);
const along = (a,u,arr,i) => { const n = a.length-1, f = u*n, s = Math.min(n-1,Math.floor(f)), t = f-s;
  arr[i*3] = a[s].x+(a[s+1].x-a[s].x)*t; arr[i*3+1] = a[s].y+(a[s+1].y-a[s].y)*t; arr[i*3+2] = a[s].z+(a[s+1].z-a[s].z)*t; };
const pathIn = X.map(x => [V(-5.6,3.9,2.4),V(x-.45,3.9,2.4),V(x-.45,3.9,.3),V(x-.45,3,0)]);
const pathEx = X.map(x => [V(x+.45,3,0),V(x+.45,3.9,-.3),V(x+.45,3.9,-2.4),V(15,3.9,-2.4)]);

// ground, grid and scenery
const ground = new T.Mesh(new T.PlaneGeometry(4000,4000), mat(0x101c25,{metalness:0,roughness:1})); ground.rotation.x = -PI/2; ground.position.y = -4.02; scene.add(ground);
const grid = new T.GridHelper(1600,160,0x2a4a5c,0x1b3340); grid.position.y = -4; scene.add(grid);
const pil = new T.InstancedMesh(new T.BoxGeometry(2,16,2), mat(0x3a5a6e,{metalness:.2}), 160); scene.add(pil);
const hs = (a,b) => { const s = Math.sin(a*127.1+b*311.7)*43758.5453; return s-Math.floor(s); }, dm = new T.Object3D();

// ---------- parts list, highlight, hover ----------
const list = $("#parts"); let cur = null;
Object.entries(PARTS).forEach(([k,[n]]) => { const b = document.createElement("button"); b.type = "button"; b.textContent = n; b.dataset.k = k; b.onclick = () => pick(k); list.appendChild(b); });
function pick(k){
  cur = cur === k ? null : k;
  ALL.forEach(m => { const mt = m.material; if (mt.userData.anim) return; const on = m.userData.k === cur;
    if (cur){ mt.transparent = true; mt.opacity = on ? (mt.userData.tr ? Math.max(mt.userData.o,.5) : 1) : mt.userData.o*.18; } else { mt.opacity = mt.userData.o; mt.transparent = mt.userData.tr; }
    if (mt.emissive){ mt.emissive.setHex(on ? 0xff6a2a : 0); mt.emissiveIntensity = on ? .6 : 1; } });
  list.querySelectorAll("button").forEach(b => b.classList.toggle("sel", b.dataset.k === cur));
  $("#detail").innerHTML = cur ? `<b>${PARTS[cur][0]}</b>${PARTS[cur][1]}` : "Pick a part, or click it in the 3D view.";
}
const ray = new T.Raycaster(), mp = new T.Vector2();
function hit(e){ const r = cv.getBoundingClientRect(); mp.set((e.clientX-r.left)/r.width*2-1, -((e.clientY-r.top)/r.height)*2+1); ray.setFromCamera(mp,cam);
  const hs2 = ray.intersectObjects(ALL,false).filter(i => i.object.userData.k && i.object.visible), SH = ["block","crankcase","gearbox","head"];
  const h = hs2.find(i => !SH.includes(i.object.userData.k)) || hs2[0]; return h ? h.object.userData.k : null; }
const tip = $("#tip");

// ---------- camera and input ----------
const CAM = {az:.9, pol:1.2, d:40, drag:false, moved:0, tgt:new T.Vector3()}; let MODE = "engine";
cv.addEventListener("pointerdown", e => { CAM.drag = true; CAM.moved = 0; cv.setPointerCapture(e.pointerId); });
cv.addEventListener("pointermove", e => {
  if (CAM.drag){ CAM.az -= e.movementX*.006; CAM.pol = Math.min(1.5,Math.max(.15,CAM.pol-e.movementY*.006)); CAM.moved += Math.abs(e.movementX)+Math.abs(e.movementY); tip.style.display = "none"; return; }
  const k = hit(e); tip.style.display = k ? "block" : "none";
  if (k){ const r = cv.parentElement.getBoundingClientRect(); tip.textContent = PARTS[k][0]; tip.style.left = e.clientX-r.left+14+"px"; tip.style.top = e.clientY-r.top+12+"px"; } });
cv.addEventListener("pointerup", e => { CAM.drag = false; if (CAM.moved < 5){ const k = hit(e); if (k) pick(k); } });
cv.addEventListener("wheel", e => { e.preventDefault(); CAM.d = Math.min(140,Math.max(10,CAM.d*(1+e.deltaY*.001))); }, {passive:false});
function setMode(m){
  MODE = m; $("#mEngine").classList.toggle("on", m === "engine"); $("#mDrive").classList.toggle("on", m === "drive");
  shell.visible = m === "drive"; if (m === "drive"){ CAM.az = PI/2; CAM.pol = 1.15; CAM.d = 70; if (!S.run) setRun(true); if (S.g === 0) setGear(1); } else { CAM.az = .9; CAM.pol = 1.2; CAM.d = 40; }
}
$("#mEngine").onclick = () => setMode("engine"); $("#mDrive").onclick = () => setMode("drive");
function fit(){ const w = cv.clientWidth, h = cv.clientHeight; ren.setSize(w,h,false); cam.aspect = w/h; cam.updateProjectionMatrix(); }
new ResizeObserver(fit).observe(cv); fit();

// ---------- controls and state ----------
const S = {run:false, rpm:0, tot:0, g:0, sh:0, v:0, ca:0, pu:[0,0,0,0], px:0, pz:0, yaw:0, steer:0};
const thr = $("#throttle"), KEY = {};
const setRun = on => { S.run = on; $("#start").textContent = on ? "Stop engine" : "Start engine"; $("#start").classList.toggle("on", on); };
$("#start").onclick = () => setRun(!S.run);
const gb = $("#gears"); ["N",1,2,3,4,5].forEach((n,i) => { const b = document.createElement("button"); b.type = "button"; b.textContent = n; b.onclick = () => setGear(i); gb.appendChild(b); });
const chips = $("#chips"); for (let i = 0; i < 4; i++) chips.appendChild(document.createElement("span"));
function setGear(g){
  g = Math.max(0,Math.min(5,g)); if (g !== S.g) S.sh = .45; S.g = g;
  gb.querySelectorAll("button").forEach((b,i) => b.classList.toggle("on", i === g));
  const rho = RAT[g] || 1, ri = 2.2/(1+rho), rc = 2.2-ri;
  gI.sp.scale.set(ri,1,ri); gC.sp.scale.set(rc,1,rc);
  [gI,gC].forEach(o => o.sp.traverse(m => { if (m.material){ m.material.userData.o = g ? 1 : .45; m.material.transparent = !g; m.material.opacity = g ? 1 : .45; } }));
  $("#gt").textContent = g ? `Gear ${g}: ${rho}:1 ratio` : "Neutral: engine is not connected to the wheels";
}
setGear(0);
addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT" && e.target.type !== "range") return;
  const k = e.key.toLowerCase(); KEY[k] = true;
  if (/^[0-5]$/.test(k)) setGear(+k); if (k === "e") setGear(S.g+1); if (k === "q") setGear(S.g-1);
  if (k === "r"){ S.px = S.pz = S.yaw = S.v = 0; }
  if (k.startsWith("arrow") || k === " ") e.preventDefault(); });
addEventListener("keyup", e => KEY[e.key.toLowerCase()] = false);

const lift = (p,a,b) => p > a && p < b ? 8*Math.sin(PI*(p-a)/(b-a)) : 0;
const wr = V(0,0,0), tmp = V(0,0,0);

function step(dt){
  // pedals
  const gasKey = KEY.w || KEY.arrowup, brake = KEY.s || KEY.arrowdown || KEY[" "];
  if (gasKey){ thr.value = Math.min(100,+thr.value+260*dt); if (!S.run) setRun(true); } else if (MODE === "drive") thr.value = Math.max(0,+thr.value-320*dt);
  const t = thr.value/100; $("#tOut").textContent = Math.round(t*100)+"%";
  // automatic gearbox (Drive mode only)
  if ($("#auto").checked && MODE === "drive" && S.run){
    if (S.g === 0 && gasKey) setGear(1);
    else if (S.g > 0 && S.sh <= 0){ if (S.rpm > 5600 && S.g < 5) setGear(S.g+1); else if (S.rpm < 1700 && S.g > 1) setGear(S.g-1); }
  }
  // engine and car physics
  const rho = RAT[S.g] || 1, eg = S.g > 0 && S.sh <= 0, wl = S.v/.114*FD*rho;
  S.sh = Math.max(0,S.sh-dt);
  let rt = S.run ? (eg ? Math.max(wl,800+t*3000) : 800+t*5200) : 0; rt *= 1-.15*(S.sh > 0);
  S.rpm += (rt-S.rpm)*Math.min(1,dt*(S.run ? 4 : 1.5)); if (S.rpm < 2 && !S.run) S.rpm = 0;
  let a = 0;
  if (eg && S.run && wl < 6400) a += t*(1.2-S.rpm/6500)*10*rho;
  a -= .0003*S.v*S.v; a -= eg ? (S.run && t > .05 ? .5 : 1+S.rpm/2000) : .6;
  if (eg && !S.run) a -= 6; if (brake) a -= 55;
  S.v = Math.max(0,S.v+a*dt);
  const u = S.v*1.2, K = $("#slow").checked ? .006 : .02;
  const tgt = (KEY.a || KEY.arrowleft ? 1 : 0)-(KEY.d || KEY.arrowright ? 1 : 0);
  S.steer += (tgt-S.steer)*Math.min(1,dt*6); S.yaw += u/28*Math.tan(.5*S.steer)*dt;
  S.px -= Math.cos(S.yaw)*u*dt; S.pz += Math.sin(S.yaw)*u*dt;
  car.position.set(S.px,0,S.pz); car.rotation.y = S.yaw;
  S.tot += S.rpm*6*dt*K; S.ca -= S.v/.114*FD*6*dt*K;
  wheels.forEach(w => w.rotation.z += u*dt/2); fpiv.forEach(p => p.rotation.y = S.steer*.5);

  // engine parts
  const ph = S.tot % 720;
  const pi = pIn.geometry.attributes.position.array, pe = pEx.geometry.attributes.position.array;
  X.forEach((x,i) => {
    const psi = (ph-OFF[i]+720)%720, th = psi%360, ang = th*PI/180, sn = Math.sin(ang), cs = Math.cos(ang);
    const py = RC*cs+Math.sqrt(LR*LR-(RC*sn)**2), pin = V(x,RC*cs,RC*sn);
    crk[i].rotation.x = ang; pist[i].position.y = py;
    link(rodM[i],V(x,py,0),pin); bigM[i].position.copy(pin);
    const li = lift(psi,10,170), le = lift(psi,550,710);
    vi[i].position.y = -li*.04; ve[i].position.y = -le*.04;
    ci[i].rotation.x = (psi/2-45)*PI/180; ce[i].rotation.x = (psi/2-315)*PI/180;
    const s = Math.floor(psi/180), f = (psi%180)/180, crown = py+.55;
    gas[i].scale.y = Math.max(.01,3.3-crown); gas[i].position.y = (crown+3.3)/2;
    const op = [.25+.35*f,.55+.35*f,.95-.4*f,.5-.3*f][s]*(s < 2 ? .4+.6*t : 1);
    gasM[i].color.setHex(FILL[s]); gasM[i].opacity = S.rpm > 1 ? op : 0; gasM[i].emissive.setHex(s === 2 ? 0xe4572e : 0); gasM[i].emissiveIntensity = s === 2 ? 1-f*.7 : 0;
    spk[i].material.opacity = S.rpm > 1 && psi > 345 && psi < 372 ? 1 : 0;
    runI[i].emissiveIntensity = li > .3 ? .4+.8*t : 0;
    S.pu[i] = (S.pu[i]+dt*(.5+1.2*t))%1;
    for (let j = 0; j < NP; j++){ const n = i*NP+j, u1 = (S.pu[i]+j/NP)%1;
      if (S.rpm > 1 && li > .3) along(pathIn[i],u1,pi,n); else pi[n*3+1] = -999;
      if (S.rpm > 1 && le > .3) along(pathEx[i],u1,pe,n); else pe[n*3+1] = -999; }
    if (i === 0) document.querySelectorAll("#strokes li").forEach((q,j) => q.classList.toggle("act", S.rpm > 1 && j === s));
    const c = chips.children[i]; c.dataset.s = S.rpm > 1 ? s : ""; c.textContent = `Cylinder ${i+1}: ${S.rpm > 1 ? NAMES[s] : "stopped"}`;
  });
  pIn.geometry.attributes.position.needsUpdate = pEx.geometry.attributes.position.needsUpdate = true;
  plate.rotation.y = 1.45*(1-t);
  plenM.emissiveIntensity = S.rpm > 1 ? .15+.5*t : 0; exM.emissiveIntensity = S.rpm > 1 ? .1+.9*S.rpm/6500 : 0;
  fw.rotation.x = cl.rotation.x = S.tot*PI/180;
  const gap = S.sh > 0 ? Math.sin(PI*(1-S.sh/.45)) : 0; pp.position.x = 5.98+gap*.7;
  gI.sp.rotation.y = S.tot*PI/180; gC.sp.rotation.y = S.ca*PI/180; ds.rotation.x = S.ca*PI/180/1.0;
  $("#rpm").textContent = Math.round(S.rpm); $("#kph").textContent = Math.round(S.v); $("#bar").style.width = Math.min(100,S.rpm/65)+"%";

  // scenery follows the car
  grid.position.x = Math.floor(S.px/10)*10; grid.position.z = Math.floor(S.pz/10)*10;
  const ca0 = Math.floor(S.px/60), cb0 = Math.floor(S.pz/60); let n = 0;
  for (let da = -6; da <= 6; da++) for (let db = -6; db <= 6; db++){ const A = ca0+da, B = cb0+db, h = hs(A,B);
    if (h > .6 && n < 160 && Math.max(Math.abs(A),Math.abs(B)) > 1){ dm.position.set(A*60+h*97%40+10,4,B*60+(h*53%1)*40+10); dm.updateMatrix(); pil.setMatrixAt(n++,dm.matrix); } }
  pil.count = n; pil.instanceMatrix.needsUpdate = true;

  // camera
  const cy = Math.cos(S.yaw), sy = Math.sin(S.yaw);
  tmp.set(S.px+(2*cy), 1, S.pz-(2*sy)); CAM.tgt.lerp(tmp,1-Math.exp(-dt*10));
  const A = CAM.az+(MODE === "drive" ? S.yaw : 0), sp = Math.sin(CAM.pol);
  wr.set(CAM.tgt.x+CAM.d*sp*Math.sin(A), CAM.tgt.y+CAM.d*Math.cos(CAM.pol), CAM.tgt.z+CAM.d*sp*Math.cos(A));
  cam.position.lerp(wr,1-Math.exp(-dt*12)); cam.lookAt(CAM.tgt);
}
let last = performance.now();
(function loop(now){ const dt = Math.min(.05,(now-last)/1000); last = now; step(dt); ren.render(scene,cam); requestAnimationFrame(loop); })(last);
