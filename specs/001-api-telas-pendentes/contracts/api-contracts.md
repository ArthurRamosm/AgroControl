# API Contracts: Integração das Telas Pendentes

Todos os endpoints abaixo já estão implementados no backend .NET Core.
Esta documentação descreve o contrato esperado pelo frontend, inferido do
código existente nas telas.

---

## Financeiro

### GET `/api/financeiro/{propriedadeId}/resumo`

Retorna o resumo financeiro da propriedade.

**Response:**
```json
{
  "receitaTotal": 12500.00,
  "despesaTotal": 8300.00,
  "lucroLiquido": 4200.00,
  "margemLucro": 33.6,
  "roi": 12.5,
  "variacaoReceitaMes": 5.2,
  "variacaoDespesaMes": -1.8,
  "variacaoLucroMes": 8.0
}
```

### GET `/api/financeiro/{propriedadeId}/evolucao?meses={3|6|12}`

Retorna evolução mensal de receitas, despesas e lucro.

**Response:**
```json
[
  { "mes": "Jan/2026", "receita": 4200.00, "despesa": 2800.00, "lucro": 1400.00 }
]
```

### GET `/api/financeiro/{propriedadeId}/despesas-categoria`

Retorna despesas agrupadas por categoria.

**Response:**
```json
[
  { "categoria": "Racao", "total": 2500.00, "percentual": 30.1 }
]
```

### GET `/api/financeiro/{propriedadeId}/custo-por-animal`

Retorna custo médio por cabeça de gado no mês.

**Response:**
```json
{
  "totalAnimaisAtivos": 120,
  "custoPorCabeca": 69.17,
  "mes": "Jun/2026"
}
```

### GET `/api/financeiro/{propriedadeId}/alertas`

Retorna alertas financeiros da propriedade.

**Response:**
```json
[
  { "tipo": "DespesaAlta", "mensagem": "Gasto com Ração acima da média", "urgencia": "media" }
]
```

### POST `/api/financeiro/{propriedadeId}/despesas`

Registra nova despesa.

**Request body:**
```json
{
  "categoria": "Racao",
  "descricao": "Compra de ração concentrada",
  "valor": 850.00,
  "dataDespesa": "2026-06-02T00:00:00"
}
```

**Response:** `201 Created` com o objeto criado.

### POST `/api/financeiro/{propriedadeId}/receitas`

Registra nova receita.

**Request body:**
```json
{
  "tipo": "Leite",
  "descricao": "Venda de leite — 500L",
  "valor": 1250.00,
  "dataReceita": "2026-06-02T00:00:00"
}
```

**Response:** `201 Created` com o objeto criado.

### POST `/api/financeiro/{propriedadeId}/vendas-animal`

Registra venda de animal.

**Request body:**
```json
{
  "animalId": 42,
  "valor": 3500.00,
  "data": "2026-06-02T00:00:00",
  "observacao": "Venda para frigorífico"
}
```

### POST `/api/financeiro/{propriedadeId}/compras-animal`

Registra compra de animal.

**Request body:**
```json
{
  "nomeAnimal": "Estrela",
  "valor": 2800.00,
  "data": "2026-06-02T00:00:00"
}
```

### POST `/api/financeiro/{propriedadeId}/insumos`

Registra compra de insumos (ração, sal mineral, etc.).

**Request body:**
```json
{
  "produto": "Sal mineral bovino 25kg",
  "categoria": "SalMineral",
  "quantidade": 10,
  "valor": 320.00,
  "data": "2026-06-02T00:00:00"
}
```

### POST `/api/financeiro/{propriedadeId}/funcionarios`

Registra pagamento de funcionário.

**Request body:**
```json
{
  "nomeFuncionario": "João Silva",
  "tipo": "Salario",
  "valor": 2200.00,
  "data": "2026-06-02T00:00:00"
}
```

---

## Relatórios

### GET `/api/relatorios/{propriedadeId}/{tipo}?dataInicio={YYYY-MM-DD}&dataFim={YYYY-MM-DD}`

Gera e retorna um relatório consolidado. Tipos aceitos: `produtividade`,
`sanitario`, `financeiro`, `reprodutivo`.

