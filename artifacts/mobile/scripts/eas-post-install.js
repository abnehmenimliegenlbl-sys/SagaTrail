#!/usr/bin/env node
/**
 * EAS post-install hook: verifies Pods.xcodeproj integrity after pod install.
 *
 * Root cause of the Xcode 26 build failures (builds 1-5):
 * React Native's SPMManager (used by Clerk's spm_dependency) injects
 * XCRemoteSwiftPackageReference / XCSwiftPackageProductDependency objects
 * into Pods.xcodeproj during post_install via `project.new(klass)`. The UUID
 * allocator can hand out a UUID already owned by the PBXProject root object;
 * the SPM object then OVERWRITES the PBXProject block on save. Xcode 26 fails
 * to load the file (`-[XCRemoteSwiftPackageReference _setSavedArchiveVersion:]
 * unrecognized selector` → "The project 'Pods' is damaged") and no pod target
 * ever builds ("module map file not found" / "no such module 'Expo'").
 *
 * The fix lives in the Podfile (UUID collision guard injected by
 * plugins/withPodfileXcode26Fix.js). This script is the final safety net:
 * it verifies on disk that the rootObject UUID still points to a PBXProject
 * block, and fails the build EARLY with a clear message if not.
 */

const fs = require('fs');
const path = require('path');

const pbxproj = path.join(__dirname, '..', 'ios', 'Pods', 'Pods.xcodeproj', 'project.pbxproj');
const nativeAppProject = path.join(__dirname, '..', 'ios', 'SagaTrail.xcodeproj', 'project.pbxproj');

if (!fs.existsSync(pbxproj)) {
  console.log('[eas-post-install] Pods.xcodeproj not found — skipping integrity check');
  process.exit(0);
}

let content = fs.readFileSync(pbxproj, 'utf8');

// Legacy safety net: strip savedArchiveVersion lines if any ever appear.
const stripped = content.replace(/[^\n]*savedArchiveVersion[^\n]*\n/g, '');
if (stripped !== content) {
  const removed = (content.match(/savedArchiveVersion/g) || []).length;
  fs.writeFileSync(pbxproj, stripped, 'utf8');
  content = stripped;
  console.log(`[eas-post-install] Stripped ${removed} savedArchiveVersion occurrence(s)`);
}

// Diagnostics: how many SPM package references does the pods project contain?
const spmRefs = (content.match(/isa = XCRemoteSwiftPackageReference;/g) || []).length;
const spmDeps = (content.match(/isa = XCSwiftPackageProductDependency;/g) || []).length;
console.log(`[eas-post-install] SPM objects: ${spmRefs} XCRemoteSwiftPackageReference, ${spmDeps} XCSwiftPackageProductDependency`);

// Integrity check: rootObject must resolve to a PBXProject block.
// NOTE: CocoaPods generates short deterministic UUIDs for Pods.xcodeproj
// (e.g. 46EB2E00000000, 14 hex chars) — do NOT require Xcode's usual 24.
const rootMatch = content.match(/rootObject = ([0-9A-F]{8,32})/);
if (!rootMatch) {
  console.error('[eas-post-install] FATAL: could not find rootObject UUID in Pods.xcodeproj — file is malformed');
  process.exit(1);
}
const rootUuid = rootMatch[1];
const blockRe = new RegExp(rootUuid + '(?: \\/\\* [^*]* \\*\\/)? = \\{[\\s\\S]{0,120}?isa = (\\w+);');
const blockMatch = content.match(blockRe);

if (!blockMatch) {
  console.error(`[eas-post-install] FATAL: rootObject ${rootUuid} has no object block in Pods.xcodeproj — PBXProject was destroyed (UUID collision). Failing early.`);
  process.exit(1);
}
if (blockMatch[1] !== 'PBXProject') {
  console.error(`[eas-post-install] FATAL: rootObject ${rootUuid} is a ${blockMatch[1]}, not PBXProject — Pods.xcodeproj corrupted by SPM UUID collision. Failing early instead of a doomed xcodebuild run.`);
  process.exit(1);
}

console.log(`[eas-post-install] OK: Pods.xcodeproj intact — rootObject ${rootUuid} is PBXProject`);

// Keep the embedded Watch target on the same build/version pair as the iPhone
// target. EAS remote versioning updates the main target, but Xcode does not
// automatically propagate that value to a manually embedded Watch target.
if (fs.existsSync(nativeAppProject)) {
	let nativeProject = fs.readFileSync(nativeAppProject, 'utf8');
	const buildConfigBlocks = nativeProject.match(/\n\t\t[A-F0-9]+ \/\* (?:Debug|Release) \*\/ = \{[\s\S]*?\n\t\t\};/g) ?? [];
	const mainConfig = buildConfigBlocks.find((block) =>
		block.includes('PRODUCT_BUNDLE_IDENTIFIER = "com.sagatrail2.app";') &&
		block.includes('CURRENT_PROJECT_VERSION =')
	);
	const mainBuildNumber = mainConfig?.match(/CURRENT_PROJECT_VERSION = ([^;]+);/)?.[1];
	const mainMarketingVersion = mainConfig?.match(/MARKETING_VERSION = ([^;]+);/)?.[1];

	if (mainBuildNumber && mainMarketingVersion) {
		let watchBlocksUpdated = 0;
		nativeProject = nativeProject.replace(
			/(\n\t\t[A-F0-9]+ \/\* (?:Debug|Release) \*\/ = \{[\s\S]*?PRODUCT_BUNDLE_IDENTIFIER = com\.sagatrail2\.app\.watchkitapp;[\s\S]*?\n\t\t\};)/g,
			(block) => {
				if (!block.includes('CURRENT_PROJECT_VERSION =')) return block;
				watchBlocksUpdated += 1;
				return block
					.replace(/CURRENT_PROJECT_VERSION = [^;]+;/, `CURRENT_PROJECT_VERSION = ${mainBuildNumber};`)
					.replace(/MARKETING_VERSION = [^;]+;/, `MARKETING_VERSION = ${mainMarketingVersion};`);
			},
		);
		fs.writeFileSync(nativeAppProject, nativeProject, 'utf8');
		console.log(`[eas-post-install] Synced Watch version ${mainMarketingVersion} (${mainBuildNumber}) across ${watchBlocksUpdated} build configurations`);
	} else {
		console.warn('[eas-post-install] Could not determine the main iOS version; Watch version was not changed');
	}
}
