-- Migración 045: Corregir capitalización incorrecta después de caracteres con tilde
-- Problema: teclados móviles capitalizan la letra siguiente a á/é/í/ó/ú
-- Ejemplo: "IváN" → "Iván", "MaríA" → "María"

CREATE OR REPLACE FUNCTION fix_accent_caps(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
  result    TEXT    := input_text;
  i         INTEGER;
  cur_char  TEXT;
  prev_char TEXT;
  accented  TEXT    := 'áéíóúàèìòùâêîôûäëïöüñÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÑ';
BEGIN
  IF result IS NULL THEN RETURN NULL; END IF;
  FOR i IN 2..length(result) LOOP
    cur_char  := substr(result, i, 1);
    prev_char := substr(result, i - 1, 1);
    -- Si el carácter anterior es tildado Y el actual es mayúscula → bajar a minúscula
    IF strpos(accented, prev_char) > 0
       AND cur_char = upper(cur_char)
       AND cur_char != lower(cur_char)
    THEN
      result := substr(result, 1, i - 1) || lower(cur_char) || substr(result, i + 1);
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a customers.name
UPDATE customers
SET name = fix_accent_caps(name)
WHERE name ~ '[áéíóúàèìòùâêîôûäëïöüñÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÑ][A-Z]';

-- Aplicar a users.name
UPDATE users
SET name = fix_accent_caps(name)
WHERE name ~ '[áéíóúàèìòùâêîôûäëïöüñÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÑ][A-Z]';

-- Eliminar función temporal (ya no es necesaria)
DROP FUNCTION IF EXISTS fix_accent_caps(TEXT);
