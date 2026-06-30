import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { LayoutGrid, Map, Truck, Receipt, MoreHorizontal, type LucideIcon } from "lucide-react-native";

import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import DashboardScreen from "../screens/DashboardScreen";
import VehiclesScreen from "../screens/VehiclesScreen";
import DriversScreen from "../screens/DriversScreen";
import TripsScreen from "../screens/TripsScreen";
import TripDetailScreen from "../screens/TripDetailScreen";
import FuelScreen from "../screens/FuelScreen";
import ExpensesScreen from "../screens/ExpensesScreen";
import ReportsScreen from "../screens/ReportsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import MoreScreen from "../screens/MoreScreen";

const PRIMARY = "#1E2D8E";

export type RootStackParamList = { Login: undefined; Main: undefined };
export type MainTabParamList = {
  DashboardTab: undefined;
  TripsTab: undefined;
  VehiclesTab: undefined;
  ExpensesTab: undefined;
  MoreTab: undefined;
};
export type TripsStackParamList = {
  TripsList: undefined;
  TripDetail: { tripId: string };
};
export type MoreStackParamList = {
  MoreMenu: undefined;
  Fuel: undefined;
  Drivers: undefined;
  Reports: undefined;
  Settings: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const TripsStack = createNativeStackNavigator<TripsStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

function TripsNavigator() {
  return (
    <TripsStack.Navigator screenOptions={{ headerShown: false }}>
      <TripsStack.Screen name="TripsList" component={TripsScreen} />
      <TripsStack.Screen name="TripDetail" component={TripDetailScreen} />
    </TripsStack.Navigator>
  );
}

function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreMenu" component={MoreScreen} />
      <MoreStack.Screen name="Fuel" component={FuelScreen} />
      <MoreStack.Screen name="Drivers" component={DriversScreen} />
      <MoreStack.Screen name="Reports" component={ReportsScreen} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} />
    </MoreStack.Navigator>
  );
}

const TAB_CONFIG: Record<string, { label: string; icon: LucideIcon }> = {
  DashboardTab: { label: "Home",     icon: LayoutGrid },
  TripsTab:     { label: "Trips",    icon: Map },
  VehiclesTab:  { label: "Vehicles", icon: Truck },
  ExpensesTab:  { label: "Expenses", icon: Receipt },
  MoreTab:      { label: "More",     icon: MoreHorizontal },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const cfg = TAB_CONFIG[route.name];
        return {
          headerShown: false,
          tabBarActiveTintColor: "#ffffff",
          tabBarInactiveTintColor: "rgba(255,255,255,0.45)",
          tabBarStyle: {
            backgroundColor: PRIMARY,
            borderTopWidth: 0,
            height: 64,
            paddingBottom: 10,
            paddingTop: 6,
            elevation: 20,
            shadowColor: PRIMARY,
            shadowOpacity: 0.4,
            shadowOffset: { width: 0, height: -4 },
            shadowRadius: 12,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            marginTop: 2,
          },
          tabBarLabel: cfg.label,
          tabBarIcon: ({ color }) => {
            const Icon = cfg.icon;
            return <Icon size={22} color={color} />;
          },
        };
      }}
    >
      <Tab.Screen name="DashboardTab" component={DashboardScreen} />
      <Tab.Screen name="TripsTab"     component={TripsNavigator} />
      <Tab.Screen name="VehiclesTab"  component={VehiclesScreen} />
      <Tab.Screen name="ExpensesTab"  component={ExpensesScreen} />
      <Tab.Screen name="MoreTab"      component={MoreNavigator} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F0F4FF" }}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <RootStack.Screen name="Main" component={MainTabs} />
        ) : (
          <RootStack.Screen name="Login" component={LoginScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
