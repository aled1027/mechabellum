import "./app.css";
import { DataBundleSchema, type DataBundle, type UnitDefinition } from "../data/schemas.js";
import { GridModel, type GridPosition, type PlayerSide } from "../grid/grid.js";
import { ServerAuthoritativeSim } from "../server/authoritative.js";
import { RoundPhaseState, resolveCombatOutcome } from "../game/roundFlow.js";
import { createShopState } from "../game/shop.js";
import { createRosterState, createCardState, type PlayerRosterState } from "../game/roster.js";
import { createSpecialistState } from "../game/specialists.js";
import type { PlayerEconomyState } from "../game/economy.js";
import { RngService } from "../core/rng.js";
import { buildPlanningHudState } from "./planningHud.js";
import { buildCombatHudState } from "./combatHud.js";
import type { SimState } from "../sim/types.js";

const WASM_PATH = "/wasm/sim_stub.wasm";
const DATA_PATH = "/data/bundle.json";
const ASSET_PLACEHOLDER = "/assets/placeholder.svg";

const loadWasm = async (): Promise<WebAssembly.Instance | null> => {
  try {
    if (WebAssembly.instantiateStreaming) {
      const response = await fetch(WASM_PATH);
      const { instance } = await WebAssembly.instantiateStreaming(response);
      return instance;
    }
    const response = await fetch(WASM_PATH);
    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes);
    return instance;
  } catch (error) {
    console.warn("Failed to load WASM stub", error);
    return null;
  }
};

const loadDataBundle = async (): Promise<DataBundle> => {
  const response = await fetch(DATA_PATH);
  if (!response.ok) {
    throw new Error(`Failed to load data bundle: ${response.status}`);
  }
  const raw = await response.json();
  return DataBundleSchema.parse(raw);
};

export const createRosterFromUnits = (units: UnitDefinition[]): PlayerRosterState => {
  const roster = createRosterState();
  const unitCounts = { squad: 0, giant: 0, air: 0 };
  let supply = 0;

  const rosterUnits = units.map((unit, index) => {
    unitCounts[unit.class] += 1;
    supply += unit.cost;
    return {
      id: `${unit.id}-${index + 1}`,
      definitionId: unit.id,
      level: 0 as const,
      techs: []
    };
  });

  return {
    ...roster,
    units: rosterUnits,
    unitCounts,
    supply
  };
};

export const createPlacements = (
  grid: GridModel,
  side: PlayerSide,
  units: UnitDefinition[],
  offset: number
) => {
  const zone = grid.getDeploymentZone(side).tiles;
  const orientation = grid.orientFacing(side, 0);
  return units.map((unit, index) => ({
    unitId: unit.id,
    side,
    position: zone[index + offset] ?? zone[index],
    orientation
  }));
};

interface RenderResources {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  attribs: {
    position: number;
    color: number;
    size: number;
  };
}

const createShader = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader => {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Failed to create shader");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return shader;
};

