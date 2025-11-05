# FUNCTION_INVOCATION_FAILED - Complete Solution Guide

## 1. **The Fix: Immediate Solution**

### Problem
The error `Cannot find module '@/config/env.js' Require stack: - /var/task/src/app.js` shows:
- Vercel is compiling TypeScript from `src/` directly (not using our `dist/` build)
- Files in `src/` still have unresolved `@/` path aliases
- Runtime path resolution isn't working because modules load before path registration

### Solution: Force Vercel to Use Compiled Files

**Option A: Configure Vercel to Skip TypeScript Compilation (Recommended)**

Update `vercel.json` to tell Vercel to use pre-compiled JavaScript:

```json
{
  "buildCommand": "npm run vercel-build",
  "outputDirectory": ".",
  "installCommand": "npm install",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/index"
    }
  ],
  "functions": {
    "api/index.js": {
      "maxDuration": 30,
      "memory": 1024
    }
  }
}
```

**Key Change:** Use `api/index.js` instead of `api/index.ts` - this tells Vercel to use the compiled file, not compile from source.

**Option B: Ensure src/ Files Also Have Resolved Paths**

Run `tsc-alias` twice - once for `dist/` and once for `src/` (if Vercel compiles from src/):

```json
"vercel-build": "prisma generate && tsc --project tsconfig.json && npx tsc-alias -p tsconfig-alias.json && npx tsc-alias -p tsconfig.json"
```

**Option C: Use Module Aliasing (Alternative)**

Instead of path aliases, use relative imports in source files. This is less elegant but more reliable.

---

## 2. **Root Cause Analysis**

### What Was Happening vs. What Should Happen

**What Was Happening:**
1. Your build runs: `tsc` compiles `src/**/*.ts` → `dist/**/*.js` with `@/` paths still present
2. `tsc-alias` runs: Processes `dist/**/*.js` and converts `@/config/env.js` → `./config/env.js`
3. Vercel deployment: Vercel sees `api/index.ts` and compiles it separately
4. Vercel ALSO compiles `src/**/*.ts` → `src/**/*.js` (bypassing your build)
5. Runtime: When `api/index.ts` imports `../src/app.js`, that file has `require("@/config/env.js")`
6. Error: Node.js can't resolve `@/config/env.js` because it's not a real path

**What Should Happen:**
1. Build runs: Compiles TypeScript and resolves all path aliases
2. Vercel uses ONLY the compiled files from `dist/`
3. Runtime: All imports use relative paths (no aliases)
4. Success: Everything resolves correctly

### Conditions That Trigger This Error

1. **Vercel's Auto-Compilation**: Vercel automatically compiles TypeScript files in serverless functions
2. **Source Files in Deployment**: If `src/` folder is included, Vercel compiles from it
3. **Path Aliases Not Resolved**: TypeScript path aliases (`@/`) are compile-time only
4. **Module-Level Requires**: When a module loads, all `require()` statements execute immediately

### The Misconception

**False Assumption:** "If I exclude `src/` from deployment, Vercel won't compile from it"

**Reality:** Vercel compiles TypeScript files in the `api/` folder AND any TypeScript files it finds, regardless of `.vercelignore`. The `api/index.ts` file triggers compilation of imported modules.

---

## 3. **Understanding the Concept**

### Why This Error Exists

**Purpose:** This error protects you from:
- **Broken Module Resolution**: Ensures all dependencies are findable
- **Runtime Errors**: Catches missing modules at load time, not later
- **Deployment Failures**: Prevents deploying broken code

**Mental Model:**
```
TypeScript Compilation (tsc)
  ↓
Path Aliases (@/) → NOT resolved in output
  ↓
tsc-alias → Resolves aliases to relative paths
  ↓
Runtime → Node.js requires actual file paths
```

**Framework Design:**
- **TypeScript**: Compile-time path aliases for developer convenience
- **Node.js**: Runtime module resolution using actual file paths
- **tsc-alias**: Bridge between TypeScript aliases and Node.js paths
- **Vercel**: Compiles TypeScript automatically, but doesn't run `tsc-alias`

### The Correct Mental Model

1. **Path Aliases are Compile-Time Only**: TypeScript understands `@/`, but Node.js doesn't
2. **Build Output Must Be "Node.js Ready"**: All aliases must be converted to relative paths
3. **Vercel Compiles Separately**: Serverless functions are compiled independently
4. **Source Files Can Cause Issues**: If `src/` is included, Vercel compiles from it

---

## 4. **Warning Signs & Code Smells**

### What to Look For

**Red Flags:**
- ✅ Error mentions `@/` paths in production
- ✅ Error shows `/var/task/src/` instead of `/var/task/dist/`
- ✅ Build succeeds but runtime fails
- ✅ Works locally but fails on Vercel
- ✅ "Cannot find module" with path aliases

**Code Smells:**
```typescript
// ❌ BAD: Path aliases in compiled output
const env = require("@/config/env.js");

// ✅ GOOD: Relative paths in compiled output
const env = require("./config/env.js");
```

**Similar Mistakes:**

1. **Using Path Aliases Without Resolution**
   - Mistake: Relying on `tsconfig-paths/register` at runtime
   - Fix: Resolve aliases at build time with `tsc-alias`

2. **Including Source Files in Deployment**
   - Mistake: Deploying `src/` folder
   - Fix: Only deploy `dist/` or configure Vercel correctly

3. **Assuming Build Output is Correct**
   - Mistake: Not verifying compiled files have resolved paths
   - Fix: Check `dist/` folder for `@/` patterns

