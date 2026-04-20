/* =============================================
   CoreSetup Studio — main.js
   Epic Three.js Globe · Gold · Black · Luxury
============================================= */

/* ─── CUSTOM CURSOR ─────────────────────────── */
(function () {
  const cur = document.getElementById('cursor');
  const dot = document.getElementById('cursorDot');
  let mx = 0, my = 0, cx = 0, cy = 0;

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  function animCursor() {
    cx += (mx - cx) * 0.12;
    cy += (my - cy) * 0.12;
    if (cur) { cur.style.left = cx + 'px'; cur.style.top = cy + 'px'; }
    if (dot) { dot.style.left = mx + 'px'; dot.style.top = my + 'px'; }
    requestAnimationFrame(animCursor);
  }
  animCursor();
})();

/* ─── NAV ────────────────────────────────────── */
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 50));
burger.addEventListener('click', () => nav.classList.toggle('open'));
document.querySelectorAll('.nav__links a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

/* ─── SCROLL REVEAL ──────────────────────────── */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealObs.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ─── COUNT UP ───────────────────────────────── */
const countObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = +el.dataset.target;
    let cur = 0;
    const step = Math.max(1, Math.floor(target / 60));
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      el.textContent = cur;
      if (cur >= target) clearInterval(t);
    }, 24);
    countObs.unobserve(el);
  });
}, { threshold: 0.6 });
document.querySelectorAll('.count').forEach(el => countObs.observe(el));

