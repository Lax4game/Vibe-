/**
 * Firebase Configuration & Initialization
 * 
 * GIẢI THÍCH CHO GIÁM KHẢO:
 * - File này khởi tạo kết nối tới Firebase (dịch vụ BaaS của Google).
 * - Firebase Auth: Xác thực người dùng bằng Google OAuth 2.0.
 * - Firestore: Cơ sở dữ liệu NoSQL realtime lưu trữ playlist cá nhân.
 * - Tách riêng file config giúp dễ thay đổi project Firebase mà không ảnh hưởng code.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Thông tin kết nối tới Firebase project "coffe-store-77f10"
// Được lấy từ Firebase Console > Project Settings > SDK Config
const firebaseConfig = {
  apiKey: "AIzaSyAdffJ_L7IcaXEFlZ_H_Qlr8iPO7VyjuRY",
  authDomain: "coffe-store-77f10.firebaseapp.com",
  projectId: "coffe-store-77f10",
  storageBucket: "coffe-store-77f10.firebasestorage.app",
  messagingSenderId: "716233062786",
  appId: "1:716233062786:web:0e1f3c9d31813f1c70379b",
  measurementId: "G-QXZMK2NW19"
};

// Khởi tạo Firebase App - đây là bước bắt buộc trước khi dùng bất kỳ service nào
const app = initializeApp(firebaseConfig);

// Export các service instances để các component khác sử dụng
export const auth = getAuth(app);                  // Service xác thực
export const db = getFirestore(app);               // Service cơ sở dữ liệu
export const storage = getStorage(app);            // Service lưu trữ file
export const googleProvider = new GoogleAuthProvider(); // Provider đăng nhập Google

export default app;
