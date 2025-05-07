const sock = io(); let myIdx = null; let state = {};
const roleSel = $("roleSelect"), playArea = $("playArea"), settingsModal = $("settingsModal"), gear = $("settingsBtn");

sock.on("state", s => { state = s; updateSettingsUI(); });

$("p1Btn").onclick = _ => choose(0); $("p2Btn").onclick = _ => choose(1);
function choose(i) { myIdx = i; roleSel.classList.add("hidden"); playArea.classList.remove("hidden"); }

$("tapBtn").onclick = _ => { if (myIdx !== null) sock.emit("score", myIdx); };

// ---------- Gear toggle fix ----------------------------------
let modalOpen = false;
gear.addEventListener("click", () => toggleModal(!modalOpen));
$("closeSettings").addEventListener("click", () => toggleModal(false));
settingsModal.addEventListener("click", e => { if (e.target === settingsModal) toggleModal(false); });
function toggleModal(flag) { modalOpen = flag; settingsModal.classList.toggle("hidden", !flag); }

function $(id) { return document.getElementById(id); }

// Inputs sync --------------------------------------------------
const inputs = ["score1Input", "score2Input", "serverSelect", "alignChk", "effectChk"].map($);
inputs.forEach(el => el.addEventListener("change", () => {
  const n = { scores: [+inputs[0].value, +inputs[1].value], serverIdx: +inputs[2].value, alignMode: inputs[3].checked, showEffects: inputs[4].checked };
  sock.emit("setState", n);
}));

$("resetBtn").onclick = _ => sock.emit("reset");

function updateSettingsUI() { inputs[0].value = state.scores[0]; inputs[1].value = state.scores[1]; inputs[2].value = state.serverIdx; inputs[3].checked = state.alignMode; inputs[4].checked = state.showEffects; }
