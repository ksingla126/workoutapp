// RankUp 3D body: an x-ray figure built from the BodyParts3D anatomy (CC BY-SA 2.1 JP, Database Center for Life Science),
// reshaped into a gender-neutral mannequin. Each muscle glows in its rank colour; crisp white lines trace every muscle edge.
// Loaded on demand from the Ranks screen. One WebGL canvas is kept and moved between renders of the screen.
import * as THREE from "three";
import { GLTFLoader } from "/body/three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "/body/three/addons/libs/meshopt_decoder.module.js";
import { EffectComposer } from "/body/three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "/body/three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "/body/three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "/body/three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "/body/three/addons/postprocessing/OutputPass.js";

const MODEL = "/body/body-neutral.glb";
let B = null; // the one live figure

/* ---------- materials ---------- */
const fillMat = (col, k) => new THREE.ShaderMaterial({ transparent: true, depthWrite: true, uniforms: { c: { value: new THREE.Color(col) }, k: { value: k }, t: { value: 0 } },
  vertexShader: `varying vec3 n;varying vec3 v;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
  fragmentShader: `uniform vec3 c;uniform float k,t;varying vec3 n;varying vec3 v;void main(){vec3 N=normalize(n);float face=abs(dot(N,v));
    float dif=max(dot(N,normalize(vec3(.35,.6,.75))),0.);float pulse=.9+.1*sin(t);
    float I=clamp(k*pulse*(.45+.55*pow(face,1.2))*(.75+.25*dif)+pow(1.-face,2.4)*.6,0.,1.);
    vec3 col=vec3(.03,.05,.13)*(.5+.8*dif)+c*I*.92+vec3(1.)*pow(1.-face,4.)*.18;gl_FragColor=vec4(col,.62+.3*min(k,1.));}` });
const darkMat = () => new THREE.MeshStandardMaterial({ color: "#0E1640", emissive: "#141E52", emissiveIntensity: .35, roughness: .75, transparent: true, opacity: .62 });
const haloMat = (col, k) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
  uniforms: { c: { value: new THREE.Color(col) }, k: { value: k }, t: { value: 0 } },
  vertexShader: `varying vec3 n;varying vec3 v;void main(){vec3 p=position+normal*9.;vec4 mv=modelViewMatrix*vec4(p,1.);n=normalize(normalMatrix*normal);v=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
  fragmentShader: `uniform vec3 c;uniform float k,t;varying vec3 n;varying vec3 v;void main(){float f=pow(1.-abs(dot(normalize(n),v)),1.25)*.55;gl_FragColor=vec4(c*f*k*(.85+.15*sin(t)),1.);}` });
// ID buffer: rgb says which muscle part a pixel is, alpha which "detail band" inside it (six-pack segments, fibre lines)
const idMat = (col, mode, z0, z1) => new THREE.ShaderMaterial({ uniforms: { c: { value: col }, mode: { value: mode }, z0: { value: z0 }, z1: { value: z1 } },
  vertexShader: `varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `uniform vec3 c;uniform int mode;uniform float z0,z1;varying vec3 p;
  void main(){float b=0.;float ax=abs(p.x);
    if(mode==1){float t=(z1-p.z)/(z1-z0);float wob=.012*sin(ax*.09);b=t<.17+wob?1.:t<.37+wob?2.:t<.58+wob?3.:4.;}
    else if(mode==2){b=mod(floor((p.z-.9*ax)/27.),2.)+1.;}
    else if(mode==3){b=mod(floor((p.z-.55*ax)/27.),2.)+1.;}
    else if(mode==4){b=mod(floor((ax+.04*(p.z-900.))/15.),2.)+1.;}
    else if(mode==5){b=(mod(floor((p.z-1.25*ax)/52.),2.)+1.)*.25;}
    gl_FragColor=vec4(c,b/16.);}` });
const EDGE = { uniforms: { tDiffuse: { value: null }, tId: { value: null }, px: { value: new THREE.Vector2() }, w: { value: 1.1 }, lc: { value: new THREE.Color("#F2F6FF") } },
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `uniform sampler2D tDiffuse,tId;uniform vec2 px;uniform float w;uniform vec3 lc;varying vec2 vUv;
  void main(){vec4 base=texture2D(tDiffuse,vUv);vec4 c=texture2D(tId,vUv);float e=0.,d=0.;
    for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 o=vec2(cos(a),sin(a));vec4 q=texture2D(tId,vUv+o*w*px);e+=step(.004,length(q.rgb-c.rgb));
      vec4 q2=texture2D(tId,vUv+o*.8*px);float da=abs(q2.a-c.a);d+=(1.-step(.004,length(q2.rgb-c.rgb)))*step(.008,da)*clamp(da*16.,.4,1.);}
    e=clamp(e/3.,0.,1.);d=clamp(d/3.,0.,1.);vec3 line=lc*(c.b>.95&&c.r<.05?.55:1.);
    vec3 col=mix(base.rgb,lc,d*.38);col=mix(col,line,e*.85);gl_FragColor=vec4(col,1.);}` };

/* ---------- build ---------- */
async function build() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const R = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" }); R.setPixelRatio(dpr);
  const S = new THREE.Scene(); S.background = new THREE.Color("#0A0F2C");
  const IDS = new THREE.Scene(); IDS.background = new THREE.Color(0, 0, 0);
  const cam = new THREE.PerspectiveCamera(30, 1, 1, 10000);
  S.add(new THREE.HemisphereLight(0xbfd4ff, 0x101840, 1.1)); const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(1, 1.5, 2); S.add(dl);
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const gl = await loader.loadAsync(MODEL);
  const root = gl.scene; root.rotation.x = -Math.PI / 2; const idRoot = new THREE.Group(); idRoot.rotation.x = -Math.PI / 2;
  const list = []; root.traverse(o => { if (o.isMesh) list.push(o) });
  const parts = [], ids = []; let n = 0;
  list.forEach(o => {
    o.geometry.computeVertexNormals(); const [g, ix] = o.name.split("__"), idx = +ix;
    const im = new THREE.Mesh(o.geometry); o.updateMatrix(); im.matrix.copy(o.matrix); im.matrixAutoUpdate = false;
    if (g === "skin") { o.material = new THREE.MeshBasicMaterial({ color: "#3D5BBF", transparent: true, opacity: .07, depthWrite: false }); o.renderOrder = -1;
      im.material = idMat(new THREE.Color(0, 0, 1), 0, 0, 1); im.material.depthWrite = false; im.renderOrder = -1 }
    else { n++; const col = new THREE.Color(((n * 53) % 251) / 255, ((n * 97) % 241) / 255, .25); o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox;
      const mode = g === "abs" ? 1 : g === "obliques" ? (idx < 2 ? 2 : 3) : g === "lowback" ? 4 : (g === "lats" && idx < 2) ? 5 : 0;
      im.material = idMat(col, mode, bb.min.z, bb.max.z); parts.push({ g, m: o }); ids.push([col, g]) }
    idRoot.add(im);
  });
  const pivot = new THREE.Group(); pivot.add(root); S.add(pivot); const ip = new THREE.Group(); ip.add(idRoot); IDS.add(ip);
  const box = new THREE.Box3().setFromObject(pivot), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  root.position.sub(c); idRoot.position.copy(root.position); idRoot.updateMatrixWorld(true);
  const comp = new EffectComposer(R); comp.addPass(new RenderPass(S, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .55, .55, .2); comp.addPass(bloom);
  const edge = new ShaderPass(EDGE); comp.addPass(edge); comp.addPass(new OutputPass());
  const idRT = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  edge.uniforms.tId.value = idRT.texture;
  return { R, S, IDS, cam, comp, bloom, edge, idRT, pivot, ip, parts, ids, h: sz.y, dpr, mats: [], halos: [], ang: 0, target: null, spin: true, w: 0, ht: 0, raf: 0, active: false, t: 0, picked: null };
}

/* ---------- colour the figure from the ranks ---------- */
function paint(ranks, colors) {
  B.halos.forEach(h => h.parent && h.parent.remove(h)); B.halos = []; B.mats = [];
  B.parts.forEach(({ g, m }) => {
    const v = ranks[g];
    if (v == null) { m.material = darkMat(); return }
    const col = colors[Math.max(0, Math.min(5, Math.floor(v)))];
    m.material = fillMat(col, 1); const h = new THREE.Mesh(m.geometry, haloMat(col, 2.6)); h.renderOrder = 8; m.add(h); B.halos.push(h); B.mats.push(m.material, h.material);
  });
}

function size(host) {
  const w = Math.max(200, Math.round(host.clientWidth)), ht = Math.round(host.clientHeight || 340);
  if (w === B.w && ht === B.ht) return; B.w = w; B.ht = ht;
  B.R.setSize(w, ht, false); B.R.domElement.style.width = w + "px"; B.R.domElement.style.height = ht + "px";
  B.comp.setSize(w, ht); B.idRT.setSize(w * B.dpr, ht * B.dpr); B.edge.uniforms.px.value.set(1 / (w * B.dpr), 1 / (ht * B.dpr));
  B.cam.aspect = w / ht; const fit = B.h * .5 / Math.tan(THREE.MathUtils.degToRad(15)) * 1.02;
  B.cam.position.set(0, B.h * .025, Math.max(fit, fit / B.cam.aspect * .5)); B.cam.lookAt(0, B.h * .025, 0); B.cam.updateProjectionMatrix();
}

function draw() {
  B.pivot.rotation.y = B.ang; B.ip.rotation.y = B.ang;
  B.mats.forEach(m => m.uniforms && (m.uniforms.t.value = B.t));
  B.R.setRenderTarget(B.idRT); B.R.render(B.IDS, B.cam); B.R.setRenderTarget(null); B.comp.render();
}
function loop(now) {
  B.raf = 0; if (!B.active) return;
  const dt = Math.min(.05, (now - (B.last || now)) / 1000); B.last = now; B.t += dt * 2.2;
  if (B.target != null) { let d = B.target - B.ang; d = Math.atan2(Math.sin(d), Math.cos(d)); B.ang += d * Math.min(1, dt * 7); if (Math.abs(d) < .002) { B.ang = B.target; B.target = null } }
  else if (B.spin) B.ang += dt * .45;
  draw(); B.raf = requestAnimationFrame(loop);
}

/* ---------- tap a muscle: read its ID from the ID buffer ---------- */
function pick(x, y) {
  const px = new Uint8Array(4), X = Math.round(x * B.dpr), Y = Math.round((B.ht - y) * B.dpr);
  B.R.readRenderTargetPixels(B.idRT, X, Y, 1, 1, px);
  if (px[0] + px[1] === 0) return null;
  let best = null, bd = 1e9; B.ids.forEach(([c, g]) => { const d = Math.abs(c.r * 255 - px[0]) + Math.abs(c.g * 255 - px[1]); if (d < bd) { bd = d; best = g } });
  return bd < 6 ? best : null;
}

/* ---------- public: mount into a slide, recolour, pause ---------- */
export async function mountBody(host, opts) {
  if (!B) B = await build();
  const cv = B.R.domElement; cv.className = "bd-cv"; cv.setAttribute("aria-hidden", "true");
  if (cv.parentNode !== host) host.prepend(cv);
  B.calm = !!opts.calm; if (B.calm) B.spin = false;
  size(host); paint(opts.ranks || {}, opts.colors); B.onPick = opts.onPick;
  if (!cv.__tap) { cv.__tap = true; let sx = 0, sy = 0, st = 0;
    cv.addEventListener("pointerdown", e => { sx = e.clientX; sy = e.clientY; st = Date.now() });
    cv.addEventListener("pointerup", e => { if (Math.hypot(e.clientX - sx, e.clientY - sy) > 8 || Date.now() - st > 500) return;
      const r = cv.getBoundingClientRect(); draw(); const g = pick(e.clientX - r.left, e.clientY - r.top); B.onPick && B.onPick(g) }) }
  draw(); return ctl;
}
const ctl = {
  setActive(on) { if (!B) return; B.active = on; if (on && !B.raf) { B.last = 0; B.raf = requestAnimationFrame(loop) } },
  face(side) { if (!B) return; B.spin = false; B.target = side === "back" ? Math.PI : 0; ctl.setActive(true) },
  spin() { if (!B) return; B.target = null; B.spin = true; ctl.setActive(true) },
  resize(host) { if (B) { size(host); draw() } },
};
export default ctl;
