import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/main/HomeScreen';
import CouponDetailScreen from '../screens/main/CouponDetailScreen';
import PremiumScreen from '../screens/main/PremiumScreen';
import SupportScreen from '../screens/main/SupportScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Context
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack Navigation
function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Bottom Tab Navigation for logged-in users
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          tabBarLabel: 'Kuponlar',
          // Use simple text/unicode for icons to avoid vector-icons package complexity
          tabBarIcon: ({ color }) => (
            <React.Fragment>
              <View><React.Fragment><React.Fragment>🎟️</React.Fragment></React.Fragment></View>
            </React.Fragment>
          ),
        }}
      />
      <Tab.Screen 
        name="Premium" 
        component={PremiumScreen} 
        options={{
          tabBarLabel: 'Premium',
          tabBarIcon: ({ color }) => (
            <React.Fragment>
              <View><React.Fragment><React.Fragment>👑</React.Fragment></React.Fragment></View>
            </React.Fragment>
          ),
        }}
      />
      <Tab.Screen 
        name="Support" 
        component={SupportScreen} 
        options={{
          tabBarLabel: 'Destek',
          tabBarIcon: ({ color }) => (
            <React.Fragment>
              <View><React.Fragment><React.Fragment>💬</React.Fragment></React.Fragment></View>
            </React.Fragment>
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color }) => (
            <React.Fragment>
              <View><React.Fragment><React.Fragment>👤</React.Fragment></React.Fragment></View>
            </React.Fragment>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen 
              name="CouponDetail" 
              component={CouponDetailScreen} 
              options={({ route }: any) => ({
                headerShown: true,
                title: route.params?.title || 'Kupon Detay',
                headerStyle: {
                  backgroundColor: '#0f172a',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
