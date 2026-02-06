import { describe, expect, it } from "vitest";
import {
  closePlanningPanel,
  createPlanningPanelsState,
  getFocusedPlanningPanel,
  openPlanningPanel,
  stepPlanningPanelTransitions,
  togglePlanningPanel
} from "../../src/client/planningPanels.js";

const config = {
  enterMs: 200,
  exitMs: 150,
  defaultPanel: "shop" as const
};

describe("planning panels", () => {
  it("initializes with the default panel focused", () => {
    const state = createPlanningPanelsState(config);
    expect(state.focusId).toBe("shop");
    expect(state.panels.shop.status).toBe("active");
  });

  it("opens and transitions panels", () => {
    const state = createPlanningPanelsState(config);
    const next = openPlanningPanel(state, config, "roster");

    expect(next.focusId).toBe("roster");
    expect(next.panels.roster.status).toBe("entering");
    expect(next.panels.shop.status).toBe("exiting");

    const stepped = stepPlanningPanelTransitions(next, 200);
    expect(stepped.panels.roster.status).toBe("active");
  });

  it("closes panels and returns focus to default", () => {
    const state = createPlanningPanelsState(config);
    const opened = openPlanningPanel(state, config, "cards");
    const closed = closePlanningPanel(opened, config, "cards");

    expect(closed.focusId).toBe("shop");
    expect(closed.panels.cards.status).toBe("exiting");
  });

  it("toggles panel state", () => {
    const state = createPlanningPanelsState(config);
    const opened = togglePlanningPanel(state, config, "specialists");
    const closed = togglePlanningPanel(opened, config, "specialists");

    expect(opened.panels.specialists.status).toBe("entering");
    expect(closed.panels.specialists.status).toBe("exiting");
  });

  it("exposes focused panel lookup", () => {
    const state = createPlanningPanelsState(config);
    const focus = getFocusedPlanningPanel(state);
    expect(focus?.id).toBe("shop");
  });
});
