import React, { useRef } from "react";
import { NavigationContainer, DefaultTheme, DarkTheme, StackActions, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View, PanResponder } from "react-native";

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
import FuelScreen from "../screens/expenses/FuelScreen";
import TollsScreen from "../screens/expenses/TollsScreen";
import TyresScreen from "../screens/expenses/TyresScreen";
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
  Expenses: undefined;
  Fuel: undefined;
  Tolls: undefined;
  Tyres: undefined;
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
      <MoreStack.Screen name="Fuel" component={FuelScreen} />
      <MoreStack.Screen name="Tolls" component={TollsScreen} />
      <MoreStack.Screen name="Tyres" component={TyresScreen} />
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

// Re-pressing a tab that's already active resets its nested stack back to
// the root screen instead of leaving you wherever you'd drilled into.
// `target: route.state?.key` is required — without it the popToTop action
// is dispatched at the tab navigator (which doesn't understand stack
// actions) and bubbles up to the root stack instead of the nested one.
function resetOnRepressListener({ navigation, route }: { navigation: any; route: any }) {
  return {
    tabPress: () => {
      if (navigation.isFocused()) {
        navigation.dispatch({
          ...StackActions.popToTop(),
          target: route.state?.key,
        });
      }
    },
  };
}

const TAB_ORDER: (keyof MainTabParamList)[] = ["HomeTab", "TripsTab", "VehiclesTab", "DriversTab", "MoreTab"];

// Swipe left/right to move between tabs. A full PagerView integration
// would mean reimplementing how @react-navigation/bottom-tabs mounts its
// screens (it doesn't expose a "put my scenes inside this pager" hook) —
// this PanResponder is the sanctioned fallback: it only claims the gesture
// once a drag is clearly horizontal (bubble phase, not capture), so
// existing horizontal chip-row ScrollViews inside each screen still get
// first refusal and keep scrolling normally.
function MainTabs({ navigationRef }: { navigationRef: React.RefObject<any> }) {
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) > 25 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
      onPanResponderRelease: (_evt, gesture) => {
        if (Math.abs(gesture.dx) < 60) return;

        const rootState = navigationRef.current?.getState() as any;
        const mainRoute = rootState?.routes?.find((r: any) => r.name === "Main");
        const tabState = mainRoute?.state;
        if (!tabState) return;

        const currentTabName = tabState.routeNames?.[tabState.index] ?? tabState.routes?.[tabState.index]?.name;
        const currentIndex = TAB_ORDER.indexOf(currentTabName);
        if (currentIndex === -1) return;

        // Swipe right (positive dx) → previous tab, swipe left → next tab.
        const nextIndex = gesture.dx > 0 ? currentIndex - 1 : currentIndex + 1;
        if (nextIndex < 0 || nextIndex >= TAB_ORDER.length) return;

        navigationRef.current?.navigate(TAB_ORDER[nextIndex] as any);
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <BottomNav {...props} />}
      >
        <Tab.Screen name="HomeTab" component={HomeScreen} />
        <Tab.Screen name="TripsTab" component={TripsNavigator} listeners={resetOnRepressListener} />
        <Tab.Screen name="VehiclesTab" component={VehiclesNavigator} listeners={resetOnRepressListener} />
        <Tab.Screen name="DriversTab" component={DriversNavigator} listeners={resetOnRepressListener} />
        <Tab.Screen name="MoreTab" component={MoreNavigator} listeners={resetOnRepressListener} />
      </Tab.Navigator>
    </View>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { scheme } = useTheme();
  const navigationRef = useNavigationContainerRef<any>();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={scheme === "dark" ? DarkTheme : DefaultTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <RootStack.Screen name="Main">
            {() => (
              <FirmProvider>
                <MainTabs navigationRef={navigationRef} />
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
