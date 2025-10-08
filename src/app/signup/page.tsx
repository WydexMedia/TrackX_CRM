"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Globe,
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SignupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    instituteName: "",
    instituteEmail: "",
    website: "",
    password: "",
    confirmPassword: "",
    subdomain: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateStep1 = () => {
    const requiredFields = ['firstName', 'lastName', 'phone', 'instituteName', 'instituteEmail'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      setMessage({ type: "error", text: "Please fill in all required fields" });
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.instituteEmail)) {
      setMessage({ type: "error", text: "Please enter a valid email address" });
      return false;
    }
    
    return true;
  };

  const validateStep2 = () => {
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return false;
    }

    if (formData.password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters long" });
      return false;
    }
    
    return true;
  };

  const validateStep3 = async () => {
    if (!formData.subdomain) {
      setMessage({ type: "error", text: "Please enter a subdomain" });
      return false;
    }

    if (formData.subdomain.length < 4) {
      setMessage({ type: "error", text: "Subdomain must be at least 4 characters long" });
      return false;
    }

    // Basic subdomain validation (alphanumeric and hyphens only)
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!subdomainRegex.test(formData.subdomain.toLowerCase())) {
      setMessage({ type: "error", text: "Subdomain can only contain lowercase letters, numbers, and hyphens" });
      return false;
    }

    // Check if subdomain already exists
    try {
      const response = await fetch(`/api/tenants?subdomain=${formData.subdomain.toLowerCase()}`);
      const data = await response.json();
      
      if (data.exists) {
        setMessage({ type: "error", text: "This subdomain is already taken. Please choose another one." });
        return false;
      }
    } catch (error) {
      console.error("Error checking subdomain:", error);
      setMessage({ type: "error", text: "Error checking subdomain availability. Please try again." });
      return false;
    }
    
    return true;
  };

  const handleNext = async () => {
    setMessage(null);
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    // Final validation for step 3
    if (!(await validateStep3())) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Create the tenant account
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subdomain: formData.subdomain.toLowerCase(),
          companyName: formData.instituteName,
          contactName: `${formData.firstName} ${formData.lastName}`,
          email: formData.instituteEmail,
          phone: formData.phone,
          website: formData.website,
          password: formData.password
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create account');
      }

      const result = await response.json();
      
      setMessage({ type: "success", text: "Account created successfully! Redirecting to login..." });
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      
    } catch (error) {
      console.error("Error creating account:", error);
      setMessage({ type: "error", text: "Failed to create account. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 opacity-50">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236b7280' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Header */}
      <div className="relative bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Home</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Already have an account?</span>
              <Link href="/login">
                <Button variant="ghost" className="text-primary hover:text-primary/90 font-medium">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Logo Section */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-xl mx-auto mb-6 flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your TrackX Account</h1>
            <p className="text-gray-600">
              {currentStep === 1 ? "Enter your basic information to get started" : 
               currentStep === 2 ? "Secure your account with a strong password" :
               "Complete your setup with domain configuration"}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <Badge 
                variant={currentStep >= 1 ? "default" : "secondary"}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  currentStep >= 1 ? 'bg-primary' : 'bg-gray-300 text-gray-600'
                }`}
              >
                1
              </Badge>
              <div className={`w-16 h-1 ${currentStep >= 2 ? 'bg-primary' : 'bg-gray-300'}`}></div>
              <Badge 
                variant={currentStep >= 2 ? "default" : "secondary"}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  currentStep >= 2 ? 'bg-primary' : 'bg-gray-300 text-gray-600'
                }`}
              >
                2
              </Badge>
              <div className={`w-16 h-1 ${currentStep >= 3 ? 'bg-primary' : 'bg-gray-300'}`}></div>
              <Badge 
                variant={currentStep >= 3 ? "default" : "secondary"}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  currentStep >= 3 ? 'bg-primary' : 'bg-gray-300 text-gray-600'
                }`}
              >
                3
              </Badge>
            </div>
          </div>

          {/* Signup Form */}
          <Card className="bg-white shadow-xl border-0">
            <CardContent className="p-8">

            {currentStep === 1 && (
              /* Step 1: Basic Information */
              <div className="space-y-6">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <Input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full h-12 px-4 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Enter your first name"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <Input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full h-12 px-4 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Enter your last name"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <Input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full h-12 px-4 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Enter your phone number"
                  />
                </div>

                {/* Institute Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Institute Name *
                  </label>
                  <Input
                    type="text"
                    name="instituteName"
                    value={formData.instituteName}
                    onChange={handleInputChange}
                    required
                    className="w-full h-12 px-4 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Enter your institute name"
                  />
                </div>

                {/* Institute Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Email *
                  </label>
                  <Input
                    type="email"
                    name="instituteEmail"
                    value={formData.instituteEmail}
                    onChange={handleInputChange}
                    required
                    className="w-full h-12 px-4 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Enter your company email"
                  />
                </div>

                {/* Website */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Website
                  </label>
                  <Input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="w-full h-12 px-4 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Enter your website URL"
                  />
                </div>

                {/* Message */}
                {message && (
                  <div className={`p-4 rounded-lg ${
                    message.type === "success" 
                      ? "bg-green-50 text-green-700 border border-green-200" 
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {message.text}
                  </div>
                )}

                {/* Next Button */}
                <Button
                  type="button"
                  onClick={handleNext}
                  className="w-full py-3 bg-primary hover:bg-primary/90"
                >
                  Next
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              /* Step 2: Password Creation */
              <div className="space-y-6">
                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="w-full h-12 px-4 pr-12 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Create a password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 h-auto p-1"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      className="w-full h-12 px-4 pr-12 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Confirm your password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 h-auto p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>

                {/* Message */}
                {message && (
                  <div className={`p-4 rounded-lg ${
                    message.type === "success" 
                      ? "bg-green-50 text-green-700 border border-green-200" 
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {message.text}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1 py-3"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 py-3 bg-primary hover:bg-primary/90"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              /* Step 3: Subdomain Selection */
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Enter Domain */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Domain
                  </label>
                  <Input
                    type="text"
                    name="subdomain"
                    value={formData.subdomain}
                    onChange={handleInputChange}
                    required
                    className="w-full h-12 px-4 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Enter your domain name"
                  />
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    <div className="w-4 h-4 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary text-xs">i</span>
                    </div>
                    <span>Minimum 4 characters required</span>
                  </div>
                </div>

                {/* Your URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your URL
                  </label>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center">
                      <span className="text-primary font-medium">https://</span>
                      <span className="text-primary font-semibold mx-2">
                        {formData.subdomain || "yourdomain"}
                      </span>
                      <span className="text-primary font-medium">.trackx.com</span>
                    </div>
                  </div>
                </div>

                {/* Message */}
                {message && (
                  <div className={`p-4 rounded-lg ${
                    message.type === "success" 
                      ? "bg-green-50 text-green-700 border border-green-200" 
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {message.text}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1 py-3"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-primary hover:bg-primary/90"
                  >
                    {isSubmitting ? "Creating Account..." : "Create Account"}
                  </Button>
                </div>
              </form>
            )}

            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:text-primary/90 font-medium">
                Sign In
              </Link>
            </p>
            <p className="text-xs text-gray-500 mt-4">
              By creating an account, you agree to trackx's{" "}
              <Link href="#" className="text-primary hover:text-primary/90">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="#" className="text-primary hover:text-primary/90">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative bg-white border-t border-gray-200 px-4 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500 max-w-6xl mx-auto">
          <div className="flex items-center space-x-2 mb-2 sm:mb-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <span>English</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="#" className="hover:text-gray-700">Help</Link>
            <span>•</span>
            <Link href="#" className="hover:text-gray-700">Terms Of Service</Link>
            <span>•</span>
            <Link href="#" className="hover:text-gray-700">Privacy Policy</Link>
            <span>•</span>
            <Link href="#" className="hover:text-gray-700">Acceptable Use</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
