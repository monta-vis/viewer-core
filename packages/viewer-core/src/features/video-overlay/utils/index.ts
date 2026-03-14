export { applyLiveCoords } from './applyLiveCoords';
export { applySquareConstraint } from './squareConstraint';
export {
  normalizeFreehandPoints,
  denormalizeFreehandPoints,
  detectAndNormalize,
} from './freehandPoints';
export type { SquareConstraintOptions, SquareConstraintResult } from './squareConstraint';

export {
  containerToLocalSpace,
  localSpaceToContainer,
  pointContainerToLocal,
  clampPointToLocalSpace,
} from './coordinateTransform';
