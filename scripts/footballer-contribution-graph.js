#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const username = process.argv[2] || 'AnshBhavsar1654';
const outDir = process.argv[3] || 'dist';
const token = process.env.GITHUB_TOKEN || '';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const THEMES = {
  dark: {
    background: '#0d1117',
    text: '#8b949e',
    colors: {
      NONE: '#1c2128',
      FIRST_QUARTILE: '#0e4429',
      SECOND_QUARTILE: '#006d32',
      THIRD_QUARTILE: '#26a641',
      FOURTH_QUARTILE: '#39d353',
    },
  },
  light: {
    background: '#ffffff',
    text: '#57606a',
    colors: {
      NONE: '#ebedf0',
      FIRST_QUARTILE: '#9be9a8',
      SECOND_QUARTILE: '#40c463',
      THIRD_QUARTILE: '#30a14e',
      FOURTH_QUARTILE: '#216e39',
    },
  },
};

const CELL = 11;
const GAP = 3;
const PITCH = CELL + GAP;
const MARGIN_LEFT = 16;
const MARGIN_TOP = 44;
const MARGIN_RIGHT = 16;
const MARGIN_BOTTOM = 14;

const centerX = (c) => MARGIN_LEFT + c * PITCH + CELL / 2;
const centerY = (r) => MARGIN_TOP + r * PITCH + CELL / 2;

