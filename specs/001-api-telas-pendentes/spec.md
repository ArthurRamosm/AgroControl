# Feature Specification: Integração das Telas Pendentes com Dados Reais

**Feature Branch**: `001-api-telas-pendentes`

**Created**: 2026-06-02

**Status**: Draft

**Input**: Implementar as 3 telas pendentes do AgroControl (Financeiro, Relatórios e
Mapa) consumindo as APIs do backend já existentes, seguindo o padrão offline-first
com sincronização e indicador de conectividade já implementado nas outras telas

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestão Financeira com Dados Reais (Priority: P1)

O produtor rural acessa a tela Financeiro e visualiza seu histórico de receitas e
despesas reais da propriedade. Ele pode registrar novos lançamentos que são salvos
localmente e sincronizados com o servidor quando há conexão. Sem internet, os dados
já carregados continuam visíveis e novos lançamentos entram em fila de sincronização.

**Why this priority**: É a tela de maior valor operacional após o cadastro de animais
— produtores precisam controlar receitas e despesas no campo, muitas vezes sem
conexão estável.

**Independent Test**: Pode ser validada isoladamente abrindo a tela Financeiro,
verificando que dados reais aparecem quando online, que o banner offline aparece
sem conexão, e que lançamentos feitos offline aparecem sincronizados ao reconectar.

**Acceptance Scenarios**:

1. **Given** o usuário está logado e com conexão ativa, **When** abre a tela
   Financeiro, **Then** vê a lista de lançamentos financeiros reais da sua
   propriedade carregados do servidor.
2. **Given** o usuário vê os dados financeiros online, **When** perde a conexão,
   **Then** os dados já carregados permanecem visíveis e o banner de modo offline
   é exibido.
3. **Given** o usuário está sem conexão, **When** registra um novo lançamento
   financeiro, **Then** o lançamento é salvo localmente e marcado como pendente
   de sincronização.
4. **Given** há lançamentos pendentes de sincronização, **When** a conexão é
   restaurada, **Then** os lançamentos são enviados ao servidor automaticamente
   e o indicador de pendência desaparece.
5. **Given** o usuário quer filtrar lançamentos, **When** seleciona um período
   ou tipo (receita/despesa), **Then** a lista é filtrada corretamente tanto
   com dados locais quanto do servidor.

---

### User Story 2 - Relatórios Consolidados da Propriedade (Priority: P2)

O produtor acessa a tela Relatórios e visualiza relatórios consolidados sobre
sua propriedade (animais, saúde do rebanho, movimentação financeira). Os relatórios
refletem dados reais do servidor. Sem conexão, o último relatório gerado fica
disponível em cache para consulta.

**Why this priority**: Relatórios são consultados em reuniões e tomadas de decisão,
frequentemente em locais sem conectividade. A combinação de dados reais + cache
offline torna a funcionalidade completa.

**Independent Test**: Pode ser validada abrindo a tela Relatórios online (dados
reais aparecem), gerando um relatório, desconectando e verificando que o último
estado fica disponível offline.

**Acceptance Scenarios**:

1. **Given** o usuário está logado e com conexão, **When** abre a tela Relatórios,
   **Then** vê os relatórios disponíveis com dados atualizados da propriedade.
2. **Given** o usuário visualiza um relatório, **When** está sem conexão, **Then**
   os dados do último carregamento ficam visíveis com indicação de que são dados
   em cache.
3. **Given** o usuário está online, **When** solicita a exportação de um relatório
   em PDF, **Then** o arquivo é gerado com os dados reais e disponibilizado para
   compartilhamento.
4. **Given** o usuário quer filtrar o relatório por período ou categoria, **When**
   aplica o filtro, **Then** o relatório reflete apenas os dados do intervalo
   selecionado.

---

### User Story 3 - Mapa Interativo com Áreas e Pontos Reais (Priority: P3)

O produtor acessa a tela Mapa da Propriedade e visualiza no mapa as áreas
delimitadas e pontos de interesse (bebedouros, currais, cercas, etc.) da sua
propriedade com dados reais do servidor. Pode adicionar e editar pontos
diretamente no mapa. Sem conexão, o último estado do mapa fica disponível.

**Why this priority**: O mapa é auxiliar ao fluxo principal (gestão de animais e
financeiro). É de grande valor mas depende de dados de propriedade/áreas que
requerem configuração prévia.

**Independent Test**: Pode ser validada exibindo o mapa com áreas e pontos reais
carregados do servidor, verificando que o mapa persiste offline com o último
estado carregado.

**Acceptance Scenarios**:

1. **Given** o usuário está logado e com conexão, **When** abre a tela Mapa,
   **Then** visualiza as áreas delimitadas e pontos de interesse reais da sua
   propriedade sobrepostos no mapa.
2. **Given** o mapa foi carregado online, **When** o usuário perde conexão,
   **Then** o mapa e os dados de área/pontos permanecem visíveis com indicador
   offline.
3. **Given** o usuário vê o mapa, **When** toca em uma área ou ponto, **Then**
   vê os detalhes daquele elemento (nome, categoria, descrição).
