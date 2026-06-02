-- Criar tabela ESTOQUE_MEDICAMENTO
-- Rodar no SSMS contra o banco AgroControl

USE AgroControl;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ESTOQUE_MEDICAMENTO')
BEGIN
    CREATE TABLE ESTOQUE_MEDICAMENTO (
        id                  INT             IDENTITY(1,1) PRIMARY KEY,
        propriedade_id      INT             NOT NULL,
        nome                VARCHAR(100)    NOT NULL,
        tipo                VARCHAR(20)     NOT NULL,   -- 'Vacina', 'Vermifugo', 'Antibiotico', 'Outro'
        unidade             VARCHAR(20)     NOT NULL,   -- 'doses', 'frascos', 'ml', 'comprimidos'
        quantidade_atual    DECIMAL(10,2)   NOT NULL DEFAULT 0,
        quantidade_minima   DECIMAL(10,2)   NULL DEFAULT 0,
        valor_unitario      DECIMAL(10,2)   NULL,
        observacao          VARCHAR(255)    NULL,
        created_at          DATETIME        NOT NULL DEFAULT GETDATE(),
        updated_at          DATETIME        NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_ESTOQUE_PROPRIEDADE FOREIGN KEY (propriedade_id)
            REFERENCES PROPRIEDADE(id)
    );
    PRINT 'Tabela ESTOQUE_MEDICAMENTO criada com sucesso.';
END
ELSE
BEGIN
    PRINT 'Tabela ESTOQUE_MEDICAMENTO ja existe — nenhuma alteracao feita.';
END
GO
