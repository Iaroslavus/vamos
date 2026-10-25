import { colors } from '@/theme/tokens';

import type { FolderColor } from './model';

export function folderSwatch(color: FolderColor): string {
  switch (color) {
    case 'coral':
      return colors.coral;
    case 'saffron':
      return colors.saffron;
    case 'teal':
      return colors.teal;
    case 'blue':
      return colors.blue;
    case 'ink':
      return colors.ink;
  }
}

export function folderTint(color: FolderColor): string {
  switch (color) {
    case 'coral':
      return colors.errorSoft;
    case 'saffron':
      return colors.saffronSoft;
    case 'teal':
      return colors.tealSoft;
    case 'blue':
      return colors.hint;
    case 'ink':
      return colors.surfaceSunken;
  }
}
