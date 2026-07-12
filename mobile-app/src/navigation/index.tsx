import React from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { FirmProvider } from "../context/FirmContext";
import { useTheme } from "../context/ThemeContext";
import BottomNav from "../components/BottomNav";
import { colors } from "../theme";
import type { Vehicle, Driver } from "../lib/types";

import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import TripsScreen from "../screens/TripsScreen";
import TripDetailScreen from "../screens/TripDetailScreen";
import AddTripScreen from "../screens/AddTripScreen";
import VehiclesScreen from "../screens/VehiclesScreen";
import VehicleDetailScreen from "../screens/VehicleDetailScreen";
import AddVehicleScreen from "../screens/AddVehicleScreen";
import DriversScreen from "../screens/DriversScreen";
import DriverDetailScreen from "../screens/DriverDetailScreen";
import AddDriverScreen from "../screens/AddDriverScreen";
import MoreScreen from "../screens/MoreScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ComingSoonScreen from "../screens/ComingSoonScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import MyFirmsScreen from "../screens/MyFirmsScreen";
import LoginPasswordScreen from "../screens/LoginPasswordScreen";
import AppearanceScreen from "../screens/AppearanceScreen";
import LanguageScreen from "../screens/LanguageScreen";
import GeneralSettingsScreen from "../screens/GeneralSettingsScreen";
import BillingScreen from "../screens/BillingScreen";
import ExpensesScreen from "../screens/expenses/ExpensesScreen";
import FleetHealthScreen from "../screens/FleetHealthScreen";
import DocumentsScreen from "../screens/DocumentsScreen";
import AccountsScreen from "../screens/AccountsScreen";
import ReportsScreen from "../screens/ReportsScreen";
import InsuranceScreen from "../screens/InsuranceScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import PartiesScreen from "../screens/PartiesScreen";

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  TripsTab: undefined;
  VehiclesTab: undefined;
  DriversTab: undefined;
  MoreTab: undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Settings: undefined;
  ComingSoon: { title: string };
  EditProfile: undefined;
  MyFirms: undefined;
  LoginPassword: undefined;
  Appearance: undefined;
  LanguageRegion: undefined;
  GeneralSettings: undefined;
  Billing: undefined;
  Expenses: { initialTab?: "fuel" | "tolls" | "tyres" | "misc" } | undefined;
  FleetHealth: undefined;
  Documents: undefined;
  Accounts: undefined;
  Reports: undefined;
  Insurance: undefined;
  Analytics: undefined;
  Parties: undefined;
};

export type TripsStackParamList = {
  TripsList: undefined;
  TripDetail: { id: string };
  AddTrip: undefined;
};

export type VehiclesStackParamList = {
  VehiclesList: undefined;
  VehicleDetail: { vehicle: Vehicle };
  AddVehicle: undefined;
};

export type DriversStackParamList = {
  DriversList: undefined;
  DriverDetail: { driver: Driver };
  AddDriver: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();
const TripsStack = createNativeStackNavigator<TripsStackParamList>();
const VehiclesStack = createNativeStackNavigator<VehiclesStackParamList>();
const DriversStack = createNativeStackNavigator<DriversStackParamList>();

function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreMenu" component={MoreScreen} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} />
      <MoreStack.Screen name="ComingSoon" component={ComingSoonScreen} />
      <MoreStack.Screen name="EditProfile" component={EditProfileScreen} />
      <MoreStack.Screen name="MyFirms" component={MyFirmsScreen} />
      <MoreStack.Screen name="LoginPassword" component={LoginPasswordScreen} />
      <MoreStack.Screen name="Appearance" component={AppearanceScreen} />
      <MoreStack.Screen name="LanguageRegion" component={LanguageScreen} />
      <MoreStack.Screen name="GeneralSettings" component={GeneralSettingsScreen} />
      <MoreStack.Screen name="Billing" component={BillingScreen} />
      <MoreStack.Screen name="Expenses" component={ExpensesScreen} />
      <MoreStack.Screen name="FleetHealth" component={FleetHealthScreen} />
      <MoreStack.Screen name="Documents" component={DocumentsScreen} />
      <MoreStack.Screen name="Accounts" component={AccountsScreen} />
      <MoreStack.Screen name="Reports" component={ReportsScreen} />
      <MoreStack.Screen name="Insurance" component={InsuranceScreen} />
      <MoreStack.Screen name="Analytics" component={AnalyticsScreen} />
      <MoreStack.Screen name="Parties" component={PartiesScreen} />
    </MoreStack.Navigator>
  );
}

function TripsNavigator() {
  return (
    <TripsStack.Navigator screenOptions={{ headerShown: false }}>
      <TripsStack.Screen name="TripsList" component={TripsScreen} />
      <TripsStack.Screen name="TripDetail" component={TripDetailScreen} />
      <TripsStack.Screen name="AddTrip" component={AddTripScreen} />
    </TripsStack.Navigator>
  );
}

function VehiclesNavigator() {
  return (
    <VehiclesStack.Navigator screenOptions={{ headerShown: false }}>
      <VehiclesStack.Screen name="VehiclesList" component={VehiclesScreen} />
      <VehiclesStack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
      <VehiclesStack.Screen name="AddVehicle" component={AddVehicleScreen} />
    </VehiclesStack.Navigator>
  );
}

function DriversNavigator() {
  return (
    <DriversStack.Navigator screenOptions={{ headerShown: false }}>
      <DriversStack.Screen name="DriversList" component={DriversScreen} />
      <DriversStack.Screen name="DriverDetail" component={DriverDetailScreen} />
      <DriversStack.Screen name="AddDriver" component={AddDriverScreen} />
    </DriversStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomNav {...props} />}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="TripsTab" component={TripsNavigator} />
      <Tab.Screen name="VehiclesTab" component={VehiclesNavigator} />
      <Tab.Screen name="DriversTab" component={DriversNavigator} />
      <Tab.Screen name="MoreTab" component={MoreNavigator} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { scheme } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={scheme === "dark" ? DarkTheme : DefaultTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <RootStack.Screen name="Main">
            {() => (
              <FirmProvider>
                <MainTabs />
              </FirmProvider>
            )}
          </RootStack.Screen>
        ) : (
          <RootStack.Screen name="Login" component={LoginScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
