
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'AgroControl')
    CREATE DATABASE AgroControl;
GO

USE AgroControl;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PROPRIEDADE')
CREATE TABLE PROPRIEDADE (
    id   INT IDENTITY(1,1) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'USUARIO')
CREATE TABLE USUARIO (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    usuario        VARCHAR(50)  NOT NULL UNIQUE,
    senha          VARCHAR(255) NOT NULL,
    propriedade_id INT          NOT NULL,
    CONSTRAINT FK_USUARIO_PROPRIEDADE FOREIGN KEY (propriedade_id)
        REFERENCES PROPRIEDADE(id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ANIMAL')
CREATE TABLE ANIMAL (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    brinco         VARCHAR(20)  NOT NULL UNIQUE,
    nome           VARCHAR(100),
    raca           VARCHAR(50)  NOT NULL,
    sexo           CHAR(1)      NOT NULL CHECK (sexo IN ('M','F')),
    tipo           VARCHAR(50)  NOT NULL,
    status_leite   VARCHAR(30)  NOT NULL DEFAULT 'N/A',
    ativo          BIT          NOT NULL DEFAULT 1,
    numero_animal  VARCHAR(30)  NULL,
    data_nascimento DATE        NULL,
    nome_pai       VARCHAR(100) NULL,
    raca_pai       VARCHAR(50)  NULL,
    nome_mae       VARCHAR(100) NULL,
    raca_mae       VARCHAR(50)  NULL,
    procedencia    VARCHAR(120) NULL,
    data_entrada   DATE         NULL,
    data_saida     DATE         NULL,
    valor          DECIMAL(10,2) NULL,
    motivo_saida   VARCHAR(120) NULL,
    marca_sinal    VARCHAR(120) NULL,
    observacao     VARCHAR(500) NULL,
    propriedade_id INT          NOT NULL,
    CONSTRAINT FK_ANIMAL_PROPRIEDADE FOREIGN KEY (propriedade_id)
        REFERENCES PROPRIEDADE(id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ANIMAL_FOTO')
CREATE TABLE ANIMAL_FOTO (
    id          INT           IDENTITY(1,1) PRIMARY KEY,
    animal_id   INT           NOT NULL,
    foto_base64 NVARCHAR(MAX) NOT NULL,
    ordem       INT           NOT NULL,
    created_at  DATETIME      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_ANIMAL_FOTO_ANIMAL FOREIGN KEY (animal_id)
        REFERENCES ANIMAL(id) ON DELETE CASCADE,
    CONSTRAINT CK_ANIMAL_FOTO_ORDEM CHECK (ordem BETWEEN 1 AND 3),
    CONSTRAINT UQ_ANIMAL_FOTO_ANIMAL_ORDEM UNIQUE (animal_id, ordem)
);
GO


IF NOT EXISTS (SELECT 1 FROM PROPRIEDADE WHERE nome = 'Fazenda São Geraldo')
    INSERT INTO PROPRIEDADE (nome) VALUES ('Fazenda São Geraldo');
GO


IF NOT EXISTS (SELECT 1 FROM USUARIO WHERE usuario = 'admin')
    INSERT INTO USUARIO (usuario, senha, propriedade_id)
    VALUES ('admin', '1234', 1);
GO


SELECT * FROM PROPRIEDADE;
SELECT * FROM USUARIO;
