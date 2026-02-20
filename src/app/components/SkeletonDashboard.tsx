 "use client";
 import React from "react";
 
 export default function SkeletonDashboard() {
   return (
     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
       <div className="lg:col-span-2 space-y-6">
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
           <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
             <div className="animate-pulse space-y-3">
               <div className="h-4 bg-gray-200 rounded w-24"></div>
               <div className="h-8 bg-gray-200 rounded w-32"></div>
               <div className="h-3 bg-gray-100 rounded w-20"></div>
             </div>
           </div>
           <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
             <div className="animate-pulse space-y-3">
               <div className="h-4 bg-gray-200 rounded w-28"></div>
               <div className="h-8 bg-gray-200 rounded w-40"></div>
               <div className="h-3 bg-gray-100 rounded w-24"></div>
             </div>
           </div>
           <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
             <div className="animate-pulse space-y-3">
               <div className="h-4 bg-gray-200 rounded w-20"></div>
               <div className="h-8 bg-gray-200 rounded w-24"></div>
               <div className="h-3 bg-gray-100 rounded w-16"></div>
             </div>
           </div>
         </div>
 
         <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
           <div className="animate-pulse">
             <div className="h-5 bg-gray-200 rounded w-48 mb-2"></div>
             <div className="h-4 bg-gray-100 rounded w-36 mb-6"></div>
             <div className="h-64 bg-gray-100 rounded"></div>
           </div>
         </div>
 
         <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
           <div className="animate-pulse">
             <div className="h-5 bg-gray-200 rounded w-40 mb-2"></div>
             <div className="h-4 bg-gray-100 rounded w-28 mb-6"></div>
             <div className="grid grid-cols-2 gap-6">
               <div className="h-40 bg-gray-100 rounded"></div>
               <div className="h-40 bg-gray-100 rounded"></div>
             </div>
           </div>
         </div>
       </div>
 
       <div className="space-y-6">
         <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
           <div className="animate-pulse space-y-4">
             <div className="flex items-center justify-between">
               <div className="h-5 bg-gray-200 rounded w-32"></div>
               <div className="h-6 w-16 bg-gray-100 rounded"></div>
             </div>
             <div className="space-y-3">
               <div className="h-4 bg-gray-100 rounded w-full"></div>
               <div className="h-4 bg-gray-100 rounded w-5/6"></div>
               <div className="h-4 bg-gray-100 rounded w-4/6"></div>
               <div className="h-4 bg-gray-100 rounded w-2/3"></div>
             </div>
           </div>
         </div>
 
         <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
           <div className="animate-pulse">
             <div className="h-5 bg-gray-200 rounded w-36 mb-2"></div>
             <div className="h-4 bg-gray-100 rounded w-24 mb-6"></div>
             <div className="h-40 bg-gray-100 rounded"></div>
           </div>
         </div>
       </div>
     </div>
   );
 }
 
