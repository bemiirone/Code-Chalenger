/**
 * Challenge Importer — reads a JSON file and upserts into MongoDB.
 * No AI calls, no API costs. Completely free to run repeatedly.
 *
 * Usage:
 *   npx ts-node scripts/import-challenges.ts scripts/output/my-batch.json
 *
 * Env required: MONGODB_URI
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import mongoose from 'mongoose';

dotenv.config();

const ChallengeSchema = new mongoose.Schema({
  title: String,
  description: String,
  language: String,
  version_constraints: [String],
  starter_code: String,
  solution_code: String,
  test_cases: [{ input: String, expectedOutput: String }],
  ai_scoring_prompt: String,
  difficulty: String,
  tags: [String],
});

const ChallengeModel = mongoose.model('ChallengeEntity', ChallengeSchema, 'challenges');

const BANNED = [/todo/i, /temperature/i, /\bsimple counter\b/i];

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx ts-node scripts/import-challenges.ts <path-to-json>');
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const mongoUri = process.env['MONGODB_URI'];
  if (!mongoUri) throw new Error('MONGODB_URI not set in .env');

  const challenges = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Array<Record<string, unknown>>;
  console.log(`Read ${challenges.length} challenges from ${filePath}`);

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB\n');

  // Load existing titles for duplicate detection
  const existingDocs = await ChallengeModel.find({}, { title: 1 }).lean();
  const seenTitles = new Set(existingDocs.map((d) => (d as { title?: string }).title?.toLowerCase().trim() ?? ''));

  let inserted = 0;
  let skipped = 0;
  let banned = 0;

  for (const challenge of challenges) {
    const title = String(challenge['title'] ?? '').trim();
    const titleKey = title.toLowerCase();

    if (BANNED.some((p) => p.test(title))) {
      console.log(`  BANNED    ${title}`);
      banned++;
      continue;
    }

    if (seenTitles.has(titleKey)) {
      console.log(`  DUPLICATE ${title}`);
      skipped++;
      continue;
    }

    await ChallengeModel.create(challenge);
    seenTitles.add(titleKey);
    inserted++;
    console.log(`  ✓ ${title}`);
  }

  const language = String(challenges[0]?.['language'] ?? 'unknown');
  const easyCount = await ChallengeModel.countDocuments({ language, difficulty: 'Easy' });
  const medCount  = await ChallengeModel.countDocuments({ language, difficulty: 'Medium' });
  const hardCount = await ChallengeModel.countDocuments({ language, difficulty: 'Hard' });

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Inserted: ${inserted} | Skipped: ${skipped} | Banned: ${banned}`);
  console.log(`Total "${language}" in DB: ${await ChallengeModel.countDocuments({ language })}`);
  console.log(`  Easy:   ${easyCount}`);
  console.log(`  Medium: ${medCount}`);
  console.log(`  Hard:   ${hardCount}`);

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
