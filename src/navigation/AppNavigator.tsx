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
import FazendaScreen from '../screens/FazendaScreen';
import ProducaoDiariaScreen from '../screens/queijaria/ProducaoDiariaScreen';
import PotabilidadeScreen from '../screens/queijaria/PotabilidadeScreen';
import HigieneCaixaScreen from '../screens/queijaria/HigieneCaixaScreen';
import AnaliseLabScreen from '../screens/queijaria/AnaliseLabScreen';
import RastreabilidadeScreen from '../screens/queijaria/RastreabilidadeScreen';
import HigienizacaoEquipScreen from '../screens/queijaria/HigienizacaoEquipScreen';
import CondicoesVestiarioScreen from '../screens/queijaria/CondicoesVestiarioScreen';
import DepositoLimpezaScreen from '../screens/queijaria/DepositoLimpezaScreen';
import ControleLeiteiroScreen from '../screens/queijaria/ControleLeiteiroScreen';
import VendaQueijoScreen from '../screens/queijaria/VendaQueijoScreen';
import MastiteClinicaScreen from '../screens/saude/MastiteClinicaScreen';
import MastiteSubclinicaScreen from '../screens/saude/MastiteSubclinicaScreen';
import ParasitasScreen from '../screens/saude/ParasitasScreen';
import DespesaDetalheScreen from '../screens/financeiro/DespesaDetalheScreen';
import ReceitaDetalheScreen from '../screens/financeiro/ReceitaDetalheScreen';

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
          <Stack.Screen name="FazendaScreen" component={FazendaScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ProducaoDiaria" component={ProducaoDiariaScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Potabilidade" component={PotabilidadeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HigieneCaixa" component={HigieneCaixaScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AnaliseLabScreen" component={AnaliseLabScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Rastreabilidade" component={RastreabilidadeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="HigienizacaoEquip" component={HigienizacaoEquipScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CondicoesVestiario" component={CondicoesVestiarioScreen} options={{ headerShown: false }} />
          <Stack.Screen name="DepositoLimpeza" component={DepositoLimpezaScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ControleLeiteiro" component={ControleLeiteiroScreen} options={{ headerShown: false }} />
          <Stack.Screen name="VendaQueijo" component={VendaQueijoScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MastiteClinica" component={MastiteClinicaScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MastiteSubclinica" component={MastiteSubclinicaScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Parasitas" component={ParasitasScreen} options={{ headerShown: false }} />
          <Stack.Screen name="DespesaDetalhe" component={DespesaDetalheScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ReceitaDetalhe" component={ReceitaDetalheScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
