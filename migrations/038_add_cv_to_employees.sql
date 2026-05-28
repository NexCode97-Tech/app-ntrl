-- Agrega campo de hoja de vida (CV) a empleados
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS cv_url TEXT DEFAULT NULL;

COMMENT ON COLUMN employees.cv_url IS 'URL del archivo de hoja de vida subido a Cloudinary';