/* ─── SMOOTH ANCHOR ──────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  });
});

/* =============================================
   THREE.JS GLOBE — HERO
============================================= */
(function initHeroGlobe() {
  if (typeof THREE === 'undefined') return;

  const canvas = document.getElementById('globeCanvas');
  const hero = document.getElementById('hero');
  if (!canvas || !hero) return;

  /* — Renderer — */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;

  /* — Scene / Camera — */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, canvas.offsetWidth / canvas.offsetHeight, 0.1, 1000);
  camera.position.set(0, 0, 3.6);

  /* — Colors — */
  const GOLD     = 0xd4af37;
  const GOLD2    = 0xf0d060;
  const GOLD_DIM = 0x6b5810;
  const BLACK    = 0x05060a;

  /* ── Globe sphere ── */
  const globeGeo = new THREE.SphereGeometry(1, 96, 96);

  // Custom shader material for the globe — dark with gold atmospheric glow
  const globeMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:      { value: 0 },
      uGlowColor: { value: new THREE.Color(GOLD) },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPos;
      varying vec2 vUv;
      void main(){
        vNormal = normalize(normalMatrix * normal);
        vPos    = (modelMatrix * vec4(position,1.0)).xyz;
        vUv     = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3  uGlowColor;
      varying vec3  vNormal;
      varying vec3  vPos;
      varying vec2  vUv;

      // simple hash
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5); }

      // continent approximation using noise fields
      float continents(vec2 uv){
        float lon = uv.x * 6.2832;
        float lat = (uv.y - 0.5) * 3.1416;
        vec2 p = vec2(cos(lat)*cos(lon), cos(lat)*sin(lon));

        // sculpt major land masses with layered sine/cos patterns
        float land = 0.0;

        // Europe / Africa band
        land += smoothstep(0.22, 0.55, sin(lon*1.8 + 0.4) * cos(lat*2.1 + 0.3));
        // Americas
        land += smoothstep(0.18, 0.52, sin(lon*1.5 - 1.9) * cos(lat*1.7 + 0.1) * 0.9);
        // Asia / Australia
        land += smoothstep(0.20, 0.58, sin(lon*2.1 + 1.6) * cos(lat*1.4 - 0.2));
        // polar caps
        float polar = smoothstep(0.6, 0.95, abs(uv.y - 0.5) * 2.0);
        land += polar * 0.5;

        return clamp(land, 0.0, 1.0);
      }

      // grid lines
      float gridLines(vec2 uv){
        float lon = mod(uv.x * 24.0, 1.0);
        float lat = mod(uv.y * 12.0, 1.0);
        float lw  = 0.03;
        float g   = step(1.0 - lw, lon) + step(1.0 - lw, lat);
        return clamp(g, 0.0, 1.0);
      }

      void main(){
        vec2 uv = vUv;

        // atmosphere rim glow
        vec3 viewDir = normalize(cameraPosition - vPos);
        float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);
        rim = pow(rim, 3.0);
        vec3 atmo = uGlowColor * rim * 0.7;

        // continent mask
        float land = continents(uv);
        vec3  oceanCol  = vec3(0.03, 0.035, 0.06);
        vec3  landCol   = vec3(0.10, 0.09, 0.06);
        vec3  base = mix(oceanCol, landCol, land);

        // gold grid overlay
        float grid = gridLines(uv) * 0.12;
        base += uGlowColor * grid * (1.0 - land * 0.6);

        // subtle animated scan line
        float scan = sin(uv.y * 180.0 + uTime * 0.4) * 0.5 + 0.5;
        base += uGlowColor * scan * 0.015;

        // specular highlight (top-left)
        float spec = pow(max(dot(vNormal, normalize(vec3(1.0,1.2,1.5))), 0.0), 32.0);
        base += vec3(0.6, 0.5, 0.2) * spec * 0.35;

        // combine
        vec3 col = base + atmo;
        float alpha = 0.92 + rim * 0.08;

        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    side: THREE.FrontSide,
  });

  const globe = new THREE.Mesh(globeGeo, globeMat);
  scene.add(globe);

  /* ── Atmosphere outer glow ── */
  const atmoGeo = new THREE.SphereGeometry(1.08, 64, 64);
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(GOLD) } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPos;
      void main(){
        vNormal = normalize(normalMatrix * normal);
        vPos = (modelMatrix * vec4(position,1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec3 vNormal;
      varying vec3 vPos;
      void main(){
        vec3 viewDir = normalize(cameraPosition - vPos);
        float rim = 1.0 - dot(vNormal, viewDir);
        rim = pow(rim, 2.5);
        gl_FragColor = vec4(uColor, rim * 0.35);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
  });
  scene.add(new THREE.Mesh(atmoGeo, atmoMat));

  /* ── Stars / particle field ── */
  const starCount = 2000;
  const starGeo   = new THREE.BufferGeometry();
  const starPos   = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 40;
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffd700, size: 0.025, transparent: true, opacity: 0.55 });
  scene.add(new THREE.Points(starGeo, starMat));

  /* ── Connection nodes on globe surface ── */
  const nodePositions = [
    // Major city lat/lon pairs (degrees) → convert to 3D
    [52.5,  13.4],  // Berlin
    [51.5,  -0.1],  // London
    [48.8,   2.3],  // Paris
    [40.7, -74.0],  // New York
    [34.0, -118.2], // LA
    [35.7, 139.7],  // Tokyo
    [22.3, 114.2],  // Hong Kong
    [1.3,  103.8],  // Singapore
    [-33.9,  18.4], // Cape Town
    [55.7,  37.6],  // Moscow
    [19.4, -99.1],  // Mexico City
    [-23.5, -46.6], // São Paulo
    [28.6,  77.2],  // Delhi
    [37.6, 126.9],  // Seoul
    [41.0,  28.9],  // Istanbul
    [-37.8, 145.0], // Melbourne
    [59.9,  30.3],  // St. Petersburg
    [24.5,  54.4],  // Abu Dhabi
  ];

  function latLonToVec3(lat, lon, r) {
    const phi   = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
       r * Math.cos(phi),
       r * Math.sin(phi) * Math.sin(theta)
    );
  }

  const nodeMeshes = [];
  const nodeGeo = new THREE.SphereGeometry(0.015, 8, 8);
  const nodeMat = new THREE.MeshBasicMaterial({ color: GOLD2 });

  nodePositions.forEach(([lat, lon]) => {
    const pos  = latLonToVec3(lat, lon, 1.01);
    const mesh = new THREE.Mesh(nodeGeo, nodeMat);
    mesh.position.copy(pos);
    globe.add(mesh);
    nodeMeshes.push({ mesh, pos });

    // pulse ring
    const ringGeo = new THREE.RingGeometry(0.02, 0.04, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pos);
    ring.lookAt(new THREE.Vector3(0, 0, 0));
    ring.userData.pulseOffset = Math.random() * Math.PI * 2;
    globe.add(ring);
    nodeMeshes.push({ ring, isPulse: true });
  });

  /* ── Arc connections between nodes ── */
  const connections = [
    [0, 1], [0, 2], [0, 9], [0, 14],  // Berlin connections
    [1, 2], [1, 4], [1, 5],
    [3, 4], [3, 10], [3, 11],
    [5, 6], [5, 7], [6, 7],
    [7, 13], [8, 14], [9, 0],
    [12, 6], [15, 6], [16, 0], [17, 12],
    [2, 14], [4, 11], [10, 3],
  ];

  function createArc(p1, p2, color, opacity) {
    const points = [];
    const segments = 48;
    for (let i = 0; i <= segments; i++) {
      const t  = i / segments;
      const pt = p1.clone().lerp(p2, t).normalize();
      const h  = Math.sin(Math.PI * t) * 0.22;
      pt.multiplyScalar(1.01 + h);
      points.push(pt);
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, linewidth: 1 });
    return new THREE.Line(geo, mat);
  }

  const arcGroup = new THREE.Group();
  connections.forEach(([a, b]) => {
    const p1 = latLonToVec3(...nodePositions[a], 1.01);
    const p2 = latLonToVec3(...nodePositions[b], 1.01);
    const arc = createArc(p1, p2, GOLD, 0.25);
    arc.userData.flashOffset = Math.random() * Math.PI * 2;
    arcGroup.add(arc);
  });
  globe.add(arcGroup);

  /* ── Animated "data packet" dots on arcs ── */
  const packetCount = connections.length;
  const packets = [];
  connections.forEach(([a, b]) => {
    const p1  = latLonToVec3(...nodePositions[a], 1.01);
    const p2  = latLonToVec3(...nodePositions[b], 1.01);
    const geo  = new THREE.SphereGeometry(0.01, 6, 6);
    const mat  = new THREE.MeshBasicMaterial({ color: GOLD2 });
    const mesh = new THREE.Mesh(geo, mat);
    globe.add(mesh);
    packets.push({ mesh, p1, p2, t: Math.random(), speed: 0.003 + Math.random() * 0.004 });
  });

  /* ── Light ── */
  const ambient = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(ambient);
  const sunLight = new THREE.DirectionalLight(0xffd080, 1.2);
  sunLight.position.set(3, 2, 3);
  scene.add(sunLight);
  const rimLight = new THREE.DirectionalLight(0xd4af37, 0.4);
  rimLight.position.set(-3, -1, -2);
  scene.add(rimLight);

  /* ── Scroll / mouse interaction ── */
  let scrollY = window.scrollY;
  let mouseX  = 0, mouseY = 0;
  let targetRotX = 0, targetRotY = 0;
  let currentRotX = 0, currentRotY = 0;

  window.addEventListener('scroll', () => { scrollY = window.scrollY; });
  document.addEventListener('mousemove', e => {
    mouseX = (e.clientX / innerWidth  - 0.5) * 2;
    mouseY = (e.clientY / innerHeight - 0.5) * 2;
  });

  /* ── Resize ── */
  function onResize() {
    const w = hero.offsetWidth, h = hero.offsetHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);
  onResize();

  /* ── Animation loop ── */
  let time = 0;
  globe.position.set(1.8, 0, 0);   // offset right of text

  function animate() {
    requestAnimationFrame(animate);
    time += 0.008;

    // Update shader time
    globeMat.uniforms.uTime.value = time;

    // Scroll-driven rotation + camera pull-back
    const heroH = hero.offsetHeight;
    const progress = Math.min(scrollY / heroH, 1);
    globe.rotation.y  = time * 0.12 + progress * Math.PI * 0.6;
    globe.rotation.x  = progress * 0.3;
    globe.position.y  = -progress * 0.5;
    globe.position.z  = -progress * 0.8;
    camera.position.z = 3.6 + progress * 0.4;

    // Subtle mouse parallax
    targetRotX = mouseY * 0.06;
    targetRotY = mouseX * 0.06;
    currentRotX += (targetRotX - currentRotX) * 0.04;
    currentRotY += (targetRotY - currentRotY) * 0.04;
    globe.rotation.x += currentRotX;
    globe.rotation.z  = currentRotY * 0.3;

    // Pulse rings
    arcGroup.children.forEach((arc, i) => {
      const flash = 0.15 + 0.15 * Math.sin(time * 1.8 + arc.userData.flashOffset);
      arc.material.opacity = flash;
    });

    nodeMeshes.forEach(item => {
      if (item.isPulse && item.ring) {
        const s = 1 + 0.4 * Math.abs(Math.sin(time * 1.2 + item.ring.userData.pulseOffset));
        item.ring.scale.setScalar(s);
        item.ring.material.opacity = 0.6 - 0.4 * Math.abs(Math.sin(time * 1.2 + (item.ring.userData.pulseOffset || 0)));
      }
    });

    // Move data packets along arcs
    packets.forEach(p => {
      p.t += p.speed;
      if (p.t > 1) p.t = 0;
      const t   = p.t;
      const mid = p.p1.clone().lerp(p.p2, t).normalize();
      mid.multiplyScalar(1.01 + Math.sin(Math.PI * t) * 0.22);
      p.mesh.position.copy(mid);
      // fade in/out
      p.mesh.material.opacity = Math.sin(Math.PI * t);
    });

    renderer.render(scene, camera);
  }
  animate();

  // Globe position: right on desktop, center + small on mobile
  function positionGlobe() {
    if (innerWidth < 768) {
      globe.position.set(0, 0, 0);
      globe.scale.setScalar(0.75);
    } else {
      globe.position.set(1.8, 0, 0);
      globe.scale.setScalar(1);
    }
  }
  window.addEventListener('resize', positionGlobe);
  positionGlobe();

})();

