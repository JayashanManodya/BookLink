import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PostWantedBookScreen } from '../screens/PostWantedBookScreen';
import { WantedBookDetailScreen } from '../screens/WantedBookDetailScreen';
import { WishlistBoardScreen } from '../screens/WishlistBoardScreen';
import { WishlistChatsScreen } from '../screens/WishlistChatsScreen';
import { WishlistMatchesScreen } from '../screens/WishlistMatchesScreen';
import { WishlistThreadChatScreen } from '../screens/WishlistThreadChatScreen';
import type { WishlistStackParamList } from './wishlistStackTypes';

const Stack = createNativeStackNavigator<WishlistStackParamList>();

export function WishlistStack() {
  return (
    <Stack.Navigator id="WishlistStackRoot" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WishlistBoard" component={WishlistBoardScreen} />
      <Stack.Screen name="WishlistChats" component={WishlistChatsScreen} />
      <Stack.Screen name="PostWanted" component={PostWantedBookScreen} />
      <Stack.Screen name="WishlistMatches" component={WishlistMatchesScreen} />
      <Stack.Screen name="WantedBookDetail" component={WantedBookDetailScreen} />
      <Stack.Screen name="WishlistThreadChat" component={WishlistThreadChatScreen} />
    </Stack.Navigator>
  );
}
