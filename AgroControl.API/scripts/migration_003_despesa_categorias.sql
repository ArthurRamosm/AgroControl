USE AgroControl;
GO

-- Drop constraint existente se houver
IF EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = 'CK_DESPESA_CATEGORIA'
      AND parent_object_id = OBJECT_ID('DESPESA')
)
    ALTER TABLE DESPESA DROP CONSTRAINT CK_DESPESA_CATEGORIA;
GO

-- Nova constraint com categorias expandidas
ALTER TABLE DESPESA ADD CONSTRAINT CK_DESPESA_CATEGORIA
CHECK (categoria IN (
    'Racao', 'Medicamentos', 'SalMineral', 'Combustivel',
    'Funcionarios', 'Manutencao', 'Reproducao', 'Energia',
    'Reformas', 'CompraAnimais', 'InsumosGerais', 'Outros'
));
GO

-- Adicionar coluna animal_id para rastrear custo por animal
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('DESPESA') AND name = 'animal_id'
)
BEGIN
    ALTER TABLE DESPESA ADD animal_id INT NULL;
    ALTER TABLE DESPESA ADD CONSTRAINT FK_DESPESA_ANIMAL
        FOREIGN KEY (animal_id) REFERENCES ANIMAL(id);
    PRINT 'Coluna animal_id adicionada com sucesso.';
END
ELSE
    PRINT 'Coluna animal_id ja existe.';
GO

PRINT 'Migration 003 — categorias de despesa — concluida.';
GO
