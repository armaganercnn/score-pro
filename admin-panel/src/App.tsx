import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import { AuthProvider } from './components/Auth/AuthProvider';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Lazy load pages for performance optimization
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const UserManagement = lazy(() => import('./pages/Users/UserManagement'));
const CouponManagement = lazy(() => import('./pages/Coupons/CouponManagement'));
const AIEngine = lazy(() => import('./pages/AI/AIEngine'));
const Engagement = lazy(() => import('./pages/Marketing/Engagement'));
const ContentManagement = lazy(() => import('./pages/CMS/ContentManagement'));
const Login = lazy(() => import('./pages/Auth/Login'));

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div></div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="coupons" element={<CouponManagement />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="ai" element={<AIEngine />} />
              <Route path="marketing" element={<Engagement />} />
              <Route path="cms" element={<ContentManagement />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
