# Quickstart: Validar Integração das 3 Telas

## Pré-requisitos

1. Backend .NET Core rodando (porta padrão configurada em `src/config/api.ts`)
2. App rodando via `npm run start` (Expo)
3. Dispositivo/emulador conectado

## Setup

```powershell
# 1. Iniciar backend (no diretório do projeto .NET)
dotnet run

# 2. Iniciar frontend
npm run start

# 3. Abrir em Android (emulador ou device)
npm run android
```

## Roteiro de validação — FinanceiroScreen

### Online
1. Abrir tela Financeiro
2. Verificar: cards de resumo (receita, despesa, saldo, margem) aparecem com valores reais
3. Verificar: gráfico de barras mensal renderiza com dados
4. Verificar: cards de categorias de despesa aparecem
5. Registrar nova despesa → preencher categoria + valor + data → Salvar
6. Verificar: tela recarrega com novo lançamento incluído

### Offline
1. Desabilitar rede (modo avião ou Wi-Fi off)
2. Verificar: OfflineBanner aparece no topo
3. Verificar: dados do último carregamento continuam visíveis
4. Registrar nova despesa → Salvar
5. Verificar: alerta de "salvo localmente" aparece (sem erro)
6. Reabilitar rede
7. Verificar: sync processa e lançamento aparece no servidor

### Estado vazio
1. Usar conta de propriedade sem lançamentos
2. Verificar: estado vazio com mensagem orientativa (não crashar)

---

## Roteiro de validação — RelatoriosScreen

### Online
1. Abrir tela Relatórios
2. Selecionar tipo "Produtividade" + período → Buscar
3. Verificar: dados de animais reais aparecem (total, por raça, etc.)
4. Repetir para tipos: Sanitário, Financeiro, Reprodutivo
5. Tap em "Exportar PDF"
6. Verificar: PDF gerado com dados reais + share sheet abre

### Offline
1. Carregar um relatório online primeiro
2. Desabilitar rede
3. Verificar: OfflineBanner aparece
4. Buscar o mesmo relatório novamente
5. Verificar: dados de cache aparecem com indicador de cache

### Estado vazio
1. Usar conta com propriedade sem dados no período selecionado
2. Verificar: estado vazio sem crash

---

## Roteiro de validação — MapaPropriedadeScreen

### Online
1. Abrir tela Mapa
2. Verificar: áreas da propriedade aparecem sobrepostas no mapa (polígonos coloridos)
3. Verificar: pontos de interesse aparecem como marcadores
4. Tocar em um marcador
5. Verificar: popup com nome, tipo e descrição aparecem
6. Adicionar novo ponto: tocar no mapa → preencher formulário → Salvar
7. Verificar: ponto aparece no mapa imediatamente

### Offline
1. Carregar o mapa online primeiro
2. Desabilitar rede
3. Verificar: OfflineBanner aparece
4. Verificar: mapa e dados (áreas + pontos) permanecem visíveis
5. Adicionar novo ponto offline
6. Verificar: ponto salvo localmente com feedback (alerta de "será sincronizado")
7. Reabilitar rede
8. Verificar: ponto sincronizado ao servidor

### Estado vazio
1. Propriedade sem áreas/pontos cadastrados
2. Verificar: mapa centralizado no Brasil com estado vazio (sem crash)

---

## Checklist de smoke test rápido

```text
[ ] FinanceiroScreen carrega dados reais online
[ ] FinanceiroScreen mostra cache offline
[ ] FinanceiroScreen salva despesa offline sem crash
[ ] RelatoriosScreen carrega relatório online
[ ] RelatoriosScreen exporta PDF
[ ] RelatoriosScreen mostra cache offline
[ ] MapaPropriedadeScreen carrega áreas e pontos online
[ ] MapaPropriedadeScreen persiste offline
[ ] MapaPropriedadeScreen salva ponto offline sem crash
[ ] OfflineBanner aparece em todas as telas sem conexão
[ ] Sync queue processa ao reconectar (checar debug/logs)
```
