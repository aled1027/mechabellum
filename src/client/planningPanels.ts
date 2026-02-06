export type PlanningPanelId = "shop" | "roster" | "specialists" | "cards" | "unit_detail";
export type PlanningPanelStatus = "hidden" | "entering" | "active" | "exiting";

export interface PlanningPanelConfig {
  enterMs: number;
  exitMs: number;
  defaultPanel: PlanningPanelId;
  panels?: PlanningPanelId[];
}

export interface PlanningPanelState {
  id: PlanningPanelId;
  status: PlanningPanelStatus;
  remainingMs: number;
}

export interface PlanningPanelsState {
  focusId?: PlanningPanelId;
  panels: Record<PlanningPanelId, PlanningPanelState>;
}

const panelIds = (config: PlanningPanelConfig): PlanningPanelId[] =>
  config.panels ?? ["shop", "roster", "specialists", "cards", "unit_detail"];

const createPanelState = (id: PlanningPanelId): PlanningPanelState => ({
  id,
  status: "hidden",
  remainingMs: 0
});

export const createPlanningPanelsState = (config: PlanningPanelConfig): PlanningPanelsState => {
  const panels = panelIds(config).reduce(
    (acc, id) => {
      acc[id] = createPanelState(id);
      return acc;
    },
    {} as Record<PlanningPanelId, PlanningPanelState>
  );

  const defaultPanel = panels[config.defaultPanel];
  if (!defaultPanel) {
    throw new Error(`Unknown default panel: ${config.defaultPanel}`);
  }

  return {
    focusId: config.defaultPanel,
    panels: {
      ...panels,
      [config.defaultPanel]: {
        ...defaultPanel,
        status: "active",
        remainingMs: 0
      }
    }
  };
};

const updatePanel = (
  state: PlanningPanelsState,
  panel: PlanningPanelState,
  patch: Partial<PlanningPanelState>
): PlanningPanelsState => ({
  ...state,
  panels: {
    ...state.panels,
    [panel.id]: { ...panel, ...patch }
  }
});

export const openPlanningPanel = (
  state: PlanningPanelsState,
  config: PlanningPanelConfig,
  panelId: PlanningPanelId
): PlanningPanelsState => {
  const panel = state.panels[panelId];
  if (!panel) {
    throw new Error(`Unknown panel: ${panelId}`);
  }
  if (panel.status === "active" || panel.status === "entering") {
    return { ...state, focusId: panelId };
  }

  let nextState: PlanningPanelsState = { ...state, focusId: panelId };
  const focusPanel = state.focusId ? state.panels[state.focusId] : undefined;
  if (focusPanel && focusPanel.id !== panelId && focusPanel.status !== "hidden") {
    nextState = updatePanel(nextState, focusPanel, {
      status: "exiting",
      remainingMs: config.exitMs
    });
  }

  return updatePanel(nextState, panel, {
    status: "entering",
    remainingMs: config.enterMs
  });
};

export const closePlanningPanel = (
  state: PlanningPanelsState,
  config: PlanningPanelConfig,
  panelId: PlanningPanelId
): PlanningPanelsState => {
  const panel = state.panels[panelId];
  if (!panel) {
    throw new Error(`Unknown panel: ${panelId}`);
  }
  if (panel.status === "hidden" || panel.status === "exiting") {
    return state;
  }

  const nextState = updatePanel(state, panel, {
    status: "exiting",
    remainingMs: config.exitMs
  });

  if (state.focusId === panelId) {
    return { ...nextState, focusId: config.defaultPanel };
  }
  return nextState;
};

export const togglePlanningPanel = (
  state: PlanningPanelsState,
  config: PlanningPanelConfig,
  panelId: PlanningPanelId
): PlanningPanelsState => {
  const panel = state.panels[panelId];
  if (!panel) {
    throw new Error(`Unknown panel: ${panelId}`);
  }
  if (panel.status === "hidden" || panel.status === "exiting") {
    return openPlanningPanel(state, config, panelId);
  }
  return closePlanningPanel(state, config, panelId);
};

export const stepPlanningPanelTransitions = (
  state: PlanningPanelsState,
  deltaMs: number
): PlanningPanelsState => {
  let nextState = { ...state };
  for (const panel of Object.values(state.panels)) {
    if (panel.remainingMs <= 0) {
      continue;
    }
    const remainingMs = Math.max(0, panel.remainingMs - deltaMs);
    if (remainingMs > 0) {
      nextState = updatePanel(nextState, panel, { remainingMs });
      continue;
    }

    if (panel.status === "entering") {
      nextState = updatePanel(nextState, panel, { status: "active", remainingMs: 0 });
    } else if (panel.status === "exiting") {
      nextState = updatePanel(nextState, panel, { status: "hidden", remainingMs: 0 });
    }
  }

  return nextState;
};

export const getFocusedPlanningPanel = (
  state: PlanningPanelsState
): PlanningPanelState | undefined => (state.focusId ? state.panels[state.focusId] : undefined);
