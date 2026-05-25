-- Migración: agregar horario laboral a employees
-- Ejecutar en Railway PostgreSQL

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS hora_entrada TIME DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS hora_salida  TIME DEFAULT '17:00';
