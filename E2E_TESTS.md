# End-to-End Testing Guide

This document streamlines E2E testing by documenting the flow once, so future runs consume fewer tokens.

## Prerequisites

- App running on `http://localhost:3000` (via `npm run dev`)
- `.env.local` configured with Supabase credentials
- Browser dev tools available for debugging

## Test Modes

### Mode A: Demo Mode (No Backend)
- **Fastest**: ~5 minutes
- **Uses**: Mock data in localStorage
- **Good for**: UI/UX testing, component verification
- **Run**: `npm run dev:demo` on port 3007

### Mode B: Full Mode (With Supabase)
- **Realistic**: Real auth, database, AI analysis
- **Time**: ~15 minutes (includes API delays)
- **Good for**: Full feature validation, data persistence
- **Run**: `npm run dev` on port 3000 (requires `.env.local`)

---

## Test Flows

### Flow 1: Landing Page → Home (Unauthenticated)

**URL**: `http://localhost:3000/`

**Expected Elements**:
- Header with "LookLab" logo
- "Iniciar sesión" link (top-right)
- "Evaluá tu outfit" buttons (multiple CTAs)
- Hero section: "Tu outfit, evaluado. Honestamente."
- Feature cards (Rúbrica por ocasión, Comunidad real, Seguridad emocional)
- Testimonials section
- Future features preview (🔒 Colorimetría, 🔒 Aprendé de estilo)

**What to Check**:
- All images load
- Links navigate correctly
- Responsive layout (test 375×812 mobile viewport)
- Copy is in Spanish (ES locale)

---

### Flow 2: Authentication (Signup → Home)

**Step 1: Navigate to Signup**
```
GET http://localhost:3000/register
```

**Expected Page Elements**:
- Form title: "Crear cuenta"
- Email input (placeholder: "vos@email.com")
- Password input (min 8 chars)
- "Mostrar contraseña" toggle button
- "Crear cuenta" submit button
- Link to "Iniciar sesión" (login fallback)

**Step 2: Fill Form**
```
Email: test-<timestamp>@example.com  (use unique email to avoid conflicts)
Password: password123456 (min 8 chars)
```

**Step 3: Submit**
- Click "Crear cuenta"
- **Expected behavior**: 
  - In Full Mode: Redirects to `/home` after Supabase auth succeeds
  - In Demo Mode: Redirects to `/home` with mock user
  
**Observed Issues** (as of 2026-07-19):
- ⚠️ Full Mode shows error: "No pudimos completar la operación. Probá de nuevo."
  - **Possible causes**: Supabase email validation, API key misconfiguration, or auth provider not configured
  - **Workaround**: Use Demo Mode or test login directly if user already exists

---

### Flow 3: Home Page (After Signin)

**URL**: `http://localhost:3000/home`

**Expected Elements**:
- Header with greeting ("Hola, [name]" or "Tu outfit, evaluado")
- Avatar circle (if user has avatar)
- "Último Outfit Score" card (if user has prior analyses)
  - Score ring visualization
  - Occasion label
  - Style descriptors
  - Link to "Ver análisis completo"
- Stats cards:
  - "Promedio histórico" (average score)
  - "Análisis" (total count)
- "Crear análisis" card (CTA to new analysis)
- "Generar colorimetría" preview card (🔒 locked feature)
- **Daily Challenge Card** (violet background, streak badge)
- Bottom tab bar (Análisis, Comunidad, Perfil)

**What to Check**:
- Latest analysis displays correctly (if user has data)
- Streak badge shows in Daily Challenge card
- Navigation between tabs works
- Images load (profile avatar, outfit photos)

---

### Flow 4: Analysis Creation

**Entry Point**: 
- Click "Crear análisis" card on home, OR
- Tap "Análisis" tab → "Subir foto" screen

**Steps**:

1. **Photo Upload**
   - Click "Subir foto" or camera icon
   - Choose file (JPG/PNG, <5MB recommended)
   - **Mobile**: Should offer camera + library options
   - **Desktop**: File picker

2. **Occasion Selection**
   ```
   Options: Casual, Trabajo, Cita, Social, Deportivo, Formal, Viaje, Otro
   ```
   - Select one (e.g., "Casual")

3. **Body Type Selection** (if available)
   ```
   Options: Completo, Torso, Lower body, etc.
   ```

4. **Submit for Analysis**
   - Click "Analizar" button
   - **Loading state**: Shows spinner + "Analizando outfit..."
   - **Expected time**: 10-15 seconds (API call to OpenAI Vision)

5. **Results Page** (`/analysis/[id]/result`)
   - **Photo header**: Blurred background + score ring overlay
   - **Score card**: 
     - Numeric score (0-100)
     - Occasion label
     - Qualitative badge (Muy bueno / Bueno / Regular / etc.)
     - Detected colors
   - **Category breakdown**: Color, Fit, Cohesion, Style
   - **Feedback sections**:
     - Fortalezas (strengths, ✓ check icons)
     - Aspectos a mejorar (improvements, → arrows)
     - Recomendaciones (suggestions)
   - **Community section**:
     - If published: "Publicado en la comunidad" + comment count
     - If not published: "Compartilo con la comunidad" + Publish button

**What to Check**:
- Photo displays correctly
- Score calculation appears reasonable
- Feedback text is substantive (not empty)
- Category percentages sum to meaningful value
- Colors detected match actual outfit
- Share/publish button works

---

### Flow 5: Community Feed

**URL**: `http://localhost:3000/community`

**Expected Elements**:
- Tab header: "Votá"
- Outfit cards (feed items)
  - Photo thumbnail
  - Score badge
  - Occasion label
  - Vote buttons (👍 agree / 👎 disagree)
  - Comment count
  - Username + avatar
