-- Nummeriert kantonale Routen (ref K<n>) pro Kanton neu durch und
-- setzt das Kantonskürzel in den Namen: "K1 BE Name von - bis"
WITH abbr(c, a) AS (VALUES
  ('Zürich','ZH'),('Bern','BE'),('Luzern','LU'),('Uri','UR'),
  ('Schwyz','SZ'),('Obwalden','OW'),('Nidwalden','NW'),('Glarus','GL'),
  ('Zug','ZG'),('Freiburg','FR'),('Solothurn','SO'),('Basel-Stadt','BS'),
  ('Basel-Landschaft','BL'),('Schaffhausen','SH'),
  ('Appenzell Ausserrhoden','AR'),('Appenzell Innerrhoden','AI'),
  ('St. Gallen','SG'),('Graubünden','GR'),('Aargau','AG'),
  ('Thurgau','TG'),('Tessin','TI'),('Waadt','VD'),('Wallis','VS'),
  ('Neuenburg','NE'),('Genf','GE'),('Jura','JU')
),
k AS (
  SELECT id, canton,
    regexp_replace(name, '^K[0-9]+ (ZH |BE |LU |UR |SZ |OW |NW |GL |ZG |FR |SO |BS |BL |SH |AR |AI |SG |GR |AG |TG |TI |VD |VS |NE |GE |JU )?', '') AS basename,
    row_number() OVER (
      PARTITION BY canton
      ORDER BY (substring(ref from 2))::int
    ) AS rn
  FROM external_routes
  WHERE ref ~ '^K[0-9]+$'
)
UPDATE external_routes e
SET ref  = 'K' || k.rn,
    name = 'K' || k.rn || ' ' || abbr.a || ' ' || k.basename
FROM k
JOIN abbr ON abbr.c = k.canton
WHERE e.id = k.id;
