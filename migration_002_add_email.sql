-- ============================================================
--  AgroControl — Migração 002
--  Adiciona campo email na tabela USUARIO
--
--  Execute no SQL Server Management Studio ou via sqlcmd:
--    sqlcmd -S "(localdb)\MSSQLLocalDB" -d AgroControl -i migration_002_add_email.sql
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('USUARIO') AND name = 'email')
    ALTER TABLE USUARIO ADD email VARCHAR(150) NULL;

PRINT 'Migração 002 aplicada com sucesso!';
