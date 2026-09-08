import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0f766e',
        headerStyle: { backgroundColor: '#0f766e' },
        headerTintColor: '#ffffff',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>🎓</Text>,
        }}
      />
      <Tabs.Screen
        name="colleges"
        options={{
          title: 'Colleges',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>🏫</Text>,
        }}
      />
      <Tabs.Screen
        name="awards"
        options={{
          title: 'Awards',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>💰</Text>,
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: 'Timeline',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>🗓️</Text>,
        }}
      />
      <Tabs.Screen
        name="pathways"
        options={{
          title: 'Pathways',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>🩺</Text>,
        }}
      />
    </Tabs>
  );
}
