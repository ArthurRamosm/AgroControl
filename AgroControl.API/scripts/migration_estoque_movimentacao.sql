-- Criar tabela ESTOQUE_MOVIMENTACAO
-- Rodar no SSMS contra o banco AgroControl APÓS rodar migration_estoque_medicamento.sql

USE AgroControl;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ESTOQUE_MOVIMENTACAO')
BEGIN
    CREATE TABLE ESTOQUE_MOVIMENTACAO (
        id                  INT             IDENTITY(1,1) PRIMARY KEY,
        estoque_id          INT             NOT NULL,
        tipo_movimentacao   VARCHAR(10)     NOT NULL,   -- 'entrada' ou 'saida'
        quantidade          DECIMAL(10,2)   NOT NULL,
        motivo              VARCHAR(100)    NULL,       -- 'Compra', 'Aplicacao', 'Vencimento', 'Ajuste'
        animal_id           INT             NULL,
        data_movimentacao   DATE            NOT NULL,
        observacao          VARCHAR(255)    NULL,
        created_at          DATETIME        NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_MOVIMENTACAO_ESTOQUE FOREIGN KEY (estoque_id)
            REFERENCES ESTOQUE_MEDICAMENTO(id) ON DELETE CASCADE,
        CONSTRAINT FK_MOVIMENTACAO_ANIMAL FOREIGN KEY (animal_id)
            REFERENCES ANIMAL(id) ON DELETE SET NULL
    );
    PRINT 'Tabela ESTOQUE_MOVIMENTACAO criada com sucesso.';
END
ELSE
BEGIN
    PRINT 'Tabela ESTOQUE_MOVIMENTACAO ja existe — nenhuma alteracao feita.';
END
GO
