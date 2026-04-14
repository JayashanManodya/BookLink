import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BrowsePointsScreen } from '../screens/BrowsePointsScreen';
import { FileReportScreen } from '../screens/FileReportScreen';
import { MyListingsScreen } from '../screens/MyListingsScreen';
import { MyPointsScreen } from '../screens/MyPointsScreen';
import { MyReportsScreen } from '../screens/MyReportsScreen';
import { MyReviewsScreen } from '../screens/MyReviewsScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { EditListingScreen } from '../screens/EditListingScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ReportDetailScreen } from '../screens/ReportDetailScreen';
import { SubmitPointScreen } from '../screens/SubmitPointScreen';
import { UserReviewsScreen } from '../screens/UserReviewsScreen';
import type { ProfileStackParamList } from './profileStackTypes';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator id="ProfileStackRoot" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="MyListings" component={MyListingsScreen} />
      <Stack.Screen name="EditListing" component={EditListingScreen} />
      <Stack.Screen name="BrowsePoints" component={BrowsePointsScreen} />
      <Stack.Screen name="SubmitPoint" component={SubmitPointScreen} />
      <Stack.Screen name="MyPoints" component={MyPointsScreen} />
      <Stack.Screen name="UserReviews" component={UserReviewsScreen} />
      <Stack.Screen name="MyReviews" component={MyReviewsScreen} />
      <Stack.Screen name="FileReport" component={FileReportScreen} />
      <Stack.Screen name="MyReports" component={MyReportsScreen} />
      <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
    </Stack.Navigator>
  );
}
