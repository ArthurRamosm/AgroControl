-- ============================================================
--  AgroControl — Modelagem do Banco de Dados (ERD)
--  Tabelas: USUARIO, ANIMAL, ANIMAL_IMAGEM,
--           PESAGEM, VACINACAO, REPRODUCAO, BAIXA
-- ============================================================

CREATE TABLE USUARIO (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario     VARCHAR(50)  NOT NULL UNIQUE,
    senha       VARCHAR(255) NOT NULL,
    propriedade VARCHAR(100) NOT NULL
);

CREATE TABLE ANIMAL (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    brinco       VARCHAR(20)  NOT NULL UNIQUE,
    nome         VARCHAR(100),
    raca         VARCHAR(50)  NOT NULL,
    sexo         CHAR(1)      NOT NULL CHECK (sexo IN ('M','F')),
    tipo         VARCHAR(50)  NOT NULL,
    status_leite VARCHAR(30)  NOT NULL DEFAULT 'N/A',
    ativo        BOOLEAN      NOT NULL DEFAULT TRUE,
    usuarioId    INTEGER      NOT NULL,
    FOREIGN KEY (usuarioId) REFERENCES USUARIO(id)
);

CREATE TABLE ANIMAL_IMAGEM (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    animalId  INTEGER      NOT NULL,
    url       VARCHAR(255) NOT NULL,
    descricao VARCHAR(100),
    FOREIGN KEY (animalId) REFERENCES ANIMAL(id)
);

CREATE TABLE PESAGEM (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    animalId INTEGER NOT NULL,
    peso     DECIMAL(8,2) NOT NULL,
    data     DATE         NOT NULL,
    FOREIGN KEY (animalId) REFERENCES ANIMAL(id)
);

CREATE TABLE VACINACAO (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    animalId    INTEGER      NOT NULL,
    vacina      VARCHAR(100) NOT NULL,
    data        DATE         NOT NULL,
    proxima_dose DATE,
    status      VARCHAR(20)  NOT NULL DEFAULT 'em_dia'
                             CHECK (status IN ('em_dia','pendente','atrasado')),
    FOREIGN KEY (animalId) REFERENCES ANIMAL(id)
);

CREATE TABLE REPRODUCAO (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    animalId  INTEGER      NOT NULL,
    tipo      VARCHAR(50)  NOT NULL,   -- Inseminação, Cobertura
    data      DATE         NOT NULL,
    resultado VARCHAR(50),             -- Prenha, Aguardando, Negativo
    FOREIGN KEY (animalId) REFERENCES ANIMAL(id)
);

CREATE TABLE BAIXA (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    animalId    INTEGER      NOT NULL,
    motivo      VARCHAR(100) NOT NULL,  -- Venda, Óbito, Descarte
    data        DATE         NOT NULL,
    observacao  TEXT,
    FOREIGN KEY (animalId) REFERENCES ANIMAL(id)
);

-- ============================================================
--  Dados iniciais
-- ============================================================

INSERT INTO USUARIO (usuario, senha, propriedade) VALUES
    ('admin', '1234', 'Fazenda São João'),
    ('joao',  'abcd', 'Sítio Boa Vista');

INSERT INTO ANIMAL (brinco, nome, raca, sexo, tipo, status_leite, ativo, usuarioId) VALUES
    ('BR-001', 'Mimosa',    'Holandesa', 'F', 'Vaca',    'Produzindo', TRUE,  1),
    ('BR-002', 'Pintada',   'Girolando', 'F', 'Vaca',    'Seca',       TRUE,  1),
    ('BR-003', 'Touro Rex', 'Nelore',    'M', 'Touro',   'N/A',        TRUE,  1),
    ('BR-004', 'Estrela',   'Jersey',    'F', 'Vaca',    'Produzindo', TRUE,  1),
    ('BR-005', 'Belinha',   'Holandesa', 'F', 'Novilha', 'Seca',       FALSE, 1);
