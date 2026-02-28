export {
  PARTTOOL_EXPORT_SIZE,
  EXPORT_SIZE,
  resolveFFmpegBinary,
  readImageDimensions,
  computeProcessingHash,
  isProcessingCurrent,
  buildImageProcessArgs,
  processImage,
  spawnFFmpeg,
} from './media-processing.js';

export type { CropRect, ImageDimensions } from './media-processing.js';
