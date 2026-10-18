import { useTranslation } from 'react-i18next';

import { StubScreen } from '@/components/StubScreen';

export default function ReviewScreen() {
  const { t } = useTranslation();

  return <StubScreen title={t('lesson.reviewTitle')} description={t('lesson.reviewStub')} />;
}
