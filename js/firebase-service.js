/**
 * Firebase Integration Service for Lesson Plan Studio
 * 
 * ระบบเชื่อมต่อ Cloud Firestore อัตโนมัติแบบ Real-time
 * รองรับการแสดงผลสถานะ ไฟเขียว 🟢 / เหลือง 🟡 / แดง 🔴 พร้อมระบบ Fallback เป็น LocalStorage
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCqoOuZrafEowcV1aWSqepYrCRHylbaR2s",
  authDomain: "lessonplanstudio.firebaseapp.com",
  projectId: "lessonplanstudio",
  storageBucket: "lessonplanstudio.firebasestorage.app",
  messagingSenderId: "1026479864595",
  appId: "1:1026479864595:web:77f99d81226e848b2178e6",
  measurementId: "G-B731PZL2YR"
};

/**
 * ตรวจสอบว่าโปรเจกต์ตั้งค่าคีย์ Firebase แล้วหรือยัง
 */
function isFirebaseConfigured() {
  return Boolean(
    FIREBASE_CONFIG.apiKey && 
    FIREBASE_CONFIG.projectId && 
    FIREBASE_CONFIG.apiKey.trim() !== ""
  );
}

/**
 * Service Wrapper สำหรับบันทึกและฟังข้อมูล (Firestore) พร้อมสถานะไฟสัญญาณ Realtime
 */
