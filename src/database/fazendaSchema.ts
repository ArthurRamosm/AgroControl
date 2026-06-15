// ============================================================
// AgroControl — Fazenda Schema
// Todas as tabelas novas: Queijaria, Saúde (expansão), Financeiro (expansão)
// ============================================================

export const FAZENDA_SCHEMA_VERSION = 1;

export const createFazendaTables = `

  -- ============================================================
  -- QUEIJARIA
  -- ============================================================

  -- PL 01/01 — Higiene das Caixas D'água (mensal)
  CREATE TABLE IF NOT EXISTS pl_higiene_caixa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    propriedade_id INTEGER NOT NULL,
    mes INTEGER NOT NULL,          -- 1-12
    ano INTEGER NOT NULL,
    data_realizacao TEXT,          -- ISO date
    observacoes TEXT,
    acoes_corretivas TEXT,
    responsavel TEXT,
    sync_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- PL 02/01 — Potabilidade da Água (diário)
  CREATE TABLE IF NOT EXISTS pl_potabilidade (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    propriedade_id INTEGER NOT NULL,
    data TEXT NOT NULL,            -- ISO date
    teor_cloro REAL,               -- ppm
    ph REAL,
    acoes_corretivas TEXT,
    responsavel TEXT,
    sync_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- PL 01/03 — Análises Laboratoriais Água/Queijo/Leite (mensal)
  CREATE TABLE IF NOT EXISTS pl_analise_lab (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    propriedade_id INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    -- ÁGUA
    agua_micro_sim_nao TEXT,       -- 'S' ou 'N'
    agua_fisico_sim_nao TEXT,
    agua_lab_credenciado TEXT,
    agua_data_analise TEXT,
    agua_numero_analise TEXT,
    -- QUEIJO
    queijo_micro_sim_nao TEXT,
    queijo_fisico_sim_nao TEXT,
    queijo_lab_credenciado TEXT,
    queijo_data_analise TEXT,
    queijo_numero_analise TEXT,
    -- LEITE
    leite_analise_sim_nao TEXT,
    leite_lab_rbql TEXT,
    leite_data_analise TEXT,
    leite_numero_analise TEXT,
    sync_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- PL 01/04 — Produção Matéria Prima (diário)
  CREATE TABLE IF NOT EXISTS pl_producao_mp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    propriedade_id INTEGER NOT NULL,
    data TEXT NOT NULL,            -- ISO date
    leite_manha_litros REAL DEFAULT 0,
    leite_tarde_litros REAL DEFAULT 0,
    queijo_manha_pecas INTEGER DEFAULT 0,
    queijo_tarde_pecas INTEGER DEFAULT 0,
    lote_manha TEXT,
    lote_tarde TEXT,
    observacoes TEXT,
    sync_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- PL 02/04 — Rastreabilidade do Produto
  CREATE TABLE IF NOT EXISTS pl_rastreabilidade (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    propriedade_id INTEGER NOT NULL,
    data_venda TEXT NOT NULL,
    quantidade_kg REAL NOT NULL,
    lote TEXT NOT NULL,            -- data de produção/lote
    comprador TEXT,
    endereco_comprador TEXT,
    observacoes TEXT,
    sync_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- PL 01/05 — Higienização de Equipamentos (diário, C/NC por equipamento)
  CREATE TABLE IF NOT EXISTS pl_higienizacao_equip (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    propriedade_id INTEGER NOT NULL,
    data TEXT NOT NULL,            -- ISO date
    tambores_leite TEXT,           -- 'C' ou 'NC'
    bancas_bancadas TEXT,
    pias TEXT,
    armarios TEXT,
    pas_liras TEXT,
    formas_plastico TEXT,
    funil_coador TEXT,
    tecidos TEXT,
    baldes_plastico TEXT,
    tanque_soro TEXT,
    prateleiras_madeira TEXT,
    ralos TEXT,
    observacoes TEXT,
    acoes_corretivas TEXT,
    sync_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- PL 02/05 — Condições do Vestiário (semanal, SIM/NÃO)
  CREATE TABLE IF NOT EXISTS pl_vestiario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    propriedade_id INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    semana INTEGER NOT NULL,       -- 1, 2, 3 ou 4
    data_avaliacao TEXT,
    item_1 TEXT,  -- ambiente limpo/organizado
    item_2 TEXT,  -- lixeira pedal
    item_3 TEXT,  -- saco plástico recolhido
    item_4 TEXT,  -- lixo recolhido semanalmente
    item_5 TEXT,  -- saboneteiras bactericida
    item_6 TEXT,  -- suporte papel toalha
    item_7 TEXT,  -- papel toalha secar mãos
    item_8 TEXT,  -- pias/ralos bom estado
    item_9 TEXT,  -- lava-botas bom estado
    item_10 TEXT, -- manipuladores passam pelo vestiário
    observacoes TEXT,
    acoes_corretivas TEXT,
    responsavel TEXT,
    sync_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- PL 03/05 — Depósito de Embalagens/Limpeza (semanal, SIM/NÃO)
  CREATE TABLE IF NOT EXISTS pl_deposito_limpeza (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    propriedade_id INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    semana INTEGER NOT NULL,
    data_avaliacao TEXT,
    item_1 TEXT,  -- ambiente limpo/organizado
    item_2 TEXT,  -- lixeira pedal
    item_3 TEXT,  -- prateleiras suficientes
    item_4 TEXT,  -- separação física materiais/embalagens
    item_5 TEXT,  -- sal acondicionado em tambores/estrados
    observacoes TEXT,
    acoes_corretivas TEXT,
    responsavel TEXT,
    sync_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Controle Leiteiro Mensal (diário)
  CREATE TABLE IF NOT EXISTS controle_leiteiro (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    propriedade_id INTEGER NOT NULL,
    data TEXT NOT NULL,
    kg_dia REAL DEFAULT 0,
    litros_dia REAL DEFAULT 0,
    vp_preco REAL DEFAULT 0,       -- valor/preço por litro
    vs REAL DEFAULT 0,             -- volume vendido
    leite_familiar REAL DEFAULT 0,
    leite_bezerro REAL DEFAULT 0,
    leite_descarte REAL DEFAULT 0,
    queijos_produzidos INTEGER DEFAULT 0,
    observacoes TEXT,
    sync_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Controle de Vendas de Queijo
  CREATE TABLE IF NOT EXISTS venda_queijo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    propriedade_id INTEGER NOT NULL,
    data_venda TEXT NOT NULL,
    cliente TEXT,
    tipo_queijo TEXT,
    quantidade_unid INTEGER DEFAULT 0,
    peso_total_kg REAL DEFAULT 0,
    peso_por_queijo_kg REAL DEFAULT 0,
    preco_unit_kg REAL DEFAULT 0,
    total_rs REAL DEFAULT 0,
    sync_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- ============================================================
  -- SAÚDE — EXPANSÃO
  -- ============================================================

  -- PL 01/07 — Mastite Clínica (por ocorrência)
  CREATE TABLE IF NOT EXISTS mastite_clinica (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    propriedade_id INTEGER NOT NULL,
    animal_id INTEGER,             -- FK para tabela animais (pode ser null se não cadastrado)
    nome_vaca TEXT NOT NULL,
    diagnostico TEXT,              -- '+' ou '-'
    teto_1 TEXT,                   -- '+' ou '-'
    teto_2 TEXT,
    teto_3 TEXT,
    teto_4 TEXT,
    data_exame TEXT NOT NULL,
    observacoes TEXT,
    sync_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- PL 02/07 — Mastite Subclínica/CMT (por sessão de teste)
  CREATE TABLE IF NOT EXISTS mastite_subclinica_sessao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    propriedade_id INTEGER NOT NULL,
    data_teste TEXT NOT NULL,
    observacoes TEXT,
    sync_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mastite_subclinica_animal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sessao_id INTEGER NOT NULL,    -- FK mastite_subclinica_sessao
    animal_id INTEGER,
    nome_vaca TEXT NOT NULL,
    diagnostico TEXT,
    teto_1 TEXT,
    teto_2 TEXT,
    teto_3 TEXT,
    teto_4 TEXT,
    observacoes TEXT
  );

  -- ============================================================
  -- ANIMAL — EXPANSÃO (dados complementares da ficha zootécnica)
  -- ============================================================

  -- Lactações do animal
  CREATE TABLE IF NOT EXISTS animal_lactacao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    animal_id INTEGER NOT NULL,
    numero_parto INTEGER NOT NULL,
    data_parto TEXT,
    inicio_controle TEXT,
    data_secagem TEXT,
    dias_lactacao INTEGER,
    producao_total_kg REAL,
    media_kg_dia REAL,
    sync_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Coberturas / Inseminações
  CREATE TABLE IF NOT EXISTS animal_cobertura (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    animal_id INTEGER NOT NULL,
    data_cobertura TEXT NOT NULL,
    tipo TEXT,                     -- 'Monta Natural' ou 'IA'
    reprodutor TEXT,
    diagnostico_gestacao TEXT,     -- '+' ou '-'
    data_diag TEXT,
    data_prevista_parto TEXT,
    data_real_parto TEXT,
    sync_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Cura do umbigo (bezerros — 5 dias)
  CREATE TABLE IF NOT EXISTS animal_cura_umbigo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    animal_id INTEGER NOT NULL,
    dia_1 TEXT,   -- 'S' ou 'N'
    dia_2 TEXT,
    dia_3 TEXT,
    dia_4 TEXT,
    dia_5 TEXT,
    observacoes TEXT,
    sync_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- ============================================================
  -- FINANCEIRO — EXPANSÃO
  -- ============================================================

  -- Controle de Despesas detalhado (caderno artesanal)
  CREATE TABLE IF NOT EXISTS despesa_detalhe (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    propriedade_id INTEGER NOT NULL,
    data_compra TEXT NOT NULL,
    data_pagamento TEXT,
    descricao TEXT NOT NULL,
    quantidade REAL DEFAULT 1,
    valor_unitario REAL DEFAULT 0,
    valor_total REAL DEFAULT 0,
    categoria_ima TEXT,            -- ex: 'sanidade', 'alimentacao', 'ordenha', etc.
    sync_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Controle de Outras Receitas
  CREATE TABLE IF NOT EXISTS receita_detalhe (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    propriedade_id INTEGER NOT NULL,
    data_venda TEXT NOT NULL,
    data_recebimento TEXT,
    descricao TEXT NOT NULL,
    quantidade REAL DEFAULT 1,
    valor_unitario REAL DEFAULT 0,
    valor_total REAL DEFAULT 0,
    sync_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- ============================================================
  -- CACHES (offline-first)
  -- ============================================================

  CREATE TABLE IF NOT EXISTS queijaria_cache (
    key TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leiteiro_cache (
    key TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`;

