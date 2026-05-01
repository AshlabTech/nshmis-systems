import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, PlusCircle, RefreshCw, Files, LogIn } from 'lucide-react-native';
import { useAppContext } from '../context/AppContext';
import { THEME } from '../config/appConfig';
import { OfflineBanner } from '../components/OfflineBanner';
import { ToastBanner } from '../components/ToastBanner';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { NewEncounterWizard } from '../screens/NewEncounterWizard';
import { DraftsScreen } from '../screens/DraftsScreen';
import { PendingSyncScreen } from '../screens/PendingSyncScreen';
import { SyncHistoryScreen } from '../screens/SyncHistoryScreen';
import { PatientListScreen } from '../screens/PatientListScreen';
import { EncounterListScreen } from '../screens/EncounterListScreen';
import { RecordsScreen } from '../screens/RecordsScreen';
import { SyncCenterScreen } from '../screens/SyncCenterScreen';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const HEADER_OPTS = {
  headerStyle: { backgroundColor: THEME.teal },
  headerTintColor: '#fff' as const,
  headerTitleStyle: { fontWeight: '800' as const },
};

const TabIcon = ({ color, size, routeName }: { color: string; size: number; routeName: string }) => {
  const props = { color, size };
  switch (routeName) {
    case 'Home':    return <Home {...props} />;
    case 'New':     return <PlusCircle {...props} />;
    case 'Records': return <Files {...props} />;
    case 'Sync':    return <RefreshCw {...props} />;
    default:        return <LogIn {...props} />;
  }
};

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        ...HEADER_OPTS,
        tabBarActiveTintColor: THEME.teal,
        tabBarInactiveTintColor: THEME.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: THEME.border,
          minHeight: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarIcon: ({ color, size }) => <TabIcon color={color} size={size} routeName={route.name} />,
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="New" component={NewEncounterWizard} options={{ title: 'New' }} />
      <Tabs.Screen name="Records" component={RecordsScreen} />
      <Tabs.Screen name="Sync" component={SyncCenterScreen} />
    </Tabs.Navigator>
  );
}

export const AppNavigator = () => {
  const { isAuthenticated, isOnline, toastMessage } = useAppContext();

  return (
    <>
      <ToastBanner message={toastMessage} />
      <OfflineBanner visible={isAuthenticated && !isOnline} />

      <Stack.Navigator
        screenOptions={{
          ...HEADER_OPTS,
          animation: 'fade_from_bottom',
          animationDuration: 280,
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false, animation: 'fade' }}
          />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="NewEncounterWizard" component={NewEncounterWizard} options={{ title: 'New Encounter', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="Drafts" component={DraftsScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="Pending Sync" component={PendingSyncScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="Sync History" component={SyncHistoryScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="Patients" component={PatientListScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="Encounters" component={EncounterListScreen} options={{ animation: 'slide_from_right' }} />
          </>
        )}
      </Stack.Navigator>
    </>
  );
};
