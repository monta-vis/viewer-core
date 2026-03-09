import { fileURLToPath } from 'url';
import path from 'path';

export const distPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
