-- Adicionar campo proxima_aplicacao à tabela ANIMAL_VACINA
-- Rodar no SSMS contra o banco AgroControl

USE AgroControl;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('ANIMAL_VACINA') AND name = 'proxima_aplicacao'
)
BEGIN
    ALTER TABLE ANIMAL_VACINA
    ADD proxima_aplicacao DATETIME NULL;
    PRINT 'Campo proxima_aplicacao adicionado com sucesso.';
END
ELSE
BEGIN
    PRINT 'Campo proxima_aplicacao já existe — nenhuma alteração feita.';
END
GO