4. **Mixing Build Systems**
   - Mistake: Having both custom build and Vercel compilation
   - Fix: Use one build system consistently

---

## 5. **Alternative Approaches & Trade-offs**

### Approach 1: Pre-compile Everything (Current + Recommended)

**How:**
- Build all TypeScript to JavaScript before deployment
- Resolve all path aliases with `tsc-alias`
- Deploy only compiled JavaScript files
- Tell Vercel to use `.js` files, not `.ts`

**Pros:**
- ✅ Full control over compilation
- ✅ Consistent builds
- ✅ Faster deployments (no compilation needed)

**Cons:**
- ⚠️ More complex build process
- ⚠️ Need to maintain build configuration

**Implementation:**
```json
// vercel.json
{
  "functions": {
    "api/index.js": { ... }  // Use .js, not .ts
  }
}
```

### Approach 2: Runtime Path Resolution (Current Fallback)

**How:**
- Use `tsconfig-paths/register` at runtime
- Register paths for both `src/` and `dist/`
- Works as fallback if build-time resolution fails

**Pros:**
- ✅ Works even if build fails
- ✅ Flexible (handles multiple locations)

**Cons:**
- ⚠️ Runtime overhead
- ⚠️ Not always reliable
- ⚠️ Doesn't work for all module types

### Approach 3: Use Relative Imports Only

**How:**
- Don't use path aliases at all
- Use relative imports: `../../config/env.js`
- Simpler, more explicit

**Pros:**
- ✅ No build-time resolution needed
- ✅ Works everywhere
- ✅ More explicit

**Cons:**
- ⚠️ Less convenient for developers
- ⚠️ Deep relative paths (`../../../../`)
- ⚠️ Harder to refactor

### Approach 4: Use Module Bundler (Webpack/Rollup)

**How:**
- Bundle all code into single file
- Resolve paths during bundling
- Deploy bundled output

**Pros:**
- ✅ Complete path resolution
- ✅ Optimized output
- ✅ Single file deployment

**Cons:**
- ⚠️ Much more complex setup
- ⚠️ Overkill for serverless functions
- ⚠️ Larger bundle size

---

## 6. **Recommended Solution**

**Best Approach: Combine Option 1 + Option 2**

1. **Primary:** Pre-compile and use `.js` files (Approach 1)
2. **Fallback:** Runtime path resolution (Approach 2) - already implemented

**Why This Works:**
- Build-time resolution handles most cases
- Runtime fallback catches edge cases
- Works regardless of Vercel's file structure

**Implementation Steps:**

1. Ensure `dist/` is NOT in `.vercelignore` ✅ (Already done)
2. Run `tsc-alias` for both `dist/` and potentially `src/` ✅ (Already done)
3. Update `vercel.json` to use `api/index.js` instead of `api/index.ts` (Need to do)
4. Keep runtime path resolution as fallback ✅ (Already done)

---

## 7. **Action Items**

### Immediate Fix

1. **Update `vercel.json`** to use compiled JavaScript:
   ```json
   "functions": {
     "api/index.js": {  // Changed from .ts to .js
       "maxDuration": 30,
       "memory": 1024
     }
   }
   ```

2. **Create `api/index.js`** from compiled TypeScript OR ensure it's compiled correctly

3. **Verify build output** - Check that `dist/` has no `@/` patterns:
   ```bash
   grep -r "@/" dist/
   # Should return nothing
   ```

### Long-term Improvements

1. **Add build verification** to CI/CD pipeline
2. **Document the build process** clearly
3. **Consider using relative imports** for critical paths
4. **Monitor Vercel logs** for path resolution issues

---

## 8. **Testing the Fix**

After implementing the fix:

1. **Check Build Logs:**
   - Verify `tsc-alias` runs successfully
   - Check for "45 files were affected" message

2. **Check Function Logs:**
   - Look for: `✅ Detected files in: ...`
   - Look for: `✅ Registered paths for: ...`
   - Should NOT see: `Cannot find module '@/config/env.js'`

3. **Test the Endpoint:**
   - Make a request to your Vercel URL
   - Should get a response (not 500 error)

---

## 9. **Key Takeaways**

1. **Path aliases are compile-time only** - Must be resolved before runtime
2. **Vercel compiles TypeScript** - Need to control this process
3. **Build output must be Node.js-ready** - All aliases must be resolved
4. **Runtime fallback is useful** - But not a replacement for build-time resolution
5. **Use compiled `.js` files** - Don't let Vercel compile from `.ts` source

---

## 10. **Prevention Checklist**

- [ ] `dist/` folder is NOT in `.vercelignore`
- [ ] `tsc-alias` runs after TypeScript compilation
- [ ] `vercel.json` uses `.js` files, not `.ts` files
- [ ] Build process verifies no `@/` patterns in output
- [ ] Runtime path resolution is configured as fallback
- [ ] CI/CD pipeline checks build output
- [ ] Documentation explains build process

---

## Summary

**The Error:** `Cannot find module '@/config/env.js'` occurs because Vercel compiles TypeScript from `src/` which still has unresolved path aliases.

**The Fix:** 
1. Ensure Vercel uses pre-compiled JavaScript files (`.js` not `.ts`)
2. Run `tsc-alias` to resolve all path aliases
3. Keep runtime path resolution as fallback

**The Lesson:** TypeScript path aliases are developer convenience features that must be resolved to actual paths before runtime. Build-time resolution is critical for serverless deployments.

