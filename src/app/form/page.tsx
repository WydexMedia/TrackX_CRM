"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast, { Toaster } from 'react-hot-toast';

const OGA_NAMES = [
  'LULU FATHIMA P A',
  'AYSHA SHAHANA P',
  'SALOOJA KK',
  'SANILA SHERIN',
  'FALIHA P P',
  'HASBANA P',
  'NIHALA THASLI P',
  'FATHIMA SAHANA TK',
];

const schema = yup.object().shape({
  ogaName: yup.string().required('OGA Name is required'),
  customerName: yup.string().required('Customer Name is required'),
  address: yup.string().required('Address is required'),
  phone: yup.string().required('Phone Number is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  amount: yup
    .number()
    .typeError('Amount must be a number')
    .required('Amount is required'),
});

type FormData = {
  ogaName: string;
  customerName: string;
  address: string;
  phone: string;
  email: string;
  amount: number;
};

export default function FormPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: yupResolver(schema) });

  const onSubmit = async (data: FormData) => {
    await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    reset();
    toast.success('Sale submitted!');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <Toaster position="top-center" />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 border border-gray-200"
      >
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Sales Entry Form</h1>
        <label className="text-gray-700 font-medium">OGA Name</label>
        <select {...register('ogaName')} className="input">
          <option value="">Select OGA Name</option>
          {OGA_NAMES.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <p className="text-red-500 text-xs">{errors.ogaName?.message}</p>

        <label className="text-gray-700 font-medium">Customer Name</label>
        <input {...register('customerName')} placeholder="Customer Name" className="input" />
        <p className="text-red-500 text-xs">{errors.customerName?.message}</p>

        <label className="text-gray-700 font-medium">Address</label>
        <input {...register('address')} placeholder="Address" className="input" />
        <p className="text-red-500 text-xs">{errors.address?.message}</p>

        <label className="text-gray-700 font-medium">Phone Number</label>
        <input {...register('phone')} placeholder="Phone Number" className="input" />
        <p className="text-red-500 text-xs">{errors.phone?.message}</p>

        <label className="text-gray-700 font-medium">Email</label>
        <input {...register('email')} placeholder="Email Address" className="input" />
        <p className="text-red-500 text-xs">{errors.email?.message}</p>

        <label className="text-gray-700 font-medium">Amount</label>
        <input {...register('amount')} placeholder="Amount" className="input" />
        <p className="text-red-500 text-xs">{errors.amount?.message}</p>

        <button
          type="submit"
          className="mt-2 py-3 rounded-lg bg-gray-800 text-white font-bold text-lg shadow hover:bg-gray-700 transition-colors"
        >
          Submit Sale
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
        @media (max-width: 600px) {
          form {
            padding: 1rem;
          }
          .input {
            font-size: 0.95rem;
            padding: 0.6rem 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}
