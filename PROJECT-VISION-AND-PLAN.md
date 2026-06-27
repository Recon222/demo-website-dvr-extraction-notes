# DVR Extraction Notes — Website Vision and Build Plan

A spoken-style summary you can listen to end to end. It covers the vision, exactly what I plan to build, what I can do on my own, what I need from you, and a short set of questions at the end. The questions are written so you can answer them out loud. There is no code in this document on purpose.

## How to use this

Listen all the way through. Everything I'm proposing has a sensible default, so when you get to the questions at the end, you can simply say "go with your defaults" and only call out the few things you want changed. Even rough answers unblock me completely.

## The big picture

We are building a marketing and beta-signup website for your iOS app, DVR Extraction Notes. The site has two jobs. The first job is to explain the app clearly and make a strong impression at your conference on Monday. The second job is to collect email addresses from people who want into the beta, and then to hand them a TestFlight link once a build is approved.

The whole site is built on the template you already forked, which is a modern, dark, glass-styled site built with Next.js and Tailwind. The template's shell is genuinely good — the navigation, the glass cards, the animated headings, the hover effects. So we keep that strong skeleton, throw away all of the template's filler marketing copy and stock photos, and replace it with your real product.

## The angle, and why it works

The spine of the entire site is this: you are not a startup that made a forensics app. You are an analyst with fifteen years and more than fifteen hundred extractions who got tired of every pain point in the job and built the tool to kill them. You took a roughly ten-minute process and brought it under five minutes.

That framing is honest, it is rare, and it disarms the "oh great, another vendor app" reflex that experienced people have. So every feature on the site is told the same way: here is a thing that used to hurt, and here is how it does not hurt anymore.

## One important guardrail I wrote down for myself

You told me that when AI hears the word "forensic," it goes overboard. I took that seriously and I wrote it into the planning docs as a rule that every future session and every helper inherits. The rule is: lead with usefulness and clarity, not with courtroom language on every page. The app's own internal documentation is soaked in "court-admissible" and "chain of custody" language, and that is correct for engineering docs, but it is not the default voice for this website.

There is exactly one exception that you personally handed me as the hero, and that is the time-calibration story, because that is the question that actually ends people on the witness stand. Everywhere else, if I feel the pull to make a legal or forensic claim, I will ask you first instead of assuming. I will not invent evidence-integrity features for drama. I will describe only what the app actually does.

## What the website is made of

There are four kinds of pages.

First, the home page. At the top is your walkthrough video — the centerpiece you asked for. Below it, the page tells the story of the job from start to finish in a few short steps, and then shows a grid of the features, each of which links to its own page. At the bottom is a clear call to join the beta.

Second, the feature pages. This is the heart of the site. Each feature gets its own page, and every feature page follows the exact same shape so they feel consistent. At the top is the name of the feature and a single sentence naming the pain. Then there is a side-by-side section: on one side a high-resolution screen recording of that feature in action, and on the other side the short story of the pain and how the app solves it. Then, as you scroll down, there is an "under the hood" section with a clean data-flow diagram that explains the technical part in plain language for non-engineers — that is the piece Gemini will produce. At the bottom of each feature page is a link to the next feature and a prompt to join the beta.

Third, the beta page, where people leave their email and, once it exists, get the TestFlight link.

Fourth, a privacy page, which we adapt from the privacy policy that already exists in your app project. We need this anyway for TestFlight and the App Store, and your privacy story is genuinely strong, so it works in our favor.

## A tour of the feature pages

Here is the walk through the actual job, which is also the order of the story. I have marked which ones I consider must-haves for Monday.

The first must-have is time calibration — the marquee. This is the story of the wrong DVR clock. The pain is that DVR clocks are almost always wrong, and proving that your own phone's time was correct is the question that ends people in court. The old way was an external website and manual reference-clock checks. The app's answer is a receipt. You point the phone at the timestamp on the DVR screen, the app reads it with on-device text recognition, and at the exact moment of capture it reaches out to a regional atomic-clock time server, calculates the offset, and prints the whole traceability chain into a report, along with the cropped image of the timestamp and a plain explanation of what the time protocol even is. This page gets the best diagram and is the strongest candidate for something interactive.

The second must-have is importing a request with the on-device AI. The pain is re-typing case details from a PDF or an email request. The fix is that you import the document and Apple's on-device intelligence reads it and fills in as much of the case as it can, without any document ever leaving the phone. That last part is a real privacy win and worth saying out loud.

The third must-have is the auto-written notes and the PDF report. The pain is that after all the field work, you still have to write the thing up. The fix is that the app aggregates everything you entered across the wizard and writes the bullet-point notes and the formal report for you. You verify, the app types.

After those three, there are several strong pages I will build if there is time. There is capturing evidence organized by location, where photos, video, and audio are filed automatically under the right location instead of scattered in your camera roll. There is the map page, where every location in a case shows up on a map and you can tap a pin to call or email either the requesting investigator or the site contact. There is GPS-marking each camera, where you literally stand under a camera and mark its position. There is secure packaging and sharing, where the whole case, documents and media together, is exported as a password-protected encrypted archive, with the password you set yourself, optionally gated behind Face ID. And there is an "on your device, under your control" page, which is really the trust story — almost nothing leaves the phone, and what does leave is just time packets, map searches, and anonymous crash reports.

## The roadmap tease

At the very end of the site, I plan one tasteful "what's next" moment that hints at the future — the investigator and door-knock canvassing mode, the live desktop monitoring from the office, and the will-say statement generation — without promising dates or specifics, and without ever suggesting they are part of the beta. If you would rather keep the site strictly to the shipping app, I will drop the tease entirely. That is one of the questions below.

## The beta signup and the TestFlight reality

