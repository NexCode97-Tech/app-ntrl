-- Corrige el bug del teclado móvil que deja minúsculas entre puntos en abreviaciones
-- Patrón: letra mayúscula o minúscula + punto + letra minúscula + punto
-- Ej: "S.a.S" → "S.A.S", "Simacol S.a.S" → "Simacol S.A.S"

CREATE OR REPLACE FUNCTION fix_period_abbrev(input TEXT)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  result TEXT := input;
  i      INT;
  c      TEXT;
  prev   TEXT;
  prev2  TEXT;
BEGIN
  IF input IS NULL THEN RETURN NULL; END IF;
  FOR i IN 2..LENGTH(result) - 1 LOOP
    c     := SUBSTRING(result, i, 1);
    prev  := SUBSTRING(result, i - 1, 1);
    prev2 := SUBSTRING(result, i + 1, 1);
    -- Si el caracter anterior es punto, el actual es letra minúscula
    -- y el siguiente también es punto → es una abreviación mal puesta
    IF prev = '.' AND c ~ '[a-záéíóúüñ]' AND prev2 = '.' THEN
      result := SUBSTRING(result, 1, i - 1) || UPPER(c) || SUBSTRING(result, i + 1);
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

UPDATE customers SET name = fix_period_abbrev(name)
WHERE name ~ '\.[a-záéíóúüñ]\.';

UPDATE users SET name = fix_period_abbrev(name)
WHERE name ~ '\.[a-záéíóúüñ]\.';

DROP FUNCTION fix_period_abbrev;