/* =============================================
   CONTACT SECTION — mini ambient globe
============================================= */
(function initContactGlobe() {
  if (typeof THREE === 'undefined') return;
  const canvas = document.getElementById('contactGlobe');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 3;

  const geo = new THREE.SphereGeometry(1, 64, 64);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vNormal; varying vec3 vPos; varying vec2 vUv;
      void main(){ vNormal=normalize(normalMatrix*normal); vPos=(modelMatrix*vec4(position,1.)).xyz; vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vNormal; varying vec3 vPos; varying vec2 vUv;
      float grid(vec2 uv){ float u=mod(uv.x*20.,1.); float v=mod(uv.y*10.,1.); return step(.96,u)+step(.96,v); }
      void main(){
        vec3 view=normalize(cameraPosition-vPos);
        float rim=pow(1.-dot(vNormal,view),3.);
        float g=grid(vUv)*0.2;
        vec3 col=vec3(0.05,0.04,0.02)+vec3(0.83,0.69,0.21)*(g+rim*0.6);
        gl_FragColor=vec4(col,rim*0.8+g*0.5);
      }
    `,
    transparent: true, side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  scene.add(new THREE.AmbientLight(0xffd070, 0.4));

  let t = 0;
  const section = document.getElementById('contact');

  function resizeCG() {
    if (!section) return;
    const w = section.offsetWidth, h = section.offsetHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resizeCG();
  window.addEventListener('resize', resizeCG);

  function animCG() {
    requestAnimationFrame(animCG);
    t += 0.005;
    mat.uniforms.uTime.value = t;
    mesh.rotation.y = t * 0.2;
    renderer.render(scene, camera);
  }
  animCG();
})();

/* =============================================
   SERVICE CARDS — 3D TILT ON HOVER
============================================= */
document.querySelectorAll('.scard').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width  - 0.5) * 10;
    const y = ((e.clientY - r.top)  / r.height - 0.5) * 10;
    card.style.transform = `perspective(700px) rotateY(${x}deg) rotateX(${-y}deg)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1), background 0.4s';
  });
  card.addEventListener('mouseenter', () => { card.style.transition = ''; });
});

