# Adding the licence to MWP Panel

The licence makes MWP Panel work only for the person who bought it, on their own computers.

## How it works for the buyer
1. The first time Panel opens, it asks for the email they bought with.
2. They get a 6-digit code by email and type it into Panel.
3. Panel shows "Licensed to <name>" and unlocks. Nothing else to do.
4. They can use it on up to 2 computers at a time. When they change computers, they remove the old one in My downloads on the shop.
5. Panel checks in quietly once a week, and keeps working offline for up to 14 days.
6. After a refund, or if they remove the computer, Panel locks on the next check.

Someone who gets a copy of the plugin can't use it: they'd need the buyer's email inbox to sign in.

## What to add to the plugin
1. Copy `license.js` into the plugin folder.
2. In `manifest.json`, allow the shop's server:
   ```json
   "requiredPermissions": { "network": { "domains": ["https://tkkpxsyioetzexgbmbqy.supabase.co"] } }
   ```
3. When the panel opens, check the licence before showing the tools:
   ```js
   const licence = require("./license.js");

   const s = await licence.status();
   if (s.state === "licensed") showTools(`Licensed to ${s.licensedTo.name || s.licensedTo.email}`);
   else showSignIn(s.message);   // "expired" shows the message, "signed-out" shows the email box
   ```
4. The sign-in screen has two steps:
   ```js
   await licence.sendCode(emailInput.value);                 // "We've emailed you a 6-digit code"
   await licence.verifyCode(emailInput.value, codeInput.value); // then showTools(...)
   ```
   Show the error message from either call if it fails (wrong code, not purchased, too many computers).
5. Add a small "Sign out" link in the panel's settings that calls `licence.signOut()`.

## One setting in Supabase (once)
The sign-in email must include the code. In Supabase → Authentication → Email Templates → **Magic Link**, add a line with `{{ .Token }}`, for example:

> Your MWP sign-in code: **{{ .Token }}**

Keep the existing link in that email: the shop's My downloads page still uses it.

## Photoshop and Photoshop (Beta)
MWP Panel should install and run in both. Three things make that work:
1. In `manifest.json`, the host is Photoshop with a minimum version and **no maximum**, so new Photoshop and Beta versions are accepted:
   ```json
   "host": [{ "app": "PS", "minVersion": "24.2.0" }]
   ```
   A `maxVersion` would block the Beta, which always has a higher version number.
2. Install it from the `.ccx` file by double-clicking. Creative Cloud then offers it to every installed Photoshop, including the Beta.
3. A computer counts once. Photoshop and the Beta keep separate plugin storage, so `license.js` works out the computer's id from the computer itself (name, system, user folder). The licence server also counts a computer already listed under the same name only once, which covers older copies of the plugin.

Test once in each app: install, sign in with the code, and check that My downloads lists the computer only once.
