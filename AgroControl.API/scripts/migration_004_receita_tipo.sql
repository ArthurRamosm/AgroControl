USE AgroControl;
GO

-- Adicionar coluna tipo se nao existir
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('RECEITA') AND name = 'tipo'
)
BEGIN
    ALTER TABLE RECEITA ADD tipo VARCHAR(50) NOT NULL CONSTRAINT DF_RECEITA_TIPO DEFAULT 'Outros';
    PRINT 'Coluna tipo adicionada com sucesso.';
END
ELSE
    PRINT 'Coluna tipo ja existe.';
GO

-- Drop constraint existente se houver
IF EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = 'CK_RECEITA_TIPO'
      AND parent_object_id = OBJECT_ID('RECEITA')
)
    ALTER TABLE RECEITA DROP CONSTRAINT CK_RECEITA_TIPO;
GO

-- Nova constraint de tipos
ALTER TABLE RECEITA ADD CONSTRAINT CK_RECEITA_TIPO
CHECK (tipo IN ('VendaAnimais', 'Leite', 'Queijo', 'Outros'));
GO

PRINT 'Migration 004 — tipo de receita — concluida.';
GO
