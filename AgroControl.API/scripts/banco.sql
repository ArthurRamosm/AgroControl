-- ============================================================
--  AgroControl — Script de criação do banco de dados
--  Execute no SQL Server Management Studio ou Azure Data Studio
-- ============================================================

-- Cria o banco (se ainda não existir)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'AgroControl')
    CREATE DATABASE AgroControl;
GO

USE AgroControl;
GO

-- Tabela PROPRIEDADE
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PROPRIEDADE')
CREATE TABLE PROPRIEDADE (
    id   INT IDENTITY(1,1) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL
);
GO

-- Tabela USUARIO
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

-- Tabela ANIMAL
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
    propriedade_id INT          NOT NULL,
    CONSTRAINT FK_ANIMAL_PROPRIEDADE FOREIGN KEY (propriedade_id)
        REFERENCES PROPRIEDADE(id)
);
GO

-- ============================================================
--  Dados de teste
-- ============================================================

-- Inserir propriedade (se não existir)
IF NOT EXISTS (SELECT 1 FROM PROPRIEDADE WHERE nome = 'Fazenda São Geraldo')
    INSERT INTO PROPRIEDADE (nome) VALUES ('Fazenda São Geraldo');
GO

-- Inserir usuário admin (se não existir)
IF NOT EXISTS (SELECT 1 FROM USUARIO WHERE usuario = 'admin')
    INSERT INTO USUARIO (usuario, senha, propriedade_id)
    VALUES ('admin', '1234', 1);
GO

-- ============================================================
--  Verificar dados inseridos
-- ============================================================
SELECT * FROM PROPRIEDADE;
SELECT * FROM USUARIO;


