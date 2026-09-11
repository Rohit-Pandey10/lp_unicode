
const { runStage1 } = require('./src/stage1');
const { runStage2 } = require('./src/stage2');
const { runCallbacks } = require('./src/stage3/runCallbacks');
const { runPromises } = require('./src/stage3/runPromises');
const { runStage4 } = require('./src/stage4');

async function runAll() {
  console.log('Starting order processing system walkthrough');
  console.log();

  console.log('Stage 1: Order Engine');
  runStage1();
  console.log();

  console.log('Stage 2: Data Analysis');
  runStage2();
  console.log();

  console.log('Stage 3: Async Flows');
  await runCallbacks();
  console.log();
  await runPromises();
  console.log();

  console.log('Stage 4: Async/Await & Error Handling');
  await runStage4();
}

if (require.main === module) {
  runAll().catch(console.error);
}

module.exports = { runAll, runDemo: runAll };