// Migration para adicionar coluna subcategoria_ima na tabela despesa_local existente
export const migrateDespesaLocal = `
  ALTER TABLE despesa_local ADD COLUMN subcategoria_ima TEXT;
  ALTER TABLE despesa_local ADD COLUMN categoria_ima TEXT;
`;

// Categorias IMA para uso nos selects do financeiro
export const CATEGORIAS_IMA_DESPESA = [
  { value: 'mao_de_obra', label: 'Mão de Obra' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'sanidade', label: 'Sanidade' },
  { value: 'inseminacao', label: 'Inseminação Artificial' },
  { value: 'ordenha', label: 'Ordenha' },
  { value: 'impostos_fixos', label: 'Impostos Fixos' },
  { value: 'combustivel_energia', label: 'Combustível / Energia' },
  { value: 'diversas', label: 'Despesas Diversas' },
  { value: 'suinos', label: 'Suínos' },
  { value: 'queijos', label: 'Queijos' },
  { value: 'aluguel_pasto', label: 'Aluguel de Pastos' },
];

export const SUBCATEGORIAS_IMA: Record<string, string[]> = {
  mao_de_obra: [
    'Mão de obra permanente', 'Encargos sociais', 'Assistência agronômica',
    'Assistência veterinária', 'Assistência zootécnica', 'Assistência contábil',
    'Consultorias ocasionais', 'Mão de obra eventual', 'Mão de obra familiar', 'Outras',
  ],
  alimentacao: [
    'Ração conc. p/ vacas', 'Ração p/ bez./nov./VS', 'Milho fubá', 'Milho grão',
    'Farelo de soja', 'Farelo de trigo', 'Farelo de algodão', 'Silagem',
    'Caroço de algodão', 'Sal comum', 'Sal mineral', 'Feno',
    'Capineira (adub./calag.)', 'Pastagens (adub./calag.)', 'Canavial (adub./calag.)',
    'Leite em pó', 'Aditivos', 'Premix/núcleos', 'Outras',
  ],
  sanidade: [
    'Água oxigenada', 'Agulhas', 'Anti-parasitários', 'Anestésicos', 'Antibióticos',
    'Anti-inflamatórios', 'Antimastísticos', 'Antitérmicos', 'Complemento vitamínico',
    'Cálcio e fósforo', 'Drench', 'Exame brucelose', 'Exame tuberculose', 'Formol',
    'Hormônios', 'Iodo', 'Mata-bicheiras', 'Seringas', 'Sulfato de cobre',
    'Tintura de iodo', 'Vacina aftosa', 'Vacina brucelose', 'Vacina carbúnculo',
    'Vacina diarréia viral', 'Vacina leptospirose', 'Vacina paratifo',
    'Vacina raiva', 'Vacina rinotraqueíte infl.', 'Homeopáticos', 'Outras',
  ],
  inseminacao: [
    'Bainha', 'Luvas', 'Nitrogênio', 'Pipeta', 'Sêmen', 'Toalhas de papel', 'Outros',
  ],
  ordenha: [
    'Camisa de filtro', 'Detergente ácido', 'Detergente alcalino', 'Escovas',
    'Hipoclorito de sódio', 'Óleo para bomba à vácuo', 'Peças de reposição',
    'Pós-dipping', 'Pré-dipping', 'Reagente CMT', 'Sabão em pó',
    'Materiais e equipamentos', 'Glicerina', 'Cloro', 'Papel toalha', 'Outras',
  ],
  impostos_fixos: ['ITR', 'IPVA', 'Licença de veículo', 'Seguro obrigatório', 'Outros'],
  combustivel_energia: [
    'Combustível p/ máquinas', 'Combustível p/ veículos', 'Telefone', 'Energia elétrica', 'Outros',
  ],
  diversas: [
    'Brincos (p/ identificação)', 'Contribuição rural', 'Encargos financeiros (juros)',
    'Frete', 'Horas de trator (aluguel)', 'Impostos (Pis, Cofins)', 'Lubrificantes',
    'Materiais para limpeza', 'Material para escritório', 'Reparo de benfeitorias',
    'Reparo de equipamentos', 'Reparo de máquinas', 'Reparo e manut. Veículos',
    'Taxas', 'Transporte de leite', 'Lonas', 'Financiamentos', 'Outras',
  ],
  queijos: [
    'Coalho', 'Rótulos e embalagens', 'Sal comum', 'Análises de água e queijo',
    'Formas e panos', 'Cloro', 'Outras',
  ],
  aluguel_pasto: ['Aluguel de pasto', 'Outros'],
};
