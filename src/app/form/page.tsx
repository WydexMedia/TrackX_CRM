"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast, { Toaster } from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const schema = yup.object().shape({
  customerName: yup.string().required('Customer Name is required'),
  amount: yup
    .number()
    .typeError('Amount must be a number')
    .required('Amount is required'),
  newAdmission: yup.string().required('Please select if this is a new admission'),
});

type FormData = {
  customerName: string;
  amount: number;
  newAdmission: string; // 'yes' or 'no'
};

export default function FormPage() {
  const router = useRouter();
  const { user: clerkUser, isLoaded } = useUser();

  React.useEffect(() => {
    if (isLoaded && !clerkUser) {
      router.replace('/login');
    }
  }, [isLoaded, clerkUser, router]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: yupResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (!clerkUser) {
      toast.error('You must be logged in!');
      return;
    }
    
    // Get user name from Clerk or database
    let userName = clerkUser.fullName || clerkUser.firstName || "User";
    try {
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (email) {
        const userResponse = await fetch(`/api/users/current?identifier=${encodeURIComponent(email)}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.success && userData.user?.name) {
            userName = userData.user.name;
          }
        }
      }
    } catch (error) {
      console.error("Error fetching user name:", error);
    }
    
    // Normalize newAdmission values to match dashboard expectations (Yes/No)
    const normalized = {
      ...data,
      newAdmission: data.newAdmission?.toLowerCase() === 'yes' ? 'Yes' : 'No',
    };
    
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...normalized, ogaName: userName }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to submit sale');
        return;
      }
      
      reset();
      toast.success('Sale submitted!');
    } catch (error) {
      console.error('Error submitting sale:', error);
      toast.error('Failed to submit sale. Please try again.');
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!clerkUser) return null;

  const userName = clerkUser.fullName || clerkUser.firstName || "User";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <Toaster position="top-center" />
      <div className="w-full max-w-md flex justify-end mb-4">
        <Button
          onClick={() => router.push('/dashboard')}
          variant="outline"
        >
          Go to Dashboard
        </Button>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Sales Entry Form</CardTitle>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-sm text-gray-600">Logged in as:</span>
            <Badge variant="secondary">{userName}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="space-y-2">
              <label htmlFor="customerName" className="text-sm font-medium">Customer Name</label>
              <Input
                id="customerName"
                {...register('customerName')}
                placeholder="Customer Name"
              />
              {errors.customerName && (
                <p className="text-red-500 text-sm">{errors.customerName.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium">Amount</label>
              <Input
                id="amount"
                {...register('amount')}
                placeholder="Amount"
                type="number"
              />
              {errors.amount && (
                <p className="text-red-500 text-sm">{errors.amount.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">New Admission?</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="Yes"
                    {...register('newAdmission')}
                    className="cursor-pointer"
                  />
                  <span className="text-sm">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="No"
                    {...register('newAdmission')}
                    className="cursor-pointer"
                  />
                  <span className="text-sm">No</span>
                </label>
              </div>
              {errors.newAdmission && (
                <p className="text-red-500 text-sm">{errors.newAdmission.message}</p>
              )}
            </div>
            
            <Button
              type="submit"
              className="mt-2"
            >
              Submit Sale
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
