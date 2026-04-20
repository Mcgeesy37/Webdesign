/* ════════════════════════════════════════════
   CoreSetup Studio — main.js
   One Globe. Gold. Sharp.
════════════════════════════════════════════ */

/* ──────────────────────────────────────────
   NAV
────────────────────────────────────────── */
const nav    = document.getElementById('nav');
const burger = document.getElementById('burger');

window.addEventListener('scroll', () => {
  nav.classList.toggle('stuck', window.scrollY > 60);
});

burger.addEventListener('click', () => {
  nav.classList.toggle('open');
});

document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => nav.classList.remove('open'));
});

/* ──────────────────────────────────────────
   SCROLL REVEAL
────────────────────────────────────────── */
const ro = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => ro.observe(el));

/* ──────────────────────────────────────────
   COUNT UP ANIMATION
────────────────────────────────────────── */
const co = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, target = +el.dataset.to;
    let val = 0;
    const step = Math.max(1, Math.ceil(target / 55));
    const timer = setInterval(() => {
      val = Math.min(val + step, target);
      el.textContent = val;
      if (val >= target) clearInterval(timer);
    }, 22);
    co.unobserve(el);
  });
}, { threshold: 0.7 });
document.querySelectorAll('.hstat-n').forEach(el => co.observe(el));

/* ──────────────────────────────────────────
   SMOOTH ANCHOR
────────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  });
});

/* ──────────────────────────────────────────
   CONTACT FORM
────────────────────────────────────────── */
function handleForm(e) {
  e.preventDefault();
  const msg = document.getElementById('formMsg');
  msg.style.display = 'block';
  msg.textContent = '✦ Nachricht gesendet! Wir melden uns innerhalb von 24 Stunden.';
  e.target.reset();
}

/* ──────────────────────────────────────────
   CARD TILT
────────────────────────────────────────── */
document.querySelectorAll('.card, .pcard, .hfeature').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = ((e.clientX - r.left)  / r.width  - .5) * 8;
    const y = ((e.clientY - r.top)   / r.height - .5) * 8;
    card.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${-y}deg)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