/* pricing cards */
document.querySelectorAll('.pcard').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width  - 0.5) * 8;
    const y = ((e.clientY - r.top)  / r.height - 0.5) * 8;
    card.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${-y}deg) translateY(-6px)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

/* =============================================
   WHY ITEMS — gold number flash on scroll
============================================= */
document.querySelectorAll('.why__num').forEach(num => {
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      num.style.transition = 'color 0.6s';
      num.style.color = 'rgba(212,175,55,0.8)';
      setTimeout(() => { num.style.color = ''; num.style.transition = 'color 1.5s'; }, 700);
    }
  }, { threshold: 0.9 }).observe(num);
});

/* =============================================
   GOLD PARTICLE CANVAS — hero overlay
============================================= */
(function initParticles() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  const cvs = document.createElement('canvas');
  cvs.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;';
  hero.appendChild(cvs);

  const ctx = cvs.getContext('2d');
  let W, H;
  const particles = [];

  function resize() {
    W = cvs.width  = hero.offsetWidth;
    H = cvs.height = hero.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * 1000,
      y: Math.random() * 800,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.2 - Math.random() * 0.4,
      size: 0.8 + Math.random() * 1.6,
      alpha: 0.2 + Math.random() * 0.6,
      life: Math.random(),
    });
  }

  function drawParticles() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.life += 0.003;
      if (p.life > 1) { p.life = 0; p.x = Math.random() * W; p.y = H + 10; }
      const a = Math.sin(p.life * Math.PI) * p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212,175,55,${a})`;
      ctx.fill();
    });
    requestAnimationFrame(drawParticles);
  }
  drawParticles();
})();
