/* ===========================================================================
   CAW Academy — content data for the interactive sections (A–F).
   ---------------------------------------------------------------------------
   This file holds TEXT ONLY. No DOM, no styling, no behaviour.
   caw-interactive.js reads window.CAW_CONTENT and renders it.

   SOURCE OF TRUTH
   ---------------
   Every course entry below was taken from the bundled course JSON on
   2026-08-28 (CAWTrainer-iOS/CAWTrainer/Data/Resources/*.json). Lesson counts
   and reading times are real: `lessons` is the number of lessons in that
   edition's file, `hours` is the sum of each lesson's `minutes`, rounded to
   the nearest half hour.

   Catalogue totals on that date (recount, do not quote from memory):
     EASA      24 courses ·  507 lessons · ~77.5 h
     UK CAA    20 courses ·  466 lessons · ~68 h
     UAE GCAA  18 courses ·  427 lessons · ~64 h
     FAA       18 courses ·  290 lessons · ~47 h
     TOTAL     80 courses · 1,690 lessons · 24,470 quiz items · 11,602 flashcards

   RE-RUN AFTER ANY CONTENT CHANGE — see docs/WEBSITE-INTERACTIVE-SECTIONS.md,
   "Content inventory check". Numbers move at every authoring pass.

   ITEMS MARKED "verify:" NEED VITALI'S CONFIRMATION BEFORE THEY GO LIVE.
   They describe admin/manager behaviour that the website should only claim
   once the feature is confirmed shipped.
   =========================================================================== */
