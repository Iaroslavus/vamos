import { useTranslation } from 'react-i18next';

import { StubScreen } from '@/components/StubScreen';

export default function VocabScreen() {
  const { t } = useTranslation();

  return <StubScreen title={t('vocab.title')} description={t('vocab.stub')} />;
}
