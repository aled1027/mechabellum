import type { UnitDefinition } from "../data/schemas.js";
import type { GridPosition, Orientation } from "../grid/grid.js";
import { GridModel } from "../grid/grid.js";
import type {
  PlacementLimits,
  PlacementRequest,
  PlayerPlacementState,
  PlacementResult
} from "../grid/placement.js";
import { defaultLimits, validatePlacement } from "../grid/placement.js";

export type PlacementInteractionMode = "idle" | "placing" | "moving";
export type RotationDirection = "clockwise" | "counterclockwise";

export interface PlacementPreview {
  request: PlacementRequest;
  result: PlacementResult;
}

export interface PlacementInteractionState {
  mode: PlacementInteractionMode;
  selectedUnitId?: string;
  orientation: Orientation;
  hover?: GridPosition;
  preview?: PlacementPreview;
  error?: string;
}

export interface PlacementInteractionContext {
  grid: GridModel;
  player: PlayerPlacementState;
  unit: UnitDefinition;
  limits?: PlacementLimits;
}

export interface PlacementConfirmation {
  state: PlacementInteractionState;
  request?: PlacementRequest;
  error?: string;
}

export const createPlacementInteractionState = (): PlacementInteractionState => ({
  mode: "idle",
  orientation: 0
});

export const beginPlacement = (
  state: PlacementInteractionState,
  unitId: string,
  orientation: Orientation = 0
): PlacementInteractionState => ({
  mode: "placing",
  selectedUnitId: unitId,
  orientation,
  hover: undefined,
  preview: undefined,
  error: undefined
});

export const beginMovePlacement = (
  state: PlacementInteractionState,
  unitId: string,
  orientation: Orientation
): PlacementInteractionState => ({
  mode: "moving",
  selectedUnitId: unitId,
  orientation,
  hover: state.hover,
  preview: state.preview,
  error: undefined
});

export const cancelPlacement = (): PlacementInteractionState => ({
  mode: "idle",
  orientation: 0
});

const buildPreview = (
  context: PlacementInteractionContext,
  position: GridPosition,
  orientation: Orientation
): PlacementPreview => {
  const request: PlacementRequest = {
    unitId: context.unit.id,
    position,
    orientation
  };
  const result = validatePlacement(
    context.grid,
    request,
    context.player,
    context.unit,
    context.limits ?? defaultLimits
  );
  return { request, result };
};

export const updatePlacementHover = (
  state: PlacementInteractionState,
  context: PlacementInteractionContext,
  position: GridPosition
): PlacementInteractionState => {
  if (state.mode === "idle" || !state.selectedUnitId) {
    return state;
  }
  const preview = buildPreview(context, position, state.orientation);
  return {
    ...state,
    hover: position,
    preview,
    error: preview.result.valid ? undefined : preview.result.error
  };
};

export const refreshPlacementPreview = (
  state: PlacementInteractionState,
  context: PlacementInteractionContext
): PlacementInteractionState => {
  if (state.mode === "idle" || !state.hover) {
    return state;
  }
  return updatePlacementHover(state, context, state.hover);
};

const rotateOrientation = (orientation: Orientation, direction: RotationDirection): Orientation => {
  const delta = direction === "clockwise" ? 90 : -90;
  const rotated = (orientation + delta + 360) % 360;
  return rotated as Orientation;
};

export const rotatePlacement = (
  state: PlacementInteractionState,
  direction: RotationDirection,
  context?: PlacementInteractionContext
): PlacementInteractionState => {
  if (state.mode === "idle") {
    return state;
  }
  const orientation = rotateOrientation(state.orientation, direction);
  const nextState = { ...state, orientation };
  if (context && state.hover) {
    return updatePlacementHover(nextState, context, state.hover);
  }
  if (state.preview) {
    return {
      ...nextState,
      preview: {
        ...state.preview,
        request: {
          ...state.preview.request,
          orientation
        }
      }
    };
  }
  return nextState;
};

export const confirmPlacement = (state: PlacementInteractionState): PlacementConfirmation => {
  if (state.mode === "idle") {
    return { state, error: "No placement in progress" };
  }
  if (!state.preview) {
    return { state: { ...state, error: "No placement target" }, error: "No placement target" };
  }
  if (!state.preview.result.valid) {
    return {
      state: { ...state, error: state.preview.result.error },
      error: state.preview.result.error
    };
  }
  return {
    state: cancelPlacement(),
    request: state.preview.request
  };
};