const FirebaseService = {
  isReady: false,
  db: null,
  status: 'offline', // 'online' | 'connecting' | 'syncing' | 'offline'
  statusListeners: [],

  /**
   * ลงทะเบียนรับการแจ้งเตือนสถานะการเชื่อมต่อ (🟢 เขียว / 🟡 เหลือง / 🔴 แดง)
   */
  onStatusChange(callback) {
    if (typeof callback === 'function') {
      this.statusListeners.push(callback);
      // ส่งสถานะปัจจุบันให้ทันที
      callback(this.status);
    }
  },

  /**
   * อัปเดตสถานะและแจ้งเตือน UI ทั้งหมด
   */
  setStatus(newStatus) {
    this.status = newStatus;
    this.statusListeners.forEach(fn => {
      try {
        fn(newStatus);
      } catch (e) {
        console.error('Error in status listener:', e);
      }
    });
  },

  /**
   * เริ่มต้นเชื่อมต่อ Firebase Firestore
   */
  async init(onPlansUpdated, onStatusChanged) {
    if (onStatusChanged) {
      this.onStatusChange(onStatusChanged);
    }

    if (!isFirebaseConfigured()) {
      console.log('ℹ️ Firebase: ยังไม่ได้ตั้งค่าคีย์ ➔ ระบบทำงานในโหมด LocalStorage');
      this.setStatus('offline');
      return false;
    }

    this.setStatus('connecting');

    // ตรวจจับกรณีเบราว์เซอร์ตัดการเชื่อมต่ออินเทอร์เน็ต
    window.addEventListener('online', () => {
      if (this.isReady) {
        this.setStatus('online');
      } else {
        this.init(onPlansUpdated);
      }
    });
    window.addEventListener('offline', () => {
      this.setStatus('offline');
    });

    try {
      // โหลด Firebase SDK แบบ Dynamic Compat
      if (!window.firebase) {
        await this.loadScripts([
          'https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js',
          'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore-compat.js'
        ]);
      }

      // ป้องกันการ initialize ซ้ำ
      if (!window.firebase.apps.length) {
        window.firebase.initializeApp(FIREBASE_CONFIG);
      }

      this.db = window.firebase.firestore();
      this.isReady = true;
      this.setStatus('online');
      console.log('🔥 Firebase Firestore: เชื่อมต่อ Real-time สำเร็จเรียบร้อย! 🟢');

      // เริ่มฟังข้อมูล Realtime การส่งแผนของเด็กทุกคนในห้อง
      if (onPlansUpdated && typeof onPlansUpdated === 'function') {
        this.subscribeClassroomPlans(onPlansUpdated);
      }

      return true;
    } catch (err) {
      console.error('❌ Firebase Init Error:', err);
      this.isReady = false;
      this.setStatus('offline');
      return false;
    }
  },

  /**
   * บันทึกแผนการสอนขึ้น Cloud (เด็กกดส่งปึ้ง ผลงานจะเด้งขึ้นหน้าจอครูทันที)
   */
  async savePlan(planData) {
    if (!this.isReady || !this.db) {
      this.setStatus('offline');
      return false;
    }

    try {
      this.setStatus('syncing');
      const planRef = this.db.collection('classroom_plans').doc(planData.id);
      await planRef.set({
        ...planData,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log('☁️ บันทึกแผนขึ้น Cloud สำเร็จ:', planData.id);
      this.setStatus('online');
      return true;
    } catch (err) {
      console.error('❌ บันทึก Firebase ล้มเหลว:', err);
      this.setStatus('offline');
      return false;
    }
  },

  /**
   * ส่งหัวใจ Like ให้เพื่อนบน Cloud
   */
  async likePlan(planId) {
    if (!this.isReady || !this.db) return false;

    try {
      const planRef = this.db.collection('classroom_plans').doc(planId);
      await planRef.update({
        likes: window.firebase.firestore.FieldValue.increment(1)
      });
      return true;
    } catch (err) {
      console.error('❌ ส่งหัวใจบน Firebase ล้มเหลว:', err);
      return false;
    }
  },

  /**
   * ลบแผนการสอน 1 แผนจาก Cloud ในแบบ Real-time
   */
  async deletePlan(planId) {
    if (!this.isReady || !this.db) return false;

    try {
      this.setStatus('syncing');
      await this.db.collection('classroom_plans').doc(planId).delete();
      console.log('🗑️ ลบแผนจาก Cloud สำเร็จ:', planId);
      this.setStatus('online');
      return true;
    } catch (err) {
      console.error('❌ ลบแผนบน Firebase ล้มเหลว:', err);
      this.setStatus('offline');
      return false;
    }
  },

  /**
   * ลบแผนการสอนทั้งหมดออกจาก Cloud (ล้างกระดานห้องเรียนแบบ Real-time)
   */
  async deleteAllPlans() {
    if (!this.isReady || !this.db) return false;

    try {
      this.setStatus('syncing');
      const snapshot = await this.db.collection('classroom_plans').get();
      if (snapshot.empty) {
        this.setStatus('online');
        return true;
      }

      const batch = this.db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log('🧹 ลบแผนทั้งหมดจาก Cloud เรียบร้อยแล้ว!');
      this.setStatus('online');
      return true;
    } catch (err) {
      console.error('❌ ลบแผนทั้งหมดบน Firebase ล้มเหลว:', err);
      this.setStatus('offline');
      return false;
    }
  },

  /**
   * ฟังข้อมูล Real-time แผนของเพื่อนๆ ในห้องเรียน
   */
  subscribeClassroomPlans(callback) {
    if (!this.isReady || !this.db) return;

    this.db.collection('classroom_plans')
      .orderBy('createdAt', 'desc')
      .onSnapshot((snapshot) => {
        const plans = [];
        snapshot.forEach(doc => {
          plans.push(doc.data());
        });
        this.setStatus('online');
        callback(plans);
      }, (err) => {
        console.error('❌ Snapshot Error (อาจเกิดจากสิทธิ์ Rule หรือออฟไลน์):', err);
        // หาก snapshot ติด permission หรือ offline ให้คงข้อมูล local ไว้
        this.setStatus('offline');
      });
  },

  /**
   * Helper สำหรับโหลด script
   */
  loadScripts(urls) {
    return Promise.all(urls.map(url => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }));
  }
};

if (typeof window !== 'undefined') {
  window.FirebaseService = FirebaseService;
}
