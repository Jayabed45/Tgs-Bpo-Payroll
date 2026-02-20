 "use client";
 import React from "react";
 
 export default function SkeletonPage() {
   return (
     <div className="space-y-6">
       {/* Header skeleton */}
       <div className="flex justify-between items-center">
         <div className="space-y-2">
           <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
           <div className="h-4 w-72 bg-gray-100 rounded animate-pulse"></div>
         </div>
         <div className="h-10 w-40 bg-gray-100 rounded animate-pulse"></div>
       </div>
 
       {/* Cards row */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
         {[1,2,3].map((i) => (
           <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
             <div className="animate-pulse space-y-3">
               <div className="h-4 bg-gray-200 rounded w-24"></div>
               <div className="h-8 bg-gray-200 rounded w-32"></div>
               <div className="h-3 bg-gray-100 rounded w-20"></div>
             </div>
           </div>
         ))}
       </div>
 
       {/* Main content block */}
       <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
         <div className="animate-pulse space-y-4">
           <div className="h-5 bg-gray-200 rounded w-56"></div>
           <div className="h-4 bg-gray-100 rounded w-40"></div>
           <div className="h-64 bg-gray-100 rounded"></div>
         </div>
       </div>
 
       {/* Secondary blocks */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
           <div className="animate-pulse space-y-3">
             <div className="h-5 bg-gray-200 rounded w-44"></div>
             <div className="h-4 bg-gray-100 rounded w-32"></div>
             <div className="h-40 bg-gray-100 rounded"></div>
           </div>
         </div>
         <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
           <div className="animate-pulse space-y-3">
             <div className="h-5 bg-gray-200 rounded w-36"></div>
             <div className="h-4 bg-gray-100 rounded w-24"></div>
             <div className="space-y-2">
               {[...Array(8)].map((_, idx) => (
                 <div key={idx} className="h-4 bg-gray-100 rounded"></div>
               ))}
             </div>
           </div>
         </div>
       </div>
     </div>
   );
 }
 
