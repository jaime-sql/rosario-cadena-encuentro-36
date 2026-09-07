# Assemble original logos from staged base64 chunks

Do **not** redesign. Decode only with `base64 -d`.

## Encuentros (expect 39736 chars text; md5 `6eefe00f14b5d8cacffa2405be2e5628`)

```bash
cat _restore/encuentros.b64 _restore/encuentros.b64.p1 _restore/encuentros.b64.p2 | tr -d '\n' > /tmp/encuentros.b64
wc -c /tmp/encuentros.b64
# expect 39736
base64 -d /tmp/encuentros.b64 > public/logos/encuentros-conyugales.jpg
```

## Unidad / Liturgia (expect 42496 chars text; md5 `3e9cca38ff677624f6c65fa6aece4694`)

```bash
cat _restore/unidad.b64.c{0..8} | tr -d '\n' > /tmp/unidad.b64
wc -c /tmp/unidad.b64
# expect 42496
base64 -d /tmp/unidad.b64 > public/logos/unidad-liturgia-oracion.jpg
```

## Verify JPGs before commit

```bash
wc -c public/logos/encuentros-conyugales.jpg public/logos/unidad-liturgia-oracion.jpg
md5sum public/logos/encuentros-conyugales.jpg public/logos/unidad-liturgia-oracion.jpg
# MUST be:
# 29802  3028f3aab1b4c4cb4de11d2172210fb6  encuentros-conyugales.jpg
# 31870  a3c98398803da9f109a8117cde5fea86  unidad-liturgia-oracion.jpg
```

If mismatch: STOP — do not commit.

Then: `git rm -r _restore` and commit the two JPGs.
