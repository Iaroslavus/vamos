import type { TFunction } from 'i18next';

import type { SystemKey } from './model';

export function folderTitle(
  folder: { systemKey: SystemKey | null; name: string },
  t: TFunction,
  count = 0,
): string {
  if (folder.systemKey === 'learned') return t('vocab.learnedAll', { count });
  if (folder.systemKey === 'favorites') return t('vocab.favorites');
  if (folder.systemKey === 'difficult') return t('vocab.difficult');
  return folder.name;
}