async function fetchCalendar(login, token) {
  const query = `query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionLevel
              contributionCount
              color
            }
          }
        }
      }
    }
  }`;

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'footballer-contribution-graph',
    },
    body: JSON.stringify({ query, variables: { login } }),
  });

  if (!res.ok) throw new Error(`GraphQL request failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error('GraphQL errors: ' + JSON.stringify(json.errors));
  return json.data.user.contributionsCollection.contributionCalendar;
}

function syntheticCalendar() {
  const weeks = [];
  const start = new Date(Date.UTC(2025, 0, 5));
  const levels = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];
  const counts = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 5, FOURTH_QUARTILE: 10 };
  for (let w = 0; w < 53; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + w * 7 + d);
      const level = d === 0 || d === 6 ? 'NONE' : levels[1 + Math.floor(Math.random() * 4)];
      days.push({
        date: date.toISOString().slice(0, 10),
        contributionLevel: level,
        contributionCount: counts[level],
        color: '#26a641',
      });
    }
    weeks.push({ contributionDays: days });
  }
  return { totalContributions: 0, weeks };
}

function serpentinePath(cols) {
  const pts = [];
  for (let r = 0; r < 7; r++) {
    if (r % 2 === 0) {
      for (let c = 0; c < cols; c++) pts.push([centerX(c), centerY(r)]);
    } else {
      for (let c = cols - 1; c >= 0; c--) pts.push([centerX(c), centerY(r)]);
    }
  }
  return 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
}

function playerMarkup() {
  const skin = '#f2c58a';
  const hair = '#3b2b20';
  const jersey = '#2563eb';
  const shorts = '#1e3a8a';
  const shoe = '#111111';
  const sock = '#ffffff';
  return `
    <g class="leg-back">
      <line x1="-1" y1="-8" x2="-8" y2="-2.5" stroke="${sock}" stroke-width="3" stroke-linecap="round"/>
      <rect x="-12" y="-4.5" width="5" height="3" rx="1.2" fill="${shoe}"/>
    </g>
    <g class="leg-front">
      <line x1="1" y1="-8" x2="8" y2="-2.5" stroke="${sock}" stroke-width="3" stroke-linecap="round"/>
      <rect x="7" y="-4.5" width="5" height="3" rx="1.2" fill="${shoe}"/>
    </g>
    <g class="arm-back">
      <line x1="-3" y1="-13" x2="-9.5" y2="-9.5" stroke="${skin}" stroke-width="2.6" stroke-linecap="round"/>
    </g>
    <g class="arm-front">
      <line x1="4" y1="-13" x2="11" y2="-9.5" stroke="${skin}" stroke-width="2.6" stroke-linecap="round"/>
    </g>
    <rect x="-4.5" y="-14.5" width="12" height="7" rx="2.5" fill="${jersey}"/>
    <rect x="-4.5" y="-9" width="12" height="4" rx="1.5" fill="${shorts}"/>
    <text x="1.5" y="-10.6" font-size="4.6" fill="#ffffff" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold">10</text>
    <circle cx="6" cy="-19" r="4.5" fill="${skin}"/>
    <path d="M1.5 -19 a4.5 4.5 0 0 1 9 0 Z" fill="${hair}"/>`;
}

function ballMarkup() {
  return `
    <circle r="4.5" fill="#ffffff" stroke="#161b22" stroke-width="0.8"/>
    <polygon points="0,-1.9 1.8,-0.58 1.11,1.53 -1.11,1.53 -1.8,-0.58" fill="#161b22"/>
    <circle cx="3.1" cy="-2.4" r="0.9" fill="#161b22"/>
    <circle cx="-2.7" cy="-2.2" r="0.9" fill="#161b22"/>
    <circle cx="-2.5" cy="2.4" r="0.9" fill="#161b22"/>
    <circle cx="2.4" cy="2.6" r="0.9" fill="#161b22"/>`;
}

function buildSvg(calendar, themeName) {
  const theme = THEMES[themeName];
  const cols = calendar.weeks.length;
  if (!cols) throw new Error('No contribution weeks returned');

  const width = MARGIN_LEFT + cols * PITCH - GAP + MARGIN_RIGHT;
  const height = MARGIN_TOP + 7 * PITCH - GAP + MARGIN_BOTTOM;

  let cells = '';
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < cols; c++) {
      const day = (calendar.weeks[c].contributionDays || [])[r];
      const level = day ? day.contributionLevel : 'NONE';
      const color = theme.colors[level] || theme.colors.NONE;
      const x = MARGIN_LEFT + c * PITCH;
      const y = MARGIN_TOP + r * PITCH;
      cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${color}"/>`;
    }
  }

  let monthLabels = '';
  let prev = -1;
  for (let c = 0; c < cols; c++) {
    const day = (calendar.weeks[c].contributionDays || [])[0];
    if (!day) continue;
    const m = parseInt(day.date.slice(5, 7), 10) - 1;
    if (m !== prev) {
      monthLabels += `<text x="${centerX(c)}" y="22" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="12" fill="${theme.text}">${MONTHS[m]}</text>`;
      prev = m;
    }
  }

  const d = serpentinePath(cols);
  const pathLen = (cols * 7 - 1) * PITCH;
  const dur = Math.max(20, Math.round(pathLen / 90)) + 's';

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
  <style>
    @keyframes legkick { 0%,100% { transform: rotate(-28deg); } 50% { transform: rotate(26deg); } }
    @keyframes legkick2 { 0%,100% { transform: rotate(26deg); } 50% { transform: rotate(-28deg); } }
    @keyframes armswing { 0%,100% { transform: rotate(22deg); } 50% { transform: rotate(-22deg); } }
    @keyframes armswing2 { 0%,100% { transform: rotate(-22deg); } 50% { transform: rotate(22deg); } }
    @keyframes dribble { 0%,100% { transform: translate(0,0); } 50% { transform: translate(0.6px,-8px); } }
    .leg-front { transform-origin: 1px -8px; animation: legkick 0.6s infinite ease-in-out; }
    .leg-back { transform-origin: -1px -8px; animation: legkick2 0.6s infinite ease-in-out; }
    .arm-front { transform-origin: 4px -13px; animation: armswing 0.6s infinite ease-in-out; }
    .arm-back { transform-origin: -3px -13px; animation: armswing2 0.6s infinite ease-in-out; }
    .ball { animation: dribble 0.6s infinite ease-in-out; }
  </style>
  <rect width="${width}" height="${height}" fill="${theme.background}"/>
  ${cells}
  <path d="${d}" fill="none" stroke="${theme.text}" stroke-opacity="0.14" stroke-width="1.5" stroke-dasharray="2 6" stroke-linecap="round"/>
  ${monthLabels}
  <g class="player">
    <animateMotion dur="${dur}" repeatCount="indefinite" rotate="auto" path="${d}"/>
    ${playerMarkup()}
    <g transform="translate(15,-6)">
      <g class="ball">${ballMarkup()}</g>
    </g>
  </g>
</svg>`;
}

async function main() {
  const scenario = process.env.SCENARIO === '1' || process.argv[2] === '--scenario';
  let calendar;
  try {
    calendar = scenario ? syntheticCalendar() : await fetchCalendar(username, token);
  } catch (e) {
    console.error('[footballer-contribution-graph]', e.message);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  for (const themeName of ['light', 'dark']) {
    const svg = buildSvg(calendar, themeName);
    const file = path.join(
      outDir,
      themeName === 'dark' ? 'footballer-contribution-graph-dark.svg' : 'footballer-contribution-graph.svg'
    );
    fs.writeFileSync(file, svg);
    console.log('Wrote', file);
  }
}

main();
