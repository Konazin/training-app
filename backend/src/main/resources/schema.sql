-- Migração incremental V2: torna fichas antigas compatíveis com o domínio semanal.
-- As demais tabelas novas são criadas pelo Hibernate; estas colunas precisam existir
-- antes da validação/atualização porque a base H2 já contém registros.
ALTER TABLE IF EXISTS training_plans
    ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE IF EXISTS training_plans
    ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE IF EXISTS training_plans
    ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE IF EXISTS training_plans
    ADD COLUMN IF NOT EXISTS end_date DATE;