/* ════════════════════════════════════════════
   THREE.JS GLOBE  — single, clean, detailed
════════════════════════════════════════════ */
(function buildGlobe() {

  if (typeof THREE === 'undefined') {
    console.warn('Three.js not loaded');
    return;
  }

  const canvas = document.getElementById('globeCanvas');
  if (!canvas) return;

  /* ── Renderer ── */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  /* ── Scene & Camera ── */
  const scene  = new THREE.Scene();
  const W = canvas.parentElement.offsetWidth;
  const H = canvas.parentElement.offsetHeight;
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);
  camera.position.set(0, 0, 3.8);

  function resize() {
    const w = canvas.parentElement.offsetWidth;
    const h = canvas.parentElement.offsetHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  /* ────────────────────────────────────────
     GLOBE SHADER — detailed continents,
     ocean depth, gold grid, atmosphere
  ──────────────────────────────────────── */
  const globeVS = `
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec2 vUv;
    void main() {
      vNormal   = normalize(normalMatrix * normal);
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vUv       = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const globeFS = `
    precision highp float;
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec2 vUv;

    /* ─ noise helpers ─ */
    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i),           hash(i+vec2(1,0)), u.x),
                 mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.1;
        a *= 0.5;
      }
      return v;
    }

    /* ─ continent mask ─
       Accurate-ish land/ocean distribution using
       layered fbm on a lon/lat projection        */
    float continentMask(vec2 uv) {
      float lon = uv.x * 6.2832 - 3.1416;  // -π … π
      float lat = (uv.y - 0.5) * 3.1416;   // -π/2 … π/2

      /* Convert to spherical x,y for noise sampling */
      float clat = cos(lat);
      vec2  sp   = vec2(clat * cos(lon), clat * sin(lon));

      /* Base continent shapes */
      float land = 0.0;

      /* Africa + Europe */
      float af = smoothstep(-0.05, 0.35,
        fbm(sp * 2.8 + vec2(1.2, 0.3)) - 0.28
      );
      land += af * 0.9;

      /* Americas */
      float am = smoothstep(-0.05, 0.35,
        fbm(sp * 2.5 + vec2(-2.1, 0.1)) - 0.30
      );
      land += am * 0.85;

      /* Asia */
      float as = smoothstep(-0.05, 0.40,
        fbm(sp * 2.6 + vec2(2.5, 0.5)) - 0.27
      );
      land += as * 0.95;

      /* Australia */
      float au = smoothstep(-0.05, 0.30,
        fbm(sp * 4.0 + vec2(2.8, -1.1)) - 0.36
      );
      land += au * 0.7;

      /* Polar ice caps */
      float pole = smoothstep(0.58, 0.95, abs(uv.y - 0.5) * 2.0);
      land += pole * 0.5;

      return clamp(land, 0.0, 1.0);
    }

    /* ─ coast line sharpness ─ */
    float coast(vec2 uv) {
      float c  = continentMask(uv);
      float eps = 0.003;
      float cx = continentMask(uv + vec2(eps, 0.0));
      float cy = continentMask(uv + vec2(0.0, eps));
      float grad = length(vec2(cx - c, cy - c)) / eps;
      return clamp(grad * 0.18, 0.0, 1.0);
    }

    void main() {
      vec2 uv = vUv;

      /* ── land / ocean ── */
      float land   = continentMask(uv);
      float coasts = coast(uv);

      vec3 deepOcean  = vec3(0.02, 0.04, 0.09);
      vec3 shallowOcean = vec3(0.05, 0.08, 0.14);
      vec3 landDark   = vec3(0.09, 0.08, 0.05);
      vec3 landMid    = vec3(0.14, 0.12, 0.07);
      vec3 landHigh   = vec3(0.20, 0.17, 0.09);

      /* ocean depth variation */
      float oceanVar = fbm(uv * 6.0) * 0.5 + 0.5;
      vec3  oceanCol = mix(deepOcean, shallowOcean, oceanVar * land + oceanVar * 0.3);

      /* land elevation variation */
      float elev     = fbm(uv * 9.0 + vec2(3.0));
      vec3  landCol  = mix(landDark, mix(landMid, landHigh, elev), land);
      landCol        = mix(landCol, vec3(0.85, 0.82, 0.70) * 0.7, coast(uv) * 0.5);

      vec3 baseCol = mix(oceanCol, landCol, step(0.45, land));

      /* ── gold lat/lon grid ── */
      float lonF = mod(uv.x * 36.0, 1.0);   /* every 10° */
      float latF = mod(uv.y * 18.0, 1.0);   /* every 10° */
      float lw   = 0.025;
      float grd  = max(step(1.0 - lw, lonF), step(1.0 - lw, latF));
      /* Major lines every 30° slightly brighter */
      float lonM = mod(uv.x * 12.0, 1.0);
      float latM = mod(uv.y * 6.0,  1.0);
      float grdM = max(step(1.0 - lw * 1.6, lonM), step(1.0 - lw * 1.6, latM));
      float finalGrid = max(grd * 0.12, grdM * 0.22);

      baseCol += vec3(0.83, 0.69, 0.21) * finalGrid * (0.4 + 0.6 * (1.0 - land));

      /* ── animated scan pulse ── */
      float pulse = sin(uv.y * 120.0 - uTime * 0.6) * 0.5 + 0.5;
      baseCol += vec3(0.83, 0.69, 0.21) * pulse * 0.018 * (1.0 - land);

      /* ── specular highlight (key light from upper-left) ── */
      vec3 lightDir = normalize(vec3(1.4, 1.6, 2.0));
      float diff    = max(dot(vNormal, lightDir), 0.0);
      float spec    = pow(diff, 28.0);
      baseCol      += vec3(0.70, 0.58, 0.22) * spec * 0.45;
      /* soft fill light */
      vec3 fillDir = normalize(vec3(-1.0, -0.5, 0.8));
      baseCol += vec3(0.05, 0.07, 0.12) * max(dot(vNormal, fillDir), 0.0) * 0.3;

      /* ── rim / atmosphere glow ── */
      vec3  viewDir = normalize(cameraPosition - vWorldPos);
      float rim     = 1.0 - max(dot(vNormal, viewDir), 0.0);
      rim           = pow(rim, 2.8);
      vec3  atmo    = vec3(0.83, 0.69, 0.21) * rim * 0.55;
      baseCol += atmo;

      float alpha = 0.88 + rim * 0.12;
      gl_FragColor = vec4(baseCol, alpha);
    }
  `;

  const globeGeo = new THREE.SphereGeometry(1.0, 128, 128);
  const globeMat = new THREE.ShaderMaterial({
    vertexShader:   globeVS,
    fragmentShader: globeFS,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
  });
  const globe = new THREE.Mesh(globeGeo, globeMat);
  scene.add(globe);

  /* ── Atmosphere outer shell ── */
  const atmoGeo = new THREE.SphereGeometry(1.10, 64, 64);
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
      varying vec3 vN; varying vec3 vP;
      void main(){ vN=normalize(normalMatrix*normal); vP=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
    `,
    fragmentShader: `
      varying vec3 vN; varying vec3 vP;
      void main(){
        vec3 v=normalize(cameraPosition-vP);
        float r=pow(1.-dot(vN,v),3.);
        gl_FragColor=vec4(vec3(0.83,0.69,0.21),r*0.28);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
  });
  scene.add(new THREE.Mesh(atmoGeo, atmoMat));

  /* ── Thin outer glow ring ── */
  const glowGeo = new THREE.SphereGeometry(1.18, 64, 64);
  const glowMat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
      varying vec3 vN; varying vec3 vP;
      void main(){ vN=normalize(normalMatrix*normal); vP=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
    `,
    fragmentShader: `
      varying vec3 vN; varying vec3 vP;
      void main(){
        vec3 v=normalize(cameraPosition-vP);
        float r=pow(1.-dot(vN,v),5.);
        gl_FragColor=vec4(vec3(0.9,0.75,0.25),r*0.12);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
  });
  scene.add(new THREE.Mesh(glowGeo, glowMat));

  /* ── Star field ── */
  const starGeo = new THREE.BufferGeometry();
  const starArr = new Float32Array(2400 * 3);
  for (let i = 0; i < 2400 * 3; i++) starArr[i] = (Math.random() - .5) * 60;
  starGeo.setAttribute('position', new THREE.BufferAttribute(starArr, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xfff8e0, size: 0.028, transparent: true, opacity: 0.55
  })));

  /* ────────────────────────────────────────
     CITY NODES + CONNECTION ARCS
  ──────────────────────────────────────── */
  function ll2v3(lat, lon, r) {
    const phi   = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
       r * Math.cos(phi),
       r * Math.sin(phi) * Math.sin(theta)
    );
  }

  /* Major world cities */
  const cities = [
    { name:'Berlin',       lat: 52.5,  lon:  13.4 },
    { name:'London',       lat: 51.5,  lon:  -0.1 },
    { name:'Paris',        lat: 48.9,  lon:   2.3 },
    { name:'New York',     lat: 40.7,  lon: -74.0 },
    { name:'Los Angeles',  lat: 34.1,  lon:-118.2 },
    { name:'São Paulo',    lat:-23.5,  lon: -46.6 },
    { name:'Lagos',        lat:  6.5,  lon:   3.4 },
    { name:'Cairo',        lat: 30.0,  lon:  31.2 },
    { name:'Moscow',       lat: 55.8,  lon:  37.6 },
    { name:'Dubai',        lat: 25.2,  lon:  55.3 },
    { name:'Mumbai',       lat: 19.1,  lon:  72.9 },
    { name:'Delhi',        lat: 28.6,  lon:  77.2 },
    { name:'Singapore',    lat:  1.3,  lon: 103.8 },
    { name:'Hong Kong',    lat: 22.3,  lon: 114.2 },
    { name:'Shanghai',     lat: 31.2,  lon: 121.5 },
    { name:'Tokyo',        lat: 35.7,  lon: 139.7 },
    { name:'Seoul',        lat: 37.6,  lon: 126.9 },
    { name:'Sydney',       lat:-33.9,  lon: 151.2 },
    { name:'Johannesburg', lat:-26.2,  lon:  28.0 },
    { name:'Chicago',      lat: 41.9,  lon: -87.6 },
    { name:'Mexico City',  lat: 19.4,  lon: -99.1 },
    { name:'Istanbul',     lat: 41.0,  lon:  28.9 },
  ];

  /* Node dots on surface */
  const nodeMat  = new THREE.MeshBasicMaterial({ color: 0xf0d878 });
  const nodeGeo  = new THREE.SphereGeometry(0.013, 8, 8);
  const pulseGeo = new THREE.RingGeometry(0.018, 0.034, 16);
  const pulseMat = new THREE.MeshBasicMaterial({ color: 0xd4af37, transparent: true, side: THREE.DoubleSide });

  const pulseRings = [];
  const cityVecs   = cities.map(c => ll2v3(c.lat, c.lon, 1.012));

  cities.forEach((_, i) => {
    const pos  = cityVecs[i];
    const dot  = new THREE.Mesh(nodeGeo, nodeMat);
    dot.position.copy(pos);
    globe.add(dot);

    const ring = new THREE.Mesh(pulseGeo, pulseMat.clone());
    ring.position.copy(pos);
    ring.lookAt(new THREE.Vector3(0, 0, 0));
    ring.userData.phase = Math.random() * Math.PI * 2;
    globe.add(ring);
    pulseRings.push(ring);
  });

  /* ── Build arcs (bezier curves over the surface) ── */
  const connections = [
    [0,1],[0,2],[0,8],[0,21],[0,11],   // Berlin hub
    [1,2],[1,3],[1,7],[1,21],
    [3,4],[3,19],[3,20],
    [4,20],[5,20],[5,6],
    [6,18],[7,18],[7,9],
    [9,10],[9,11],[10,12],[11,12],
    [12,13],[12,15],[13,14],[14,15],
    [15,16],[15,17],[16,17],
    [8,21],[8,9],[0,3],[3,5],
  ];

  function makeArc(i1, i2) {
    const p1  = cityVecs[i1].clone();
    const p2  = cityVecs[i2].clone();
    const mid = p1.clone().lerp(p2, .5).normalize();
    const h   = .15 + p1.distanceTo(p2) * .22;
    mid.multiplyScalar(1.0 + h);

    const curve  = new THREE.QuadraticBezierCurve3(p1, mid, p2);
    const pts    = curve.getPoints(64);
    const geo    = new THREE.BufferGeometry().setFromPoints(pts);
    const mat    = new THREE.LineBasicMaterial({
      color:       0xd4af37,
      transparent: true,
      opacity:     0.18 + Math.random() * 0.15,
      linewidth:   1,
    });
    return { line: new THREE.Line(geo, mat), curve, phase: Math.random() * Math.PI * 2 };
  }

  const arcs = connections.map(([a, b]) => makeArc(a, b));
  arcs.forEach(a => globe.add(a.line));

  /* ── Data packets travelling along arcs ── */
  const packetMat = new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true });
  const packetGeo = new THREE.SphereGeometry(0.009, 6, 6);

  const packets = arcs.map(arc => {
    const mesh = new THREE.Mesh(packetGeo, packetMat.clone());
    globe.add(mesh);
    return {
      mesh,
      curve:  arc.curve,
      t:      Math.random(),
      speed:  0.0018 + Math.random() * 0.0025,
      phase:  Math.random() * Math.PI * 2,
    };
  });

  /* ── Light ── */
  scene.add(new THREE.AmbientLight(0xfff8e0, 0.20));
  const sun = new THREE.DirectionalLight(0xffd080, 1.1);
  sun.position.set(4, 3, 3);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xd4af37, 0.30);
  rim.position.set(-3, -2, -2);
  scene.add(rim);

  /* ── Mouse parallax ── */
  let mxTarget = 0, myTarget = 0, mxCur = 0, myCur = 0;
  document.addEventListener('mousemove', e => {
    mxTarget = (e.clientX / window.innerWidth  - .5) * .4;
    myTarget = (e.clientY / window.innerHeight - .5) * .25;
  });

  /* ── Position globe right of hero content ── */
  function positionGlobe() {
    if (window.innerWidth < 768) {
      globe.position.set(0, 0, 0);
      globe.scale.setScalar(.70);
    } else {
      globe.position.set(1.65, 0, 0);
      globe.scale.setScalar(1.0);
    }
  }
  positionGlobe();
  window.addEventListener('resize', positionGlobe);

  /* ── Animation loop ── */
  let time = 0;
  function animate() {
    requestAnimationFrame(animate);
    time += 0.007;

    /* Update shader */
    globeMat.uniforms.uTime.value = time;

    /* Auto-rotate */
    globe.rotation.y = time * 0.09;

    /* Subtle mouse parallax on camera, not globe */
    mxCur += (mxTarget - mxCur) * 0.04;
    myCur += (myTarget - myCur) * 0.04;
    camera.position.x = mxCur * .6;
    camera.position.y = -myCur * .4;
    camera.lookAt(globe.position);

    /* Pulse rings */
    pulseRings.forEach(ring => {
      const s = 1.0 + .55 * Math.abs(Math.sin(time * 1.1 + ring.userData.phase));
      ring.scale.setScalar(s);
      ring.material.opacity = .55 - .45 * Math.abs(Math.sin(time * 1.1 + ring.userData.phase));
    });

    /* Arc flicker */
    arcs.forEach((arc, i) => {
      arc.line.material.opacity = 0.12 + .18 * (.5 + .5 * Math.sin(time * .9 + arc.phase));
    });

    /* Move packets */
    packets.forEach(p => {
      p.t += p.speed;
      if (p.t > 1) p.t = 0;
      const pos = p.curve.getPoint(p.t);
      p.mesh.position.copy(pos);
      p.mesh.material.opacity = Math.sin(p.t * Math.PI) * .9;
    });

    renderer.render(scene, camera);
  }
  animate();

})();
