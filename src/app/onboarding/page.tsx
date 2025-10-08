"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface OnboardingForm {
  companyName: string;
  subdomain: string;
  contactName: string;
  email: string;
  phone: string;
  expectedUsers: string;
  industry: string;
}

export default function OnboardingPage() {
  const [form, setForm] = useState<OnboardingForm>({
    companyName: "",
    subdomain: "",
    contactName: "",
    email: "",
    phone: "",
    expectedUsers: "1-10",
    industry: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: "error", text: "Logo file size must be less than 2MB" });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage({ type: "error", text: "Please select a valid image file" });
        return;
      }

      setLogoFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Clear any previous error messages
      setMessage(null);
    }
  };

  const validateSubdomain = (subdomain: string) => {
    return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSubdomain(form.subdomain)) {
      setMessage({ type: "error", text: "Subdomain must be 3-63 characters, lowercase letters, numbers, and hyphens only" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('subdomain', form.subdomain);
      formData.append('name', form.companyName);
      formData.append('metadata', JSON.stringify({
        contactName: form.contactName,
        email: form.email,
        phone: form.phone,
        expectedUsers: form.expectedUsers,
        industry: form.industry,
        onboardingDate: new Date().toISOString(),
      }));
      
      // Add logo file if selected
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const response = await fetch("/api/tenants", {
        method: "POST",
        body: formData, // Use FormData instead of JSON
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: `🎉 Welcome ${form.companyName}! Your account has been created successfully. You can now access your dashboard at ${form.subdomain}.wydex.co`,
        });
        setForm({
          companyName: "",
          subdomain: "",
          contactName: "",
          email: "",
          phone: "",
          expectedUsers: "1-10",
          industry: "",
        });
        setLogoFile(null);
        setLogoPreview(null);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to create tenant" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Welcome to Our CRM Platform
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get your own isolated CRM environment in minutes. Perfect for teams, agencies, and businesses.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="text-center">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Secure & Isolated</h3>
                  <p className="text-gray-600">Each client gets their own secure, isolated environment</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="text-center">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Instant Setup</h3>
                  <p className="text-gray-600">Get up and running in minutes, not days</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="text-center">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Full Analytics</h3>
                  <p className="text-gray-600">Complete CRM with leads, sales, and reporting</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Onboarding Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-3xl">Get Started</CardTitle>
              </CardHeader>
              <CardContent>
            
            <form onSubmit={handleSubmit} className="space-y-6 text-black">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Company Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <Input
                    type="text"
                    name="companyName"
                    value={form.companyName}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter company name"
                  />
                </div>

                {/* Subdomain */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subdomain *
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      name="subdomain"
                      value={form.subdomain}
                      onChange={handleInputChange}
                      required
                      pattern="[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?"
                      className="pr-32"
                      placeholder="yourcompany"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 text-sm">
                      .wydex.co
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Only lowercase letters, numbers, and hyphens. 3-63 characters.
                  </p>
                </div>
              </div>

              {/* Company Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Logo
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {logoPreview ? (
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="w-16 h-16 object-contain border border-gray-300 rounded-lg bg-white"
                      />
                    ) : (
                      <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      name="logo"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended: 200x200px, PNG or JPG. Max 2MB.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Contact Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Name *
                  </label>
                  <Input
                    type="text"
                    name="contactName"
                    value={form.contactName}
                    onChange={handleInputChange}
                    required
                    placeholder="Your full name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                    required
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <Input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                {/* Expected Users */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Users
                  </label>
                  <select
                    name="expectedUsers"
                    value={form.expectedUsers}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="1-10">1-10 users</option>
                    <option value="11-25">11-25 users</option>
                    <option value="26-50">26-50 users</option>
                    <option value="51-100">51-100 users</option>
                    <option value="100+">100+ users</option>
                  </select>
                </div>
              </div>

              {/* Industry */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                <Input
                  type="text"
                  name="industry"
                  value={form.industry}
                  onChange={handleInputChange}
                  placeholder="e.g., Technology, Healthcare, Education"
                />
              </div>

              {/* Message Display */}
              {message && (
                <div className={`p-4 rounded-lg ${
                  message.type === "success" 
                    ? "bg-green-100 text-green-800 border border-green-200" 
                    : "bg-red-100 text-red-800 border border-red-200"
                }`}>
                  {message.text}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-14 text-lg"
              >
                {isSubmitting ? "Creating Your Environment..." : "Create My CRM Environment"}
              </Button>
            </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Footer Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-center mt-12 text-gray-600"
          >
            <p className="mb-2">
              Need help? Contact us at{" "}
              <a href="mailto:support@proskilledu.com" className="text-blue-600 hover:underline">
                support@proskilledu.com
              </a>
            </p>
            <p className="text-sm">
              Your data is secure and isolated. Each client environment is completely separate.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
