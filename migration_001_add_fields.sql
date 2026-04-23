-- ============================================================
--  AgroControl — Migração 001
--  Adiciona campos: Propriedade (cidade, estado), Usuario (nome)
--
--  Execute no SQL Server Management Studio ou via sqlcmd:
--    sqlcmd -S "(localdb)\MSSQLLocalDB" -d AgroControl -i migration_001_add_fields.sql
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('PROPRIEDADE') AND name = 'cidade')
    ALTER TABLE PROPRIEDADE ADD cidade VARCHAR(100) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('PROPRIEDADE') AND name = 'estado')
    ALTER TABLE PROPRIEDADE ADD estado CHAR(2) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('USUARIO') AND name = 'nome')
    ALTER TABLE USUARIO ADD nome VARCHAR(100) NULL;

PRINT 'Migração 001 aplicada com sucesso!';
