#!/usr/bin/env bash
set -euo pipefail
# Este roteiro só opera em um emulador limpo.
[[ "$(adb shell getprop ro.kernel.qemu | tr -d '\r')" = 1 ]]
app=com.redacaolab.personal
if adb shell pm path "$app" | grep -q package:; then exit 1; fi
adb install android/app/build/outputs/apk/debug/app-debug.apk
adb install android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb shell cmd connectivity airplane-mode enable
[[ "$(adb shell settings get global airplane_mode_on | tr -d '\r')" = 1 ]]
for method in storesSelectionOffline restoresSelectionOffline; do
  adb shell am force-stop "$app"
  result=$(adb shell am instrument -w -e scratch yes -e class "$app.OfflineReaderTest#$method" "$app.test/androidx.test.runner.AndroidJUnitRunner")
  echo "$result"
  grep -Fq 'OK (1 test)' <<< "$result"
done
