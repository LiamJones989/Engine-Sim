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
  intake:["Intake manifold","Shares fresh air between the four cylinders through one runner each. The throttle plate sits at its entrance."],
  exhaust:["Exhaust manifold","Collects burnt gas from all four cylinders into one pipe that leads to the tailpipe."],
  clutch:["Clutch","A friction disc pressed against the flywheel by a spring plate. Pressing the pedal pulls the plate away, so the gearbox can change gear without grinding. It opens briefly on every shift."],
  gearbox:["Gearbox (transmission)","Holds the input shaft from the clutch, a second shaft below it, and the gears that link them. Picking a gear changes how fast the wheels turn for a given engine speed."],
  gears:["Gear pair","A small gear driving a big one multiplies torque but slows the wheel (1st gear). A big driving a small one is faster but weaker (5th gear). The picture shows the pair now selected."],
  shaft:["Driveshaft and final drive","Carries power from the gearbox to the wheel and reduces speed once more by a fixed ratio of 4.1 to 1."],
  wheel:["Wheel","Turns the engine's rotation into motion along the road. Its speed is engine rpm divided by the gear ratio and the final drive."]
};
const $ = s => document.querySelector(s), svg = $("#engine"), NS = "http://www.w3.org/2000/svg";
const C = [130,260,390,520], OFF = [0,540,180,360], R = 40, L = 140, FD = 4.1, RAT = [0,3.6,2.1,1.4,1,.75];
const FILL = ["#6fb7d6","#4f8fb0","#e4572e","#7d868c"], NAMES = ["Intake","Compression","Power","Exhaust"];

// The engine drawing now lives in index.html as plain SVG. This file only adds behavior.
// parts list, tooltips, selection
const list = $("#parts"); let cur = null;
Object.entries(PARTS).forEach(([k,[n]]) => {
  const b = document.createElement("button"); b.type = "button"; b.textContent = n; b.dataset.k = k; b.onclick = () => pick(k); list.appendChild(b);
  svg.querySelectorAll(`[data-part="${k}"]`).forEach(el => { const t = document.createElementNS(NS,"title"); t.textContent = n; el.prepend(t); });
});
function pick(k){
  cur = cur === k ? null : k;
  svg.querySelectorAll("[data-part]").forEach(e => e.classList.toggle("hl", e.dataset.part === cur));
  cur ? svg.setAttribute("data-focus","") : svg.removeAttribute("data-focus");
  list.querySelectorAll("button").forEach(b => b.classList.toggle("sel", b.dataset.k === cur));
  $("#detail").innerHTML = cur ? `<b>${PARTS[cur][0]}</b>${PARTS[cur][1]}` : "Pick a part, or click it on the engine.";
}
svg.addEventListener("click", e => { const p = e.target.closest("[data-part]"); if (p) pick(p.dataset.part); });

// state and controls
const S = {run:false, rpm:0, tot:0, g:0, sh:0, kph:0, ca:0, wa:0, fi:0, fe:0, fv:[0,0,0,0]};
const thr = $("#throttle"), t = () => thr.value / 100;
thr.oninput = () => $("#tOut").textContent = thr.value + "%";
$("#start").onclick = e => { S.run = !S.run; e.target.textContent = S.run ? "Stop engine" : "Start engine"; e.target.classList.toggle("on", S.run); };
const gb = $("#gears");
["N",1,2,3,4,5].forEach((n,i) => { const b = document.createElement("button"); b.type = "button"; b.textContent = n; b.onclick = () => setGear(i); gb.appendChild(b); });
const chips = $("#chips"); for (let i = 0; i < 4; i++) chips.appendChild(document.createElement("span"));
function setGear(g){
  if (g !== S.g) S.sh = .45; S.g = g;
  gb.querySelectorAll("button").forEach((b,i) => b.classList.toggle("on", i === g));
  const rho = RAT[g] || 1, ri = 70 / (1 + rho), rc = 70 - ri;
  [["gI",ri],["gC",rc]].forEach(([id,rad]) => {
    const c = $("#" + id + "c"), n = Math.round(rad / 2.6);
    c.setAttribute("r", rad); c.setAttribute("stroke-dasharray", (2 * Math.PI * rad) / (2 * n));
    const l = $("#" + id + "l"), cy = +c.getAttribute("cy"); l.setAttribute("y2", cy - rad * .7);
    $("#" + id).setAttribute("opacity", g ? 1 : .45);
  });
  $("#gt").textContent = g ? `Gear ${g}  ${rho}:1` : "Neutral";
}
addEventListener("keydown", e => { if (/^[0-5]$/.test(e.key) && !/INPUT/.test(e.target.tagName)) setGear(+e.key); });
setGear(0);

const lift = (p,a,b) => p > a && p < b ? 8 * Math.sin(Math.PI * (p - a) / (b - a)) : 0;
const el = {}; const $$ = id => el[id] || (el[id] = document.getElementById(id));
const tf = (id,s) => $$(id).setAttribute("transform", s);

