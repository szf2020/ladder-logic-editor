/**
 * Build script for generating the Lezer parser from the grammar
 *
 * Run with: node src/lang/build-parser.mjs
 */

import { buildParserFile } from '@lezer/generator';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const grammarPath = join(__dirname, 'st.grammar');
const outputPath = join(__dirname, 'st-parser.ts');

console.log('Building ST parser from grammar...');

try {
  const grammar = readFileSync(grammarPath, 'utf-8');

  const { parser, terms } = buildParserFile(grammar, {
    moduleStyle: 'es',
    typeScript: true,
  });

  writeFileSync(outputPath, parser);

  console.log('Parser generated successfully:', outputPath);
  console.log('Terms:', Object.keys(terms).length);
} catch (error) {
  console.error('Failed to build parser:', error.message);
  process.exit(1);
}
