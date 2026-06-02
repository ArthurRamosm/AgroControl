-- Adicionar campo foco_produtivo à tabela PROPRIEDADE
-- Rodar no SSMS contra o banco AgroControl

USE AgroControl;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('PROPRIEDADE') AND name = 'foco_produtivo'
)
BEGIN
    ALTER TABLE PROPRIEDADE
    ADD foco_produtivo VARCHAR(20) NOT NULL
        CONSTRAINT DF_PROPRIEDADE_FOCO_PRODUTIVO DEFAULT 'ambos',
        CONSTRAINT CK_PROPRIEDADE_FOCO_PRODUTIVO CHECK (foco_produtivo IN ('leite', 'corte', 'ambos'));
    PRINT 'Campo foco_produtivo adicionado com sucesso.';
END
ELSE
BEGIN
    PRINT 'Campo foco_produtivo já existe — nenhuma alteração feita.';
END
GO