4. **Given** o usuário quer adicionar um ponto de interesse, **When** marca o
   local no mapa e preenche os dados, **Then** o ponto é salvo localmente e
   sincronizado quando houver conexão.

---

### Edge Cases

- O que acontece quando a propriedade do usuário não tem lançamentos financeiros
  cadastrados? → Tela exibe estado vazio com mensagem orientativa.
- O que acontece quando não há relatórios gerados ainda? → Tela exibe estado vazio
  com opção de gerar o primeiro relatório.
- O que acontece quando a propriedade não tem áreas ou pontos cadastrados no mapa?
  → Mapa exibe apenas a localização base sem sobrepositores, com estado vazio para
  áreas/pontos.
- O que acontece quando a sincronização falha repetidamente? → Dados permanecem
  em fila; o usuário é informado do status pendente mas não perde os registros.
- O que acontece quando o usuário não tem propriedade cadastrada? → As três telas
  exibem mensagem pedindo que o usuário cadastre sua propriedade primeiro.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A tela Financeiro MUST exibir os lançamentos financeiros reais da
  propriedade do usuário autenticado.
- **FR-002**: A tela Financeiro MUST permitir o registro de novos lançamentos
  (receitas e despesas) com categoria, valor, data e descrição.
- **FR-003**: A tela Financeiro MUST apresentar totalizadores de receitas, despesas
  e saldo do período visível.
- **FR-004**: A tela Relatórios MUST exibir relatórios consolidados com dados reais
  (animais, saúde, financeiro) da propriedade.
- **FR-005**: A tela Relatórios MUST permitir a exportação do relatório visualizado
  em formato PDF para compartilhamento.
- **FR-006**: A tela Mapa MUST exibir áreas geográficas delimitadas da propriedade
  sobrepostas no mapa.
- **FR-007**: A tela Mapa MUST exibir pontos de interesse cadastrados (coordenadas
  + categoria + nome) sobrepostos no mapa.
- **FR-008**: A tela Mapa MUST permitir adicionar novos pontos de interesse
  diretamente pelo mapa.
- **FR-009**: Todas as três telas MUST exibir o banner de modo offline quando não
  há conexão com o servidor, consistente com o comportamento das demais telas.
- **FR-010**: Todas as três telas MUST armazenar localmente os dados carregados para
  disponibilização offline.
- **FR-011**: Toda escrita feita offline MUST ser enfileirada e sincronizada
  automaticamente ao restaurar a conexão, sem ação manual do usuário.
- **FR-012**: Todas as três telas MUST seguir o mesmo padrão visual das telas já
  implementadas (cor primária, tipografia, componentes reutilizáveis existentes).

### Key Entities *(include if feature involves data)*

- **Lançamento Financeiro**: Registro de receita ou despesa com valor, data,
  categoria e descrição; pertence a uma propriedade.
- **Relatório**: Documento consolidado gerado a partir dos dados da propriedade em
  um período; pode ser exportado em PDF.
- **Área**: Polígono geográfico que delimita uma zona da propriedade (pasto,
  curral, etc.) com nome e categoria.
- **Ponto de Interesse**: Coordenada geográfica com nome, categoria e descrição
  (bebedouro, porteira, etc.); pertence a uma propriedade.
- **Fila de Sincronização**: Conjunto de operações de escrita pendentes de envio
  ao servidor quando offline.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Produtores conseguem visualizar seus dados financeiros reais em até
  3 segundos após abrir a tela Financeiro com conexão ativa.
- **SC-002**: Produtores conseguem registrar um lançamento financeiro offline e
  confirmam que ele aparece sincronizado ao reconectar, sem perda de dados.
- **SC-003**: Produtores conseguem visualizar e exportar um relatório da propriedade
  em menos de 2 minutos a partir da abertura da tela Relatórios.
- **SC-004**: O mapa da propriedade carrega áreas e pontos reais em até 5 segundos
  com conexão; permanece navegável sem conexão com o último estado carregado.
- **SC-005**: As três telas exibem o indicador de modo offline em 100% das
  situações de ausência de conexão, alinhado ao comportamento das demais telas.
- **SC-006**: Nenhum dado escrito offline é perdido — taxa de sucesso de
  sincronização de 100% após restauração de conexão estável.

## Assumptions

- O usuário já está autenticado; estas telas não incluem lógica de login.
- O backend já possui todos os endpoints necessários (Financeiro, Relatorios,
  Propriedades, Areas, Pontos) implementados e funcionais.
- O padrão de sincronização offline (SQLite local + fila de sync + hook de
  conectividade) já está implementado nas demais telas e será replicado — não
  será redesenhado.
- O componente OfflineBanner já existe e será reutilizado sem modificação.
- Relatórios são somente leitura (gerados pelo servidor); a escrita offline
  aplica-se apenas a Financeiro e Mapa (novos pontos).
- O usuário tem pelo menos uma propriedade cadastrada; o fluxo de cadastro de
  propriedade está fora do escopo desta feature.
- O mapa na plataforma web usa react-leaflet; no mobile o comportamento de
  visualização é equivalente mas pode ter limitações de interação em versões
  futuras (aceito para este escopo).
- A exportação PDF de relatórios usa as bibliotecas expo-print e expo-sharing
  já presentes no projeto.
