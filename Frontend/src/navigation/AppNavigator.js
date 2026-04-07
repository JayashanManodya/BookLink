import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

// Auth Screen
import SignInScreen from '../screens/auth/SignInScreen';

// Browse Screens
import BrowseBooksScreen from '../screens/browse/BrowseBooksScreen';
import BookDetailScreen from '../screens/browse/BookDetailScreen';
import AddBookScreen from '../screens/browse/AddBookScreen';

// Requests Screens
import IncomingRequestsScreen from '../screens/requests/IncomingRequestsScreen';
import OutgoingRequestsScreen from '../screens/requests/OutgoingRequestsScreen';
import SendRequestScreen from '../screens/requests/SendRequestScreen';
import RequestDetailScreen from '../screens/requests/RequestDetailScreen';

// Wishlist Screens
import AllWishlistsScreen from '../screens/wishlist/AllWishlistsScreen';
import AddWishlistScreen from '../screens/wishlist/AddWishlistScreen';
import MyWishlistScreen from '../screens/wishlist/MyWishlistScreen';
import MatchesScreen from '../screens/wishlist/MatchesScreen';

// Profile Screens
import ProfileScreen from '../screens/profile/ProfileScreen';
import MyListingsScreen from '../screens/profile/MyListingsScreen';
import MyReviewsScreen from '../screens/profile/MyReviewsScreen';
import MyPointsScreen from '../screens/profile/MyPointsScreen';
import MyReportsScreen from '../screens/profile/MyReportsScreen';
import WriteReviewScreen from '../screens/profile/WriteReviewScreen';
import UserReviewsScreen from '../screens/profile/UserReviewsScreen';
import PointDetailScreen from '../screens/profile/PointDetailScreen';
import ReportDetailScreen from '../screens/profile/ReportDetailScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Stack Navigators for each tab
const BrowseStack = () => (
    <Stack.Navigator>
        <Stack.Screen name="BrowseBooks" component={BrowseBooksScreen} options={{ title: 'Browse Books' }} />
        <Stack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: 'Details' }} />
        <Stack.Screen name="AddBook" component={AddBookScreen} options={{ title: 'Add Book' }} />
    </Stack.Navigator>
);

const RequestStack = () => (
    <Stack.Navigator>
        <Stack.Screen name="IncomingRequests" component={IncomingRequestsScreen} options={{ title: 'Incoming' }} />
        <Stack.Screen name="OutgoingRequests" component={OutgoingRequestsScreen} options={{ title: 'Outgoing' }} />
        <Stack.Screen name="SendRequest" component={SendRequestScreen} options={{ title: 'Send Request' }} />
        <Stack.Screen name="RequestDetail" component={RequestDetailScreen} options={{ title: 'Request Details' }} />
    </Stack.Navigator>
);

const WishlistStack = () => (
    <Stack.Navigator>
        <Stack.Screen name="AllWishlists" component={AllWishlistsScreen} options={{ title: 'Browse Wishlists' }} />
        <Stack.Screen name="AddWishlist" component={AddWishlistScreen} options={{ title: 'Add to Wishlist' }} />
        <Stack.Screen name="MyWishlist" component={MyWishlistScreen} options={{ title: 'My Wishlist' }} />
        <Stack.Screen name="Matches" component={MatchesScreen} options={{ title: 'Matches' }} />
    </Stack.Navigator>
);

const ProfileStack = () => (
    <Stack.Navigator>
        <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Profile' }} />
        <Stack.Screen name="MyListings" component={MyListingsScreen} options={{ title: 'My Books' }} />
        <Stack.Screen name="MyReviews" component={MyReviewsScreen} options={{ title: 'Reviews' }} />
        <Stack.Screen name="MyPoints" component={MyPointsScreen} options={{ title: 'Points' }} />
        <Stack.Screen name="MyReports" component={MyReportsScreen} options={{ title: 'Reports' }} />
        <Stack.Screen name="WriteReview" component={WriteReviewScreen} options={{ title: 'Leave Review' }} />
        <Stack.Screen name="UserReviews" component={UserReviewsScreen} options={{ title: 'User Reviews' }} />
        <Stack.Screen name="PointDetail" component={PointDetailScreen} options={{ title: 'Location Details' }} />
        <Stack.Screen name="ReportDetail" component={ReportDetailScreen} options={{ title: 'Report Details' }} />
    </Stack.Navigator>
);

const MainTabs = () => (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="BrowseTab" component={BrowseStack} options={{ tabBarLabel: 'Browse' }} />
        <Tab.Screen name="RequestsTab" component={RequestStack} options={{ tabBarLabel: 'Requests' }} />
        <Tab.Screen name="WishlistTab" component={WishlistStack} options={{ tabBarLabel: 'Wishlist' }} />
        <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
);

const AppNavigator = () => {
    const { isSignedIn, isLoaded } = useAuth();

    if (!isLoaded) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#00ff00" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {isSignedIn ? <MainTabs /> : <SignInScreen />}
        </NavigationContainer>
    );
};

export default AppNavigator;