**Response (tipo = produtividade):**
```json
{
  "totalAnimaisAtivos": 120,
  "totalMachos": 45,
  "totalFemeas": 75,
  "porRaca": { "Nelore": 80, "Gir": 40 },
  "porTipo": { "Bovino": 120 },
  "porStatusLeite": { "Lactante": 35, "Seca": 40 }
}
```

**Response (tipo = sanitario):**
```json
{
  "totalAfastamentos": 12,
  "afastamentosAtivos": 3,
  "porMotivo": { "Doença": 8, "Tratamento": 4 },
  "ultimosAfastamentos": [
    {
      "id": 1,
      "animalNome": "Pintada",
      "animalBrinco": "BR-001",
      "motivoAfastamento": "Mastite",
      "dataAfastamento": "2026-05-20",
      "dataRetorno": null
    }
  ]
}
```

**Response (tipo = financeiro):**
```json
{
  "receitaTotal": 12500.00,
  "despesaTotal": 8300.00,
  "lucro": 4200.00,
  "margemLucro": 33.6,
  "evolucaoMensal": [
    { "mes": "Jan/2026", "receita": 4000.00, "despesa": 2700.00 }
  ],
  "despesasPorCategoria": [
    { "categoria": "Racao", "total": 2500.00, "percentual": 30.1 }
  ]
}
```

**Response (tipo = reprodutivo):**
```json
{
  "totalGestantes": 12,
  "totalPartos": 8,
  "taxaNatalidade": 6.7,
  "mensagem": "8 partos registrados no período"
}
```

---

## Mapa da Propriedade

### GET `/api/areas?propriedadeId={id}` *(path a confirmar)*

Retorna as áreas delimitadas da propriedade.

**Response:**
```json
[
  {
    "id": 1,
    "propriedadeId": 5,
    "nome": "Pasto Principal",
    "tipoCadastro": "AREA_INTERNA",
    "tipo": "Pasto",
    "coordenadas": [[-15.78, -47.93], [-15.79, -47.94], [-15.78, -47.95]],
    "areaTotalHectares": 25.5
  }
]
```

### GET `/api/propriedade-pontos?propriedadeId={id}`

Retorna os pontos de interesse da propriedade.

**Response:**
```json
[
  {
    "id": 1,
    "propriedadeId": 5,
    "nome": "Bebedouro Norte",
    "tipo": "Bebedouro",
    "latitude": -15.784,
    "longitude": -47.931,
    "descricao": "Bebedouro do pasto norte"
  }
]
```

### POST `/api/areas?propriedadeId={id}` *(path a confirmar)*

Cria nova área delimitada.

**Request body:**
```json
{
  "propriedadeId": 5,
  "nome": "Piquete 3",
  "tipoCadastro": "AREA_INTERNA",
  "tipo": "Piquete",
  "coordenadas": [[-15.78, -47.93], [-15.79, -47.94]],
  "areaTotalHectares": 8.2
}
```

**Response:** `201 Created` com área criada.

### POST `/api/propriedade-pontos?propriedadeId={id}`

Cria novo ponto de interesse.

**Request body:**
```json
{
  "propriedadeId": 5,
  "nome": "Porteira Sul",
  "tipo": "Porteira",
  "latitude": -15.792,
  "longitude": -47.945,
  "descricao": "Porteira de acesso ao pasto sul"
}
```

**Response:** `201 Created` com ponto criado.

---

## Observações de integração

- Todos os endpoints exigem JWT Bearer token no header `Authorization`.
- Erros retornam `{ message: string }` com status HTTP apropriado.
- Todos os POSTs offline devem usar `tabela` no `sync_queue` como:
  - Financeiro despesas → `'financeiro_despesas'`
  - Financeiro receitas → `'financeiro_receitas'`
  - Financeiro vendas → `'financeiro_vendas_animal'`
  - Financeiro compras → `'financeiro_compras_animal'`
  - Financeiro insumos → `'financeiro_insumos'`
  - Financeiro funcionários → `'financeiro_funcionarios'`
  - Mapa áreas → `'propriedade_areas'`
  - Mapa pontos → `'propriedade_pontos'`
