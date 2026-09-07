# Assemble full base64 payloads

`encuentros.b64` on this branch currently holds bytes `[0:15000]` of the original 39736-char payload.

```bash
cd _restore
cp encuentros.b64 encuentros.b64.p0
cat encuentros.b64.p0 encuentros.b64.p1 encuentros.b64.p2 > encuentros.b64
# then push unidad parts similarly once present
wc -c encuentros.b64   # expect 39736
```

Expected md5 of full encuentros.b64 text: `6eefe00f14b5d8cacffa2405be2e5628`
