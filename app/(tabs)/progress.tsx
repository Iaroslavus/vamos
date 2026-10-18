import { useTranslation } from 'react-i18next';

import { StubScreen } from '@/components/StubScreen';

export default function ProgressScreen() {
  const { t } = useTranslation();

  return <StubScreen title={t('progress.title')} description={t('progress.stub')} />;
}
