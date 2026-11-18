/**
 * Resolve a time to the latest storyboard scene that has started.
 * Any interval between one slide's end and the next slide's start keeps the
 * previous slide on screen; before the first slide, use the first slide.
 *
 * @template {{ start: number, end: number }} T
 * @param {readonly T[]} slides
 * @param {number} time
 * @returns {number}
 */
export function getStoryboardSlideIndexAtTime(slides, time) {
  if (!Array.isArray(slides) || slides.length === 0) {
    throw new TypeError("A storyboard must contain at least one slide.");
  }
  if (!Number.isFinite(time)) {
    throw new TypeError("Storyboard time must be a finite number.");
  }

  let low = 0;
  let high = slides.length - 1;
  let selectedIndex = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const start = Number(slides[middle]?.start);
    if (!Number.isFinite(start)) {
      throw new TypeError("Every timed storyboard slide must have a finite start time.");
    }
    if (start <= time) {
      selectedIndex = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return selectedIndex;
}

/**
 * Validate scene ordering and report timing gaps/overlaps.
 * Gaps are valid only when the storyboard explicitly declares the
 * "hold-previous" policy and the renderer uses this shared selector.
 *
 * @template {{ start: number, end: number, id?: string }} T
 * @param {readonly T[]} slides
 * @param {{ fps?: number, durationSeconds?: number }} [options]
 */
export function inspectStoryboardTimeline(slides, options = {}) {
  const fps = Number(options.fps ?? 30);
  const durationSeconds = options.durationSeconds == null
    ? null
    : Number(options.durationSeconds);
  const errors = [];
  const gaps = [];
  const overlaps = [];
  const tolerance = Number.isFinite(fps) && fps > 0 ? 0.5 / fps : 0;

  if (!Array.isArray(slides) || slides.length === 0) {
    return { valid: false, errors: ["Storyboard must contain at least one slide."], gaps, overlaps };
  }
  if (!Number.isFinite(fps) || fps <= 0) {
    errors.push("Storyboard fps must be a positive finite number.");
  }
  if (durationSeconds !== null && (!Number.isFinite(durationSeconds) || durationSeconds <= 0)) {
    errors.push("Storyboard durationSeconds must be a positive finite number.");
  }

  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index];
    const start = Number(slide?.start);
    const end = Number(slide?.end);
    const label = slide?.id || `slide ${index + 1}`;

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      errors.push(`${label} must have finite start and end times.`);
      continue;
    }
    if (start < 0) errors.push(`${label} starts before time zero.`);
    if (end <= start) errors.push(`${label} must end after it starts.`);
    if (durationSeconds !== null && end > durationSeconds + tolerance) {
      errors.push(`${label} ends after the storyboard duration.`);
    }

    if (index === 0) continue;
    const previous = slides[index - 1];
    const previousStart = Number(previous?.start);
    const previousEnd = Number(previous?.end);
    if (!Number.isFinite(previousStart) || !Number.isFinite(previousEnd)) continue;
    if (start < previousStart) {
      errors.push(`${label} is out of order; storyboard slides must be sorted by start time.`);
    }

    const delta = start - previousEnd;
    if (delta > tolerance) {
      gaps.push({
        from: previous?.id || `slide ${index}`,
        to: label,
        seconds: Number(delta.toFixed(3)),
      });
    } else if (delta < -tolerance) {
      overlaps.push({
        from: previous?.id || `slide ${index}`,
        to: label,
        seconds: Number((-delta).toFixed(3)),
      });
    }
  }

  return { valid: errors.length === 0 && overlaps.length === 0, errors, gaps, overlaps };
}
