/**
 * SILICON GENESIS — Live 16-Bit Pixel-Art Ending Scene Renderer
 *
 * Renders two atmospheric, live-animated 320x180 pixel-art scenes inside the
 * Full-Screen Visual-Novel Ending Theater:
 *   - 'ch1_beacon': Chapter I Ending — ARK-7's restored control hub & starry
 *     night relay tower beaming "HELLO, WORLD." with pulsing emerald radio
 *     waves, twinkling ARK-4 CPU rack LEDs, and ARK-3's incoming reply wave!
 *   - 'ch2_bluesky': Chapter II Grand Ending — The massive underground blast
 *     hatch thrown wide open onto a radiant true blue sky, drifting pixel
 *     clouds, golden sunbeams, sparkling sea horizon, green windswept hills,
 *     shelters' residents & Mina/Kagari/Hako silhouettes, and ARK-3's rover!
 */

const PW = 320;
const PH = 180;

export class EndingSceneCanvas {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl ? canvasEl.getContext('2d') : null;
    this.mode = null; // null | 'ch1_beacon' | 'ch2_bluesky' | 'ch2_hatch_open'
    this.stagePhase = 0; // 0..1 sub-state (e.g. reply received vs transmitting)
    this.time = 0;
    this._raf = null;
    this._lastTs = 0;

    if (this.canvas) {
      this.canvas.width = PW;
      this.canvas.height = PH;
    }

