/**
 * Lesson Plan Studio - Controller
 * อิงหลักสูตรแกนกลาง สพฐ. / สสวท.
 * โฟกัสความง่าย: Placeholder สีเทาตรงตามวิชา, รองรับวิชาอื่นๆ, ช่องพิมพ์เด่นชัด, แทนที่ข้อความ (Replace), และคำนวณเวลาอัตโนมัติ
 */

// Application State
const appState = {
  currentView: 'start', // 'start' | 'wizard' | 'overview' | 'teacherDashboard'
  wizardStep: 1,        // 1 to 9
  formData: {
    id: null,
    subject: 'science',
    customSubjectName: '',
    grade: 'm6',
    teacherName: '',
    totalMinutes: 50,
    introMinutes: 10,
    teachingMinutes: 30,
    conclusionMinutes: 10,
    topic: '',
    kVerb: 'อธิบาย',
    kDetail: '',
    pVerb: 'ทดลอง',
    pDetail: '',
    aType: 'มีจิตวิทยาศาสตร์และช่างสังเกต',
    aCustom: '',
    introActivity: 'ดูคลิปวิดีโอสั้นหรือภาพปริศนาชวนคิด',
    introDetail: '',
    introMedia: ['คลิปวิดีโอสั้น (YouTube)'],
    introCustomMedia: '',
    teachingActivity: 'ลงมือปฏิบัติจริง / ทำการทดลอง /สร้างชิ้นงาน',
    teachingDetail: '',
    teachingMedia: ['ชุดอุปกรณ์ทดลอง / โมเดลจำลอง'],
    teachingCustomMedia: '',
    conclusionActivity: 'เขียนตั๋วออกจากห้องเรียน (Exit Ticket โพสต์อิท)',
    conclusionDetail: '',
    conclusionMedia: ['กระดาษโพสต์อิท (Exit Ticket)'],
    conclusionCustomMedia: '',
    likes: 1,
    createdAt: null
  },
  classroomPlans: [],
  selectedFilter: 'all'
};

// Mascot Tips per Step
const WIZARD_COACH = {
  1: "คลิกเลือก 1 วิชาที่อยากลองสอน หรือเลือก 'วิชาอื่นๆ' เพื่อพิมพ์เองได้เลยจ้า 📚",
  2: "เลือก 1 ชั้นเรียนของน้องๆ ที่อยากสอน (ป.1 ถึง ม.6) 🎒",
  3: "ระบุชื่อผู้สอน เวลาในคาบ และพิมพ์ชื่อเรื่องที่จะสอน (มีไอเดีย สสวท. ให้ดูนะ) 💡",
  4: "ด้านความรู้ (K): เลือกคำกริยาวัดได้ แล้วพิมพ์เนื้อหา หรือจิ้มไอเดียแทนที่ได้เลย 🧠",
  5: "ด้านทักษะ (P): จบคลาสอยากให้เด็กๆ ลงมือทำอะไรได้ ตัวอย่างปรับตามวิชาแล้ว 🛠️",
  6: "ด้านเจตคติ (A): ปลูกฝังนิสัยหรือค่านิยมดีๆ ในคาบเรียน 💖",
  checkpoint: "เก่งมาก! ได้เป้าหมาย K-P-A ครบแล้ว พักหายใจแป๊บแล้วไปลุยออกแบบ 3 ขั้นตอนการสอนกันต่อเลย 🚀",
  7: "ขั้นนำ (Warm-up): เปิดตัวคาบเรียนอย่างไรให้ตื่นเต้น พร้อมเลือกสื่อ 🎪",
  8: "ขั้นสอน (Learning Activity): ช่วงเวลาลงมือทำจริงสุดมันส์ พร้อมเลือกสื่อ 🛠️",
  9: "ขั้นสรุป (Reflection): สรุปความรู้และเช็คความเข้าใจ พร้อมเลือกสื่อ 🏆"
};

const STORAGE_MY_PLAN = 'LP_STUDIO_MY_PLAN_V3';
const STORAGE_CLASSROOM_WALL = 'LP_STUDIO_CLASSROOM_WALL_V3';

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  updateTimeDistribution(appState.formData.totalMinutes || 50);
  renderStep1Subjects();
  renderStep2Grades();
  syncSubjectPlaceholdersAndControls();
  renderStep3Form();
  initStep4Controls();
  initStep5Controls();
  initStep6Controls();
  initStep7Controls();
  initStep8Controls();
  initStep9Controls();
  setupEventListeners();
  checkInitialHash();

  if (window.lucide) window.lucide.createIcons();
});

/**
 * Initialize Storage
 */
function initStorage() {
  try {
    const myPlan = localStorage.getItem(STORAGE_MY_PLAN);
    if (myPlan) {
      const parsed = JSON.parse(myPlan);
      appState.formData = { ...appState.formData, ...parsed };
    }

    const wall = localStorage.getItem(STORAGE_CLASSROOM_WALL);
    if (wall) {
      appState.classroomPlans = JSON.parse(wall);
    } else {
      appState.classroomPlans = [...window.LESSON_PLAN_DATA.initialClassroomPlans];
      localStorage.setItem(STORAGE_CLASSROOM_WALL, JSON.stringify(appState.classroomPlans));
    }
  } catch (e) {
    console.error(e);
  }
  updateNavCountBadge();

  // Initialize Firebase Cloud Service if available and configured
  if (window.FirebaseService) {
    window.FirebaseService.init(
      // 1. Data update listener (Real-time Firestore)
      async (remotePlans) => {
        if (Array.isArray(remotePlans)) {
          const hasSeeded = localStorage.getItem('LP_STUDIO_SEEDED');
          // กรณีเปิดใช้งานครั้งแรกและ Cloud ยังว่างเปล่า ให้ส่งแผนเริ่มต้นขึ้นไป
          if (remotePlans.length === 0 && !hasSeeded) {
            localStorage.setItem('LP_STUDIO_SEEDED', 'true');
            if (window.LESSON_PLAN_DATA?.initialClassroomPlans) {
              for (const initP of window.LESSON_PLAN_DATA.initialClassroomPlans) {
                await window.FirebaseService.savePlan(initP);
              }
            }
            return;
          }

          // อัปเดตข้อมูลแบบ Real-time ทันที (แม้ผลงานจะเหลือ 0 หลังกดลบทั้งหมด ก็อัปเดตทันที)
          appState.classroomPlans = remotePlans;
          localStorage.setItem(STORAGE_CLASSROOM_WALL, JSON.stringify(appState.classroomPlans));
          updateNavCountBadge();
          if (appState.currentView === 'teacherDashboard') {
            renderTeacherDashboard();
          }
        }
      },
      // 2. Realtime status listener (🟢 เขียว / 🟡 เหลือง / 🔴 แดง)
      (status) => {
        updateCloudStatusIndicator(status);
      }
    );
  }
}

/**
 * Update Real-time Cloud Status Indicator (ไฟเขียว/เหลือง/แดง)
 * 🟢 online: Firebase Real-time สด
 * 🟡 connecting / syncing: กำลังเชื่อมต่อหรือซิงค์ข้อมูล
 * 🔴 offline: ทำงานแบบ LocalStorage ออฟไลน์
 */
