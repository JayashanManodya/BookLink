import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AddBookScreen } from '../screens/AddBookScreen';
import { BookDetailScreen } from '../screens/BookDetailScreen';
import { BrowseListScreen } from '../screens/BrowseListScreen';
import { RequestExchangeScreen } from '../screens/RequestExchangeScreen';
import { UserReviewsScreen } from '../screens/UserReviewsScreen';
import type { BrowseStackParamList } from './browseStackTypes';

import { themePageBg } from '../theme/courseTheme';

const Stack = createNativeStackNavigator<BrowseStackParamList>();

export function BrowseStack() {
  return (
    <Stack.Navigator
      id="BrowseStackRoot"
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: themePageBg } }}
    >
      <Stack.Screen name="BrowseList" component={BrowseListScreen} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} />
      <Stack.Screen name="AddBook" component={AddBookScreen} />
      <Stack.Screen name="RequestExchange" component={RequestExchangeScreen} />
      <Stack.Screen name="UserReviews" component={UserReviewsScreen} />
    </Stack.Navigator>
  );
}
