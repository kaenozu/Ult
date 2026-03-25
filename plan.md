1. **Replace insecure Math.random() in `app/api/auth/register/route.ts`**
   - Import `randomUUID` from the Node `crypto` module.
   - Replace `Math.random().toString(36).substring(2, 7)` when generating the `User` ID with `randomUUID().replace(/-/g, '').substring(0, 16)`.
2. **Replace insecure Math.random() in `app/api/export/trades/route.ts`**
   - Import `randomUUID` from the Node `crypto` module.
   - Replace `Math.random().toString(36).substring(2, 7)` when generating the `exportId` with `randomUUID().replace(/-/g, '').substring(0, 16)`.
3. **Verify Changes**
   - Run `pnpm test` and `pnpm lint` in the `trading-platform` directory.
   - Use `grep` to ensure `Math.random` is successfully removed from the modified files.
4. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
5. **Submit Changes**
