import { DomainError, type Extraction, type Intake, type Listing } from '../src/domain';
import { Inbox } from './inbox';

export type Extractor = (input: Intake) => Promise<Extraction>;
export async function processInbox(
  inbox: Inbox,
  listings: Listing[],
  now: () => string,
  extract?: Extractor,
  limit = 10,
) {
  let completed = 0,
    failed = 0,
    fenced = 0;
  for (let i = 0; i < limit; i++) {
    const claim = inbox.claim(now());
    if (!claim) break;
    try {
      // The external await never holds a database transaction or write lock.
      const result = extract ? await extract(claim.input) : undefined;
      inbox.complete(claim, listings, now(), result);
      completed++;
    } catch (error) {
      if (error instanceof DomainError && error.code === 'LEASE_LOST') {
        fenced++;
        continue;
      }
      try {
        inbox.fail(claim, now());
        failed++;
      } catch (leaseError) {
        if (leaseError instanceof DomainError && leaseError.code === 'LEASE_LOST') {
          fenced++;
          continue;
        }
        throw leaseError;
      }
    }
  }
  return { completed, failed, fenced };
}
