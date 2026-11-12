import { Redirect } from 'expo-router';

/** Old Today links (notifications, deep links) open the path. */
export default function TodayRedirect() {
  return <Redirect href="/(tabs)" />;
}
