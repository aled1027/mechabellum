export const lerp = (start, end, alpha) => {
  return start + (end - start) * alpha;
};
export const interpolatePosition = (previous, next, alpha) => {
  return {
    x: lerp(previous.x, next.x, alpha),
    y: lerp(previous.y, next.y, alpha)
  };
};
