const PARTS = {
  block:["Cylinder block","The strong metal body with a smooth round bore. The piston slides up and down inside it, and the walls carry heat away."],
  head:["Cylinder head","Seals the top of the cylinder. It holds the valves, the spark plug and the passages that let air in and exhaust out."],
  chamber:["Combustion chamber","The space above the piston. Its volume shrinks when the piston rises (compression) and grows when it falls. This is where fuel burns."],
  piston:["Piston","Takes the push from burning gas. Its rings seal the gap against the wall so pressure cannot leak, and the wrist pin joins it to the connecting rod."],
  rod:["Connecting rod","Links the piston to the crankshaft. It turns the piston's straight up-and-down motion into rotation."],
  crankshaft:["Crankshaft","A cranked shaft that spins as the rod pushes its offset pin. The counterweight opposite the pin balances the moving mass."],
  flywheel:["Flywheel","A heavy disc that stores spin energy. Only one stroke in four pushes, so it carries the engine through the other three."],
  crankcase:["Crankcase","The housing around the crankshaft. It holds oil and keeps the bottom end aligned."],
  camshaft:["Camshaft","Its lobes push the valves open at the right moment. It turns at half the crankshaft speed, so valves open once every two crank turns."],
  valveIn:["Intake valve","Opens during the intake stroke to let air and fuel in, then seals the chamber shut for compression and power."],
  valveEx:["Exhaust valve","Opens at the end of the power stroke so the rising piston can push burnt gas out."],
  plug:["Spark plug","Fires a spark across its tip just before the top of compression, igniting the mixture so it burns and expands."],
  throttle:["Throttle plate","A flap in the intake pipe. Closed, it restricts air and the engine idles. Open, more air and fuel arrive, so each power stroke is stronger and rpm climbs."],
  intake:["Intake manifold","The pipe that carries fresh air from outside to the intake valve. The throttle plate sits inside it."],
  exhaust:["Exhaust pipe","Carries hot burnt gas away from the exhaust valve and out of the engine."]
};
const $ = s => document.querySelector(s);
const svg = $("#engine"), NS = "http://www.w3.org/2000/svg";
const S = {run:false, rpm:0, phi:0, fi:0, fe:0};
const R = 50, L = 130, FILL = ["#6fb7d6","#4f8fb0","#e4572e","#7d868c"];
const NAMES = ["Intake","Compression","Power","Exhaust"];

// parts list, tooltips and selection
const list = $("#parts");
Object.entries(PARTS).forEach(([k,[n]]) => {
  const b = document.createElement("button"); b.type = "button"; b.textContent = n; b.dataset.k = k;
  b.onclick = () => pick(k); list.appendChild(b);
  svg.querySelectorAll(`[data-part="${k}"]`).forEach(el => {
    const t = document.createElementNS(NS,"title"); t.textContent = n; el.prepend(t);
  });
});
let cur = null;
function pick(k){
  cur = cur === k ? null : k;
  svg.querySelectorAll("[data-part]").forEach(e => e.classList.toggle("hl", e.dataset.part === cur));
  cur ? svg.setAttribute("data-focus","") : svg.removeAttribute("data-focus");
  list.querySelectorAll("button").forEach(b => b.classList.toggle("sel", b.dataset.k === cur));
  $("#detail").innerHTML = cur ? `<b>${PARTS[cur][0]}</b>${PARTS[cur][1]}` : "Pick a part, or click it on the engine.";
}
svg.addEventListener("click", e => { const p = e.target.closest("[data-part]"); if (p) pick(p.dataset.part); });

// controls
const thr = $("#throttle"), t = () => thr.value / 100;
thr.oninput = () => $("#tOut").textContent = thr.value + "%";
$("#start").onclick = e => {
  S.run = !S.run; e.target.textContent = S.run ? "Stop engine" : "Start engine"; e.target.classList.toggle("on", S.run);
};

const lift = (p,a,b) => p > a && p < b ? 8 * Math.sin(Math.PI * (p - a) / (b - a)) : 0;
const set = (el,a) => Object.entries(a).forEach(([k,v]) => el.setAttribute(k,v));

function draw(dt){
  const th = (S.phi % 360) * Math.PI / 180, sn = Math.sin(th), cs = Math.cos(th);
  const pinY = 500 - (R * cs + Math.sqrt(L * L - (R * sn) ** 2));
  const px = 300 + R * sn, py = 500 - R * cs;
  $("#pist").setAttribute("transform", `translate(300 ${pinY})`);
  set($("#rod"), {x1:300, y1:pinY, x2:px, y2:py}); set($("#big"), {cx:px, cy:py});
  $("#crank").setAttribute("transform", `rotate(${S.phi % 360} 300 500)`);

  const li = lift(S.phi,10,170), le = lift(S.phi,550,710);
  $("#vI").setAttribute("transform", `translate(0 ${li})`); $("#vE").setAttribute("transform", `translate(0 ${le})`);
  $("#camI").setAttribute("transform", `translate(270 160) rotate(${S.phi / 2 - 45})`);
  $("#camE").setAttribute("transform", `translate(330 160) rotate(${S.phi / 2 - 315})`);
  $("#plate").setAttribute("transform", `rotate(${82 * (1 - t())})`);

  const stroke = Math.floor(S.phi / 180), f = (S.phi % 180) / 180;
  const op = [.25 + .35 * f, .55 + .35 * f, 1 - .5 * f, .55 - .3 * f][stroke] * (stroke < 2 ? .4 + .6 * t() : 1);
  set($("#gas"), {y:250, height:Math.max(0, pinY - 36 - 250), fill:FILL[stroke], "fill-opacity":S.rpm > 1 ? op : 0});
  $("#spark").setAttribute("opacity", S.phi > 345 && S.phi < 372 ? 1 : 0);

  const v = S.rpm * dt * .05 * (.2 + t());
  S.fi += li > .3 ? 40 * dt * (.3 + t()) : v * .2; S.fe += le > .3 ? 60 * dt * (.3 + t()) : 0;
  set($("#flowIn"), {"stroke-dashoffset": -S.fi, opacity: .15 + .85 * t()});
  set($("#flowEx"), {"stroke-dashoffset": -S.fe, opacity: le > .3 ? 1 : .25});

  $("#rpm").textContent = Math.round(S.rpm); $("#bar").style.width = Math.min(100, S.rpm / 60) + "%";
  $("#valves").textContent = `Intake valve ${li > .3 ? "open" : "closed"}. Exhaust valve ${le > .3 ? "open" : "closed"}.`;
  document.querySelectorAll("#strokes li").forEach((el,i) => el.classList.toggle("act", S.rpm > 1 && i === stroke));
}

let last = performance.now();
(function loop(now){
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const target = S.run ? 800 + t() * 5200 : 0;
  S.rpm += (target - S.rpm) * Math.min(1, dt * (S.run ? 2.5 : 1.2));
  if (S.rpm < 2 && !S.run) S.rpm = 0;
  S.phi = (S.phi + S.rpm * 6 * dt * ($("#slow").checked ? .006 : .02)) % 720;
  draw(dt); requestAnimationFrame(loop);
})(last);
