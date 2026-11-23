"""Verifica a configuração distribuída no APK debug ou release."""
import json
import sys
from zipfile import ZipFile

with ZipFile(sys.argv[1]) as apk:
    config = json.loads(apk.read("assets/capacitor.config.json"))
    logging = config.get("android", {}).get("loggingBehavior", config.get("loggingBehavior", "debug"))
    assert logging == "none", "A ponte nativa pode registrar valores enviados ao SQLite."
    assert not config.get("server", {}).get("url"), "O APK precisa abrir o bundle embarcado."
    assert config.get("webDir", "dist") == "dist", "A distribuição pública exige os assets do perfil público."
    for name in apk.namelist():
        if name.startswith("assets/public/") and name.endswith((".json", ".js")):
            assert b"pr-mod-15-mensagem-" not in apk.read(name), "Referências pessoais presentes no APK público."
print("Configuração de privacidade do APK verificada.")
