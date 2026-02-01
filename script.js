// script.js
(() => {
  const yesBtn = document.getElementById('yesBtn');
  const noBtn  = document.getElementById('noBtn');
  const card   = document.getElementById('card');
  const choices = document.getElementById('choices');

  const overlay = document.getElementById('posterOverlay');
  const posterInner = document.getElementById('posterInner');
  const downloadLink = document.getElementById('downloadLink');
  const closePoster = document.getElementById('closePoster');

  // Config
  const AWARENESS_DISTANCE = 160; // px: how close the cursor can be before No moves
  const MOVE_PADDING = 12; // keep some padding from edges
  let moving = false; // rate-limit movement to avoid jitter

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Move the No button away when cursor is close
  function onPointerMove(e){
    // get cursor
    const cx = e.clientX;
    const cy = e.clientY;

    const btnRect = noBtn.getBoundingClientRect();
    const containerRect = choices.getBoundingClientRect();

    const btnCenterX = btnRect.left + btnRect.width/2;
    const btnCenterY = btnRect.top + btnRect.height/2;

    const dx = cx - btnCenterX;
    const dy = cy - btnCenterY;
    const dist = Math.hypot(dx, dy);

    if (dist < AWARENESS_DISTANCE && !moving){
      moving = true;
      requestAnimationFrame(() => {
        moveNoButtonAway(cx, cy, containerRect, btnRect);
        // small cooldown so it doesn't jitter continuously
        setTimeout(()=> moving = false, 180);
      });
    }
  }

  function randomInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }

  function moveNoButtonAway(cursorX, cursorY, containerRect, btnRect){
    // Try to find a new position at least AWARENESS_DISTANCE away from cursor
    const btnW = btnRect.width;
    const btnH = btnRect.height;

    const leftBound = containerRect.left + MOVE_PADDING;
    const topBound  = containerRect.top + MOVE_PADDING;
    const rightBound = containerRect.right - btnW - MOVE_PADDING;
    const bottomBound = containerRect.bottom - btnH - MOVE_PADDING;

    // Convert bounds into coordinates relative to the container (for setting style.left/top)
    const containerLeft = containerRect.left;
    const containerTop = containerRect.top;

    const tries = 12;
    let chosen = null;
    for (let i=0;i<tries;i++){
      // random position inside container
      const candidateX = randomInt(leftBound, Math.max(leftBound, rightBound));
      const candidateY = randomInt(topBound, Math.max(topBound, bottomBound));

      const cCenterX = candidateX + btnW/2;
      const cCenterY = candidateY + btnH/2;

      const d = Math.hypot(cCenterX - cursorX, cCenterY - cursorY);
      if (d >= AWARENESS_DISTANCE + 30) { chosen = {x: candidateX, y: candidateY}; break; }
      if (!chosen && i === tries-1) chosen = {x: candidateX, y: candidateY};
    }

    // If somehow bounds are tiny (mobile), move using a vector away from cursor instead
    if (!chosen) {
      const currentLeft = btnRect.left;
      const currentTop = btnRect.top;
      const vx = btnRect.left + btnW/2 - cursorX;
      const vy = btnRect.top + btnH/2 - cursorY;
      const vlen = Math.hypot(vx, vy) || 1;
      const factor = 1.8;
      let newCenterX = btnRect.left + btnW/2 + (vx/vlen) * (AWARENESS_DISTANCE * factor);
      let newCenterY = btnRect.top + btnH/2 + (vy/vlen) * (AWARENESS_DISTANCE * factor);

      newCenterX = clamp(newCenterX, leftBound + btnW/2, rightBound + btnW/2);
      newCenterY = clamp(newCenterY, topBound + btnH/2, bottomBound + btnH/2);

      chosen = { x: newCenterX - btnW/2, y: newCenterY - btnH/2 };
    }

    // Apply as position relative to the choices container
    const relX = chosen.x - containerLeft;
    const relY = chosen.y - containerTop;

    noBtn.style.left = `${relX}px`;
    noBtn.style.top  = `${relY}px`;
  }

  // Prevent clicking the No button under any circumstance
  noBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    // optional cheeky response (uncomment if you want): alert("Nope 😉");
  });

  // Also move the button if user tries to mousedown on it
  noBtn.addEventListener('mousedown', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    // cause immediate move
    const containerRect = choices.getBoundingClientRect();
    const btnRect = noBtn.getBoundingClientRect();
    moveNoButtonAway(ev.clientX, ev.clientY, containerRect, btnRect);
  });

  // Listen for pointer moves over the whole document so it works even when cursor enters from outside
  document.addEventListener('mousemove', onPointerMove);
  // touch devices: move when touchmove
  document.addEventListener('touchmove', (ev) => {
    if (ev.touches && ev.touches[0]) onPointerMove(ev.touches[0]);
  }, {passive:true});

  // Handle Yes click -> generate poster
  yesBtn.addEventListener('click', () => {
    showPoster();
  });

  closePoster.addEventListener('click', hidePoster);

  // Generate an SVG poster and show it (also wire download)
  function generatePosterSVG(){
    const width = 1000;
    const height = 1400;
    const title = "Let's go on a date";
    const subtitle = "14 February — Make this day special";
    const message = "Let's go for a date on 14th Feb";

    // Keep fonts simple and embed emoji hearts
    const svg = `
<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'>
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#ff6b9a"/>
      <stop offset="1" stop-color="#ffd1dc"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>

  <rect width="100%" height="100%" rx="28" fill="url(#g)"/>

  <g transform="translate(0,50)">
    <text x="50%" y="140" font-family="Segoe UI, Roboto, Arial" font-weight="700" font-size="64" fill="white" text-anchor="middle"> ${title} ❤️ </text>

    <text x="50%" y="240" font-family="Georgia, serif" font-size="28" fill="#fff" text-anchor="middle">${subtitle}</text>

    <g transform="translate(0,320)">
      <rect x="80" y="0" width="${width-160}" height="700" rx="18" fill="rgba(255,255,255,0.9)"/>
      <text x="50%" y="200" font-family="Georgia, serif" font-size="44" fill="#333" text-anchor="middle">${message}</text>
      <text x="50%" y="320" font-family="Segoe UI, Roboto" font-size="20" fill="#666" text-anchor="middle">Let's make memories together — food, laughs, and a little sparkle ✨</text>
    </g>

    <g transform="translate(0,1100)">
      <text x="50%" y="40" font-family="Segoe UI, Roboto" font-size="20" fill="#fff" text-anchor="middle">With love,</text>
      <text x="50%" y="80" font-family="Segoe UI, Roboto" font-size="18" fill="#fff" text-anchor="middle">— Someone special</text>
    </g>
  </g>
</svg>
`.trim();

    return svg;
  }

  function showPoster(){
    const svg = generatePosterSVG();
    // Create a data URL (encode special chars)
    const svgBlob = new Blob([svg], {type: 'image/svg+xml;charset=utf-8'});
    const svgUrl = URL.createObjectURL(svgBlob);

    // Put an <img> inside posterInner to display SVG
    posterInner.innerHTML = `<img src="${svgUrl}" alt="Valentine Poster" style="width:100%; display:block; border-radius:8px;" />`;

    // prepare download link for SVG file
    // For better UX, we'll create a downloadable SVG file (browser will save as .svg)
    downloadLink.href = svgUrl;
    downloadLink.setAttribute('download', 'valentine_poster.svg');

    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden','false');

    // revoke URL later when overlay closes (handled in hidePoster)
  }

  function hidePoster(){
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden','true');

    // Revoke any created object URLs to free memory
    const img = posterInner.querySelector('img');
    if (img && img.src.startsWith('blob:')) {
      URL.revokeObjectURL(img.src);
    }

    // clear posterInner after brief delay to avoid flicker on close
    setTimeout(()=> posterInner.innerHTML = '', 120);
  }

  // Keep No button within container bounds at start (center-right)
  function initNoPosition(){
    const containerRect = choices.getBoundingClientRect();
    const btnRect = noBtn.getBoundingClientRect();
    // initial position: center-right
    const relX = (containerRect.width * 0.7) - btnRect.width/2;
    const relY = (containerRect.height / 2) - btnRect.height/2;
    noBtn.style.left = `${relX}px`;
    noBtn.style.top  = `${relY}px`;
  }

  // Initialize when DOM is ready
  window.addEventListener('load', () => {
    // make choices container positioned so absolute children are relative to it
    choices.style.position = 'relative';
    initNoPosition();

    // Make the No button focusable false to discourage keyboard click
    noBtn.setAttribute('tabindex', '-1');
  });

  // Recenter on resize
  window.addEventListener('resize', initNoPosition);
})();
