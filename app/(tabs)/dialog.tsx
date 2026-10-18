import { useTranslation } from 'react-i18next';

import { StubScreen } from '@/components/StubScreen';

export default function DialogScreen() {
  const { t } = useTranslation();

  return <StubScreen title={t('dialog.title')} description={t('dialog.stub')} />;
}