const createProgram = (gl: WebGL2RenderingContext): WebGLProgram => {
  const vertexSource = `#version 300 es
    in vec2 a_position;
    in vec3 a_color;
    in float a_size;
    out vec3 v_color;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      gl_PointSize = a_size;
      v_color = a_color;
    }
  `;
  const fragmentSource = `#version 300 es
    precision highp float;
    in vec3 v_color;
    out vec4 outColor;
    void main() {
      float dist = distance(gl_PointCoord, vec2(0.5));
      if (dist > 0.5) {
        discard;
      }
      outColor = vec4(v_color, 1.0);
    }
  `;
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) {
    throw new Error("Failed to create program");
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link failed: ${log}`);
  }
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return program;
};

const initWebGl = (canvas: HTMLCanvasElement): RenderResources => {
  const gl = canvas.getContext("webgl2", { antialias: true });
  if (!gl) {
    throw new Error("WebGL2 not supported");
  }
  const program = createProgram(gl);
  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new Error("Failed to create buffer");
  }
  gl.useProgram(program);
  const position = gl.getAttribLocation(program, "a_position");
  const color = gl.getAttribLocation(program, "a_color");
  const size = gl.getAttribLocation(program, "a_size");
  return { gl, program, buffer, attribs: { position, color, size } };
};

const updateViewport = (canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) => {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.floor(canvas.clientWidth * dpr);
  const height = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
};

export const positionToClip = (position: GridPosition): [number, number] => {
  const nx = position.x / (GridModel.width - 1);
  const ny = position.y / (GridModel.height - 1);
  return [nx * 2 - 1, (1 - ny) * 2 - 1];
};

const renderUnits = (resources: RenderResources, state: SimState | null) => {
  const { gl, buffer, attribs } = resources;
  const units = state?.units ?? [];
  const stride = 6;
  const data = new Float32Array(units.length * stride);
  units.forEach((unit, index) => {
    const [x, y] = positionToClip(unit.position);
    const offset = index * stride;
    const color = unit.side === "north" ? [0.2, 0.7, 1.0] : [1.0, 0.45, 0.2];
    const size = unit.class === "giant" ? 18 : unit.class === "air" ? 14 : 10;
    data[offset] = x;
    data[offset + 1] = y;
    data[offset + 2] = color[0];
    data[offset + 3] = color[1];
    data[offset + 4] = color[2];
    data[offset + 5] = size;
  });

  gl.clearColor(0.02, 0.05, 0.12, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
  const strideBytes = stride * Float32Array.BYTES_PER_ELEMENT;
  gl.enableVertexAttribArray(attribs.position);
  gl.vertexAttribPointer(attribs.position, 2, gl.FLOAT, false, strideBytes, 0);
  gl.enableVertexAttribArray(attribs.color);
  gl.vertexAttribPointer(
    attribs.color,
    3,
    gl.FLOAT,
    false,
    strideBytes,
    2 * Float32Array.BYTES_PER_ELEMENT
  );
  gl.enableVertexAttribArray(attribs.size);
  gl.vertexAttribPointer(
    attribs.size,
    1,
    gl.FLOAT,
    false,
    strideBytes,
    5 * Float32Array.BYTES_PER_ELEMENT
  );
  gl.drawArrays(gl.POINTS, 0, units.length);
};

const createHudSection = (title: string) => {
  const section = document.createElement("div");
  section.className = "section";
  const label = document.createElement("div");
  label.className = "label";
  label.textContent = title;
  const value = document.createElement("div");
  value.className = "value";
  section.append(label, value);
  return { section, value };
};

export const main = async () => {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) {
    throw new Error("Missing #app root");
  }

  const canvas = document.createElement("canvas");
  const hud = document.createElement("div");
  hud.className = "hud";
  const heading = document.createElement("h1");
  heading.textContent = "Mechabellum Local Client";
  hud.append(heading);

  const phaseSection = createHudSection("Phase");
  const timerSection = createHudSection("Timer");
  const teamSection = createHudSection("Teams");
  const planningSection = createHudSection("Planning HUD");
  const outcomeSection = createHudSection("Outcome");
  const rendererSection = createHudSection("Renderer");
  const assetSection = createHudSection("Assets");

  const assetPreview = document.createElement("img");
  assetPreview.src = ASSET_PLACEHOLDER;
  assetPreview.alt = "Asset placeholder";
  assetPreview.width = 96;
  assetPreview.height = 96;
  assetSection.section.append(assetPreview);

  hud.append(
    phaseSection.section,
    timerSection.section,
    teamSection.section,
    planningSection.section,
    outcomeSection.section,
    rendererSection.section,
    assetSection.section
  );

  root.append(canvas, hud);

  const [data, wasmInstance] = await Promise.all([loadDataBundle(), loadWasm()]);

  const rngService = new RngService(1337);
  const shop = createShopState(data, rngService.stream("shop"));
  const roster = createRosterFromUnits(data.units.slice(0, 6));
  const economy: PlayerEconomyState = { credits: 30, winStreak: 0, lossStreak: 0 };
  const specialists = createSpecialistState();
  const cards = createCardState();
  const roundFlow = new RoundPhaseState({ planningMs: 4000, combatMs: 20000 });
  roundFlow.startRound(1);

  const grid = new GridModel();
  const northPlacements = createPlacements(grid, "north", data.units.slice(0, 6), 0);
  const southPlacements = createPlacements(grid, "south", data.units.slice(0, 6), 0);
  const simInput = {
    round: 1,
    placements: [...northPlacements, ...southPlacements]
  };

  const sim = new ServerAuthoritativeSim(data, 4242, { tickMs: 50, maxTicks: 1800 });
  sim.applyInput(simInput);

  const renderer = initWebGl(canvas);
  const webGpuAvailable = "gpu" in navigator;
  const maybeWasmTick = wasmInstance?.exports.tick;
  rendererSection.value.textContent = `WebGL2${webGpuAvailable ? " + WebGPU" : ""} · WASM ${wasmInstance ? "loaded" : "missing"}`;
  let lastTime = performance.now();
  let accumulator = 0;
  let combatOutcome = "-";

  const updateHud = (state: SimState) => {
    const phase = roundFlow.getPhase();
    phaseSection.value.textContent = `${phase.toUpperCase()} · Round ${roundFlow.getRound()}`;
    timerSection.value.textContent = `${Math.ceil(roundFlow.getRemainingMs() / 1000)}s remaining`;

    const combatHud = buildCombatHudState({
      roundFlow,
      simState: state,
      data,
      playerSide: "north"
    });
    teamSection.value.textContent = `North ${combatHud.friendly.unitsAlive} vs South ${combatHud.enemy.unitsAlive}`;

    const planningHud = buildPlanningHudState({
      roundFlow,
      economy,
      roster,
      shop,
      specialists,
      cards
    });
    planningSection.value.textContent = `Credits ${planningHud.credits} · Supply ${planningHud.roster.supply}`;
    outcomeSection.value.textContent = combatOutcome;
  };

  const tick = (time: number) => {
    const delta = time - lastTime;
    lastTime = time;

    roundFlow.advanceTime(delta);
    if (roundFlow.getPhase() === "combat") {
      accumulator += delta;
      while (accumulator >= 50) {
        sim.step();
        accumulator -= 50;
      }
    }

    const state = sim.getState();
    if (roundFlow.getPhase() === "combat") {
      const northAlive = state.units.some((unit) => unit.side === "north");
      const southAlive = state.units.some((unit) => unit.side === "south");
      if (!northAlive || !southAlive || state.tick >= 1800) {
        roundFlow.lockCombat();
        const outcome = resolveCombatOutcome(state, data);
        combatOutcome = `${outcome.winner.toUpperCase()} (${outcome.reason})`;
      }
    }

    updateViewport(canvas, renderer.gl);
    renderUnits(renderer, state);
    updateHud(state);

    if (typeof maybeWasmTick === "function") {
      maybeWasmTick();
    }

    requestAnimationFrame(tick);
  };

  window.addEventListener("resize", () => updateViewport(canvas, renderer.gl));
  requestAnimationFrame(tick);
};

if (typeof window !== "undefined" && typeof document !== "undefined") {
  void main();
}
