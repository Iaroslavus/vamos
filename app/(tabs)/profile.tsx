import { useTranslation } from 'react-i18next';

import { StubScreen } from '@/components/StubScreen';

export default function ProfileScreen() {
  const { t } = useTranslation();

  return <StubScreen title={t('profile.title')} description={t('profile.stub')} />;
}