Here is something important I learned in my research. A public TestFlight link does not exist until you have a build that has actually passed Apple's beta review. That is not instant. So I designed the beta page to work in two phases that swap with a single setting. Phase one is email collection, which works the day we launch. Phase two replaces the form with a big "Join the TestFlight beta" button the moment your link is live, while still keeping a small "email me about updates" option.

For storing those emails, my recommended plan is to host the site on Vercel, which is the easiest path for this kind of site, and to save the signups into Firebase, which you already have. The emails get written through a secure server-side connection so that nothing sensitive is exposed in the browser, with simple spam protection and a consent checkbox that links to the privacy page. A confirmation email back to the signer is a nice-to-have we can add later; it is not needed for Monday.

## The media plan

Quick note on the "high-res gif" idea. The right format for crisp, large motion on the web is not actually a gif — gifs are huge and look bad at this size. The modern approach is a small silent video that loops automatically, which looks identical to a gif but is roughly ten to twenty times smaller and much sharper. So when you record the app, I will convert your recordings into that format. I have the exact recipe ready. Each feature page gets one short looping recording, and the home page gets your longer narrated walkthrough.

The diagrams for the "under the hood" sections are the one thing I will hand to Gemini. I have already written the briefs for each one, so Gemini can produce them and they will drop straight into the right spots.

## The design direction

The template is already dark with a glass look, which is most of the way to your app's vibe. I plan to recolor it toward your app's actual palette — the deep navy, the Carolina-blue accent, and the gold highlight — and optionally bring in the same technical monospace font your app uses for things like timestamps and offsets, so the website feels like it is speaking the same language as the app. This is a low-risk change and easy to tune.

## The timeline to Monday

Today is Thursday. The conference is Monday. The honest bottleneck is not the code, it is the content — your recordings and walkthrough, and Gemini's diagrams. So my strategy is to build the entire site shell now, with tasteful placeholders, and then drop the real recordings and diagrams in as they arrive, with no code changes needed per asset.

The plan is roughly: Friday, build the shell, the home page, the three must-have feature pages, the beta page wired to the database, the privacy page, and get it deployed to a live link early so the deploy pipeline is proven. Saturday, integrate real recordings as they come and add more feature pages. Sunday, polish, optimize the media, check it on the actual phone you will demo from, and flip the beta link live if Apple has approved a build. Monday morning, final proofread and a smoke test of every page and the signup form.

The single most important risk-reducer is that the site is presentable even if a recording or two is missing, and the beta page works whether or not the TestFlight link exists yet. So Monday is safe either way.

## What I can build completely on my own

Once you answer the few questions below, I can autonomously do all of the following without further input. I can prune the template and restructure it. I can recolor it to your palette. I can build the reusable feature-page layout and the looping-video component. I can write all of the copy from the feature notes I already compiled, in your practitioner-first voice. I can build the home page, all the feature pages, the beta page, and the privacy page. I can wire up the email capture to Firebase through a secure connection. I can make the whole thing fast, responsive, and accessible, and deploy it to a live link. And I can fill every empty media slot with a clean placeholder so the site looks finished before your real assets land.

## What genuinely needs you

A small number of things only you can provide. The decisions in the questions below. The content — your screen recordings, the narrated walkthrough, and your app logo as a vector file. Sign-off on any numbers or claims before they go public. The Firebase project and its credentials, or your okay to connect that when your MCP access is back on. And anything on the Apple side — the App Store Connect and TestFlight setup — since only you have that account.

And one thing goes to Gemini, not you or me: the data-flow diagrams, which I have already briefed.

## The questions

Answer these out loud whenever you like. If you only have a moment, the first six are the ones that unblock Friday's build. For all of them, you can just say "use your default" and I will proceed.

One. The public name. Do we market it as "DVR Extraction Notes," or do you have a cleaner public brand in mind? My default is to use the current name.

Two. The public contact email. Your privacy policy lists one address and your account shows a slightly different one. Which email is the public contact for the site and the beta?

Three. The Apple side. Does an app record already exist in App Store Connect, and has any build passed beta review yet? This is what decides whether Monday's beta page shows a live join link or starts as email-only. Either way is fine; I just need to know which to build.

Four. The one sentence. What is the single line you want a visitor to repeat to a colleague? I have several candidates ready if you want me to just pick the strongest and you can correct it later.

Five. The must-have feature pages. I plan to build three for certain — time calibration, the AI import, and the auto-written reports — and then add the others if time allows. Does that priority sound right, or do you want a different feature leading?

Six. The look. Default is to recolor the site to your app's navy, Carolina blue, and gold, and add your app's technical font for small labels. Good to proceed, or keep the template's existing blue?

And then a few lower-priority ones you can answer now or later.

Seven. How far should I lean into the "forensic" framing beyond the time-calibration page? My strong default is utility-first everywhere else, and I ask you before making any legal-sounding claim. Confirm you are happy with that.

Eight. The numbers. Can I publish "fifteen years, fifteen hundred plus extractions, ten minutes down to under five"? And is there any number you do not want made public?

Nine. The roadmap tease. Are you okay with one tasteful "what's next" mention of the investigator mode, the desktop monitoring, and the will-say generation, with no dates and no promises? Or keep the site strictly to the shipping app?

Ten. Hosting and database. Default is the site on Vercel and the signups in Firebase. Any reason to prefer otherwise, and which Firebase project should I use — your existing one or a fresh one?

Eleven. The domain. Do you have a domain you want this on, or should I ship it on a temporary link for Monday and point a real domain at it later?

Twelve. Content. Which feature recordings can you realistically capture before Monday, and do you already have the narrated walkthrough, or is that still to record? This only affects how much real footage versus placeholder we show on Monday — it does not block me building anything.

That is the whole plan. Say the word, even just "go with your defaults," and I will start building the shell.
