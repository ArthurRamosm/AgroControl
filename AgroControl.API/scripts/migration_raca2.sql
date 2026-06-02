-- Adicionar campo raca2 à tabela ANIMAL
-- Rodar no SSMS contra o banco AgroControl

USE AgroControl;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('ANIMAL') AND name = 'raca2'
)
BEGIN
    ALTER TABLE ANIMAL ADD raca2 VARCHAR(50) NULL;
    PRINT 'Campo raca2 adicionado com sucesso.';
END
ELSE
BEGIN
    PRINT 'Campo raca2 já existe — nenhuma alteração feita.';
END
GO
