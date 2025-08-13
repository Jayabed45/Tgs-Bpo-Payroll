"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(userData));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

	if (!user) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
					<h1 className="text-2xl font-bold text-gray-900 mb-2">TGS PAYROLL SYSTEM</h1>
					<p className="text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

  return (
    <div className="min-h-screen bg-white">
      {/* Simple Header */}
      <header className="bg-gray-100 border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900">TGS BPO PAYROLL SYSTEM</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user.name || user.email}</span>
              <button 
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Simple Main Content (empty for now) */}
      <main className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-gray-50 p-6 rounded-lg text-gray-500 text-sm">
          {/* Intentionally left blank for now */}
        </div>
      </main>
    </div>
  );
} 