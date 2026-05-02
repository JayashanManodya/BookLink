import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatsInboxScreen } from '../screens/ChatsInboxScreen';
import { RequestsScreen } from '../screens/RequestsScreen';
import { ExchangeRequestDetailScreen } from '../screens/ExchangeRequestDetailScreen';
import { RequestChatScreen } from '../screens/RequestChatScreen';
import { WriteReviewScreen } from '../screens/WriteReviewScreen';
import { ReportExchangeScreen } from '../screens/ReportExchangeScreen';
import type { RequestsStackParamList } from './requestsStackTypes';

import { themePageBg } from '../theme/courseTheme';

const Stack = createNativeStackNavigator<RequestsStackParamList>();

export function RequestsStack() {
  return (
    <Stack.Navigator
      id="RequestsStackRoot"
      initialRouteName="ChatsInbox"
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: themePageBg } }}
    >
      <Stack.Screen name="ChatsInbox" component={ChatsInboxScreen} />
      <Stack.Screen name="RequestsHome" component={RequestsScreen} />
      <Stack.Screen name="ExchangeRequestDetail" component={ExchangeRequestDetailScreen} />
      <Stack.Screen name="RequestChat" component={RequestChatScreen} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
      <Stack.Screen name="ReportExchange" component={ReportExchangeScreen} />
    </Stack.Navigator>
  );
}
