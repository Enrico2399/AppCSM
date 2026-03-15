#!/bin/bash

echo "📊 Monitoring CSM App Health..."

# Check build time
BUILD_START=$(date +%s)
npm run build > /dev/null 2>&1
BUILD_END=$(date +%s)
BUILD_TIME=$((BUILD_END - BUILD_START))

# Check bundle size
BUNDLE_SIZE=$(du -k www | cut -f1)

# Log metrics
echo "$(date),${BUILD_TIME},${BUNDLE_SIZE}" >> health_metrics.csv

# Alert if thresholds exceeded
if [ $BUILD_TIME -gt 120 ]; then
    echo "🚨 Build time exceeded threshold: ${BUILD_TIME}s"
fi

if [ $BUNDLE_SIZE -gt 500 ]; then
    echo "🚨 Bundle size exceeded threshold: ${BUNDLE_SIZE}KB"
fi

echo "✅ Health monitoring complete!"
echo "📈 Build time: ${BUILD_TIME}s"
echo "📦 Bundle size: ${BUNDLE_SIZE}KB"
