#!/usr/bin/env bash
set -euo pipefail

echo "Running expo prebuild for iOS (clean)..."
npx expo prebuild --platform ios --clean

PODFILE=ios/Podfile

if [ ! -f "$PODFILE" ]; then
  echo "Podfile not found at $PODFILE"
  exit 1
fi

if grep -q "use_modular_headers!" "$PODFILE"; then
  echo "use_modular_headers! already present in $PODFILE"
else
  echo "Inserting use_modular_headers! into $PODFILE"
  # Insert after the platform line
  awk 'BEGIN{added=0} /^platform[[:space:]]+:ios/ && !added {print; print ""; print "# Added by ios_prebuild.sh to enable modular headers for Firebase pods"; print "use_modular_headers!"; added=1; next} {print}' "$PODFILE" > "$PODFILE.tmp" && mv "$PODFILE.tmp" "$PODFILE"
fi

echo "Installing CocoaPods..."
cd ios
pod install
cd -

echo "iOS prebuild finished."