function draw(dt, K){
  const ph = S.tot % 720, rho = RAT[S.g] || 1;
  let any = 0;
  C.forEach((x,i) => {
    const psi = (ph - OFF[i] + 720) % 720, th = psi % 360, a = th * Math.PI / 180, sn = Math.sin(a), cs = Math.cos(a);
    const pinY = 500 - (R * cs + Math.sqrt(L * L - (R * sn) ** 2)), px = x + R * sn, py = 500 - R * cs;
    tf("pi"+i, `translate(${x} ${pinY})`); tf("cr"+i, `rotate(${th} ${x} 500)`);
    const rd = $$("rd"+i); rd.setAttribute("x1", x); rd.setAttribute("y1", pinY); rd.setAttribute("x2", px); rd.setAttribute("y2", py);
    $$("bg"+i).setAttribute("cx", px); $$("bg"+i).setAttribute("cy", py);
    const li = lift(psi,10,170), le = lift(psi,550,710); any += le > .3;
    tf("vi"+i, `translate(0 ${li})`); tf("ve"+i, `translate(0 ${le})`);
    tf("ci"+i, `translate(${x-30} 36) rotate(${psi / 2 - 45})`); tf("ce"+i, `translate(${x+30} 36) rotate(${psi / 2 - 315})`);
    const s = Math.floor(psi / 180), f = (psi % 180) / 180;
    const op = [.25 + .35 * f, .55 + .35 * f, 1 - .5 * f, .55 - .3 * f][s] * (s < 2 ? .4 + .6 * t() : 1);
    const g = $$("gs"+i); g.setAttribute("y", 250); g.setAttribute("height", Math.max(0, pinY - 36 - 250)); g.setAttribute("fill", FILL[s]); g.setAttribute("fill-opacity", S.rpm > 1 ? op : 0);
    $$("sp"+i).setAttribute("opacity", psi > 345 && psi < 372 ? 1 : 0);
    S.fv[i] += li > .3 ? 70 * dt * (.3 + t()) : 0; $$("fv"+i).setAttribute("stroke-dashoffset", -S.fv[i]);
    $$("fv"+i).setAttribute("opacity", li > .3 ? .3 + .7 * t() : 0);
    const c = chips.children[i]; c.dataset.s = S.rpm > 1 ? s : ""; c.textContent = `Cylinder ${i+1}: ${S.rpm > 1 ? NAMES[s] : "stopped"}`;
    if (i === 0) document.querySelectorAll("#strokes li").forEach((q,j) => q.classList.toggle("act", S.rpm > 1 && j === s));
  });
  tf("pl", `rotate(${82 * (1 - t())})`);
  S.fi += S.rpm > 1 ? 30 * dt * (.2 + t()) : 0; S.fe += S.rpm > 1 ? 50 * dt * (.3 + t()) : 0;
  $$("fi").setAttribute("stroke-dashoffset", -S.fi); $$("fi").setAttribute("opacity", S.rpm > 1 ? .15 + .85 * t() : 0);
  $$("fx").setAttribute("stroke-dashoffset", -S.fe); $$("fx").setAttribute("opacity", S.rpm > 1 ? .2 + .8 * S.rpm / 6000 : 0);

  // transmission
  const gap = S.sh > 0 ? Math.sin(Math.PI * (1 - S.sh / .45)) : 0;
  tf("pp", `translate(${gap * 14} 0)`); tf("fw", `rotate(${S.tot % 360} 660 500)`);
  tf("gI", `rotate(${S.tot % 360} 858 500)`); tf("gC", `rotate(${S.ca % 360} 858 570)`); tf("wh", `rotate(${S.wa % 360} 1020 570)`);
  $$("road").setAttribute("stroke-dashoffset", S.wa / 360 * 301);
  $("#rpm").textContent = Math.round(S.rpm); $("#kph").textContent = Math.round(S.kph);
  $("#bar").style.width = Math.min(100, S.rpm / 60) + "%";
}

let last = performance.now();
(function loop(now){
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const K = $("#slow").checked ? .006 : .02, rho = RAT[S.g] || 1;
  S.sh = Math.max(0, S.sh - dt);
  const target = (S.run ? 800 + t() * 5200 : 0) * (1 - .15 * (S.sh > 0 ? 1 : 0));
  S.rpm += (target - S.rpm) * Math.min(1, dt * (S.run ? 2.5 : 1.2));
  if (S.rpm < 2 && !S.run) S.rpm = 0;
  const d = S.rpm * 6 * dt * K; S.tot += d;
  const drive = S.g > 0 && S.sh <= 0;
  S.kph = drive ? S.kph + (S.rpm / rho / FD * .114 - S.kph) * Math.min(1, dt * 2.5) : Math.max(0, S.kph * (1 - .12 * dt));
  const wrpm = S.kph / .114;
  S.wa += wrpm * 6 * dt * K; S.ca -= wrpm * FD * 6 * dt * K;
  draw(dt, K); requestAnimationFrame(loop);
})(last);