function updateCloudStatusIndicator(status) {
  const navBadge = document.getElementById('navCloudStatusBadge');
  const navPing = document.getElementById('navCloudPing');
  const navDot = document.getElementById('navCloudDot');
  const navText = document.getElementById('navCloudText');

  const dashBadge = document.getElementById('dashCloudStatusBadge');
  const dashPing = document.getElementById('dashCloudPing');
  const dashDot = document.getElementById('dashCloudDot');
  const dashText = document.getElementById('dashCloudText');

  const applyClasses = (el, removeList, addList) => {
    if (!el) return;
    removeList.forEach(cls => el.classList.remove(cls));
    addList.forEach(cls => el.classList.add(cls));
  };

  const bgClasses = ['bg-emerald-50', 'bg-amber-50', 'bg-rose-50'];
  const textClasses = ['text-emerald-800', 'text-amber-800', 'text-rose-800'];
  const borderClasses = ['border-emerald-300', 'border-amber-300', 'border-rose-300'];
  const allBadgeClasses = [...bgClasses, ...textClasses, ...borderClasses];

  const dotClasses = ['bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
  const pingClasses = ['bg-emerald-400', 'bg-amber-400', 'bg-rose-400'];

  if (status === 'online') {
    // 🟢 Green - Online Real-time
    [navBadge, dashBadge].forEach(b => applyClasses(b, allBadgeClasses, ['bg-emerald-50', 'text-emerald-800', 'border-emerald-300']));
    [navDot, dashDot].forEach(d => applyClasses(d, dotClasses, ['bg-emerald-500']));
    [navPing, dashPing].forEach(p => {
      if (p) {
        applyClasses(p, pingClasses, ['bg-emerald-400']);
        p.classList.remove('hidden');
      }
    });
    if (navText) navText.innerText = 'Cloud Real-time (สด)';
    if (dashText) dashText.innerText = 'ซิงค์สด Cloud (Real-time)';
    if (navBadge) navBadge.title = '🟢 เชื่อมต่อ Firebase สำเร็จ ซิงค์ข้อมูล Real-time สด';
  } else if (status === 'connecting' || status === 'syncing') {
    // 🟡 Yellow - Connecting / Syncing
    [navBadge, dashBadge].forEach(b => applyClasses(b, allBadgeClasses, ['bg-amber-50', 'text-amber-800', 'border-amber-300']));
    [navDot, dashDot].forEach(d => applyClasses(d, dotClasses, ['bg-amber-500']));
    [navPing, dashPing].forEach(p => {
      if (p) {
        applyClasses(p, pingClasses, ['bg-amber-400']);
        p.classList.remove('hidden');
      }
    });
    const label = status === 'syncing' ? 'กำลังบันทึก Cloud...' : 'เชื่อมต่อ Cloud...';
    if (navText) navText.innerText = label;
    if (dashText) dashText.innerText = label;
    if (navBadge) navBadge.title = '🟡 กำลังเชื่อมต่อหรือบันทึกข้อมูลกับ Firebase Cloud';
  } else {
    // 🔴 Red - Offline
    [navBadge, dashBadge].forEach(b => applyClasses(b, allBadgeClasses, ['bg-rose-50', 'text-rose-800', 'border-rose-300']));
    [navDot, dashDot].forEach(d => applyClasses(d, dotClasses, ['bg-rose-500']));
    [navPing, dashPing].forEach(p => {
      if (p) p.classList.add('hidden');
    });
    if (navText) navText.innerText = 'ออฟไลน์ (เซฟในเครื่อง)';
    if (dashText) dashText.innerText = 'ออฟไลน์ (บันทึกในเครื่อง)';
    if (navBadge) navBadge.title = '🔴 ทำงานในโหมดออฟไลน์ บันทึกข้อมูลลงเครื่องอัตโนมัติ';
  }
}

/**
 * Check Hash on Load
 */
function checkInitialHash() {
  const hash = window.location.hash;
  if (hash === '#dashboard') {
    showView('teacherDashboard');
  } else if (hash === '#overview') {
    showView('overview');
  } else if (hash === '#checkpoint') {
    startWizard('checkpoint');
  } else if (hash.startsWith('#step')) {
    const s = parseInt(hash.replace('#step', ''), 10);
    if (s >= 1 && s <= 9) {
      startWizard(s);
      return;
    }
    showView('start');
  } else {
    showView('start');
  }
}

/**
 * Switch View: 'start' | 'wizard' | 'overview' | 'teacherDashboard'
 */
function showView(view) {
  appState.currentView = view;
  const startEl = document.getElementById('viewStart');
  const wizardEl = document.getElementById('viewWizard');
  const overviewEl = document.getElementById('viewOverview');
  const dashEl = document.getElementById('viewTeacherDashboard');

  [startEl, wizardEl, overviewEl, dashEl].forEach(el => el && el.classList.add('hidden'));

  if (view === 'start') {
    window.location.hash = '';
    if (startEl) startEl.classList.remove('hidden');
  } else if (view === 'wizard') {
    if (wizardEl) wizardEl.classList.remove('hidden');
    goToWizardStep(appState.wizardStep || 1);
  } else if (view === 'overview') {
    window.location.hash = '#overview';
    if (overviewEl) overviewEl.classList.remove('hidden');
    renderOverviewTicket();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (view === 'teacherDashboard') {
    window.location.hash = '#dashboard';
    if (dashEl) dashEl.classList.remove('hidden');
    renderTeacherDashboard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Start Wizard Button Handler
 */
window.startWizard = function(startAtStep = 1) {
  appState.wizardStep = startAtStep;
  showView('wizard');
};

/**
 * Go to Wizard Step (1 to 9, or 'checkpoint')
 */
function goToWizardStep(step) {
  const isCheckpoint = step === 'checkpoint';
  if (!isCheckpoint && (step < 1 || step > 9)) return;
  appState.wizardStep = step;
  window.location.hash = isCheckpoint ? '#checkpoint' : `#step${step}`;

  const checkpointPanel = document.getElementById('stepPanel-checkpoint');
  const bottomNav = document.getElementById('wizardBottomNav');

  // Switch step panels
  for (let i = 1; i <= 9; i++) {
    const panel = document.getElementById(`stepPanel-${i}`);
    if (panel) {
      if (!isCheckpoint && i === step) {
        panel.classList.remove('hidden');
        panel.classList.add('animate-cute-pop');
      } else {
        panel.classList.add('hidden');
        panel.classList.remove('animate-cute-pop');
      }
    }
  }

  // Handle Checkpoint View (Intermission between Part 1 and Part 2)
  if (isCheckpoint) {
    if (checkpointPanel) {
      checkpointPanel.classList.remove('hidden');
      checkpointPanel.classList.add('animate-cute-pop');
    }
    if (bottomNav) bottomNav.classList.add('hidden');

    renderCheckpointRecap();

    // Trigger celebratory mini confetti
    if (window.confetti) {
      window.confetti({ particleCount: 50, spread: 70, origin: { y: 0.55 } });
    }

    // Progress Bar & Tracker for Checkpoint
    const counterEl = document.getElementById('wizardStepCounter');
    const pctEl = document.getElementById('wizardStepPercentage');
    const barEl = document.getElementById('wizardProgressBar');
    const coachEl = document.getElementById('wizardCoachText');

    if (counterEl) counterEl.innerText = `🎉 พาร์ท 1 สำเร็จ! (เตรียมลุยพาร์ท 2)`;
    if (pctEl) pctEl.innerText = `66%`;
    if (barEl) barEl.style.width = `66%`;
    if (coachEl) coachEl.innerText = WIZARD_COACH['checkpoint'];

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // Regular Steps (1 - 9)
  if (checkpointPanel) checkpointPanel.classList.add('hidden');
  if (bottomNav) bottomNav.classList.remove('hidden');

  // Progress Bar & Tracker
  const pct = Math.round((step / 9) * 100);
  const counterEl = document.getElementById('wizardStepCounter');
  const pctEl = document.getElementById('wizardStepPercentage');
  const barEl = document.getElementById('wizardProgressBar');
  const coachEl = document.getElementById('wizardCoachText');

  if (counterEl) {
    if (step <= 6) {
      counterEl.innerText = `พาร์ท 1: ข้อ ${step} จาก 6 (เป้าหมาย K-P-A)`;
    } else {
      counterEl.innerText = `พาร์ท 2: ขั้นตอนที่ ${step - 6} จาก 3 (กระบวนการสอน & สื่อ)`;
    }
  }
  if (pctEl) pctEl.innerText = `${pct}%`;
  if (barEl) barEl.style.width = `${pct}%`;
  if (coachEl && WIZARD_COACH[step]) coachEl.innerText = WIZARD_COACH[step];

  // Prev / Next Buttons
  const btnPrev = document.getElementById('btnWizardPrev');
  const btnNext = document.getElementById('btnWizardNext');

  if (btnPrev) {
    if (step === 1) {
      btnPrev.classList.add('invisible');
    } else {
      btnPrev.classList.remove('invisible');
    }
  }

  if (btnNext) {
    if (step === 6) {
      btnNext.innerHTML = `<span>สรุปเป้าหมาย K-P-A & ไปต่อ ➔</span><i data-lucide="sparkles" class="w-4 h-4 ml-1 inline"></i>`;
      btnNext.className = 'inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 hover:from-purple-700 hover:to-pink-600 shadow-md shadow-purple-200 transition-all';
    } else if (step === 9) {
      btnNext.innerHTML = `<span>ส่งแผนการสอน & ดู Overview ✨</span><i data-lucide="sparkles" class="w-4 h-4 ml-1 inline"></i>`;
      btnNext.className = 'inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-pink-500 hover:bg-pink-600 shadow-md shadow-pink-200 transition-all';
    } else {
      btnNext.innerHTML = `<span>ถัดไป</span><i data-lucide="chevron-right" class="w-4 h-4 ml-1 inline"></i>`;
      btnNext.className = 'inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-200 hover:shadow-lg transition-all';
    }
  }

  if (step === 3) {
    syncSubjectPlaceholdersAndControls();
    renderStep3TopicCards();
  }
  if (step === 4) {
    initStep4Controls();
    updateStep4KPreview();
  }
  if (step === 5) {
    initStep5Controls();
    updateStep5PPreview();
  }
  if (step === 6) updateStep6SummaryKPA();
  if (step === 7) updatePhaseTimeBadges();
  if (step === 8) updatePhaseTimeBadges();
  if (step === 9) updatePhaseTimeBadges();

  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (window.lucide) window.lucide.createIcons();
}

window.goToWizardStep = goToWizardStep;

window.startPart2 = function() {
  goToWizardStep(7);
};

/**
 * Render Live Recap on Checkpoint Screen
 */
function renderCheckpointRecap() {
  const p = appState.formData;
  const sub = window.LESSON_PLAN_DATA?.subjects.find(s => s.id === p.subject);
  const gradeLabel = window.LESSON_PLAN_DATA?.getGradeLabel ? window.LESSON_PLAN_DATA.getGradeLabel(p.grade) : { short: p.grade, category: '' };

  let subDisplayName = sub?.name || p.subject;
  if (p.subject === 'other' && p.customSubjectName) {
    subDisplayName = `${p.customSubjectName} 🌐`;
  }

  const subEl = document.getElementById('checkpointSubjectBadge');
  const gradeEl = document.getElementById('checkpointGradeBadge');
  const topicEl = document.getElementById('checkpointTopicText');
  const kEl = document.getElementById('checkpointKLine');
  const pEl = document.getElementById('checkpointPLine');
  const aEl = document.getElementById('checkpointALine');

  const topicVal = document.getElementById('step3TopicInput')?.value.trim() || p.topic || 'บทเรียนบูรณาการ';
  const kVal = document.getElementById('step4KDetailInput')?.value.trim() || p.kDetail || 'เนื้อหาและมโนทัศน์สำคัญ';
  const pVal = document.getElementById('step5PDetailInput')?.value.trim() || p.pDetail || 'ทักษะกระบวนการที่ลงมือทำ';
  const aCustomVal = document.getElementById('step6ACustomInput')?.value.trim() || p.aCustom || '';
  const aVal = `${p.aType || 'มีจิตวิทยาศาสตร์และช่างสังเกต'} ${aCustomVal}`.trim();

  // Sync to appState
  p.topic = topicVal;
  p.kDetail = kVal;
  p.pDetail = pVal;
  p.aCustom = aCustomVal;

  if (subEl) subEl.innerHTML = `${sub?.emoji || '📚'} <span>วิชา${subDisplayName}</span>`;
  if (gradeEl) gradeEl.innerText = `${gradeLabel.short} (${gradeLabel.category})`;
  if (topicEl) topicEl.innerText = topicVal;

  if (kEl) {
    kEl.innerHTML = `🧠 <strong>K (ความรู้):</strong> นักเรียนสามารถ [${p.kVerb || 'อธิบาย'}] ${kVal}`;
  }
  if (pEl) {
    pEl.innerHTML = `🛠️ <strong>P (ทักษะ):</strong> นักเรียนสามารถ [${p.pVerb || 'ทดลอง'}] ${pVal}`;
  }
  if (aEl) {
    aEl.innerHTML = `💖 <strong>A (เจตคติ):</strong> นักเรียน ${aVal}`;
  }
}

/**
 * Calculate & Synchronize Time Ratio Across All 3 Phases
 */
function updateTimeDistribution(totalMin) {
  const total = Math.max(20, Math.min(180, parseInt(totalMin, 10) || 50));
  appState.formData.totalMinutes = total;

  // Active learning ratio: Intro ~ 15-20%, Conclusion ~ 15-20%, Teaching = main
  let intro = Math.max(5, Math.round((total * 0.20) / 5) * 5);
  let conclusion = Math.max(5, Math.round((total * 0.20) / 5) * 5);
  let teaching = total - intro - conclusion;

  if (teaching < 10) {
    intro = 5;
    conclusion = 5;
    teaching = total - 10;
  }

  appState.formData.introMinutes = intro;
  appState.formData.teachingMinutes = teaching;
  appState.formData.conclusionMinutes = conclusion;

  // Update step 3 linked notice
  const notice = document.getElementById('step3TimeLinkedNotice');
  if (notice) {
    notice.innerText = `นำ ${intro}น. + สอน ${teaching}น. + สรุป ${conclusion}น. = ${total}น.`;
  }

  updatePhaseTimeBadges();
}

function updatePhaseTimeBadges() {
  const s7 = document.getElementById('step7TimeBadge');
  const s8 = document.getElementById('step8TimeBadge');
  const s9 = document.getElementById('step9TimeBadge');

  if (s7) s7.innerText = `⏰ ${appState.formData.introMinutes} นาที`;
  if (s8) s8.innerText = `⏰ ${appState.formData.teachingMinutes} นาที`;
  if (s9) s9.innerText = `⏰ ${appState.formData.conclusionMinutes} นาที`;
}

window.setLessonDuration = function(minutes) {
  const input = document.getElementById('step3DurationInput');
  if (input) input.value = minutes;
  updateTimeDistribution(minutes);
  showToast(`ตั้งเวลาเรียน ${minutes} นาที จัดสรรเวลาให้ครบถ้วน ⏱️`);
};

window.onDurationInputChange = function() {
  const val = document.getElementById('step3DurationInput')?.value;
  updateTimeDistribution(val);
};

/**
 * STEP 1: Subject Cards (10 Options including 'other')
 */
function renderStep1Subjects() {
  const container = document.getElementById('step1SubjectGrid');
  if (!container || !window.LESSON_PLAN_DATA) return;

  container.innerHTML = window.LESSON_PLAN_DATA.subjects.map(s => {
    const isSelected = appState.formData.subject === s.id;
    return `
      <div onclick="selectSubjectChoice('${s.id}')" class="choice-card p-2.5 sm:p-3 text-center ${isSelected ? 'selected' : ''}">
        <span class="text-xl sm:text-2xl block mb-1">${s.emoji}</span>
        <div class="font-bold text-[11px] sm:text-xs line-clamp-1">${s.shortName}</div>
      </div>
    `;
  }).join('');

  // Handle custom subject box visibility
  const customBox = document.getElementById('step1CustomSubjectBox');
  const customInput = document.getElementById('step1CustomSubjectInput');
  if (customBox) {
    if (appState.formData.subject === 'other') {
      customBox.classList.remove('hidden');
      if (customInput) customInput.value = appState.formData.customSubjectName || '';
    } else {
      customBox.classList.add('hidden');
    }
  }
}

window.selectSubjectChoice = function(id) {
  appState.formData.subject = id;
  renderStep1Subjects();
  syncSubjectPlaceholdersAndControls();
  renderStep3TopicCards();
  initStep4Controls();
  initStep5Controls();

  const sub = window.LESSON_PLAN_DATA?.subjects.find(s => s.id === id);
  if (id === 'other') {
    showToast(`เลือก: วิชาอื่นๆ / ภาษาอื่นๆ 🌐`);
  } else {
    showToast(`เลือกวิชา: ${sub?.name || id} ✨`);
  }
};

/**
 * Dynamic Subject Placeholders & Controls Sync
 */
function syncSubjectPlaceholdersAndControls() {
  const subId = appState.formData.subject || 'science';
  const subObj = window.LESSON_PLAN_DATA?.subjects.find(s => s.id === subId) || window.LESSON_PLAN_DATA?.subjects[0];

  // Update Topic Input Placeholder
  const topicIn = document.getElementById('step3TopicInput');
  if (topicIn && subObj?.topicPlaceholder) {
    topicIn.placeholder = subObj.topicPlaceholder;
  }

  // Update K Input Placeholder
  const kIn = document.getElementById('step4KDetailInput');
  if (kIn && subObj?.kPlaceholder) {
    kIn.placeholder = subObj.kPlaceholder;
  }

  // Update P Input Placeholder
  const pIn = document.getElementById('step5PDetailInput');
  if (pIn && subObj?.pPlaceholder) {
    pIn.placeholder = subObj.pPlaceholder;
  }
}

/**
 * STEP 2: Grade Cards (Categorized 12 Individual Grades)
 */
function renderStep2Grades() {
  const container = document.getElementById('step2GradeGroupsContainer');
  if (!container || !window.LESSON_PLAN_DATA) return;

  container.innerHTML = window.LESSON_PLAN_DATA.gradeCategories.map(cat => {
    return `
      <div class="p-2.5 sm:p-3 rounded-2xl bg-slate-50 border-2 border-slate-200">
        <div class="flex items-center justify-between mb-1.5">
          <span class="font-bold text-xs text-purple-950">${cat.badge} ${cat.name}</span>
        </div>
        <div class="grid grid-cols-3 gap-1.5 sm:gap-2">
          ${cat.grades.map(g => {
            const isSel = appState.formData.grade === g.id;
            return `
              <div onclick="selectIndividualGrade('${g.id}')" class="grade-pill ${isSel ? 'selected' : ''}">
                ${g.short}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

window.selectIndividualGrade = function(gradeId) {
  appState.formData.grade = gradeId;
  renderStep2Grades();
  const label = window.LESSON_PLAN_DATA.getGradeLabel(gradeId);
  showToast(`เลือกระดับชั้น: ${label.short} 🎒`);
};

/**
 * STEP 3: Basic Info & Topic
 */
function renderStep3Form() {
  const nameIn = document.getElementById('step3TeacherNameInput');
  const durIn = document.getElementById('step3DurationInput');
  const topIn = document.getElementById('step3TopicInput');

  // Do NOT fill black text if user hasn't explicitly typed!
  if (nameIn) nameIn.value = appState.formData.teacherName || '';
  if (durIn) durIn.value = appState.formData.totalMinutes || 50;
  if (topIn) topIn.value = appState.formData.topic || '';

  renderStep3TopicCards();
}

function renderStep3TopicCards() {
  const container = document.getElementById('step3TopicCards');
  if (!container || !window.LESSON_PLAN_DATA) return;

  const sub = appState.formData.subject || 'science';
  const list = window.LESSON_PLAN_DATA.topicInspirations[sub] || window.LESSON_PLAN_DATA.topicInspirations.science;

  container.innerHTML = list.map((item, idx) => `
    <div onclick="pickTopicIdea(${idx})" class="p-2.5 rounded-xl bg-white hover:bg-purple-50 border-2 border-purple-200 cursor-pointer transition-all flex items-center justify-between gap-2 group">
      <div>
        <div class="font-bold text-slate-900 text-xs group-hover:text-purple-700">${item.title}</div>
      </div>
      <span class="text-[10px] font-bold text-purple-700 bg-purple-100 group-hover:bg-purple-700 group-hover:text-white px-2.5 py-1 rounded-lg border border-purple-200 transition-all shrink-0">
        เลือกหัวข้อนี้ ✨
      </span>
    </div>
  `).join('');
}

window.pickTopicIdea = function(idx) {
  const sub = appState.formData.subject || 'science';
  const list = window.LESSON_PLAN_DATA?.topicInspirations[sub] || window.LESSON_PLAN_DATA?.topicInspirations.science;
  const item = list[idx];
  if (!item) return;

  appState.formData.topic = item.title;
  appState.formData.kVerb = item.kVerb;
  appState.formData.kDetail = item.kDetail;
  appState.formData.pVerb = item.pVerb;
  appState.formData.pDetail = item.pDetail;
  if (item.aType) appState.formData.aType = item.aType;

  const topIn = document.getElementById('step3TopicInput');
  const kIn = document.getElementById('step4KDetailInput');
  const pIn = document.getElementById('step5PDetailInput');

  if (topIn) topIn.value = item.title;
  if (kIn) kIn.value = item.kDetail;
  if (pIn) pIn.value = item.pDetail;

  initStep4Controls();
  initStep5Controls();
  initStep6Controls();

  // Close topic drawer after pick
  closeDrawer('step3TopicDrawer');
  showToast(`เลือกหัวข้อ "${item.title}" เรียบร้อย! 💡`, 'success');
};

/**
 * Universal Drawer Toggler (Click to Appear)
 */
window.toggleDrawer = function(drawerId) {
  const drawer = document.getElementById(drawerId);
  const icon = document.getElementById(`${drawerId}Icon`);
  const btn = document.getElementById(`${drawerId}Btn`);

  if (!drawer) return;
  const isHidden = drawer.classList.contains('hidden');

  if (isHidden) {
    drawer.classList.remove('hidden');
    drawer.classList.add('animate-cute-pop');
    if (icon) icon.style.transform = 'rotate(180deg)';
    if (btn) btn.classList.add('open');
  } else {
    drawer.classList.add('hidden');
    drawer.classList.remove('animate-cute-pop');
    if (icon) icon.style.transform = 'rotate(0deg)';
    if (btn) btn.classList.remove('open');
  }
};

function closeDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  const icon = document.getElementById(`${drawerId}Icon`);
  const btn = document.getElementById(`${drawerId}Btn`);

  if (drawer) drawer.classList.add('hidden');
  if (icon) icon.style.transform = 'rotate(0deg)';
  if (btn) btn.classList.remove('open');
}

/**
 * Replace Input Helper (Replaces entire text to maintain single focal concept)
 */
window.replaceInput = function(inputId, text) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.value = text;

  if (inputId === 'step4KDetailInput') {
    appState.formData.kDetail = text;
    updateStep4KPreview();
  }
  if (inputId === 'step5PDetailInput') {
    appState.formData.pDetail = text;
    updateStep5PPreview();
  }
  if (inputId === 'step6ACustomInput') {
    appState.formData.aCustom = text;
    updateStep6SummaryKPA();
  }
  if (inputId === 'step7IntroDetail') appState.formData.introDetail = text;
  if (inputId === 'step8TeachDetail') appState.formData.teachingDetail = text;
  if (inputId === 'step9ConcDetail') appState.formData.conclusionDetail = text;

  showToast(`เติมข้อความตัวอย่างแล้ว ✨`);
};

/**
 * STEP 4: K Controls (Dynamic Idea Chips by Subject)
 */
function initStep4Controls() {
  const data = window.LESSON_PLAN_DATA?.measurableVerbs?.knowledge;
  const sub = appState.formData.subject || 'science';
  const chips = window.LESSON_PLAN_DATA?.subjectIdeaChips[sub]?.k || window.LESSON_PLAN_DATA?.subjectIdeaChips.science.k;
  const select = document.getElementById('step4KVerbSelect');
  const chipsList = document.getElementById('step4KChips');

  if (select && data) {
    select.innerHTML = data.map(k => `
      <option value="${k.verb}" ${appState.formData.kVerb === k.verb ? 'selected' : ''}>${k.verb}</option>
    `).join('');
  }

  if (chipsList && chips) {
    chipsList.innerHTML = chips.map(c => `
      <button type="button" onclick="replaceInput('step4KDetailInput', '${c}')" class="idea-chip">
        ${c}
      </button>
    `).join('');
  }

  const kIn = document.getElementById('step4KDetailInput');
  if (kIn) {
    kIn.value = appState.formData.kDetail || '';
  }

  updateStep4KPreview();
}

function updateStep4KPreview() {
  const select = document.getElementById('step4KVerbSelect');
  const detail = document.getElementById('step4KDetailInput');
  const preview = document.getElementById('step4KPreview');
  if (preview && select && detail) {
    const val = detail.value.trim() ? detail.value.trim() : '...';
    preview.innerHTML = `นักเรียนสามารถ <strong>[${select.value}]</strong> ${val}`;
    appState.formData.kVerb = select.value;
    appState.formData.kDetail = detail.value;
  }
}

/**
 * STEP 5: P Controls (Dynamic Idea Chips by Subject)
 */
function initStep5Controls() {
  const sub = appState.formData.subject || 'science';
  const data = window.LESSON_PLAN_DATA?.measurableVerbs?.processBySubject[sub] || window.LESSON_PLAN_DATA?.measurableVerbs?.processBySubject.science;
  const chips = window.LESSON_PLAN_DATA?.subjectIdeaChips[sub]?.p || window.LESSON_PLAN_DATA?.subjectIdeaChips.science.p;
  const select = document.getElementById('step5PVerbSelect');
  const chipsList = document.getElementById('step5PChips');

  if (select && data) {
    select.innerHTML = data.map(p => `
      <option value="${p.verb}" ${appState.formData.pVerb === p.verb ? 'selected' : ''}>${p.verb}</option>
    `).join('');
  }

  if (chipsList && chips) {
    chipsList.innerHTML = chips.map(c => `
      <button type="button" onclick="replaceInput('step5PDetailInput', '${c}')" class="idea-chip">
        ${c}
      </button>
    `).join('');
  }

  const pIn = document.getElementById('step5PDetailInput');
  if (pIn) {
    pIn.value = appState.formData.pDetail || '';
  }

  updateStep5PPreview();
}

function updateStep5PPreview() {
  const select = document.getElementById('step5PVerbSelect');
  const detail = document.getElementById('step5PDetailInput');
  const preview = document.getElementById('step5PPreview');
  if (preview && select && detail) {
    const val = detail.value.trim() ? detail.value.trim() : '...';
    preview.innerHTML = `นักเรียนสามารถ <strong>[${select.value}]</strong> ${val}`;
    appState.formData.pVerb = select.value;
    appState.formData.pDetail = detail.value;
  }
}

/**
 * STEP 6: A Controls
 */
function initStep6Controls() {
  const data = window.LESSON_PLAN_DATA?.measurableVerbs?.attitudes;
  const chips = window.LESSON_PLAN_DATA?.aChips;
  const select = document.getElementById('step6ASelect');
  const chipsList = document.getElementById('step6AChips');

  if (select && data) {
    select.innerHTML = data.map(a => `
      <option value="${a.text}" ${appState.formData.aType === a.text ? 'selected' : ''}>${a.text}</option>
    `).join('');
  }

  if (chipsList && chips) {
    chipsList.innerHTML = chips.map(c => `
      <button type="button" onclick="replaceInput('step6ACustomInput', '${c}')" class="idea-chip">
        ${c}
      </button>
    `).join('');
  }

  const aIn = document.getElementById('step6ACustomInput');
  if (aIn) {
    aIn.value = appState.formData.aCustom || '';
  }

  updateStep6SummaryKPA();
}

function updateStep6SummaryKPA() {
  const select = document.getElementById('step6ASelect');
  const custom = document.getElementById('step6ACustomInput');

  if (select) appState.formData.aType = select.value;
  if (custom) appState.formData.aCustom = custom.value;

  const kLine = document.getElementById('step6KLine');
  const pLine = document.getElementById('step6PLine');
  const aLine = document.getElementById('step6ALine');

  if (kLine) kLine.innerHTML = `🔹 K: นักเรียนสามารถ <strong>[${appState.formData.kVerb}]</strong> ${appState.formData.kDetail || '...'}`;
  if (pLine) pLine.innerHTML = `🔹 P: นักเรียนสามารถ <strong>[${appState.formData.pVerb}]</strong> ${appState.formData.pDetail || '...'}`;
  if (aLine) aLine.innerHTML = `🔹 A: นักเรียน <strong>${appState.formData.aType}</strong> ${appState.formData.aCustom || ''}`;
}

/**
 * STEP 7: Intro Phase
 */
function initStep7Controls() {
  const data = window.LESSON_PLAN_DATA?.phases?.intro;
  const select = document.getElementById('step7IntroSelect');
  const grid = document.getElementById('step7IntroMediaGrid');
  const ideasContainer = document.getElementById('step7IntroIdeas');
  const detailIn = document.getElementById('step7IntroDetail');

  if (select && data) {
    select.innerHTML = data.activities.map(a => `
      <option value="${a.title}" ${appState.formData.introActivity === a.title ? 'selected' : ''}>${a.title}</option>
    `).join('');
  }

  if (detailIn) {
    detailIn.value = appState.formData.introDetail || '';
  }

  const customIn7 = document.getElementById('step7IntroCustomMedia');
  if (customIn7) {
    customIn7.value = appState.formData.introCustomMedia || '';
  }

  if (ideasContainer && data?.ideas) {
    ideasContainer.innerHTML = data.ideas.map(idea => `
      <button type="button" onclick="replaceInput('step7IntroDetail', '${idea}')" class="text-left text-xs p-2 rounded-xl bg-white hover:bg-purple-100 border border-purple-200 text-slate-800 font-medium transition-colors">
        💡 ${idea}
      </button>
    `).join('');
  }

  if (grid && data) {
    grid.innerHTML = data.mediaOptions.map(m => {
      const isSel = (appState.formData.introMedia || []).includes(m.label);
      return `
        <div onclick="toggleStepMedia('intro', '${m.label}')" class="choice-card p-2 flex items-center gap-1.5 text-xs font-semibold ${isSel ? 'selected' : ''}">
          <span>${m.emoji}</span>
          <span class="line-clamp-1 flex-1 text-[11px]">${m.label}</span>
          <span class="text-xs ${isSel ? 'text-purple-700 font-bold' : 'text-slate-300'}">${isSel ? '✓' : '○'}</span>
        </div>
      `;
    }).join('');
  }
}

window.onIntroSelectChange = function() {
  const sel = document.getElementById('step7IntroSelect');
  if (sel) {
    appState.formData.introActivity = sel.value;
    const act = window.LESSON_PLAN_DATA?.phases?.intro?.activities.find(a => a.title === sel.value);
    const detailIn = document.getElementById('step7IntroDetail');
    if (detailIn && act?.placeholder) {
      detailIn.placeholder = act.placeholder;
    }
  }
};

/**
 * STEP 8: Teaching Phase
 */
function initStep8Controls() {
  const data = window.LESSON_PLAN_DATA?.phases?.teaching;
  const select = document.getElementById('step8TeachSelect');
  const grid = document.getElementById('step8TeachMediaGrid');
  const ideasContainer = document.getElementById('step8TeachIdeas');
  const detailIn = document.getElementById('step8TeachDetail');

  if (select && data) {
    select.innerHTML = data.activities.map(a => `
      <option value="${a.title}" ${appState.formData.teachingActivity === a.title ? 'selected' : ''}>${a.title}</option>
    `).join('');
  }

  if (detailIn) {
    detailIn.value = appState.formData.teachingDetail || '';
  }

  const customIn8 = document.getElementById('step8TeachCustomMedia');
  if (customIn8) {
    customIn8.value = appState.formData.teachingCustomMedia || '';
  }

  if (ideasContainer && data?.ideas) {
    ideasContainer.innerHTML = data.ideas.map(idea => `
      <button type="button" onclick="replaceInput('step8TeachDetail', '${idea}')" class="text-left text-xs p-2 rounded-xl bg-white hover:bg-emerald-100 border border-emerald-200 text-slate-800 font-medium transition-colors">
        💡 ${idea}
      </button>
    `).join('');
  }

  if (grid && data) {
    grid.innerHTML = data.mediaOptions.map(m => {
      const isSel = (appState.formData.teachingMedia || []).includes(m.label);
      return `
        <div onclick="toggleStepMedia('teaching', '${m.label}')" class="choice-card p-2 flex items-center gap-1.5 text-xs font-semibold ${isSel ? 'selected' : ''}">
          <span>${m.emoji}</span>
          <span class="line-clamp-1 flex-1 text-[11px]">${m.label}</span>
          <span class="text-xs ${isSel ? 'text-emerald-700 font-bold' : 'text-slate-300'}">${isSel ? '✓' : '○'}</span>
        </div>
      `;
    }).join('');
  }
}

window.onTeachSelectChange = function() {
  const sel = document.getElementById('step8TeachSelect');
  if (sel) {
    appState.formData.teachingActivity = sel.value;
    const act = window.LESSON_PLAN_DATA?.phases?.teaching?.activities.find(a => a.title === sel.value);
    const detailIn = document.getElementById('step8TeachDetail');
    if (detailIn && act?.placeholder) {
      detailIn.placeholder = act.placeholder;
    }
  }
};

/**
 * STEP 9: Conclusion Phase
 */
function initStep9Controls() {
  const data = window.LESSON_PLAN_DATA?.phases?.conclusion;
  const select = document.getElementById('step9ConcSelect');
  const grid = document.getElementById('step9ConcMediaGrid');
  const ideasContainer = document.getElementById('step9ConcIdeas');
  const detailIn = document.getElementById('step9ConcDetail');

  if (select && data) {
    select.innerHTML = data.activities.map(a => `
      <option value="${a.title}" ${appState.formData.conclusionActivity === a.title ? 'selected' : ''}>${a.title}</option>
    `).join('');
  }

  if (detailIn) {
    detailIn.value = appState.formData.conclusionDetail || '';
  }

  const customIn9 = document.getElementById('step9ConcCustomMedia');
  if (customIn9) {
    customIn9.value = appState.formData.conclusionCustomMedia || '';
  }

  if (ideasContainer && data?.ideas) {
    ideasContainer.innerHTML = data.ideas.map(idea => `
      <button type="button" onclick="replaceInput('step9ConcDetail', '${idea}')" class="text-left text-xs p-2 rounded-xl bg-white hover:bg-amber-100 border border-amber-200 text-slate-800 font-medium transition-colors">
        💡 ${idea}
      </button>
    `).join('');
  }

  if (grid && data) {
    grid.innerHTML = data.mediaOptions.map(m => {
      const isSel = (appState.formData.conclusionMedia || []).includes(m.label);
      return `
        <div onclick="toggleStepMedia('conclusion', '${m.label}')" class="choice-card p-2 flex items-center gap-1.5 text-xs font-semibold ${isSel ? 'selected' : ''}">
          <span>${m.emoji}</span>
          <span class="line-clamp-1 flex-1 text-[11px]">${m.label}</span>
          <span class="text-xs ${isSel ? 'text-amber-700 font-bold' : 'text-slate-300'}">${isSel ? '✓' : '○'}</span>
        </div>
      `;
    }).join('');
  }
}

window.onConcSelectChange = function() {
  const sel = document.getElementById('step9ConcSelect');
  if (sel) {
    appState.formData.conclusionActivity = sel.value;
    const act = window.LESSON_PLAN_DATA?.phases?.conclusion?.activities.find(a => a.title === sel.value);
    const detailIn = document.getElementById('step9ConcDetail');
    if (detailIn && act?.placeholder) {
      detailIn.placeholder = act.placeholder;
    }
  }
};

window.onCustomMediaInput = function(phase) {
  if (phase === 'intro') {
    appState.formData.introCustomMedia = document.getElementById('step7IntroCustomMedia')?.value.trim() || '';
  } else if (phase === 'teaching') {
    appState.formData.teachingCustomMedia = document.getElementById('step8TeachCustomMedia')?.value.trim() || '';
  } else if (phase === 'conclusion') {
    appState.formData.conclusionCustomMedia = document.getElementById('step9ConcCustomMedia')?.value.trim() || '';
  }
};

window.toggleStepMedia = function(phase, label) {
  let list = [];
  if (phase === 'intro') {
    list = appState.formData.introMedia = appState.formData.introMedia || [];
  } else if (phase === 'teaching') {
    list = appState.formData.teachingMedia = appState.formData.teachingMedia || [];
  } else {
    list = appState.formData.conclusionMedia = appState.formData.conclusionMedia || [];
  }

  if (list.includes(label)) {
    const idx = list.indexOf(label);
    list.splice(idx, 1);
  } else {
    list.push(label);
  }

  if (phase === 'intro') initStep7Controls();
  if (phase === 'teaching') initStep8Controls();
  if (phase === 'conclusion') initStep9Controls();
};

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  const btnPrev = document.getElementById('btnWizardPrev');
  const btnNext = document.getElementById('btnWizardNext');

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (appState.wizardStep === 'checkpoint') {
        goToWizardStep(6);
      } else if (appState.wizardStep === 7) {
        goToWizardStep('checkpoint');
      } else if (typeof appState.wizardStep === 'number' && appState.wizardStep > 1) {
        goToWizardStep(appState.wizardStep - 1);
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (appState.wizardStep === 6) {
        goToWizardStep('checkpoint');
      } else if (typeof appState.wizardStep === 'number' && appState.wizardStep < 9) {
        goToWizardStep(appState.wizardStep + 1);
      } else if (appState.wizardStep === 9) {
        submitWizardPlan();
      }
    });
  }

  // Live input sync
  document.getElementById('step1CustomSubjectInput')?.addEventListener('input', (e) => {
    appState.formData.customSubjectName = e.target.value;
  });
  document.getElementById('step3TeacherNameInput')?.addEventListener('input', (e) => {
    appState.formData.teacherName = e.target.value;
  });
  document.getElementById('step3TopicInput')?.addEventListener('input', (e) => {
    appState.formData.topic = e.target.value;
  });

  // Live preview bindings
  document.getElementById('step4KVerbSelect')?.addEventListener('change', updateStep4KPreview);
  document.getElementById('step4KDetailInput')?.addEventListener('input', updateStep4KPreview);
  document.getElementById('step5PVerbSelect')?.addEventListener('change', updateStep5PPreview);
  document.getElementById('step5PDetailInput')?.addEventListener('input', updateStep5PPreview);
  document.getElementById('step6ASelect')?.addEventListener('change', updateStep6SummaryKPA);
  document.getElementById('step6ACustomInput')?.addEventListener('input', updateStep6SummaryKPA);
}

/**
 * Submit Plan: Save to LocalStorage & Show Overview Screen
 */
function submitWizardPlan() {
  const getVal = (id) => document.getElementById(id)?.value?.trim() || '';

  const teacher = getVal('step3TeacherNameInput');
  appState.formData.teacherName = teacher || 'ครูผู้จัดทำ ม.6';

  const customSub = getVal('step1CustomSubjectInput');
  if (customSub) appState.formData.customSubjectName = customSub;

  const topicVal = getVal('step3TopicInput');
  appState.formData.topic = topicVal || appState.formData.topic || 'บทเรียนบูรณาการ';

  appState.formData.kDetail = getVal('step4KDetailInput') || appState.formData.kDetail || 'เนื้อหาและมโนทัศน์สำคัญ';
  appState.formData.pDetail = getVal('step5PDetailInput') || appState.formData.pDetail || 'ทักษะกระบวนการที่ลงมือทำ';
  appState.formData.aCustom = getVal('step6ACustomInput') || appState.formData.aCustom;

  appState.formData.introActivity = getVal('step7IntroSelect') || 'ดูคลิปวิดีโอสั้นหรือภาพปริศนาชวนคิด';
  appState.formData.introDetail = getVal('step7IntroDetail') || 'เปิดประเด็นกระตุ้นความสนใจ';
  appState.formData.introCustomMedia = getVal('step7IntroCustomMedia') || appState.formData.introCustomMedia || '';

  appState.formData.teachingActivity = getVal('step8TeachSelect') || 'ลงมือปฏิบัติจริง / ทำการทดลอง / สร้างชิ้นงาน';
  appState.formData.teachingDetail = getVal('step8TeachDetail') || 'แบ่งกลุ่มทำงานร่วมกัน';
  appState.formData.teachingCustomMedia = getVal('step8TeachCustomMedia') || appState.formData.teachingCustomMedia || '';

  appState.formData.conclusionActivity = getVal('step9ConcSelect') || 'เขียนตั๋วออกจากห้องเรียน (Exit Ticket โพสต์อิท)';
  appState.formData.conclusionDetail = getVal('step9ConcDetail') || 'เขียนข้อคิดและความรู้สึกที่ได้';
  appState.formData.conclusionCustomMedia = getVal('step9ConcCustomMedia') || appState.formData.conclusionCustomMedia || '';

  appState.formData.id = appState.formData.id || 'my_plan_' + Date.now();
  appState.formData.createdAt = 'เมื่อสักครู่';

  try {
    localStorage.setItem(STORAGE_MY_PLAN, JSON.stringify(appState.formData));

    // Update Classroom Wall in LocalStorage
    const rawName = (appState.formData.teacherName || 'ครูผู้จัดทำ ม.6').replace(' (ผลงานของคุณ ✨)', '');
    const wallItem = {
      id: appState.formData.id,
      studentName: rawName + ' (ผลงานของคุณ ✨)',
      topic: appState.formData.topic,
      subject: appState.formData.subject,
      customSubjectName: appState.formData.customSubjectName,
      grade: appState.formData.grade,
      kVerb: appState.formData.kVerb,
      kDetail: appState.formData.kDetail,
      pVerb: appState.formData.pVerb,
      pDetail: appState.formData.pDetail,
      aType: appState.formData.aType,
      aCustom: appState.formData.aCustom,
      totalMinutes: appState.formData.totalMinutes,
      introMinutes: appState.formData.introMinutes,
      introActivity: appState.formData.introActivity,
      introDetail: appState.formData.introDetail,
      introMedia: appState.formData.introMedia,
      introCustomMedia: appState.formData.introCustomMedia,
      teachingMinutes: appState.formData.teachingMinutes,
      teachingActivity: appState.formData.teachingActivity,
      teachingDetail: appState.formData.teachingDetail,
      teachingMedia: appState.formData.teachingMedia,
      teachingCustomMedia: appState.formData.teachingCustomMedia,
      conclusionMinutes: appState.formData.conclusionMinutes,
      conclusionActivity: appState.formData.conclusionActivity,
      conclusionDetail: appState.formData.conclusionDetail,
      conclusionMedia: appState.formData.conclusionMedia,
      conclusionCustomMedia: appState.formData.conclusionCustomMedia,
      likes: appState.formData.likes || 1,
      createdAt: 'เมื่อสักครู่'
    };

    const existingIdx = appState.classroomPlans.findIndex(p => p.id === appState.formData.id);
    if (existingIdx >= 0) {
      appState.classroomPlans[existingIdx] = wallItem;
    } else {
      appState.classroomPlans.unshift(wallItem);
    }
    localStorage.setItem(STORAGE_CLASSROOM_WALL, JSON.stringify(appState.classroomPlans));
    updateNavCountBadge();

    // Cloud sync with Firebase if configured
    if (window.FirebaseService && window.FirebaseService.isReady) {
      window.FirebaseService.savePlan(wallItem);
    }
  } catch (e) {
    console.error(e);
  }

  // Celebration Confetti
  if (window.confetti) {
    window.confetti({ particleCount: 110, spread: 85, origin: { y: 0.6 } });
  }

  showView('overview');
  showToast('สร้างแผนการสอนสำเร็จแล้ว! ชม Overview ได้เลย 🎉', 'success');
}

/**
 * Render Overview Ticket (View 3)
 */
function renderOverviewTicket() {
  const p = appState.formData;
  const sub = window.LESSON_PLAN_DATA?.subjects.find(s => s.id === p.subject);
  const gradeLabel = window.LESSON_PLAN_DATA.getGradeLabel(p.grade);

  let subDisplayName = sub?.name || p.subject;
  if (p.subject === 'other' && p.customSubjectName) {
    subDisplayName = `${p.customSubjectName} 🌐`;
  }

  document.getElementById('overviewSubjectBadge').innerText = `${sub?.emoji || '📚'} ${subDisplayName}`;
  document.getElementById('overviewGradeBadge').innerText = `${gradeLabel.short} (${gradeLabel.category})`;
  document.getElementById('overviewTopicTitle').innerText = p.topic || 'แผนการจัดการเรียนรู้';
  document.getElementById('overviewTeacherName').innerText = p.teacherName || 'คุณครู ม.6';
  document.getElementById('overviewDuration').innerText = `${p.totalMinutes} นาที`;
  document.getElementById('overviewDurationBreakdown').innerText = `ขั้นนำ ${p.introMinutes}น. | ขั้นสอน ${p.teachingMinutes}น. | ขั้นสรุป ${p.conclusionMinutes}น. (รวม ${p.totalMinutes} นาที)`;

  // K - P - A
  document.getElementById('overviewKText').innerHTML = `
    <span class="font-bold text-sky-900">K (ความรู้):</span> นักเรียนสามารถ <strong>[${p.kVerb}]</strong> ${p.kDetail || '-'}
  `;
  document.getElementById('overviewPText').innerHTML = `
    <span class="font-bold text-emerald-900">P (ทักษะ):</span> นักเรียนสามารถ <strong>[${p.pVerb}]</strong> ${p.pDetail || '-'}
  `;
  document.getElementById('overviewAText').innerHTML = `
    <span class="font-bold text-amber-900">A (เจตคติ):</span> นักเรียน <strong>${p.aType}</strong> ${p.aCustom || ''}
  `;

  // Time Badges in Overview
  document.getElementById('overviewIntroTimeBadge').innerText = `${p.introMinutes} นาที`;
  document.getElementById('overviewTeachingTimeBadge').innerText = `${p.teachingMinutes} นาที`;
  document.getElementById('overviewConclusionTimeBadge').innerText = `${p.conclusionMinutes} นาที`;

  // Helper for rendering badges with custom media
  const renderMediaBadges = (mediaList, customMedia, baseClass, borderClass, textClass) => {
    const badges = (mediaList || []).map(m => `
      <span class="px-2 py-0.5 rounded-lg text-[11px] font-bold ${baseClass} ${borderClass} ${textClass}">📦 ${m}</span>
    `);
    if (customMedia) {
      badges.push(`
        <span class="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-pink-100 text-pink-800 border-2 border-pink-300 shadow-2xs">✨ ${customMedia} (สื่อสร้างสรรค์)</span>
      `);
    }
    return badges.length > 0 ? badges.join('') : `<span class="text-[11px] text-slate-400">ไม่มีสื่อระบุ</span>`;
  };

  // Intro
  document.getElementById('overviewIntroAct').innerText = `${p.introActivity} (${p.introDetail || '-'})`;
  document.getElementById('overviewIntroMediaBadges').innerHTML = renderMediaBadges(
    p.introMedia, p.introCustomMedia, 'bg-purple-50', 'border border-purple-200', 'text-purple-700'
  );

  // Teaching
  document.getElementById('overviewTeachingAct').innerText = `${p.teachingActivity} (${p.teachingDetail || '-'})`;
  document.getElementById('overviewTeachingMediaBadges').innerHTML = renderMediaBadges(
    p.teachingMedia, p.teachingCustomMedia, 'bg-emerald-50', 'border border-emerald-200', 'text-emerald-700'
  );

  // Conclusion
  document.getElementById('overviewConclusionAct').innerText = `${p.conclusionActivity} (${p.conclusionDetail || '-'})`;
  document.getElementById('overviewConclusionMediaBadges').innerHTML = renderMediaBadges(
    p.conclusionMedia, p.conclusionCustomMedia, 'bg-amber-50', 'border border-amber-200', 'text-amber-700'
  );
}

/**
 * Render Teacher Dashboard & Classroom Wall (View 4)
 */
function renderTeacherDashboard() {
  const wall = appState.classroomPlans || [];

  if (window.FirebaseService) {
    updateCloudStatusIndicator(window.FirebaseService.status);
  }

  document.getElementById('statWallTotal').innerText = wall.length;
  const totalLikes = wall.reduce((sum, p) => sum + (p.likes || 0), 0);
  document.getElementById('statWallTotalLikes').innerText = `${totalLikes} ❤️`;

  // Top Subject
  const counts = {};
  wall.forEach(p => counts[p.subject] = (counts[p.subject] || 0) + 1);
  let topSub = 'science';
  let max = 0;
  for (const k in counts) {
    if (counts[k] > max) { max = counts[k]; topSub = k; }
  }
  const topSubObj = window.LESSON_PLAN_DATA?.subjects.find(s => s.id === topSub);
  document.getElementById('statWallTopSub').innerText = `${topSubObj?.shortName || topSub}`;

  // Compact Filter Dropdown
  const filterSelect = document.getElementById('wallSubjectSelectFilter');
  if (filterSelect && window.LESSON_PLAN_DATA) {
    const list = [{ id: 'all', shortName: 'ทั้งหมด 🌟' }, ...window.LESSON_PLAN_DATA.subjects];
    filterSelect.innerHTML = list.map(s => `
      <option value="${s.id}" ${appState.selectedFilter === s.id ? 'selected' : ''}>${s.shortName}</option>
    `).join('');
  }

  // Cards
  const filtered = appState.selectedFilter === 'all'
    ? wall
    : wall.filter(p => p.subject === appState.selectedFilter);

  document.getElementById('statShowingCount').innerText = `แสดง ${filtered.length} ผลงาน`;

  const grid = document.getElementById('classroomGridCards');
  if (grid) {
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-14 px-4 text-center bg-white rounded-3xl border-2 border-dashed border-purple-200 space-y-3">
          <div class="text-4xl">🍃</div>
          <div class="font-heading font-bold text-slate-700 text-base">ยังไม่มีแผนการสอนในกระดานห้องเรียน</div>
          <p class="text-xs text-slate-500 max-w-sm mx-auto">ผลงานถูกล้างแล้ว หรือยังไม่มีใครส่งแผนในกลุ่มสาระนี้ สามารถกดเริ่มสร้างแผนใหม่ได้เลย</p>
          <button onclick="startWizard(1)" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 cursor-pointer">
            <span>🚀 เขียนแผนของฉันเพิ่ม</span>
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(plan => {
      const sub = window.LESSON_PLAN_DATA?.subjects.find(s => s.id === plan.subject);
      const gradeLabel = window.LESSON_PLAN_DATA.getGradeLabel(plan.grade);
      const isMine = plan.id && plan.id.startsWith('my_plan_');
      let subTitle = sub?.shortName || plan.subject;
      if (plan.subject === 'other' && plan.customSubjectName) {
        subTitle = `${plan.customSubjectName} 🌐`;
      }

      return `
        <div class="showcase-card p-4 sm:p-5 border-2 ${isMine ? 'border-purple-500 bg-purple-50/20' : 'border-slate-200'}">
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${sub?.badgeClass || 'bg-slate-100 text-slate-800'}">
                ${sub?.emoji || '📚'} ${subTitle}
              </span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-300 text-slate-700">
                ${gradeLabel.short}
              </span>
            </div>
            <span class="text-[11px] text-slate-400">${plan.createdAt || ''}</span>
          </div>

          <h4 class="font-heading font-bold text-base text-slate-900 line-clamp-1 mb-0.5">${plan.topic}</h4>
          <div class="text-xs font-semibold text-purple-700 mb-2">ผู้สอน: ${plan.studentName}</div>

          <div class="text-xs text-slate-700 space-y-0.5 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div>🧠 <strong>K:</strong> [${plan.kVerb}] ${plan.kDetail || '-'}</div>
            <div>🛠️ <strong>P:</strong> [${plan.pVerb}] ${plan.pDetail || '-'}</div>
          </div>

          <!-- Card Actions (Like, View, Edit, Delete) -->
          <div class="pt-2.5 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <button onclick="likePlan('${plan.id}')" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors border border-rose-200 shadow-2xs cursor-pointer">
              <span>❤️</span>
              <span id="wallLike-${plan.id}">${plan.likes || 0}</span>
            </button>

            <div class="flex items-center gap-1.5 ml-auto">
              <button onclick="openModalDetail('${plan.id}')" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer" title="ดูตั๋วฉบับเต็ม">
                <span>🔍 ดูเต็ม</span>
              </button>

              <button onclick="editPlanFromDashboard('${plan.id}')" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer" title="แก้ไขแผนนี้">
                <span>✏️ แก้ไข</span>
              </button>

              <button onclick="deletePlan('${plan.id}')" class="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer" title="ลบแผนนี้">
                <span>🗑️ ลบ</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

window.setFilterSubject = function(id) {
  appState.selectedFilter = id;
  renderTeacherDashboard();
};

window.likePlan = function(id) {
  const plan = appState.classroomPlans.find(p => p.id === id);
  if (plan) {
    plan.likes = (plan.likes || 0) + 1;
    localStorage.setItem(STORAGE_CLASSROOM_WALL, JSON.stringify(appState.classroomPlans));
    const countEl = document.getElementById(`wallLike-${id}`);
    if (countEl) countEl.innerText = plan.likes;
    const totalLikes = appState.classroomPlans.reduce((s, p) => s + (p.likes || 0), 0);
    document.getElementById('statWallTotalLikes').innerText = `${totalLikes} ❤️`;
    showToast(`ส่งหัวใจให้ "${plan.studentName}" แล้ว! ❤️`, 'info');

    // Cloud sync with Firebase if configured
    if (window.FirebaseService && window.FirebaseService.isReady) {
      window.FirebaseService.likePlan(id);
    }
  }
};

window.openModalDetail = function(id) {
  const plan = appState.classroomPlans.find(p => p.id === id);
  if (!plan) return;

  const target = document.getElementById('modalTarget');
  const modal = document.getElementById('planDetailModal');
  const sub = window.LESSON_PLAN_DATA?.subjects.find(s => s.id === plan.subject);
  const gradeLabel = window.LESSON_PLAN_DATA.getGradeLabel(plan.grade);

  let subName = sub?.name || plan.subject;
  if (plan.subject === 'other' && plan.customSubjectName) {
    subName = `${plan.customSubjectName} 🌐`;
  }

  if (target && modal) {
    target.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900">
            ${sub?.emoji || '📚'} ${subName}
          </span>
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            ${gradeLabel.full}
          </span>
          <span class="text-xs text-slate-500 ml-auto">ผู้สอน: ${plan.studentName}</span>
        </div>

        <h3 class="font-heading font-bold text-xl sm:text-2xl text-slate-900">${plan.topic}</h3>

        <div class="p-2.5 rounded-xl bg-purple-50 text-xs font-bold text-purple-900 border border-purple-200">
          ⏱️ เวลาในคาบ: รวม ${plan.totalMinutes || 50} นาที (ขั้นนำ ${plan.introMinutes || 10}น. | ขั้นสอน ${plan.teachingMinutes || 30}น. | ขั้นสรุป ${plan.conclusionMinutes || 10}น.)
        </div>

        <div class="space-y-2 text-xs sm:text-sm">
          <div class="p-2.5 rounded-xl bg-sky-50 border border-sky-200">
            <strong>K (ความรู้):</strong> นักเรียนสามารถ [${plan.kVerb}] ${plan.kDetail || '-'}
          </div>
          <div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <strong>P (ทักษะ):</strong> นักเรียนสามารถ [${plan.pVerb}] ${plan.pDetail || '-'}
          </div>
          <div class="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
            <strong>A (เจตคติ):</strong> นักเรียน ${plan.aType || '-'}
          </div>
        </div>

        <div class="space-y-3 pt-2 border-t-2 border-slate-100 text-xs sm:text-sm">
          <div>
            <strong class="text-purple-700">7.1 ขั้นนำ (${plan.introMinutes || 10} นาที):</strong> ${plan.introActivity} (${plan.introDetail || '-'})
            <div class="text-slate-500 text-xs mt-0.5">สื่อ: ${(plan.introMedia || []).join(', ')}${plan.introCustomMedia ? ` + ✨ ${plan.introCustomMedia} (สื่อสร้างสรรค์)` : ''}</div>
          </div>
          <div>
            <strong class="text-emerald-700">7.2 ขั้นสอน (${plan.teachingMinutes || 30} นาที):</strong> ${plan.teachingActivity} (${plan.teachingDetail || '-'})
            <div class="text-slate-500 text-xs mt-0.5">สื่อ: ${(plan.teachingMedia || []).join(', ')}${plan.teachingCustomMedia ? ` + ✨ ${plan.teachingCustomMedia} (สื่อสร้างสรรค์)` : ''}</div>
          </div>
          <div>
            <strong class="text-amber-700">7.3 ขั้นสรุป (${plan.conclusionMinutes || 10} นาที):</strong> ${plan.conclusionActivity} (${plan.conclusionDetail || '-'})
            <div class="text-slate-500 text-xs mt-0.5">สื่อ: ${(plan.conclusionMedia || []).join(', ')}${plan.conclusionCustomMedia ? ` + ✨ ${plan.conclusionCustomMedia} (สื่อสร้างสรรค์)` : ''}</div>
          </div>
        </div>

        <!-- Modal Actions (Edit, Delete, Close) -->
        <div class="pt-4 border-t-2 border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2 flex-wrap">
            <button onclick="editPlanFromDashboard('${plan.id}')" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 transition-all cursor-pointer">
              <span>✏️</span>
              <span>แก้ไขแผนนี้</span>
            </button>
            <button onclick="deletePlan('${plan.id}')" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 transition-all cursor-pointer">
              <span>🗑️</span>
              <span>ลบแผนนี้</span>
            </button>
          </div>
          <button onclick="closeModal()" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer ml-auto">
            ปิด
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }
};

window.closeModal = function() {
  document.getElementById('planDetailModal')?.classList.add('hidden');
};

/**
 * แก้ไขแผนการสอนจากหน้าแดชบอร์ด (Edit Plan)
 */
window.editPlanFromDashboard = function(id) {
  const plan = appState.classroomPlans.find(p => p.id === id);
  if (!plan) return;

  // โหลดข้อมูลแผนนั้นกลับเข้า appState.formData
  appState.formData = {
    id: plan.id, // ใช้ id เดิมเพื่อให้อัปเดตทับแผนเดิม
    subject: plan.subject || 'science',
    customSubjectName: plan.customSubjectName || '',
    grade: plan.grade || 'm6',
    teacherName: (plan.studentName || plan.teacherName || '').replace(' (ผลงานของคุณ ✨)', ''),
    totalMinutes: plan.totalMinutes || 50,
    introMinutes: plan.introMinutes || 10,
    teachingMinutes: plan.teachingMinutes || 30,
    conclusionMinutes: plan.conclusionMinutes || 10,
    topic: plan.topic || '',
    kVerb: plan.kVerb || 'อธิบาย',
    kDetail: plan.kDetail || '',
    pVerb: plan.pVerb || 'ทดลอง',
    pDetail: plan.pDetail || '',
    aType: plan.aType || 'มีจิตวิทยาศาสตร์และช่างสังเกต',
    aCustom: plan.aCustom || '',
    introActivity: plan.introActivity || 'ดูคลิปวิดีโอสั้นหรือภาพปริศนาชวนคิด',
    introDetail: plan.introDetail || '',
    introMedia: Array.isArray(plan.introMedia) ? [...plan.introMedia] : ['คลิปวิดีโอสั้น (YouTube)'],
    introCustomMedia: plan.introCustomMedia || '',
    teachingActivity: plan.teachingActivity || 'ลงมือปฏิบัติจริง / ทำการทดลอง / สร้างชิ้นงาน',
    teachingDetail: plan.teachingDetail || '',
    teachingMedia: Array.isArray(plan.teachingMedia) ? [...plan.teachingMedia] : ['ชุดอุปกรณ์ทดลอง / โมเดลจำลอง'],
    teachingCustomMedia: plan.teachingCustomMedia || '',
    conclusionActivity: plan.conclusionActivity || 'เขียนตั๋วออกจากห้องเรียน (Exit Ticket โพสต์อิท)',
    conclusionDetail: plan.conclusionDetail || '',
    conclusionMedia: Array.isArray(plan.conclusionMedia) ? [...plan.conclusionMedia] : ['กระดาษโพสต์อิท (Exit Ticket)'],
    conclusionCustomMedia: plan.conclusionCustomMedia || '',
    likes: plan.likes || 1,
    createdAt: plan.createdAt || null
  };

  // บันทึกลง Storage ร่าง
  localStorage.setItem(STORAGE_MY_PLAN, JSON.stringify(appState.formData));

  // ซิงค์การแสดงผลทุกขั้นตอนให้ตรงกับข้อมูลที่โหลดมา
  updateTimeDistribution(appState.formData.totalMinutes || 50);
  renderStep1Subjects();
  renderStep2Grades();
  syncSubjectPlaceholdersAndControls();
  renderStep3Form();
  initStep4Controls();
  initStep5Controls();
  initStep6Controls();
  initStep7Controls();
  initStep8Controls();
  initStep9Controls();

  closeModal();
  startWizard(1);
  showToast(`กำลังเปิดแก้ไขแผน: "${plan.topic || plan.studentName}" ✏️`, 'success');
};

/**
 * ลบแผนการสอน 1 แผนแบบ Real-time (Delete Single Plan)
 */
window.deletePlan = async function(id) {
  const plan = appState.classroomPlans.find(p => p.id === id);
  if (!plan) return;

  const planName = plan.topic ? `"${plan.topic}"` : 'แผนการสอนนี้';
  if (!confirm(`คุณต้องการลบ ${planName} ออกจากกระดานห้องเรียนใช่หรือไม่?`)) {
    return;
  }

  // ป้องกันการโหลดแผน mock มาแทนที่
  localStorage.setItem('LP_STUDIO_SEEDED', 'true');

  // 1. Optimistic UI: ลบทันทีในเครื่อง ไม่ต้องรอโหลด ไม่ต้องรีเฟรช หายวับทันที!
  appState.classroomPlans = appState.classroomPlans.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_CLASSROOM_WALL, JSON.stringify(appState.classroomPlans));
  updateNavCountBadge();
  renderTeacherDashboard();
  closeModal();
  showToast(`ลบแผนการสอนเรียบร้อยแล้ว 🗑️`, 'info');

  // 2. ซิงค์ลบบน Firebase Cloud Real-time
  if (window.FirebaseService && window.FirebaseService.isReady) {
    await window.FirebaseService.deletePlan(id);
  }
};

/**
 * ลบแผนการสอนทั้งหมดแบบ Real-time (Delete All Plans / Clear Wall)
 */
window.deleteAllPlans = async function() {
  if (!appState.classroomPlans || appState.classroomPlans.length === 0) {
    showToast('ไม่มีแผนการสอนในกระดานห้องเรียนให้ลบแล้วครับ', 'info');
    return;
  }

  const count = appState.classroomPlans.length;
  const ok = confirm(`⚠️ คำเตือนสำคัญ:\nคุณต้องการลบแผนการสอนทั้งหมด (${count} แผน) ออกจากกระดานห้องเรียนใช่หรือไม่?\n\nเมื่อลบแล้ว กระดานจะว่างเปล่าแบบ Real-time ทันที!`);
  if (!ok) return;

  // ป้องกันการโหลดแผน mock มาแทนที่
  localStorage.setItem('LP_STUDIO_SEEDED', 'true');

  // 1. Optimistic UI: ล้างกระดานทันทีแบบ Real-time หายวับทันตา ไม่ต้องรีเฟรช
  appState.classroomPlans = [];
  localStorage.setItem(STORAGE_CLASSROOM_WALL, JSON.stringify([]));
  updateNavCountBadge();
  renderTeacherDashboard();
  showToast(`ลบแผนการสอนทั้งหมด (${count} แผน) เรียบร้อยแล้ว! 🧹`, 'success');

  // 2. ซิงค์ลบทั้งหมดบน Firebase Cloud Real-time
  if (window.FirebaseService && window.FirebaseService.isReady) {
    await window.FirebaseService.deleteAllPlans();
  }
};

function updateNavCountBadge() {
  const badge = document.getElementById('navWallCountBadge');
  if (badge) {
    badge.innerText = appState.classroomPlans.length || 0;
  }
}

window.downloadOverviewPng = function() {
  const card = document.getElementById('overviewTicketCard');
  if (!card) return;

  showToast('กำลังเตรียมรูปภาพ PNG... ⏳', 'info');

  if (window.html2canvas) {
    window.html2canvas(card, { scale: 2, backgroundColor: '#ffffff', useCORS: true }).then(canvas => {
      const a = document.createElement('a');
      a.download = `ตั๋วแผนการสอน_${appState.formData.topic || 'lesson_ticket'}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      showToast('ดาวน์โหลดรูปภาพสำเร็จแล้ว! 🖼️', 'success');
    }).catch(e => {
      showToast('ไม่สามารถดาวน์โหลดภาพได้ กรุณาใช้ปุ่มพิมพ์/PDF แทน', 'warning');
    });
  }
};

window.copyOverviewText = function() {
  const p = appState.formData;
  const sub = window.LESSON_PLAN_DATA?.subjects.find(s => s.id === p.subject);
  const gradeLabel = window.LESSON_PLAN_DATA.getGradeLabel(p.grade);

  let subName = sub?.name || p.subject;
  if (p.subject === 'other' && p.customSubjectName) {
    subName = `${p.customSubjectName} 🌐`;
  }

  const text = `
=========================================
🎒 แผนการจัดการเรียนรู้ (Lesson Plan Overview)
=========================================
• กลุ่มสาระ: ${subName}
• ระดับชั้น: ${gradeLabel.full}
• เรื่อง: ${p.topic || 'แผนการสอน'}
• ผู้จัดทำ: ${p.teacherName || 'คุณครู ม.6'}
• เวลาเรียน: รวม ${p.totalMinutes} นาที (นำ ${p.introMinutes}น. | สอน ${p.teachingMinutes}น. | สรุป ${p.conclusionMinutes}น.)

🎯 จุดประสงค์การเรียนรู้ (K - P - A)
1. K (ความรู้): นักเรียนสามารถ [${p.kVerb}] ${p.kDetail || '-'}
2. P (ทักษะ): นักเรียนสามารถ [${p.pVerb}] ${p.pDetail || '-'}
3. A (เจตคติ): นักเรียน ${p.aType} ${p.aCustom || ''}

🎪 กระบวนการเรียนรู้ & สื่อประจำขั้น
1. ขั้นนำ (${p.introMinutes} นาที): ${p.introActivity} (${p.introDetail || '-'})
   - สื่อ: ${(p.introMedia || []).join(', ')}${p.introCustomMedia ? ` + ✨ ${p.introCustomMedia} (สื่อสร้างสรรค์)` : ''}
2. ขั้นสอน (${p.teachingMinutes} นาที): ${p.teachingActivity} (${p.teachingDetail || '-'})
   - สื่อ: ${(p.teachingMedia || []).join(', ')}${p.teachingCustomMedia ? ` + ✨ ${p.teachingCustomMedia} (สื่อสร้างสรรค์)` : ''}
3. ขั้นสรุป (${p.conclusionMinutes} นาที): ${p.conclusionActivity} (${p.conclusionDetail || '-'})
   - สื่อ: ${(p.conclusionMedia || []).join(', ')}${p.conclusionCustomMedia ? ` + ✨ ${p.conclusionCustomMedia} (สื่อสร้างสรรค์)` : ''}

ส่งเข้าสู่ Lesson Plan Studio 🎒
=========================================
  `.trim();

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('คัดลอกข้อความแผนการสอนแล้ว! 📋 พร้อมวางใน Docs/Word', 'success');
    });
  }
};

