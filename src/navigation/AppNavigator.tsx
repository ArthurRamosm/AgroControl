import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { loadSavedSession } from '../services/session';
import { initDatabase } from '../database/localDb';
import OfflineBanner from '../components/OfflineBanner';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import AnimalListScreen from '../screens/AnimalListScreen';
import CadastroAnimalScreen from '../screens/CadastroAnimalScreen';
import AnimalDetailsScreen from '../screens/AnimalDetailsScreen';
import SaudeScreen from '../screens/SaudeScreen';
import AnimalReportScreen from '../screens/AnimalReportScreen';
import MapaPropriedadeScreen from '../screens/MapaPropriedadeScreen';
import FinanceiroScreen from '../screens/FinanceiroScreen';
import RelatoriosScreen from '../screens/RelatoriosScreen';
import AfastamentoScreen from '../screens/AfastamentoScreen';
import ConfiguracoesScreen from '../screens/ConfiguracoesScreen';
import EstoqueScreen from '../screens/EstoqueScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Login');

  useEffect(() => {
    async function bootstrap() {
      await initDatabase().catch(() => {});

      const saved = await loadSavedSession();
      if (saved) setInitialRoute('Home');

      setReady(true);
    }
    bootstrap();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a3d1f' }}>
        <ActivityIndicator color="#ffffff" size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="AnimalList" component={AnimalListScreen} />
          <Stack.Screen name="Saude" component={SaudeScreen} />
          <Stack.Screen name="MapaPropriedade" component={MapaPropriedadeScreen} />
          <Stack.Screen name="AnimalDetails" component={AnimalDetailsScreen} />
          <Stack.Screen name="AnimalReport" component={AnimalReportScreen} />
          <Stack.Screen name="CadastroAnimal" component={CadastroAnimalScreen} />
          <Stack.Screen name="Financeiro" component={FinanceiroScreen} />
          <Stack.Screen name="Relatorios" component={RelatoriosScreen} />
          <Stack.Screen name="Afastamento" component={AfastamentoScreen} />
          <Stack.Screen name="Configuracoes" component={ConfiguracoesScreen} />
          <Stack.Screen name="Estoque" component={EstoqueScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