    // Deterministic pixel stars for ch1_beacon
    this._stars = [];
    let seed = 42094;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 62; i++) {
      this._stars.push({
        x: Math.floor(rand() * PW),
        y: Math.floor(rand() * 98),
        phase: rand() * Math.PI * 2,
        speed: 1.2 + rand() * 2.5,
        bright: rand() > 0.7,
      });
    }

    // Deterministic clouds for ch2_bluesky
    this._clouds = [
      { x: 24, y: 24, w: 68, h: 16, speed: 3.2 },
      { x: 132, y: 14, w: 86, h: 20, speed: 2.3 },
      { x: 244, y: 32, w: 62, h: 14, speed: 3.9 },
      { x: 78, y: 48, w: 50, h: 12, speed: 2.8 },
    ];

    // Golden sunlit floating dust motes / wind petals
    this._motes = [];
    for (let i = 0; i < 24; i++) {
      this._motes.push({
        x: rand() * PW,
        y: 20 + rand() * 140,
        vx: 4 + rand() * 8,
        vy: -2 + rand() * 4,
        phase: rand() * Math.PI * 2,
      });
    }
  }

  setScene(mode, { phase = 0 } = {}) {
    if (!this.canvas || !this.ctx) return;
    const changed = this.mode !== mode;
    this.mode = mode;
    this.stagePhase = phase;
    this.canvas.classList.toggle('hidden', !mode);
    if (mode) {
      if (changed) this.time = 0;
      this._ensureLoop();
    } else {
      this.stop();
    }
  }

  stop() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    this._lastTs = 0;
  }

  _ensureLoop() {
    if (this._raf) return;
    const tick = (ts) => {
      if (!this.mode) {
        this._raf = null;
        return;
      }
      if (!this._lastTs) this._lastTs = ts;
      const dt = Math.min(0.05, (ts - this._lastTs) / 1000);
      this._lastTs = ts;
      this.time += dt;
      this._render();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  _render() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    if (this.mode === 'ch1_beacon') {
      this._renderCh1Beacon(ctx);
    } else if (this.mode === 'ch2_bluesky') {
      this._renderCh2BlueSky(ctx);
    }
  }

  // ===========================================================================
  // CHAPTER I ENDING: "HELLO, WORLD." BEACON & ARK-4 CPU IGNITION
  // ===========================================================================
  _renderCh1Beacon(ctx) {
    const t = this.time;
    const hasReply = this.stagePhase >= 1;

    // 1. Pre-dawn starry sky above the horizon (y = 0..108)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 112);
    skyGrad.addColorStop(0, '#070e1b');
    skyGrad.addColorStop(0.55, '#0f2038');
    skyGrad.addColorStop(0.85, hasReply ? '#21425a' : '#1b3147');
    skyGrad.addColorStop(1, hasReply ? '#5e463a' : '#332d33');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, PW, 112);

    // Subtle dawn glow on the eastern horizon
    if (hasReply) {
      ctx.fillStyle = 'rgba(255, 198, 112, 0.18)';
      ctx.fillRect(0, 96, PW, 16);
      ctx.fillStyle = 'rgba(255, 220, 148, 0.22)';
      ctx.fillRect(72, 102, 176, 10);
    }

    // Twinkling pixel stars
    for (const st of this._stars) {
      const tw = 0.45 + 0.55 * Math.sin(t * st.speed + st.phase);
      ctx.fillStyle = st.bright
        ? `rgba(210, 242, 255, ${tw.toFixed(2)})`
        : `rgba(148, 188, 224, ${(tw * 0.8).toFixed(2)})`;
      ctx.fillRect(st.x, st.y, st.bright && tw > 0.85 ? 2 : 1, 1);
    }

    // 2. Distant city ruins & ridge silhouette (y = 86..114)
    ctx.fillStyle = '#0c1522';
    ctx.fillRect(0, 104, PW, 12);
    const ridges = [
      [0, 96, 36, 12],
      [28, 92, 42, 16],
      [62, 98, 52, 10],
      [182, 95, 44, 13],
      [220, 88, 38, 20],
      [254, 94, 66, 14],
    ];
    for (const [rx, ry, rw, rh] of ridges) {
      ctx.fillRect(rx, ry, rw, rh);
    }

    // 3. Surface Relay Beacon Tower (center-left x=96) emitting expanding radio pulses!
    const tx = 96;
    const ty = 34;
    ctx.fillStyle = '#182636';
    ctx.fillRect(tx - 1, ty, 3, 74);
    ctx.fillStyle = '#25384c';
    ctx.fillRect(tx - 6, ty + 24, 13, 2);
    ctx.fillRect(tx - 9, ty + 46, 19, 2);
    ctx.fillRect(tx - 13, ty + 66, 27, 4);
    // Diagonal lattice hints
    ctx.strokeStyle = '#2e455c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx - 11, ty + 66);
    ctx.lineTo(tx, ty + 6);
    ctx.lineTo(tx + 11, ty + 66);
    ctx.stroke();

    // Expanding emerald "HELLO, WORLD." radio rings
    for (let i = 0; i < 4; i++) {
      const p = ((t * 0.55 + i * 0.25) % 1);
      const rad = 5 + p * 74;
      const alpha = (1 - p) * 0.72;
      ctx.strokeStyle = `rgba(82, 227, 182, ${alpha.toFixed(2)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(tx, ty, rad, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    }

    // Incoming golden ARK-3 reply pulse from far right ridge!
    if (hasReply) {
      const rx = 258;
      const ry = 76;
      for (let i = 0; i < 3; i++) {
        const p = ((t * 0.65 + i * 0.33) % 1);
        const rad = 4 + p * 54;
        const alpha = (1 - p) * 0.78;
        ctx.strokeStyle = `rgba(255, 209, 102, ${alpha.toFixed(2)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rx, ry, rad, Math.PI * 0.95, Math.PI * 1.75);
        ctx.stroke();
      }
      // ARK-3 distant tower beacon light
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(rx - 1, ry - 1, 3, 3);
      ctx.fillStyle = '#182636';
      ctx.fillRect(rx, ry + 2, 1, 14);
    }

    // Glowing tower beacon tip
    const tipPulse = 0.65 + 0.35 * Math.sin(t * 7);
    ctx.fillStyle = `rgba(110, 255, 206, ${tipPulse.toFixed(2)})`;
    ctx.fillRect(tx - 2, ty - 2, 5, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(tx - 1, ty - 1, 3, 3);

    // 4. Lower Underground ARK-7 Control Console Cutaway (y = 108..180)
    ctx.fillStyle = '#101822';
    ctx.fillRect(0, 108, PW, 72);
    // Steel ceiling divider beam
    ctx.fillStyle = '#29394a';
    ctx.fillRect(0, 106, PW, 4);
    ctx.fillStyle = '#4c657d';
    ctx.fillRect(0, 107, PW, 1);

    // Left: Homemade ARK-4 CPU Rack with twinkling amber/emerald LED matrix!
    ctx.fillStyle = '#192430';
    ctx.fillRect(14, 116, 72, 56);
    ctx.strokeStyle = '#c28b42';
    ctx.lineWidth = 1;
    ctx.strokeRect(14.5, 116.5, 71, 55);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ARK-4 CPU', 20, 125);
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 10; col++) {
        const wave = Math.sin(t * 5.2 + row * 1.3 + col * 0.85);
        const on = wave > 0.05;
        ctx.fillStyle = on
          ? (row + col) % 3 === 0
            ? '#52e3b6'
            : '#ffd166'
          : '#233242';
        ctx.fillRect(20 + col * 6, 130 + row * 7, 4, 4);
      }
    }

    // Center: Glowing Green Phosphor CRT Monitor showing "HELLO, WORLD." & Reply!
    ctx.fillStyle = '#1e2c3a';
    ctx.fillRect(98, 114, 134, 60);
    ctx.strokeStyle = '#52e3b6';
    ctx.lineWidth = 1;
    ctx.strokeRect(98.5, 114.5, 133, 59);
    ctx.fillStyle = '#071b16';
    ctx.fillRect(103, 119, 124, 50);

    // Live oscillating digital carrier waveform inside CRT
    ctx.strokeStyle = hasReply ? '#ffd166' : '#52e3b6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let px = 0; px < 118; px++) {
      const wy =
        154 +
        Math.round(
          Math.sin(px * 0.22 - t * 9) * 5 * Math.cos(px * 0.05 + t * 2)
        );
      if (px === 0) ctx.moveTo(106 + px, wy);
      else ctx.lineTo(106 + px, wy);
    }
    ctx.stroke();

    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#72f7ca';
    ctx.fillText('TX> "HELLO, WORLD."', 107, 130);
    if (hasReply) {
      ctx.fillStyle = '#ffe28a';
      ctx.fillText('RX< ARK-3: ALIVE!!', 107, 141);
    } else {
      const dots = '.'.repeat(1 + (Math.floor(t * 3) % 3));
      ctx.fillStyle = '#56ccf2';
      ctx.fillText(`SCANNING BAND${dots}`, 107, 141);
    }

    // Right: Warm silhouettes of Mina (raising fist), Kagari, and Hako CRT box!
    ctx.fillStyle = '#182430';
    ctx.fillRect(242, 120, 66, 52);
    ctx.strokeStyle = '#4a6075';
    ctx.strokeRect(242.5, 120.5, 65, 51);

    // Hako mini terminal on desk
    ctx.fillStyle = '#3d4c5c';
    ctx.fillRect(284, 144, 18, 16);
    ctx.fillStyle = '#182e28';
    ctx.fillRect(286, 146, 14, 9);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(288, 149, 3, 2);
    ctx.fillRect(294, 149, 3, 2);
    ctx.fillRect(289, 152, 7, 1);

    // Mina cheerful silhouette (bob hair + raised arm)
    ctx.fillStyle = '#25394a';
    ctx.fillRect(250, 144, 10, 26); // torso
    ctx.fillStyle = '#e8bda0';
    ctx.fillRect(252, 135, 6, 7); // face
    ctx.fillStyle = '#141a22';
    ctx.fillRect(250, 133, 10, 5); // bob hair
    ctx.fillRect(250, 137, 2, 5);
    ctx.fillRect(258, 137, 2, 5);
    // Raised celebrating arm
    const bob = Math.sin(t * 4) > 0 ? -1 : 0;
    ctx.fillStyle = '#2d4b61';
    ctx.fillRect(246, 132 + bob, 4, 13);

    // Kagari silhouette (hair bun + olive jacket)
    ctx.fillStyle = '#3b4a36';
    ctx.fillRect(266, 145, 11, 25);
    ctx.fillStyle = '#e4b89b';
    ctx.fillRect(268, 136, 7, 7);
    ctx.fillStyle = '#252930';
    ctx.fillRect(267, 134, 9, 4);
    ctx.fillRect(269, 130, 5, 4); // hair bun
    ctx.fillStyle = '#cbd4de';
    ctx.fillRect(272, 134, 3, 2); // silver streak
  }

  // ===========================================================================
  // CHAPTER II GRAND ENDING: RETURN TO THE REAL BLUE SKY
  // ===========================================================================
  _renderCh2BlueSky(ctx) {
    const t = this.time;
    const showRover = this.stagePhase >= 1;

    // 1. Radiant Vivid TRUE BLUE SKY Gradient!
    const sky = ctx.createLinearGradient(0, 0, 0, 112);
    sky.addColorStop(0, '#1466c4');
    sky.addColorStop(0.45, '#3aa0f2');
    sky.addColorStop(0.82, '#88dbff');
    sky.addColorStop(1, '#fff3c4');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, PW, 114);

    // 2. Radiant Golden Morning Sun & Volumetric Sunbeams!
    const sunX = 228;
    const sunY = 40;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 78);
    sunGlow.addColorStop(0, 'rgba(255, 252, 224, 0.95)');
    sunGlow.addColorStop(0.28, 'rgba(255, 232, 152, 0.45)');
    sunGlow.addColorStop(1, 'rgba(255, 232, 152, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(sunX - 80, 0, 160, 120);

    // Crisp pixel sun disc
    ctx.fillStyle = '#fff9d6';
    ctx.fillRect(sunX - 7, sunY - 7, 14, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sunX - 5, sunY - 5, 10, 10);

    // Soft diagonal sunbeams slanting down across the open sky
    ctx.save();
    for (let i = 0; i < 4; i++) {
      const shimmer = 0.055 + 0.025 * Math.sin(t * 1.4 + i * 1.6);
      ctx.fillStyle = `rgba(255, 248, 210, ${shimmer.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(sunX - 18 + i * 16, sunY);
      ctx.lineTo(sunX - 4 + i * 16, sunY);
      ctx.lineTo(40 + i * 54, PH);
      ctx.lineTo(12 + i * 54, PH);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 3. Gently Drifting Pixel-Art Cumulus Clouds
    for (const c of this._clouds) {
      const cx = Math.floor(((c.x + t * c.speed) % (PW + c.w + 20)) - c.w);
      const cy = c.y;
      // Cloud base shadow (soft azure-lavender)
      ctx.fillStyle = '#c4e4fa';
      ctx.fillRect(cx + 4, cy + Math.floor(c.h * 0.55), c.w - 8, Math.floor(c.h * 0.45));
      // Cloud main fluffy puffs (bright warm white)
      ctx.fillStyle = '#f5fbff';
      ctx.fillRect(cx + 6, cy + 4, c.w - 12, Math.floor(c.h * 0.55));
      ctx.fillRect(cx + Math.floor(c.w * 0.22), cy, Math.floor(c.w * 0.42), Math.floor(c.h * 0.65));
      ctx.fillRect(cx + Math.floor(c.w * 0.52), cy + 2, Math.floor(c.w * 0.28), Math.floor(c.h * 0.55));
      // Sunlit top rim
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + Math.floor(c.w * 0.25), cy, Math.floor(c.w * 0.36), 3);
    }

    // Distant gliding seabirds (tiny animated V-pixels)
    ctx.fillStyle = '#1f4f7d';
    for (let b = 0; b < 3; b++) {
      const bx = Math.floor(((75 + b * 48 + t * (8 + b * 2)) % (PW + 20)) - 10);
      const by = 42 + b * 11 + Math.round(Math.sin(t * 2.5 + b) * 2);
      const flap = Math.sin(t * 7 + b * 2) > 0 ? -1 : 1;
      ctx.fillRect(bx, by, 2, 1);
      ctx.fillRect(bx - 2, by + flap, 2, 1);
      ctx.fillRect(bx + 2, by + flap, 2, 1);
    }

    // 4. Sparkling Distant Ocean Horizon (y = 98..112)
    ctx.fillStyle = '#2080c9';
    ctx.fillRect(0, 98, PW, 15);
    ctx.fillStyle = '#47a9eb';
    ctx.fillRect(0, 98, PW, 4);
    for (let s = 0; s < 16; s++) {
      const sx = 175 + ((s * 17 + Math.floor(t * 8)) % 110);
      const sy = 100 + (s % 4) * 3;
      if (Math.sin(t * 4 + s) > -0.1) {
        ctx.fillStyle = '#fff5c2';
        ctx.fillRect(sx, sy, 4 + (s % 3), 1);
      }
    }

    // 5. Lush Sunlit Green Rolling Hills & Wildflowers (y = 106..158)
    // Far emerald hill
    ctx.fillStyle = '#2d8054';
    ctx.beginPath();
    ctx.moveTo(0, 122);
    ctx.quadraticCurveTo(95, 96, 195, 114);
    ctx.quadraticCurveTo(265, 102, PW, 112);
    ctx.lineTo(PW, 155);
    ctx.lineTo(0, 155);
    ctx.closePath();
    ctx.fill();

    // Near sunlit grassy slope
    ctx.fillStyle = '#43a664';
    ctx.beginPath();
    ctx.moveTo(0, 132);
    ctx.quadraticCurveTo(115, 114, 210, 128);
    ctx.quadraticCurveTo(275, 122, PW, 130);
    ctx.lineTo(PW, PH);
    ctx.lineTo(0, PH);
    ctx.closePath();
    ctx.fill();

    // Grass highlights & wildflowers swaying gently
    for (let f = 0; f < 22; f++) {
      const fx = 34 + ((f * 29) % 256);
      const fy = 126 + (f % 5) * 6;
      const sway = Math.round(Math.sin(t * 3 + f));
      ctx.fillStyle = f % 3 === 0 ? '#ffe57f' : f % 3 === 1 ? '#ffffff' : '#9cffbd';
      ctx.fillRect(fx + sway, fy, 2, 2);
    }

    // 6. Friendly ARK-3 Surface Rover cresting the sunlit green ridge!
    if (showRover) {
      const rvX = Math.floor(236 - Math.min(28, t * 3.5));
      const rvY = 113;
      // Tracks & chassis
      ctx.fillStyle = '#2a3745';
      ctx.fillRect(rvX, rvY + 7, 22, 5);
      ctx.fillStyle = '#677c8f';
      ctx.fillRect(rvX + 2, rvY + 2, 18, 6);
      ctx.fillStyle = '#8fa6ba';
      ctx.fillRect(rvX + 4, rvY, 10, 3);
      // Flashing friendly warm headlight
      if (Math.sin(t * 8) > -0.2) {
        ctx.fillStyle = '#fff5b8';
        ctx.fillRect(rvX - 3, rvY + 3, 4, 3);
      }
      // Waving orange/emerald rescue flag!
      ctx.fillStyle = '#d9e6f2';
      ctx.fillRect(rvX + 16, rvY - 8, 1, 10);
      const flagWave = Math.sin(t * 7) > 0 ? 1 : 0;
      ctx.fillStyle = '#ff9f43';
      ctx.fillRect(rvX + 17, rvY - 8 + flagWave, 6, 3);
    }

    // 7. Open Underground Hatch Concrete Threshold & Heavy Open Blast Doors (Framing the Sky!)
    // Sunlit exit ramp
    ctx.fillStyle = '#5c6a75';
    ctx.beginPath();
    ctx.moveTo(64, PH);
    ctx.lineTo(106, 134);
    ctx.lineTo(214, 134);
    ctx.lineTo(256, PH);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8fa0ad';
    ctx.beginPath();
    ctx.moveTo(80, PH);
    ctx.lineTo(116, 136);
    ctx.lineTo(204, 136);
    ctx.lineTo(240, PH);
    ctx.closePath();
    ctx.fill();

    // Left massive open blast door leaf (angled outward into the light!)
    ctx.fillStyle = '#1b2632';
    ctx.beginPath();
    ctx.moveTo(0, 74);
    ctx.lineTo(36, 98);
    ctx.lineTo(58, PH);
    ctx.lineTo(0, PH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#47617a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 74);
    ctx.lineTo(36, 98);
    ctx.lineTo(58, PH);
    ctx.stroke();
    // Amber caution stripes on hatch rim
    ctx.fillStyle = '#e6a23c';
    ctx.fillRect(28, 114, 7, 3);
    ctx.fillRect(34, 130, 7, 3);
    ctx.fillRect(40, 146, 7, 3);

    // Right massive open blast door leaf
    ctx.fillStyle = '#1b2632';
    ctx.beginPath();
    ctx.moveTo(PW, 74);
    ctx.lineTo(PW - 36, 98);
    ctx.lineTo(PW - 58, PH);
    ctx.lineTo(PW, PH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#47617a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PW, 74);
    ctx.lineTo(PW - 36, 98);
    ctx.lineTo(PW - 58, PH);
    ctx.stroke();
    ctx.fillStyle = '#e6a23c';
    ctx.fillRect(PW - 35, 114, 7, 3);
    ctx.fillRect(PW - 41, 130, 7, 3);
    ctx.fillRect(PW - 47, 146, 7, 3);

    // 8. Mina, Child, Dr. Kagari, Residents & Hako Looking Up at the Blue Sky!
    // Mina (center-left, bob hair, holding child's hand, looking up!)
    const mx = 128;
    const my = 132;
    ctx.fillStyle = '#2a4d69';
    ctx.fillRect(mx, my + 8, 9, 18); // overalls
    ctx.fillStyle = '#f2c8a8';
    ctx.fillRect(mx + 2, my + 1, 5, 6);
    ctx.fillStyle = '#151b24';
    ctx.fillRect(mx + 1, my, 7, 5); // bob hair
    ctx.fillStyle = '#6c7d5e';
    ctx.fillRect(mx + 1, my + 7, 7, 2); // headphones on neck

    // Child holding Mina's hand & lifting arms joyfully toward the sky!
    const cx = 141;
    const cy = 141;
    ctx.fillStyle = '#e86f51';
    ctx.fillRect(cx, cy + 5, 6, 12);
    ctx.fillStyle = '#f2c8a8';
    ctx.fillRect(cx + 1, cy, 4, 4);
    ctx.fillStyle = '#261f1d';
    ctx.fillRect(cx + 1, cy - 1, 4, 2);
    // Joined hands & raised arm
    ctx.fillStyle = '#f2c8a8';
    ctx.fillRect(mx + 9, my + 14, 4, 2);
    ctx.fillRect(cx + 6, cy + 1 + (Math.sin(t * 5) > 0 ? -1 : 0), 2, 6);

    // Dr. Kagari (center-right, olive coat, bun hair with silver streak)
    const kx = 172;
    const ky = 131;
    ctx.fillStyle = '#475741';
    ctx.fillRect(kx, ky + 8, 10, 19);
    ctx.fillStyle = '#1c242b';
    ctx.fillRect(kx + 3, ky + 8, 4, 8);
    ctx.fillStyle = '#ebbfa0';
    ctx.fillRect(kx + 2, ky + 1, 6, 6);
    ctx.fillStyle = '#252930';
    ctx.fillRect(kx + 2, ky, 6, 3);
    ctx.fillRect(kx + 3, ky - 3, 4, 3); // bun
    ctx.fillStyle = '#d5dfe8';
    ctx.fillRect(kx + 5, ky, 2, 2); // silver streak

    // Hako portable relay cart beside Dr. Kagari (happy amber eyes!)
    const hx = 188;
    const hy = 145;
    ctx.fillStyle = '#495a6b';
    ctx.fillRect(hx, hy, 14, 12);
    ctx.fillStyle = '#152924';
    ctx.fillRect(hx + 2, hy + 2, 10, 7);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(hx + 4, hy + 4, 2, 2);
    ctx.fillRect(hx + 8, hy + 4, 2, 2);
    ctx.fillRect(hx + 5, hy + 7, 4, 1);
    ctx.fillStyle = '#222d38';
    ctx.fillRect(hx + 2, hy + 12, 3, 3);
    ctx.fillRect(hx + 9, hy + 12, 3, 3);

    // Residents emerging behind on the sunlit ramp
    const resColors = ['#3d5c78', '#7d4f50', '#4f6d5a', '#6b5b7b'];
    const resPos = [
      [104, 146],
      [114, 150],
      [206, 148],
      [156, 152],
    ];
    resPos.forEach(([rx, ry], idx) => {
      ctx.fillStyle = resColors[idx];
      ctx.fillRect(rx, ry + 5, 7, 13);
      ctx.fillStyle = '#e8bda0';
      ctx.fillRect(rx + 1, ry, 5, 5);
      ctx.fillStyle = '#1f2329';
      ctx.fillRect(rx + 1, ry - 1, 5, 2);
    });

    // 9. Floating sunlit breeze motes sparkling across the frame
    for (const m of this._motes) {
      const mxp = (m.x + t * m.vx) % PW;
      const myp = (m.y + Math.sin(t * 2 + m.phase) * 6 + t * m.vy + PH) % PH;
      const alpha = 0.35 + 0.45 * Math.sin(t * 3 + m.phase);
      ctx.fillStyle = `rgba(255, 252, 214, ${alpha.toFixed(2)})`;
      ctx.fillRect(Math.floor(mxp), Math.floor(myp), 2, 2);
    }
  }
}
