/**
 * Semantic-release plugin to update jsr.json version and publish to JSR
 * 
 * This plugin:
 * 1. Updates the version in jsr.json (prepare step)
 * 2. Publishes to JSR using deno publish (publish step)
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Updates the version in a JSON file
 */
function updateJsonVersion(fileName, version) {
  const filePath = path.join(process.cwd(), fileName);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`${fileName} not found, skipping version update`);
    return;
  }

  const jsonContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  jsonContent.version = version;
  fs.writeFileSync(
    filePath,
    JSON.stringify(jsonContent, null, 2) + '\n',
    'utf8'
  );
  console.log(`✓ Updated ${fileName} version to ${version}`);
}

/**
 * Updates the version in jsr.json, deno.json, and package.json
 */
function updateVersions(version) {
  ['jsr.json', 'deno.json', 'package.json'].forEach(fileName => {
    updateJsonVersion(fileName, version);
  });
}

/**
 * Publishes to JSR using deno publish
 */
function publishToJsr() {
  try {
    console.log('Publishing to JSR...');
    execSync('deno publish', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('✓ Successfully published to JSR');
  } catch (error) {
    console.error('✗ Failed to publish to JSR:', error.message);
    throw error;
  }
}

/**
 * Semantic-release prepare step
 * Updates jsr.json with the new version
 */
async function prepare(pluginConfig, context) {
  const { nextRelease } = context;
  
  if (!nextRelease) {
    return;
  }

  updateVersions(nextRelease.version);
  
  return {
    jsrJson: {
      version: nextRelease.version,
    },
  };
}

/**
 * Semantic-release publish step
 * Publishes to JSR
 */
async function publish(pluginConfig, context) {
  const { nextRelease } = context;
  
  if (!nextRelease) {
    return;
  }

  publishToJsr();
  
  return {
    jsr: {
      version: nextRelease.version,
      published: true,
    },
  };
}

export { prepare, publish };