window.confirmReset = function() {
  if (confirm('ต้องการล้างข้อมูลเพื่อเริ่มสร้างแผนใหม่ใช่ไหมครับ? 🎒')) {
    localStorage.removeItem(STORAGE_MY_PLAN);
    appState.formData = {
      id: null,
      subject: 'science',
      customSubjectName: '',
      grade: 'm6',
      teacherName: '',
      totalMinutes: 50,
      introMinutes: 10,
      teachingMinutes: 30,
      conclusionMinutes: 10,
      topic: '',
      kVerb: 'อธิบาย',
      kDetail: '',
      pVerb: 'ทดลอง',
      pDetail: '',
      aType: 'มีจิตวิทยาศาสตร์และช่างสังเกต',
      aCustom: '',
      introActivity: 'ดูคลิปวิดีโอสั้นหรือภาพปริศนาชวนคิด',
      introDetail: '',
      introMedia: ['คลิปวิดีโอสั้น (YouTube)'],
      introCustomMedia: '',
      teachingActivity: 'ลงมือปฏิบัติจริง / ทำการทดลอง / สร้างชิ้นงาน',
      teachingDetail: '',
      teachingMedia: ['ชุดอุปกรณ์ทดลอง / โมเดลจำลอง'],
      teachingCustomMedia: '',
      conclusionActivity: 'เขียนตั๋วออกจากห้องเรียน (Exit Ticket โพสต์อิท)',
      conclusionDetail: '',
      conclusionMedia: ['กระดาษโพสต์อิท (Exit Ticket)'],
      conclusionCustomMedia: '',
      likes: 1,
      createdAt: null
    };
    renderStep1Subjects();
    renderStep2Grades();
    syncSubjectPlaceholdersAndControls();
    renderStep3Form();
    initStep4Controls();
    initStep5Controls();
    initStep6Controls();
    initStep7Controls();
    initStep8Controls();
    initStep9Controls();
    showView('start');
    showToast('พร้อมเริ่มใหม่แล้วจ้า 🚀', 'info');
  }
};

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  // Clear previous toasts so they don't pile up or clutter the mobile view
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const toast = document.createElement('div');
  const colors = {
    info: 'bg-purple-950/90 text-white border-purple-400/40 shadow-purple-900/30',
    success: 'bg-emerald-950/90 text-white border-emerald-400/40 shadow-emerald-900/30',
    warning: 'bg-amber-950/90 text-white border-amber-400/40 shadow-amber-900/30'
  };

  // Capsule pill design with pointer-events-none so it NEVER blocks any click or touch
  toast.className = `pointer-events-none select-none flex items-center justify-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg backdrop-blur-md border text-center text-xs sm:text-sm font-bold animate-cute-pop ${colors[type] || colors.info}`;
  toast.innerHTML = `<span>${msg}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-6px) scale(0.95)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 1800);
}
