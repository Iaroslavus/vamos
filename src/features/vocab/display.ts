import type { TFunction } from 'i18next';

import type { SystemKey } from './model';

export function folderTitle(
  folder: { systemKey: SystemKey | null; name: string },
  t: TFunction,
): string {
  if (folder.systemKey === 'favorites') return t('vocab.favorites');
  if (folder.systemKey === 'difficult') return t('vocab.difficult');
  return folder.name;
}