- Filters (optional): "Para ti", "Seguidos", "Nuevos", "Populares"

**Actions**:
1. **Vote on an outfit**
   - Click 👍 (Agree) or 👎 (Disagree)
   - **Expected**: Vote count updates instantly
   - Vote state persists (localStorage in demo, DB in full)

2. **View outfit detail**
   - Click outfit card → navigates to `/community/post/[id]`
   - Shows full analysis + community comments

3. **Follow user**
   - Click username/avatar
   - Should show user profile (if implemented)

**What to Check**:
- Outfit cards render correctly
- Vote buttons respond immediately
- No API errors in browser console
- Images load
- Responsive layout (cards stack on mobile)

---

### Flow 6: Daily Challenge (Reto Diario)

**Entry Point**:
- Visible on home page as violet card with 🔥 streak badge
- Title: "Reto diario" or "Reto de hoy: listo"

**Expected States**:
- **Not completed today**: 
  - Icon: 🎯 (quiz icon)
  - Text: "Reto diario • Evalúa 3 outfits"
  - Streak badge visible (if streak > 0)
  
- **Completed today**:
  - Icon: ✓ (check circle, filled)
  - Text: "Reto de hoy: listo • ¡Volvé mañana!"
  - Streak badge shows current streak number + 🔥

**Actions**:
1. Click card → Opens **DailyChallengeSheet** modal
   - Shows 3 outfit cards (from mock `DEMO_COMMUNITY_POSTS`)
   - Each outfit has photo, score, "Agree" button
   - Instructions: "Votá estos 3 outfits para completar el reto"

2. **Vote on all 3 outfits**
   - Click "Agree" on each (or "Disagree")
   - After 3rd vote → Closes challenge modal
   - Opens **DailyChallengeCompleteSheet** (celebration modal)
   - Shows streak count + encouragement message

3. **Streak calculation**
   - Stored in localStorage: `{ lastCompletedDate, streak }`
   - Increments daily if user votes on challenge
   - Resets if user misses a day

**What to Check**:
- Card displays correct state (completed vs. not)
- Streak badge renders correctly
- Modal opens on click
- Vote buttons work
- Completion modal shows
- Streak updates (check localStorage after)

---

## Quick Test Checklist

Use this for rapid validation:

```
Landing Page
  ✓ Logo visible
  ✓ Hero text renders
  ✓ CTAs navigate to login/community
  
Signup/Login
  ✓ Form fields accept input
  ✓ Validation works (e.g., password min 8 chars)
  ✓ Submit button triggers API call
  
Home Page
  ✓ User greeting or default text
  ✓ Latest analysis card displays (if exists)
  ✓ Stats cards show counters
  ✓ Daily Challenge card visible with streak
  
Analysis Creation
  ✓ Photo upload succeeds
  ✓ Occasion selection works
  ✓ Analysis API call completes (10-15s)
  ✓ Results page renders score + feedback
  
Community
  ✓ Feed loads outfits
  ✓ Vote buttons respond
  ✓ Outfit cards clickable
  
Daily Challenge
  ✓ Modal opens
  ✓ Vote buttons work
  ✓ Completion modal shows
  ✓ Streak increments in localStorage
```

---

## Browser Console Checks

After each test, verify no errors:

```javascript
// Check for API errors
console.error();  // Should have none

// Check localStorage (demo mode)
localStorage.getItem('muza_streak');  // { lastCompletedDate, streak }
localStorage.getItem('muza_user');    // Mock user data (if demo)

// Check Supabase auth (full mode)
// Should see successful auth calls in Network tab
// POST /auth/v1/signup or /auth/v1/token
```

---

## Known Issues & Workarounds

| Issue | Symptom | Workaround |
|-------|---------|-----------|
| Supabase signup fails | "No pudimos completar..." | Use demo mode or create user via Supabase dashboard |
| Images don't load | Photo URLs 404 | Check Supabase storage bucket, verify signed URL generation |
| Analysis API timeout | Spinner never ends (>30s) | Check OpenAI API key, verify quota, check network tab |
| Streak doesn't persist | Resets after page reload | Check localStorage corruption, verify streak logic |
| Layout broken on mobile | Elements overlap (375×812) | Check Tailwind responsive classes, test in actual mobile device |

---

## Automation Tips (For Future Runs)

To make this reproducible without tokens:

1. **Use Playwright or Cypress for automated testing**
   ```bash
   npm install --save-dev playwright
   npx playwright codegen http://localhost:3000
   ```

2. **Document API responses** (mock in tests)
   ```json
   // Example: Analysis response
   {
     "id": "uuid",
     "overall_score": 78,
     "feedback": [...],
     "categories": {...}
   }
   ```

3. **Use demo mode for CI/CD** (no backend dependencies)
   ```bash
   npm run dev:demo &
   npm test -- --e2e
   ```

---

## Test Results (Last Run)

**Date**: 2026-07-19  
**Mode**: Full Mode (Supabase Cloud)  
**Status**: ⚠️ Partial (signup fails, landed on auth error)

**Findings**:
- ✅ Landing page renders correctly
- ✅ Navigation links work
- ❌ Signup form validates input but fails on submit
  - Error: "No pudimos completar la operación"
  - **Action needed**: Debug Supabase auth config or use demo mode

**Recommendation**: 
Use **demo mode** for rapid testing until Supabase auth issue is resolved.

---

## Next Steps

1. **Resolve Supabase auth**: Check SUPABASE_ANON_KEY, email provider config
2. **Run demo mode tests**: `npm run dev:demo` → repeat flows 1, 3, 5, 6
3. **Automate with Playwright**: Create `e2e/tests.spec.ts` for regression testing
4. **Monitor API latency**: Track OpenAI Vision API response times