(function (w) {
  'use strict';

  /* --- framework labels ------------------------------------------------- */
  var FW = {
    EASA:       { label: 'EASA',     flag: '🇪🇺', naming: 'Part-…' },
    'UK CAA':   { label: 'UK CAA',   flag: '🇬🇧', naming: 'UK Part-…' },
    'UAE GCAA': { label: 'UAE GCAA', flag: '🇦🇪', naming: 'CAR-…' },
    FAA:        { label: 'FAA',      flag: '🇺🇸', naming: '14 CFR' }
  };

  /* =========================================================================
     COURSE REGISTRY
     Each entry: title, description, editions {framework: [lessons, hours]},
     features[], and (where useful) a scenario line.
     Sections A and D reference these by key, so a course is described once.
     ========================================================================= */
  var COURSES = {

    aof: {
      label: 'Operating Framework',
      title: 'Airline Operating Framework (AOF)',
      description: 'The orientation course. It sets out how an airline is authorised to operate and where airworthiness sits inside that structure — from ICAO down to the detailed requirements a team works with every day.',
      editions: { EASA: [36, 7], 'UK CAA': [29, 5], 'UAE GCAA': [28, 6.5], FAA: [21, 4] },
      free: true,
      features: [
        'The regulatory cascade, in order: ICAO, the Basic Regulation, the implementing regulations.',
        'The Operating Licence and the Air Operator Certificate, and what each one certifies.',
        'Where the CAMO, the maintenance organisation and the authority meet.',
        'A reader’s guide to the other frameworks, so a document from another authority can be placed.'
      ],
      scenario: 'A document arrives with a reference nobody recognises. The course shows how to place it in the cascade before reading a word of it.'
    },

    m: {
      label: 'Part-M',
      title: 'Part-M — Continuing Airworthiness Requirements',
      description: 'The continuing-airworthiness rule set, article by article: who is responsible, what must be recorded, how maintenance is controlled and how an aircraft is released back to service.',
      editions: { EASA: [65, 11], 'UK CAA': [63, 9], 'UAE GCAA': [71, 7.5] },
      free: true,
      note: 'The UAE edition is CAR-M. In the FAA edition the equivalent duties are covered by Part 43 & 91 and the Air Carrier CAMP course.',
      features: [
        'Responsibility, records, the maintenance programme, occurrence reporting and release to service.',
        'Every article carries its own lesson, quiz set and flashcards.',
        'Audit findings written as scenarios: situation, root cause, consequence, article.',
        'Cross-references to Part-CAMO and Part-145 instead of repeating them.'
      ]
    },

    camo: {
      label: 'Part-CAMO',
      title: 'Part-CAMO — Continuing Airworthiness Management Organisations',
      description: 'How a CAMO is approved, staffed and run: the exposition, the nominated persons, the management system, contracted work and the interface with maintenance.',
      editions: { EASA: [32, 5], 'UK CAA': [23, 3.5] },
      note: 'UAE CAMO duties are covered inside the CAR-M course. There is no direct FAA equivalent — the FAA edition covers the same ground through the Air Carrier CAMP course.',
      features: [
        'The CAME: what goes in it and why an auditor opens it first.',
        'Nominated persons and the competence expected of each role.',
        'The management system, including safety and compliance monitoring.',
        'A dedicated fleet phase-in chapter covering induction work a small CAMO usually runs.'
      ]
    },

    p145: {
      label: 'Part-145',
      title: 'Part-145 — Maintenance Organisation Approvals',
      description: 'The approval a maintenance organisation holds, and the day-to-day rules behind it: facilities, personnel, data, tools, components, certifying staff and the certificate of release to service.',
      editions: { EASA: [30, 5.5], 'UK CAA': [30, 4], 'UAE GCAA': [34, 3.5], FAA: [16, 2] },
      features: [
        'The MOE and how each part of it maps to a requirement.',
        'Certifying staff, authorisations and the limits on them.',
        'Receiving inspection, the bonded store, tool calibration and the work pack.',
        'What an auditor looks for, written from real finding patterns.'
      ],
      scenario: 'A component arrives with paperwork that does not match the part. The lesson follows the receiving-inspection decision to its conclusion.'
    },

    partis: {
      label: 'Part-IS',
      title: 'Part-IS — Information Security Management',
      description: 'The information-security management requirements that now apply to approved organisations, and how they fit alongside an existing safety management system.',
      editions: { EASA: [15, 2], 'UK CAA': [18, 3], 'UAE GCAA': [13, 2] },
      note: 'The UK edition covers the CAA aviation cyber-security scheme. The UAE edition covers GCAA cybersecurity guidance.',
      features: [
        'Risk identification, assessment and treatment in an aviation setting.',
        'Incident detection, response and reporting.',
        'How the information-security management system sits next to the SMS.',
        'Practical examples drawn from maintenance and CAMO systems.'
      ]
    },

    p21: {
      label: 'Part-21',
      title: 'Part-21 — Design & Production Organisations, Certification',
      description: 'Initial airworthiness: how a product is certified, how design and production organisations are approved, and how changes, repairs and permits to fly are handled.',
      editions: { EASA: [38, 4], 'UK CAA': [22, 1.5], 'UAE GCAA': [30, 5], FAA: [15, 2] },
      features: [
        'The certification basis and how it is set.',
        'Design organisation and production organisation approvals.',
        'Major and minor changes, repairs and supplemental type certificates.',
        'Release documents and what each one certifies.'
      ]
    },

    cs: {
      label: 'Certification Specifications',
      title: 'Certification Specifications (CS) — the Airworthiness Codes',
      description: 'The airworthiness codes themselves, and how a CAMO or maintenance engineer reads them: what each code covers, how it is amended, and how it feeds the certification basis.',
      editions: { EASA: [31, 4], 'UK CAA': [31, 3.5], 'UAE GCAA': [21, 3], FAA: [15, 2] },
      features: [
        'Product scope: large aeroplanes, rotorcraft, engines, propellers, APUs and equipment.',
        'How the certification basis is fixed and what happens when a code is amended.',
        'Bilateral agreements and the validation of foreign approvals.',
        'The UK edition covers CS-UKTSO and the codes the UK retains.'
      ]
    },

    iawfam: {
      label: 'Part-21 & CS for CAMO',
      title: 'Initial Airworthiness Familiarisation for CAMO Staff',
      description: 'A short bridge course. It covers only the parts of Part-21 and the certification specifications that continuing-airworthiness staff actually use.',
      editions: { EASA: [10, 1.5], 'UK CAA': [10, 1], 'UAE GCAA': [10, 1.5] },
      features: [
        'Reading a type certificate data sheet.',
        'Where approved data comes from, and what makes it approved.',
        'Modifications and repairs from the CAMO side of the desk.',
        'Airworthiness limitations and where they bind the maintenance programme.'
      ]
    },

    amp: {
      label: 'AMP',
      title: 'Aircraft Maintenance Programme (AMP) Development',
      description: 'Building and maintaining the approved maintenance programme: the source documents, the task list, intervals, escalation, and keeping the programme approved as the fleet changes.',
      editions: { EASA: [22, 3], 'UK CAA': [22, 3], 'UAE GCAA': [22, 3] },
      note: 'The FAA edition covers this ground through the Air Carrier CAMP and MSG-3 / MRB courses.',
      features: [
        'MRB report, MPD and the operator’s own additions.',
        'Airworthiness limitations and certification-maintenance requirements.',
        'Interval setting, escalation and the evidence an authority expects.',
        'Programme approval, amendment and annual review.'
      ]
    },

    arc: {
      label: 'ARC',
      title: 'The Airworthiness Review & the ARC',
      description: 'The airworthiness review from end to end: preparation, the document review, the physical survey, findings, the recommendation, issue, validity and extension.',
      editions: { EASA: [20, 3.5], 'UK CAA': [20, 3.5], 'UAE GCAA': [20, 3.5] },
      features: [
        'What a full review covers and in what order.',
        'Validity, the two extensions and the 30-day rule.',
        'The conditions that make a certificate invalid.',
        'Findings: how they are raised, classified and closed.'
      ],
      scenario: 'An aircraft transfers to another register with four months left on its certificate. The lesson works through what actually happens to it.'
    },

    reliability: {
      label: 'Reliability',
      title: 'Fleet Reliability & Availability Management',
      description: 'Running a reliability programme and managing fleet availability: the data, the alert levels, the reviews, and the contributing factors behind technical downtime.',
      editions: { EASA: [23, 2.5], 'UK CAA': [23, 3], 'UAE GCAA': [23, 3], FAA: [15, 2.5] },
      features: [
        'What the programme must produce, and for whom.',
        'Alert levels, trends and when to act on them.',
        'Classifying technical downtime: spares, manpower, outstations, disposition, operations.',
        'The reliability review meeting and the decisions it makes.'
      ]
    },

    mec: {
      label: 'Maintenance Economics',
      title: 'Maintenance Economics & Cost Management',
      description: 'The cost side of the technical department: budgets, cost drivers, benchmarking, contracts and the decisions that move maintenance cost across a fleet’s life.',
      editions: { EASA: [24, 3.5], 'UK CAA': [22, 3], 'UAE GCAA': [22, 3], FAA: [22, 4.5] },
      features: [
        'Direct maintenance cost and how it is built up.',
        'Check cost and downtime, and how both are controlled.',
        'Shop-visit representation and scrap control.',
        'Contract types, rates and what each one really covers.'
      ]
    },

    lease: {
      label: 'Aircraft Leasing',
      title: 'Aircraft & Engine Leasing',
      description: 'The lease lifecycle from the technical side: the agreement, delivery, the records package, maintenance reserves, return conditions and redelivery.',
      editions: { EASA: [40, 7.5], 'UK CAA': [39, 6.5], 'UAE GCAA': [39, 7], FAA: [26, 4.5] },
      features: [
        'Reading the technical schedules of a lease agreement.',
        'Maintenance reserves, rates and escalation.',
        'The records package and what makes it acceptable.',
        'Return conditions, the redelivery check and open items.',
        'A capstone lesson that follows one redelivery from start to finish.'
      ],
      scenario: 'A redelivery inspection finds a records gap on a life-limited part. The lesson follows the consequences through to the settlement.'
    },

    eng: {
      label: 'Engine & LLP',
      title: 'Engine & LLP Asset Management',
      description: 'Running engines and life-limited parts as high-value assets: time on wing, the shop-visit cycle, workscope building, the LLP stack and back-to-birth records.',
      editions: { EASA: [23, 3.5], 'UK CAA': [23, 3], 'UAE GCAA': [23, 4], FAA: [23, 4] },
      features: [
        'Time on wing and what drives it.',
        'The shop-visit lifecycle and workscope decisions.',
        'Table inspection, representation and scrap control.',
        'The LLP stack, remaining cyclic life and back-to-birth records.'
      ]
    },

    recycle: {
      label: 'Recycling',
      title: 'Aircraft Recycling & End-of-Life',
      description: 'What happens at retirement: teardown planning, part recovery and eligibility, records, and the controls that keep used serviceable material trustworthy.',
      editions: { EASA: [20, 4], 'UK CAA': [20, 3.5], 'UAE GCAA': [20, 3.5], FAA: [20, 3] },
      features: [
        'Planning a teardown and sequencing the recovery.',
        'Part eligibility, traceability and acceptance.',
        'Records at end of life, including life-limited parts.',
        'Fraud patterns: re-identified parts and how they are caught.'
      ]
    },

    offshore: {
      label: 'Offshore Registries',
      title: 'Offshore Registries & Article 83 bis',
      description: 'Cross-border registration and the transfer of oversight: why fleets are registered outside the operator’s state, what an Article 83 bis agreement moves, and what it does not.',
      editions: { EASA: [13, 2.5], 'UK CAA': [21, 3] },
      features: [
        'How a registry is chosen and what it changes.',
        'What an Article 83 bis agreement transfers.',
        'Records, marks and continuing-airworthiness duties across a transfer.',
        'Practical traps at delivery and redelivery.'
      ]
    },

    hf: {
      label: 'Human Factors',
      title: 'Human Factors in Maintenance',
      description: 'Continuation training in human factors: how maintenance error happens, the conditions that make it more likely, and the defences that catch it.',
      editions: { EASA: [11, 1.5], 'UK CAA': [13, 2.5], 'UAE GCAA': [13, 2.5], FAA: [11, 2] },
      features: [
        'Error types and the conditions behind them.',
        'The well-known error-producing conditions, with maintenance examples.',
        'Communication, shift handover and documentation.',
        'Just culture, reporting and what happens after a report.'
      ]
    },

    sms: {
      label: 'Safety Management',
      title: 'Safety Management Systems (SMS)',
      description: 'The four components of a safety management system and what each one requires of an approved organisation in practice.',
      editions: { EASA: [12, 1], 'UK CAA': [13, 2.5], 'UAE GCAA': [13, 2], FAA: [13, 2] },
      features: [
        'Safety policy, risk management, assurance and promotion.',
        'Hazard identification and risk assessment with worked examples.',
        'Safety performance indicators and targets.',
        'How the SMS meets the compliance-monitoring function.'
      ]
    },

    ewis: {
      label: 'EWIS',
      title: 'EWIS — Electrical Wiring Interconnection Systems',
      description: 'Specialised continuation training on aircraft wiring. The EASA edition is split into the target-group bands, so each role studies the band that applies to it.',
      editions: { EASA: [30, 3.5], 'UK CAA': [13, 2], 'UAE GCAA': [14, 2.5], FAA: [13, 2] },
      note: 'The EASA edition ships as four target-group courses (Groups 1-2, Group 3, Groups 4-5, Groups 6-8). The figures above are the four combined.',
      features: [
        'Wiring degradation, contamination and damage.',
        'Inspection standards and housekeeping.',
        'Wire separation, protection and repair practice.',
        'Target-group content matched to the role.'
      ]
    },

    fts: {
      label: 'Fuel Tank Safety',
      title: 'Fuel Tank Safety',
      description: 'Fuel tank safety continuation training. The EASA edition is split into Phase 1 awareness and Phase 2 specific training.',
      editions: { EASA: [12, 1.5], 'UK CAA': [11, 2], 'UAE GCAA': [11, 2], FAA: [11, 2] },
      features: [
        'Why the requirement exists and what it protects against.',
        'Critical design configuration control limitations, and what breaches one.',
        'Maintenance and inspection practice inside the tank.',
        'Phase 1 awareness and Phase 2 specific content, separated.'
      ]
    },

    p43: {
      label: 'Part 43 & 91',
      title: '14 CFR Part 43 & 91 — Maintenance & Airworthiness Responsibility',
      description: 'The FAA edition’s continuing-airworthiness anchor: who may perform maintenance, how it is recorded, and where responsibility for airworthiness sits.',
      editions: { FAA: [19, 2.5] },
      free: true,
      features: [
        'Persons authorised to perform and approve maintenance.',
        'Maintenance records and the approval for return to service.',
        'Owner and operator responsibilities.',
        'Inspection programmes and their intervals.'
      ]
    },

    p39: {
      label: 'Part 39',
      title: '14 CFR Part 39 — Airworthiness Directives',
      description: 'How an airworthiness directive is issued, what it requires, how compliance is recorded, and what happens when an aircraft cannot comply.',
      editions: { FAA: [11, 2] },
      features: [
        'The unsafe condition and the rulemaking behind a directive.',
        'Compliance methods, times and alternative methods.',
        'Recording compliance so it survives an audit.',
        'Ferry permits when a directive cannot be met in place.'
      ]
    },

    p65: {
      label: 'Part 65',
      title: '14 CFR Part 65 — Mechanic & Repairman Certification',
      description: 'US certification of maintenance personnel: eligibility, ratings, privileges and the limits that go with them.',
      editions: { FAA: [12, 2] },
      features: [
        'Mechanic certificates and their ratings.',
        'Repairman certificates and where they apply.',
        'Privileges, limitations and recent-experience requirements.',
        'Records and the duties attached to a certificate.'
      ]
    },

    camp: {
      label: 'Air Carrier CAMP',
      title: 'Air Carrier Maintenance Program (14 CFR Parts 121 & 135)',
      description: 'The US air-carrier maintenance program: the required elements, the continuing analysis and surveillance system, and the manual structure behind them.',
      editions: { FAA: [14, 2] },
      features: [
        'The elements a carrier’s program must contain.',
        'Continuing analysis and surveillance.',
        'Manual structure and required inspection items.',
        'Contract maintenance and oversight of it.'
      ]
    },

    msg3: {
      label: 'MSG-3 / MRB',
      title: 'MSG-3 & the Maintenance Review Board',
      description: 'How scheduled maintenance is developed: the MSG-3 analysis, the industry steering committee process and the maintenance review board report.',
      editions: { FAA: [13, 2] },
      features: [
        'The MSG-3 decision logic.',
        'Systems, structures and zonal analysis.',
        'How the MRB report becomes an operator programme.',
        'Evolution of the programme after entry into service.'
      ]
    }
  };

  /* =========================================================================
     A — "Made for the people who keep aircraft airworthy"
     Trigger UI: the existing .chips pills. Each opens a modal.
     ========================================================================= */
  var GROUPS = [
    {
      id: 'camo-staff',
      pill: 'CAMO staff & post-holders',
      title: 'CAMO staff & post-holders',
      intro: 'For people who manage continuing airworthiness: planners, engineers, records staff and the nominated persons who are responsible for the organisation. The courses follow the same order as the work — the framework first, then the rule set, then the programmes built on it.',
      courses: ['aof', 'm', 'camo', 'amp', 'arc', 'reliability'],
      why: [
        'The exposition, the maintenance programme and the airworthiness review are covered as one connected set, not as separate topics.',
        'Every article carries its own quiz and flashcards, so a post-holder can check where the gaps are before an audit rather than after one.'
      ]
    },
    {
      id: 'p145-engineers',
      pill: 'Part-145 engineers',
      title: 'Part-145 engineers',
      intro: 'For certifying staff, mechanics, planners and support staff in an approved maintenance organisation. The regulatory course is paired with the continuation-training subjects that a maintenance organisation has to keep current.',
      courses: ['p145', 'hf', 'ewis', 'fts', 'sms', 'partis'],
      why: [
        'Human Factors, EWIS and Fuel Tank Safety are already structured the way a continuation-training programme needs them, including the EWIS target-group split.',
        'The material works offline on a phone or tablet, so it can be studied in the hangar or at an outstation.'
      ]
    },
    {
      id: 'review-staff',
      pill: 'Airworthiness review staff',
      title: 'Airworthiness review staff',
      intro: 'For staff who prepare, carry out or recommend airworthiness reviews. The review course is the centre; the surrounding courses cover the records and programmes a review actually examines.',
      courses: ['arc', 'm', 'amp', 'camo', 'lease'],
      why: [
        'Validity, extension and the invalidity conditions are handled as scenarios, which is how they come up in a review.',
        'Records questions are practised against the same article set the review is measured on.'
      ]
    },
    {
      id: 'students',
      pill: 'Part-147 / Part-66 students',
      title: 'Part-147 / Part-66 students',
      intro: 'For people studying towards a licence or working through an approved training course. The material assumes no prior knowledge and builds up to the level the regulations are written at.',
      courses: ['aof', 'm', 'p145', 'hf', 'ewis', 'fts'],
      why: [
        'The Operating Framework and Part-M courses are free in every framework edition, so a student can start without a licence code.',
        'Flashcards and a timed assessment with a 75% pass mark give a realistic check of readiness before an examination.'
      ],
      note: 'CAW Academy is a study aid. It is not an approved Part-147 course and does not replace one.'
    },
    {
      id: 'asset-managers',
      pill: 'Technical & asset managers',
      title: 'Technical & asset managers',
      intro: 'For people responsible for the value of the fleet as well as its airworthiness: cost, contracts, leases, engines and end-of-life decisions.',
      courses: ['mec', 'lease', 'eng', 'reliability', 'recycle', 'offshore'],
      why: [
        'These courses connect the regulatory record to the commercial consequence — a records gap becomes a redelivery cost, a scrapped part becomes a shop-visit variance.',
        'Worked examples use realistic figures and are kept type-agnostic, so nothing is tied to one manufacturer or one operator.'
      ]
    },
    {
      id: 'quality-safety',
      pill: 'Quality & safety teams',
      title: 'Quality & safety teams',
      intro: 'For compliance monitoring, quality and safety staff who audit against the regulations rather than work to them directly.',
      courses: ['sms', 'hf', 'partis', 'p145', 'arc'],
      why: [
        'Each regulatory lesson ends with a "Where it goes wrong" section written as an audit finding: situation, root cause, consequence and the article breached.',
        'The same material can be issued to the whole organisation, so auditor and auditee are working from one baseline.'
      ]
    }
  ];

  /* =========================================================================
     B — "Train your whole airworthiness team to one standard"
     Trigger UI: the existing .card items in #organisations.
     Shared blocks (catalogue structure, admin, in-app activity) are defined
     once and reused, so the modals stay consistent.
     ========================================================================= */
  var B_SHARED = {
    structure: {
      heading: 'How the catalogue is organised',
      lead: 'Three levels, in this order:',
      items: [
        '<b>Framework</b> — EASA, UK CAA, UAE GCAA or FAA. Each is a complete edition of the catalogue, written against that authority’s own references. A person sees one framework at a time.',
        '<b>Course</b> — a regulation, a Part or a practitioner subject: Part-M, Part-145, the Airworthiness Review, Maintenance Economics, and so on.',
        '<b>Lesson</b> — the unit of study, normally one article or one topic, about 8 to 14 minutes of reading. Each lesson carries its own flashcards and quiz.'
      ],
      close: 'Every lesson has the same five sections: In brief, In depth, Examples in practice, Where it goes wrong, and Where it applies. Once a person has read two lessons they know where to look in every other one.'
    },
    admin: {
      heading: 'Giving access and following progress',
      items: [
        'Access is granted by licence. A licence has a scope (which courses and which frameworks) and an end date.',
        'A licence can be tied to your email domain, so only people with a company address can use it.',
        'Each seat is single-use and stays with the account that redeemed it. Codes cannot be passed around.',
        'A free trial is a normal licence with a short validity. Study progress survives the trial ending.',
        'Completion is evidenced by the certificate: each one carries a unique number and a QR code, confirmable in the public registry on this site.'
      ],
      verify: 'verify: confirm the exact manager-facing reporting available before publishing any claim about a progress dashboard. The registry and licence administration are confirmed; per-learner progress reporting for managers is not described here on purpose.'
    },
    inApp: {
      heading: 'What people do in the app',
      items: [
        'Read lessons, with the regulatory reference always visible.',
        'Listen to a lesson read aloud, with the paragraph being spoken highlighted.',
        'Highlight text and attach notes, then review them in the notes panel.',
        'Look up any acronym in the built-in glossary.',
        'Practise with flashcards and rate their own recall.',
        'Sit a timed assessment with a 75% pass mark, then review the wrong answers.',
        'Track completion per course and across the catalogue.',
        'Generate a certificate once every lesson is complete and the assessment is passed.'
      ]
    }
  };

  var BENEFITS = [
    {
      id: 'one-standard',
      card: 'One standard, whole team',
      title: 'One standard, whole team',
      intro: 'Everyone in the department studies the same material, in the same order, against the same references. Differences between people become differences in progress, not differences in what they were taught.',
      aof: 'The Airline Operating Framework course is the shared starting point. It places the operator, the CAMO, the maintenance organisation and the authority in one structure before anyone opens a specific Part. A planner and a shop engineer then read Part-M and Part-145 from the same map.',
      extra: {
        heading: 'What this looks like in practice',
        items: [
          'One framework edition is selected for the organisation, so nobody studies the wrong authority’s wording.',
          'The same lesson identifiers apply across the team, which makes internal briefings and refresher plans easy to write.'
        ]
      }
    },
    {
      id: 'audit-evidence',
      card: 'Audit-ready evidence',
      title: 'Audit-ready evidence',
      intro: 'A certificate is only useful if someone else can check it. Every certificate issued by the app carries a unique number and a QR code that resolves to a public verification page.',
      aof: 'The Operating Framework course explains what the organisation is accountable for and to whom, which is the context an auditor asks about first. It is free in every framework edition, so it can be issued to everyone.',
      extra: {
        heading: 'How verification works',
        items: [
          'Certificate numbers are issued centrally, so no two are the same.',
          'Anyone can check a number and holder name on the verification page. The check returns valid or invalid, the course and the date.',
          'Scanning the QR code on a certificate shows the full details, because the person scanning is already holding the document.'
        ]
      }
    },
    {
      id: 'continuation',
      card: 'Supports continuation training',
      title: 'Supports continuation training',
      intro: 'Human Factors, Safety Management, EWIS and Fuel Tank Safety are already structured the way a recurrent programme needs them, including the EWIS target-group bands and the two Fuel Tank Safety phases.',
      aof: 'The Operating Framework course gives new and returning staff the same orientation before they start the subject material, so a recurrent session does not begin with a definition round.',
      extra: {
        heading: 'What is covered',
        items: [
          'EWIS: four target-group courses in the EASA edition, matched to the role.',
          'Fuel Tank Safety: Phase 1 awareness and Phase 2 specific training, separated.',
          'Human Factors and Safety Management in all four framework editions.'
        ]
      },
      note: 'The app supports your approved programme. It does not replace it, and it is not an approved training organisation.'
    },
    {
      id: 'onboarding',
      card: 'Onboard new hires faster',
      title: 'Onboard new hires faster',
      intro: 'A new starter can begin on day one, at their own pace, without a classroom booking. The material starts from no prior knowledge and builds to the level the regulations are written at.',
      aof: 'The Airline Operating Framework course is the intended first course. It answers the questions a new starter cannot ask out loud: what authorises this airline to fly, what the CAMO actually does, where the maintenance organisation fits, and which document sits above which. It is free in every edition, so a new hire can start before any licence is issued.',
      extra: {
        heading: 'A workable first two weeks',
        items: [
          'Week 1 — Operating Framework (about 5 to 7 hours of reading, depending on the edition).',
          'Week 2 — the Part that matches the role: Part-M for CAMO staff, Part-145 for maintenance staff.',
          'End of week 2 — the timed assessment on the first course, and the certificate that follows a pass.'
        ]
      }
    },
    {
      id: 'seats',
      card: 'Manage seats & track progress',
      title: 'Managing seats',
      intro: 'Access is administered centrally. You decide which courses and which framework a licence covers, how long it runs, and who may redeem it.',
      aof: 'Because the Operating Framework and Part-M courses are free in every edition, you can give a whole department a common starting point before deciding which paid scopes each role needs.',
      extra: B_SHARED.admin
    },
    {
      id: 'offline',
      card: 'Works where your people work',
      title: 'Works where your people work',
      intro: 'The course content is stored on the device. Once a course is installed it can be read in a hangar, at an outstation or on an aircraft with no connection at all.',
      aof: 'The Operating Framework course is small enough to be read in short sessions between tasks, which is how most people fit training into a shift.',
      extra: {
        heading: 'Availability',
        items: [
          'iPhone, iPad and Mac today. An Android app is in preparation.',
          'Progress, highlights, notes and bookmarks follow the account across devices.',
          'Reading a lesson aloud runs on the device, with no connection and no external service.'
        ]
      }
    }
  ];

  /* =========================================================================
     C — "Built to make complex regulations clear"
     Trigger UI: a tab strip in #why (visually tabs, semantically buttons that
     open dialogs — see the accessibility note in the spec).
     ========================================================================= */
  var CLARITY = [
    {
      id: 'clear-structured',
      tab: 'Clear and structured',
      title: 'Clear and structured',
      intro: 'Regulatory text is written to be precise, not to be read for the first time. Each lesson rewrites one article in plain English, keeps the reference visible, and follows the same five sections every time.',
      examples: [
        { h: 'The same five sections, every lesson', p: 'In brief, In depth, Examples in practice, Where it goes wrong, Where it applies. A reader always knows where the summary ends and the detail begins.' },
        { h: 'The reference stays on screen', p: 'The article number sits in the lesson subtitle and in the Where it applies section, so the plain-English version can always be checked against the source.' },
        { h: 'Sentences written for non-native readers', p: 'Short sentences, one idea at a time, and an acronym is only used after the glossary entry exists for it. Any acronym can be tapped to open the glossary.' }
      ]
    },
    {
      id: 'case-based',
      tab: 'Real-world & case-based',
      title: 'Real-world & case-based',
      intro: 'Every regulatory lesson ends with the situations where the requirement is actually missed. The cases are drawn from real audit and operational experience and are written to be type-agnostic — no manufacturer, operator or registration appears in them.',
      examples: [
        { h: '"Where it goes wrong" is an audit finding, not a warning', p: 'Each case gives the situation, the root cause, the consequence and the article breached. Example, from the Part-145 course: a component arrives with paperwork that does not match the part, and the lesson follows the receiving-inspection decision through to the release.' },
        { h: 'Quiz questions are scenarios', p: 'Questions describe a situation rather than quoting a paragraph number. From the Airworthiness Review course: an aircraft transfers to another register with four months left on its certificate — what happens to the certificate? The explanation covers why the tempting answers are wrong, not just why the right one is right.' },
        { h: 'Capstone lessons run one case end to end', p: 'The leasing course closes with a full redelivery, from the return-condition review to the settlement of open items.' }
      ]
    },
    {
      id: 'exam-ready',
      tab: 'Exam-ready',
      title: 'Exam-ready',
      intro: 'Practice is built into every lesson, and the course ends with a timed assessment. The pass mark is 75%.',
      examples: [
        { h: 'Flashcards rated by the reader', p: 'Each lesson has its own flashcards. A person rates their own recall, and the cards they keep missing come back more often.' },
        { h: 'Every question stands on its own', p: 'Questions are written so they still make sense when pulled out of their lesson and mixed into a large assessment. Wrong options are plausible answers from the same subject, not obvious filler.' },
        { h: 'A review that points back at the lesson', p: 'After an assessment, each wrong answer shows the correct answer with its reasoning and a link straight to the lesson it came from.' }
      ]
    },
    {
      id: 'synced',
      tab: 'Synced & yours to keep',
      title: 'Synced & yours to keep',
      intro: 'Study is spread across devices and interrupted constantly. Progress, highlights, notes and bookmarks follow the account so a session can be picked up where it stopped.',
      examples: [
        { h: 'Highlights and notes', p: 'Text can be highlighted in three colours and a note attached to it. The notes panel lists every note in the lesson, and notes can be exported to a file.' },
        { h: 'A bookmark where you actually stopped', p: 'The bookmark is set on the paragraph you select, and an orange rule marks it. It is never set automatically.' },
        { h: 'Progress that is yours', p: 'Completion, assessment history and certificates stay with the account. If a trial licence ends, the record of what was studied remains.' }
      ]
    }
  ];

  /* =========================================================================
     D — "The whole airworthiness picture in one app"
     Trigger UI: a six-step path rail under the existing track cards.
     ========================================================================= */
  var PATH = [
    {
      id: 'foundations',
      short: 'the operating framework, before any Part',
      step: 'Foundations',
      title: 'Step 1 — Foundations',
      duration: 'About 5 to 7 hours, depending on the framework edition',
      intro: 'Start with the structure. Before any Part makes sense, a reader needs to know what authorises the operator to fly, who holds which approval, and which document sits above which.',
      courses: ['aof'],
      features: [
        'Free in every framework edition, with no account required.',
        'Ordered from ICAO down to the detailed requirements.',
        'A reader’s guide to the other frameworks, so a foreign document can be placed.',
        'Ends with a timed assessment and a certificate.'
      ]
    },
    {
      id: 'framework',
      short: 'select EASA, UK CAA, UAE GCAA or FAA',
      step: 'Your framework',
      title: 'Step 2 — Choose your framework',
      duration: 'A single choice, changeable at any time',
      intro: 'The catalogue exists as four complete editions: EASA, UK CAA, UAE GCAA and FAA. Each is written against its own authority’s references. A person selects one and sees only that edition, so no one studies the wrong wording by accident.',
      courses: [],
      features: [
        'EASA — 24 courses, 507 lessons.',
        'UK CAA — 20 courses, 466 lessons.',
        'UAE GCAA — 18 courses, 427 lessons.',
        'FAA — 18 courses, 290 lessons.',
        'Counts recorded on 28 August 2026. See "The same syllabus, in your framework" below for what changes between editions.'
      ]
    },
    {
      id: 'core',
      short: 'the rule set the role works to',
      step: 'Core regulations',
      title: 'Step 3 — The regulations for your role',
      duration: 'From about 4 hours to about 20 hours, depending on the role',
      intro: 'Next comes the rule set the role actually works to. CAMO staff take Part-M and Part-CAMO; maintenance staff take Part-145; design and certification staff take Part-21 and the certification specifications.',
      courses: ['m', 'camo', 'p145', 'partis', 'p21', 'cs', 'iawfam'],
      features: [
        'One lesson per article, so a course can be used as a reference as well as a study path.',
        'Quiz and flashcards attached to every article.',
        'Cross-references between Parts instead of repeated content.'
      ]
    },
    {
      id: 'practice',
      short: 'flashcards, quizzes and real findings',
      step: 'Practice & cases',
      title: 'Step 4 — Practice and real cases',
      duration: 'Continuous — practice sits inside every lesson',
      intro: 'Reading alone does not hold. Each lesson carries flashcards, a quiz and a set of cases showing where the requirement is missed in practice.',
      courses: ['amp', 'arc', 'reliability'],
      features: [
        '24,470 quiz items and 11,602 flashcards across the four editions.',
        'Practice hub per course: flashcards, all questions, and a review of missed questions.',
        'Cases written as audit findings: situation, root cause, consequence, article.',
        'Counts recorded on 28 August 2026.'
      ]
    },
    {
      id: 'assessment',
      short: 'timed, 75% pass mark, certificate issued',
      step: 'Assessment & certificate',
      title: 'Step 5 — Assessment and certificate',
      duration: 'One timed assessment per course',
      intro: 'Each course closes with a timed assessment drawn fresh from the whole course. The pass mark is 75%. A course counts as complete when every lesson is complete and the assessment is passed.',
      courses: [],
      features: [
        'Results are shown at the end, then each wrong answer is reviewed with its reasoning.',
        'Every wrong answer links back to the lesson it came from.',
        'Attempt history is kept per course, with the date and score.',
        'On a pass, a certificate can be issued with a unique number and QR code, confirmable in the public registry.'
      ]
    },
    {
      id: 'current',
      short: 'content updates as the regulations move',
      step: 'Staying current',
      title: 'Step 6 — Staying current',
      duration: 'Ongoing',
      intro: 'Regulations change. Content updates are delivered to the app without waiting for a store release, and every change is listed so a reader can see what moved.',
      courses: [],
      features: [
        'A What’s New feed listing each content change, with the lessons affected.',
        'Regulatory changes tracked against the published sources for all four authorities.',
        'Updates arrive in the app; nothing has to be re-purchased.',
        'Progress and notes are unaffected by an update.'
      ]
    }
  ];

  /* =========================================================================
     E — "The same syllabus, in your framework"
     Trigger UI: the existing .fw-pill items.
     ========================================================================= */
  var FRAMEWORKS = [
    {
      id: 'easa',
      free: { courses: [{ n: 'Airline Operating Framework', l: '36 lessons' }, { n: 'Part-M Continuing Airworthiness', l: '65 lessons' }], note: 'Open in full, with no account and no licence.' },
      flag: '🇪🇺',
      pill: 'EASA',
      naming: 'Part-…',
      title: 'EASA',
      what: 'The European Union Aviation Safety Agency framework. It applies in the EU Member States and in the states that have adopted the EU rules. It is the edition the catalogue was originally written against.',
      basedOn: 'The Basic Regulation (Regulation (EU) 2018/1139) and the implementing regulations made under it — in particular Regulation (EU) No 1321/2014 for continuing airworthiness (Part-M, Part-CAMO, Part-145, Part-CAO), Regulation (EU) No 748/2012 for initial airworthiness (Part-21), the certification specifications, and the information-security regulations for Part-IS.',
      changes: [
        'Naming: annexes are called Parts — Part-M, Part-CAMO, Part-145, Part-21.',
        'Release documents: EASA Form 1 for components, EASA Form 15 for the airworthiness review certificate.',
        'Reference style: articles such as M.A.302, CAMO.A.305, 145.A.50, 21.A.163.',
        'Scope: 24 courses, 507 lessons.'
      ]
    },
    {
      id: 'uk',
      free: { courses: [{ n: 'Airline Operating Framework', l: '29 lessons' }, { n: 'UK Part-M Continuing Airworthiness', l: '63 lessons' }], note: 'Open in full, with no account and no licence.' },
      flag: '🇬🇧',
      pill: 'UK CAA',
      naming: 'UK Part-…',
      title: 'UK CAA',
      what: 'The United Kingdom framework, administered by the Civil Aviation Authority. It began from the same text as the EU rules and has been developing separately since.',
      basedOn: 'The assimilated versions of the EU regulations as they apply in the UK, together with the Air Navigation Order, UK statutory instruments, and CAA publications (CAP documents and official record series).',
      changes: [
        'Naming: UK Part-M, UK Part-145, UK Part-CAMO, with UK-specific guidance where the CAA has published its own.',
        'Documents: CAA Form 1 in place of EASA Form 1; CAA Form 4 for post holders.',
        'Terminology: "post holder" is the correct UK term and is used instead of the EASA wording.',
        'Certification: CS-UKTSO in place of CS-ETSO, and the UK retains codes the EU has moved on from.',
        'Scope: 20 courses, 466 lessons.'
      ]
    },
    {
      id: 'gcaa',
      free: { courses: [{ n: 'Airline Operating Framework', l: '28 lessons' }, { n: 'CAR-M Continuing Airworthiness', l: '71 lessons' }], note: 'Open in full, with no account and no licence.' },
      flag: '🇦🇪',
      pill: 'UAE GCAA',
      naming: 'CAR-…',
      title: 'UAE GCAA',
      what: 'The United Arab Emirates framework, administered by the General Civil Aviation Authority. The requirements are close in substance to the European set, but they are published as the UAE’s own instruments.',
      basedOn: 'The UAE Civil Aviation Regulations (CARs) — CAR-M, CAR-145, CAR-21 and the related parts — together with GCAA advisory material, and ICAO Annexes where the CARs point to them.',
      changes: [
        'Naming: instruments are CARs, not Parts — CAR-M, CAR-145, CAR-21.',
        'Reference style: CAR M.901, CAR 145.30 and similar.',
        'CAMO material sits inside the CAR-M course rather than in a separate Part-CAMO course.',
        'Cybersecurity is published as advisory guidance rather than as a binding annex.',
        'Scope: 18 courses, 427 lessons.'
      ]
    },
    {
      id: 'faa',
      free: { courses: [{ n: 'Airline Operating Framework', l: '21 lessons' }, { n: '14 CFR Part 43 &amp; 91', l: '19 lessons' }], note: 'The FAA edition has no Part-M, so Part 43 &amp; 91 is the free continuing-airworthiness anchor. Open in full, with no account and no licence.' },
      flag: '🇺🇸',
      pill: 'FAA',
      naming: '14 CFR',
      title: 'FAA',
      what: 'The United States framework, administered by the Federal Aviation Administration. It reaches the same safety outcomes by a different structure, so this edition is shaped differently from the other three rather than translated from them.',
      basedOn: 'Title 14 of the Code of Federal Regulations — Parts 21, 39, 43, 65, 91, 121, 135 and 145 — together with FAA advisory circulars and the maintenance review board process.',
      changes: [
        'Naming: numbered CFR parts, not lettered annexes — 14 CFR Part 43, Part 145, Part 39.',
        'Structure: there is no CAMO approval and no airworthiness review certificate. The equivalent ground is covered by Part 43 & 91 responsibilities and the air-carrier maintenance program.',
        'Documents: FAA Form 8130-3 in place of EASA Form 1.',
        'Additional courses that exist only here: Part 39 airworthiness directives, Part 65 personnel certification, the Air Carrier CAMP, and MSG-3 / MRB.',
        'Scope: 18 courses, 290 lessons.'
      ]
    }
  ];

  /* =========================================================================
     D (page UI) — the four curriculum tracks that already exist in #curriculum.
     Each track card opens a modal listing its real courses. The six-step path
     above is shown inside as context, so the page gains no new elements.
     ========================================================================= */
  var TRACKS = [
    {
      id: 'initial',
      badge: 'Initial airworthiness',
      title: 'Initial airworthiness',
      intro: 'How a product is certified in the first place, and how design and production organisations are approved. This track answers where approved data comes from — the question every continuing-airworthiness decision eventually rests on.',
      duration: '79 lessons · about 9.5 hours of reading (EASA edition)',
      courses: ['p21', 'cs', 'iawfam'],
      features: [
        'The certification basis, and what happens when a code is amended.',
        'Design and production organisation approvals, changes, repairs and permits to fly.',
        'A short familiarisation course covering only the parts a CAMO actually uses.',
        'Bilateral agreements and the validation of foreign approvals.'
      ]
    },
    {
      id: 'continuing',
      badge: 'Continuing airworthiness',
      title: 'Continuing airworthiness',
      intro: 'The core of the catalogue: who is accountable for keeping an aircraft airworthy, how the work is managed and recorded, who may carry it out, and how the aircraft is released back to service.',
      duration: '207 lessons · about 32 hours of reading (EASA edition)',
      courses: ['m', 'camo', 'p145', 'partis', 'amp', 'arc', 'reliability'],
      features: [
        'One lesson per article, so the course works as a reference as well as a study path.',
        'The management side (Part-M, Part-CAMO) and the doing side (Part-145) taught as one connected set.',
        'The maintenance programme and the airworthiness review covered as dedicated courses.',
        'Audit findings written as scenarios: situation, root cause, consequence, article.'
      ]
    },
    {
      id: 'asset',
      badge: 'Asset value',
      title: 'Asset value',
      intro: 'The commercial layer that sits on top of the regulations. The same records that keep an aircraft airworthy also carry most of its value, and this track follows that value through cost, leases, engines and end of life.',
      duration: '120 lessons · about 21 hours of reading (EASA edition)',
      courses: ['mec', 'lease', 'eng', 'recycle', 'offshore'],
      features: [
        'Direct maintenance cost, check cost and downtime, and how each is controlled.',
        'The lease lifecycle from the technical schedules to redelivery and settlement.',
        'Engines and life-limited parts run as assets: time on wing, shop visits, the LLP stack.',
        'A capstone lesson that follows one redelivery from start to finish.'
      ]
    },
    {
      id: 'essentials',
      badge: 'Essentials',
      title: 'Essentials',
      intro: 'The continuation-training subjects an approved organisation has to keep current, structured the way a recurrent programme needs them.',
      duration: '65 lessons · about 7.5 hours of reading (EASA edition)',
      courses: ['hf', 'sms', 'ewis', 'fts'],
      features: [
        'Human Factors and Safety Management in all four framework editions.',
        'EWIS split into the four target-group bands, so each role studies its own.',
        'Fuel Tank Safety separated into Phase 1 awareness and Phase 2 specific training.',
        'Short enough to be completed in single sessions between shifts.'
      ]
    }
  ];

  /* =========================================================================
     F — "Everything you need to study with confidence"
     Eight demo screens. Triggered from the six feature cards that already
     exist; the remaining two are reached from the switcher inside the pop-up.
     `pointer` places the half-transparent hand: x/y are percentages of the
     PORTRAIT screen area.
     ========================================================================= */
  var DEMOS = [
    {
      id: 'lesson',
      card: 'A lesson',
      title: 'Inside a lesson',
      instruction: 'Look at the numbered section headers as you scroll. Every lesson in the catalogue uses the same five sections, in the same order.',
      intro: 'M.A.201 Responsibilities, from the Part-M course, shown as it appears on iPad. This is the real lesson text, not a summary written for the website.',
      demo: 'lesson',
      pointer: { x: 52, y: 44, label: 'Pointing at the first numbered section header' },
      notes: 'Real content from the Part-M course (M.A.201). The longer sections are trimmed for the web; the app shows all of them.'
    },
    {
      id: 'flashcards',
      card: 'Flashcards',
      title: 'Flashcards',
      instruction: 'Select the card to turn it over. The rating buttons only come alive once the answer is showing.',
      intro: 'Every lesson carries its own flashcards — nine in this one. The rating is the reader’s own judgement; nothing is scored against them.',
      demo: 'flashcards',
      pointer: { x: 72, y: 47, label: 'Pointing at the card, which turns over when selected' }
    },
    {
      id: 'quiz',
      card: 'Lesson quiz',
      title: 'The lesson quiz',
      instruction: 'Choose an answer. The correct one turns green, a wrong choice turns red, and the explanation appears underneath.',
      intro: 'Every lesson has its own quiz on the third tab. It marks the answer immediately and explains why the other options are wrong — this is the real M.A.201 question set.',
      demo: 'quiz',
      pointer: { x: 72, y: 43, label: 'Pointing at the answer options' },
      notes: 'The worked examples are prose inside the lesson itself — see the "A lesson" screen, section 3. The quiz is the interactive part.'
    },
    {
      id: 'glossary',
      card: 'Glossary',
      title: 'Glossary',
      instruction: 'Type an acronym — try CAMO, CAME or CDCCL — and the definition appears exactly as it does in the app.',
      intro: 'The glossary covers every acronym used more than twice across the catalogue. In the app it opens over whatever you are reading, so you never lose your place.',
      demo: 'glossary',
      pointer: { x: 50, y: 17, label: 'Pointing at the glossary search field' }
    },
    {
      id: 'notes',
      card: 'Highlights & notes',
      title: 'Highlights and notes',
      instruction: 'Select an entry to open the lesson at that highlight, then use the back arrow to return to the list.',
      intro: 'Text is highlighted in the lesson and a note can be attached to it. The My notes screen collects every highlight and note in one place, filterable by course and colour, and exportable as PDF or Markdown.',
      demo: 'notes',
      pointer: { x: 30, y: 45, label: 'Pointing at a highlighted phrase and the note under it' }
    },
    {
      id: 'voice',
      card: 'Read aloud',
      title: 'Reading a lesson aloud',
      instruction: 'Select play. The paragraph being spoken is highlighted, and the page follows it down.',
      intro: 'Lessons can be read aloud on iPhone, iPad and Mac. The voice runs on the device: no connection is used and nothing is sent anywhere.',
      demo: 'voice',
      pointer: { x: 71, y: 88, label: 'Pointing at the play control in the transport bar' },
      notes: 'This preview shows the behaviour only. It plays no sound.'
    },
    {
      id: 'sync',
      card: 'Progress that follows you',
      title: 'The same progress on every device',
      instruction: 'Compare the two screens. The Continue card, the percentage and the per-course progress are identical, because both devices are signed in to the same account.',
      intro: 'Progress, highlights, notes and bookmarks are tied to the account, not the device. Stop on the iPhone in the hangar and carry on from the same lesson on the iPad at the desk.',
      demo: 'sync',
      layout: 'devices',
      notes: 'Progress syncs through the CAW account. Highlights and notes stay on the device and are not shared.'
    },
    {
      id: 'exam',
      card: 'Assessment',
      title: 'Assessment & quiz',
      instruction: 'Three questions are active in this preview. The rest are greyed out and cannot be selected. Answer all three and the Submit button unlocks.',
      intro: 'The timed assessment shows results only at the end, then reviews each wrong answer with its reasoning and a link back to the lesson. The pass mark is 75%.',
      demo: 'exam',
      pointer: { x: 70, y: 41, label: 'Pointing at the answer options' }
    },
    {
      id: 'certificate',
      card: 'Certificate',
      title: 'Certificate',
      instruction: 'Look at the certificate number and the QR code. Both resolve to the public registry on this site.',
      intro: 'A certificate is issued once every lesson in a course is complete and the assessment is passed. The number is issued centrally, so it is unique across all holders.',
      demo: 'certificate',
      notes: 'The screen below is a sample layout, marked as such. It is not a real certificate and cannot be verified.'
    }
  ];

  /* --- export ----------------------------------------------------------- */
  w.CAW_CONTENT = {
    generated: '2026-08-28',
    frameworksMeta: FW,
    courses: COURSES,
    groups: GROUPS,
    benefits: BENEFITS,
    benefitShared: B_SHARED,
    clarity: CLARITY,
    tracks: TRACKS,
    path: PATH,
    frameworks: FRAMEWORKS,
    demos: DEMOS,

    /* Demo content that is NOT auto-generated.
       The lesson text, flashcards, quiz items and glossary entries used by the
       demos come from website/caw-demo-content.js, which is generated from the
       bundled course JSON by tools/export_demo_content.py. Only the three
       items below are written for the website, and all three are built on the
       same lesson (M.A.201) so the demos tell one coherent story. */
    sample: {
      /* F8 — highlights and notes, as the "My notes" screen lists them.
         `quote` is the real M.A.201 text, `anchor` is the part that was
         highlighted inside it, `note` is what the reader typed. */
      notes: [
        {
          colour: 'yellow',
          quote: 'The responsible party must ensure no flight takes place unless the aircraft is airworthy, its equipment serviceable or clearly identified unserviceable, its airworthiness certificate valid, and maintenance done to the AMP.',
          anchor: 'no flight takes place unless the aircraft is airworthy',
          note: 'Four cumulative conditions. Check the dispatch procedure actually lists all four.'
        },
        {
          colour: 'green',
          quote: 'Specific duties belong to others: whoever performs maintenance is responsible for those tasks; the pilot-in-command, or the operator for an air carrier, is responsible for the pre-flight inspection.',
          anchor: 'whoever performs maintenance is responsible for those tasks',
          note: 'This is the split the CAMO contract has to reflect. Raise at the next review.'
        },
        {
          colour: 'coral',
          quote: 'Accountability for continuing airworthiness cannot be contracted away - the owner or operator stays responsible even when a CAMO, CAO or Part-145 organisation does the work.',
          anchor: 'cannot be contracted away',
          note: ''
        }
      ],

      /* F6 — a sample certificate, laid out from a real issued PDF
         (CAW-AOF-000001). The holder name is a neutral placeholder, the serial
         is not one that has been issued, and the screen carries a SAMPLE
         watermark, so nothing here can be mistaken for a real credential. */
      certificate: {
        holder: 'Alex Morgan',
        course: 'Airline Operating Framework',
        duration: 'Duration: 7 hours',
        completed: '28 August 2026',
        score: 'exam score 92%',
        number: 'CAW-AOF-000042',
        tagline: 'Airworthiness made learnable',
        disclaimer: 'CAW Academy is an independent study aid aligned with the EASA Easy Access Rules and is not affiliated with or endorsed by EASA. This certificate confirms completion of in-app study only; it does not constitute or confer any EASA licence, qualification, rating or approval.'
      }
    }
  };
})(window);
