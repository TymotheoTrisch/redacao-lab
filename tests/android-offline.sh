#!/usr/bin/env bash
set -euo pipefail
# Este roteiro só opera em um emulador limpo.
[[ "$(adb shell getprop ro.kernel.qemu | tr -d '\r')" = 1 ]]
app=com.redacaolab.personal
if adb shell pm path "$app" | grep -q package:; then exit 1; fi
adb shell cmd connectivity airplane-mode enable
[[ "$(adb shell settings get global airplane_mode_on | tr -d '\r')" = 1 ]]
run_test() {
  local method="$1" result
  adb shell am force-stop "$app"
  result=$(adb shell am instrument -w -e scratch yes -e class "$app.OfflineReaderTest#$method" "$app.test/androidx.test.runner.AndroidJUnitRunner")
  echo "$result"
  grep -Fq 'OK (1 test)' <<< "$result"
}
apk=android/app/build/outputs/apk/debug/app-debug.apk
instrumentation=android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb install "$apk"
adb install "$instrumentation"
run_test storesSelectionOffline
run_test restoresSelectionOffline
# Dados sintéticos em instalação criada acima, exclusivamente no emulador descartável.
adb uninstall "$app.test"
adb uninstall "$app"
adb install ".baseline/$apk"
adb install ".baseline/$instrumentation"
run_test storesSelectionOffline
adb install -r "$apk"
adb install -r "$instrumentation"
run_test retainsPreviousVersion
