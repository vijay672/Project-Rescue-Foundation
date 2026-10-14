import { runSecurityTestSuite } from './supabase_rls_security.test';
import { runOfflineSyncRecoveryTests } from './offline_sync_recovery.test';

async function main() {
  console.log('=== PROJECT RESCUE FOUNDATION: TEST SUITE EXECUTION ===\n');

  console.log('[1/2] Running Supabase RLS & Security Invariant Tests...');
  const secResults = runSecurityTestSuite();
  let secPassed = 0;
  for (const r of secResults) {
    const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${symbol}: ${r.name}`);
    console.log(`     ↳ ${r.details}`);
    if (r.passed) secPassed++;
  }
  console.log(`RLS & Security Summary: ${secPassed}/${secResults.length} passed.\n`);

  console.log('[2/2] Running Offline Synchronization & Recovery Tests...');
  const syncResults = await runOfflineSyncRecoveryTests();
  let syncPassed = 0;
  for (const r of syncResults) {
    const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${symbol}: [${r.suite}] ${r.name}`);
    console.log(`     ↳ ${r.notes}`);
    if (r.passed) syncPassed++;
  }
  console.log(`Offline Sync Summary: ${syncPassed}/${syncResults.length} passed.\n`);

  if (secPassed === secResults.length && syncPassed === syncResults.length) {
    console.log('ALL VERIFICATION SUITES PASSED SUCCESSFULLY (100% PASS RATE).');
    process.exit(0);
  } else {
    console.error('SOME TESTS FAILED.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
