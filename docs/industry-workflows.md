# Industry workspaces — local implementation

The existing MOBILE and COMPUTER intake remains intact. New services are APPLIANCE, FACILITIES, VEHICLE and INDUSTRIAL. `lib/shop-services.ts` controls persistence and home routing; the legacy device helper remains unchanged for legacy screens.

## Implemented

- Signup allows multiple services, preserves OTP verification and routes new-only businesses to their industry workspace.
- Existing owners can enable services in `/industry-workspaces` or edit them in shop settings. Access to an industry requires shop membership and that service enabled.
- Specialized intake validates required industry details on the server and uses the existing tenant-scoped ticket creation, quota, customer and SMS flow.
- Industry details are stored as labelled text in `issueInitial`, included in printed receipts. They are not structured searchable database columns; no migration is required.
- Owners and front-desk users can start work, mark ready with a cost, and record delivery after invoice/payment registration. Existing invoice, customer, inventory and history screens remain shared across the shop.
- Legacy ticket board filters out other industry categories; shared invoice options still include all ready tickets.
- `/industry-demo` uses fictional fixtures only and is disabled outside development. Its forms do not send mutations.

## Verification

- 69 automated tests passed, including service routing and industry intake validation.
- Production build and type checking are part of the release checks.
- Browser tests exercised all four signup steps without OTP submission; all four demo intake forms; mobile 390px and desktop 1440px layout; no page errors or horizontal document overflow.
- Anonymous industry reads and service-enable writes returned 401.
- No real shop was created, no production data was changed, and no SMS was sent during testing.

## Before production release

Run an authenticated end-to-end test on an isolated test database with an SMS stub: create each shop type, intake, print, ready, invoice/partial payment, delivery, and verify a second tenant cannot see or mutate its tickets. Test concurrent submissions and financial retries. The code is not a claim of verified production delivery. Industry pages currently use Persian labels and owner/front-desk access, not a new technician-role model or fully translated industry workspace.
