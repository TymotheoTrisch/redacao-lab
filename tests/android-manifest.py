"""Confere o manifesto efetivo após a mesclagem das bibliotecas Android."""
from pathlib import Path
import sys
from xml.etree import ElementTree

android = "{http://schemas.android.com/apk/res/android}"
manifest = ElementTree.parse(Path(sys.argv[1])).getroot()
app = manifest.find("application")
assert manifest.get("package") == "com.redacaolab.personal"
assert app is not None and app.get(android + "allowBackup") == "false"
assert app.get(android + "usesCleartextTraffic") == "false"
exported = {entry.get(android + "name") for entry in app if entry.get(android + "exported") == "true"}
assert exported == {"com.redacaolab.personal.MainActivity"}, exported
permissions = {p.get(android + "name") for p in manifest.findall("uses-permission")}
assert permissions <= {"com.redacaolab.personal.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION"}, permissions
print("Manifesto verificado.")
