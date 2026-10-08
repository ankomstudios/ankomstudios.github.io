/* Official tracklist: My Beautiful Dark Twisted Fantasy (2010).
   "f" = file inside /music. Swap placeholder-XX.mp3 for your real file names. */
const TRACKS = [
  { t: "Dark Fantasy",                        a: "Kanye West",                                                     d: "4:40", f: "placeholder-01.mp3" },
  { t: "Gorgeous",                            a: "Kanye West, Kid Cudi, Raekwon",                                  d: "5:57", f: "placeholder-02.mp3" },
  { t: "Power",                               a: "Kanye West",                                                     d: "4:52", f: "placeholder-03.mp3" },
  { t: "All of the Lights (Interlude)",       a: "Kanye West",                                                     d: "1:02", f: "placeholder-04.mp3" },
  { t: "All of the Lights",                   a: "Kanye West, Rihanna, Kid Cudi",                                  d: "5:00", f: "placeholder-05.mp3" },
  { t: "Monster",                             a: "Kanye West, JAY-Z, Rick Ross, Nicki Minaj, Bon Iver",            d: "6:18", f: "placeholder-06.mp3" },
  { t: "So Appalled",                         a: "Kanye West, JAY-Z, Pusha T, Swizz Beatz, CyHi, RZA",             d: "6:38", f: "placeholder-07.mp3" },
  { t: "Devil in a New Dress",                a: "Kanye West, Rick Ross",                                          d: "5:52", f: "placeholder-08.mp3" },
  { t: "Runaway",                             a: "Kanye West, Pusha T",                                            d: "9:08", f: "placeholder-09.mp3" },
  { t: "Hell of a Life",                      a: "Kanye West",                                                     d: "5:27", f: "placeholder-10.mp3" },
  { t: "Blame Game",                          a: "Kanye West, John Legend",                                        d: "7:49", f: "placeholder-11.mp3" },
  { t: "Lost in the World",                   a: "Kanye West, Bon Iver",                                           d: "4:17", f: "placeholder-12.mp3" },
  { t: "Who Will Survive in America",         a: "Kanye West",                                                     d: "2:38", f: "placeholder-13.mp3" }
];
const BASE = "music/";

const $ = s => document.querySelector(s);
const audio = new Audio();
audio.preload = "metadata";
let idx = -1, playing = false, shuffle = false, repeat = false, dragging = false;
let ctx, an, buf;

const ico = n => `<svg><use href="#i-${n}"/></svg>`;
const fmt = s => isFinite(s) ? Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0") : "0:00";

/* Track list */
const list = $("#tracks");
list.innerHTML = TRACKS.map((k, i) =>
  `<div class="row" role="listitem" tabindex="0" data-i="${i}"><span class="n">${i + 1}</span>
   <div><div class="t">${k.t}</div><div class="a">${k.a}</div></div><span class="d">${k.d}</span></div>`).join("");
const rows = [...list.children];
rows.forEach(r => {
  const go = () => { const i = +r.dataset.i; i === idx ? toggle() : (load(i), play()); };
  r.addEventListener("click", go);
  r.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
});
$("#q").addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  rows.forEach((r, i) => r.hidden = !(TRACKS[i].t + " " + TRACKS[i].a).toLowerCase().includes(q));
});

/* Core */
function load(i) {
  idx = (i + TRACKS.length) % TRACKS.length;
  const k = TRACKS[idx];
  audio.src = BASE + k.f;
  $("#title").textContent = k.t;
  $("#artist").textContent = k.a;
  $("#cur").textContent = "0:00"; $("#dur").textContent = k.d; $("#seek").value = 0;
  rows.forEach((r, n) => r.classList.toggle("cur", n === idx));
}
function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    an = ctx.createAnalyser(); an.fftSize = 64;
    ctx.createMediaElementSource(audio).connect(an); an.connect(ctx.destination);
    buf = new Uint8Array(an.frequencyBinCount);
    draw();
  } catch (e) { ctx = null; }
}
function play() {
  if (idx < 0) load(0);
  initAudio();
  if (ctx && ctx.state === "suspended") ctx.resume();
  audio.play().catch(() => {});
}
function toggle() { playing ? audio.pause() : play(); }
function next() {
  let n = idx + 1;
  if (shuffle && TRACKS.length > 1) do { n = Math.floor(Math.random() * TRACKS.length); } while (n === idx);
  load(n); play();
}
function prev() {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  load(idx - 1); play();
}
function setPlaying(v) {
  playing = v;
  const i = v ? "pause" : "play";
  $("#pp").innerHTML = ico(i); $("#pp").setAttribute("aria-label", v ? "Pause" : "Play");
  $("#heroPlay").innerHTML = ico(i);
}
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove("show"), 4000);
}

/* Audio events */
audio.addEventListener("play", () => setPlaying(true));
audio.addEventListener("pause", () => setPlaying(false));
audio.addEventListener("loadedmetadata", () => $("#dur").textContent = fmt(audio.duration));
audio.addEventListener("timeupdate", () => {
  if (dragging || !audio.duration) return;
  $("#seek").value = audio.currentTime / audio.duration * 100;
  $("#cur").textContent = fmt(audio.currentTime);
});
audio.addEventListener("ended", () => {
  if (repeat) { audio.currentTime = 0; play(); } else next();
});
audio.addEventListener("error", () => {
  setPlaying(false);
  toast(`Can't play "${TRACKS[idx].t}". Add ${TRACKS[idx].f} to the music folder.`);
});

/* Controls */
$("#pp").onclick = toggle;
$("#heroPlay").onclick = toggle;
$("#next").onclick = next;
$("#prev").onclick = prev;
$("#shuf").onclick = e => { shuffle = !shuffle; e.currentTarget.classList.toggle("on", shuffle); };
$("#rep").onclick = e => { repeat = !repeat; e.currentTarget.classList.toggle("on", repeat); };
$("#seek").addEventListener("input", e => {
  dragging = true;
  if (audio.duration) { audio.currentTime = e.target.value / 100 * audio.duration; $("#cur").textContent = fmt(audio.currentTime); }
});
$("#seek").addEventListener("change", () => dragging = false);
$("#vol").addEventListener("input", e => audio.volume = e.target.value / 100);
audio.volume = $("#vol").value / 100;

document.addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT" && e.target.type === "search") return;
  if (e.key === " " && e.target.tagName !== "BUTTON") { e.preventDefault(); toggle(); }
  else if (e.key === "ArrowRight") next();
  else if (e.key === "ArrowLeft") prev();
});

/* Visualizer */
function draw() {
  requestAnimationFrame(draw);
  const c = $("#viz").getContext("2d");
  c.clearRect(0, 0, 80, 28);
  c.fillStyle = "#d4a843";
  if (playing) an.getByteFrequencyData(buf);
  for (let i = 0; i < 12; i++) {
    const v = playing ? buf[i * 2] / 255 : 0;
    const h = Math.max(3, v * 28);
    c.fillRect(i * 6.6, 28 - h, 5, h);
  }
}
