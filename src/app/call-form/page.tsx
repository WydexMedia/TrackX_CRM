"use client";
import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast, { Toaster } from 'react-hot-toast';

const schema = yup.object().shape({
  callCompleted: yup.string().required('Please select if call was completed'),
  callType: yup.string().required('Please select call type'),
  callStatus: yup.string().required('Please select call status'),
  notes: yup.string().required('Notes are required'),
  // mark as defined so keys are always present (may be undefined)
  leadPhone: yup.string().optional().defined(),
  phone: yup.string().optional().defined(),
});

type FormData = {
  callCompleted: string; // 'yes' or 'no'
  callType: string; // 'new' or 'followup'
  callStatus: string; // 'QUALIFIED', 'CONNECTED_TO_WHATSAPP', 'DNP', 'POSITIVE', 'NATC'
  notes: string;
  leadPhone: string;
  phone: string;
};

function CallFormPage() {
  const [user, setUser] = React.useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (u) {
      setUser(JSON.parse(u));
    } else {
      router.replace('/login');
    }
  }, [router]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ 
    resolver: yupResolver(schema),
    defaultValues: {
      callCompleted: 'no',
      callType: '',
      callStatus: '',
      notes: '',
      leadPhone: searchParams?.get('leadPhone') || '',
      phone: searchParams?.get('phone') || ''
    }
  });

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast.error('You must be logged in!');
      return;
    }
    try {
      const response = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, ogaName: user.name }),
      });
      
      if (response.ok) {
        reset();
        toast.success('Call logged successfully!');
      } else {
        toast.error('Failed to log call');
      }
    } catch (error) {
      toast.error('Failed to log call');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <Toaster position="top-center" />
      <div className="w-full max-w-md flex justify-end mb-4">
        <button
          onClick={() => router.push('/login')}
          className="px-6 py-2 bg-gray-700 text-white rounded-lg font-semibold shadow hover:from-blue-700 hover:to-purple-700 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 border border-gray-200"
      >
        <h2 className="text-xl font-bold text-center text-gray-800 mb-2">Call Log Form</h2>
        <div className="text-gray-700 font-medium mb-2">Logged in as: <span className="font-bold">{user.name}</span></div>

        <label className="text-gray-700 font-medium">Lead Phone (exact match to existing lead)</label>
        <input
          {...register('leadPhone')}
          placeholder="e.g. +911234567890"
          className="input"
        />
        <p className="text-xs text-slate-500 mb-2">Tip: This links the log to the lead so the Team Lead timeline updates.</p>

        <label className="text-gray-700 font-medium">Dialed Phone (optional)</label>
        <input
          {...register('phone')}
          placeholder="Customer phone"
          className="input"
        />
        
        <label className="text-gray-700 font-medium">Have you completed the call?</label>
        <div className="flex gap-4">
          <label className="flex text-black items-center gap-2">
            <input type="radio" value="yes" {...register('callCompleted')} /> Yes
          </label>
          <label className="flex text-black items-center gap-2">
            <input type="radio" value="no" {...register('callCompleted')} /> No
          </label>
        </div>
        <p className="text-red-500 text-xs">{errors.callCompleted?.message}</p>
        
        <label className="text-gray-700 font-medium">Is this a new or follow-up call?</label>
        <div className="flex gap-4">
          <label className="flex text-black items-center gap-2">
            <input type="radio" value="new" {...register('callType')} /> New
          </label>
          <label className="flex text-black items-center gap-2">
            <input type="radio" value="followup" {...register('callType')} /> Follow-up
          </label>
        </div>
        <p className="text-red-500 text-xs">{errors.callType?.message}</p>
        
        <label className="text-gray-700 font-medium">Call Status</label>
        <select {...register('callStatus')} className="input">
          <option value="">Select status</option>
          <option value="QUALIFIED">QUALIFIED</option>
          <option value="CONNECTED_TO_WHATSAPP">CONNECTED TO WHATSAPP</option>
          <option value="DNP">DNP</option>
          <option value="POSITIVE">POSITIVE</option>
          <option value="NATC">NATC</option>
          <option value="NOT_INTERESTED">NOT INTERESTED</option>
        </select>
        <p className="text-red-500 text-xs">{errors.callStatus?.message}</p>
        
        <label className="text-gray-700 font-medium">Notes</label>
        <textarea 
          {...register('notes')} 
          placeholder="Write notes about the call..." 
          className="input min-h-[100px] resize-none"
        />
        <p className="text-red-500 text-xs">{errors.notes?.message}</p>
        
        <button
          type="submit"
          className="mt-2 py-3 rounded-lg bg-gray-800 text-white font-bold text-lg shadow hover:bg-gray-700 transition-colors"
        >
          Submit Call Log
        </button>
      </form>
      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.7rem 1rem;
          border-radius: 0.7rem;
          border: 1.5px solid #d1d5db;
          font-size: 1rem;
          margin-bottom: 0.1rem;
          outline: none;
          transition: border 0.2s;
          color: #222;
          background: #f9fafb;
        }
        .input:focus {
          border: 1.5px solid #6366f1;
        }
        .input::placeholder {
          color: #888;
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div />}> 
      <CallFormPage />
    </Suspense>
  );
}