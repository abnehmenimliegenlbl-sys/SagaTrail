#!/usr/bin/env node
/**
 * EAS post-install hook: strips savedArchiveVersion from Pods.xcodeproj.
 *
 * Why this exists:
 * CocoaPods writes savedArchiveVersion into XCRemoteSwiftPackageReference
 * objects. Xcode 16/26 removed the _setSavedArchiveVersion: selector, so
 * loading Pods.xcodeproj crashes with an unrecognized-selector exception.
 * The Podfile post_install approach is unreliable because CocoaPods may
 * save the project again after all hooks finish (post_integrate phase).
 * This script runs AFTER the entire pod install process, immediately before
 * xcodebuild starts — nothing can undo it.
 */

const fs = require('fs');
const path = require('path');

const pbxproj = path.join(__dirname, '..', 'ios', 'Pods', 'Pods.xcodeproj', 'project.pbxproj');

if (!fs.existsSync(pbxproj)) {
  console.log('[eas-post-install] Pods.xcodeproj not found — skipping savedArchiveVersion patch');
  process.exit(0);
}

const original = fs.readFileSync(pbxproj, 'utf8');
const patched = original.replace(/[^\n]*savedArchiveVersion[^\n]*\n/g, '');

if (patched === original) {
  console.log('[eas-post-install] savedArchiveVersion not present in Pods.xcodeproj — nothing to do');
} else {
  fs.writeFileSync(pbxproj, patched, 'utf8');
  const removed = (original.match(/savedArchiveVersion/g) || []).length;
  console.log(`[eas-post-install] Stripped ${removed} savedArchiveVersion occurrence(s) from Pods.xcodeproj`);
}
