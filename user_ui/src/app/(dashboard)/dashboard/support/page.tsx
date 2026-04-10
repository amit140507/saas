"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { HelpCircle, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Select } from "@/components/forms/Select";
import { Textarea } from "@/components/forms/Textarea";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";

const supportSchema = z.object({
  topic: z.string().min(1, "Please select a topic"),
  description: z.string().min(10, "Please provide more details (min 10 characters)"),
});

type SupportValues = z.infer<typeof supportSchema>;

export default function SupportPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupportValues>({
    resolver: zodResolver(supportSchema),
  });

  const onSubmit = async (data: SupportValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await api.post("/support/tickets/", data);
      setIsSubmitted(true);
      reset();
    } catch (err: any) {
      console.error("Support submission error:", err);
      setError(err.response?.data?.detail || "Something went wrong. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-6">
        <div className="inline-flex items-center justify-center p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Request Sent Successfully!</h2>
        <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
          Our support team has received your request and will get back to you within 24-48 hours via email.
        </p>
        <Button onClick={() => setIsSubmitted(false)} variant="outline" className="mt-8">
          Send Another Request
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
            <HelpCircle className="w-6 h-6 text-indigo-600" />
          </div>
          Support Center
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Have a question or facing an issue? Fill out the form below and we'll help you out.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open a Support Ticket</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Select
              label="What do you need help with?"
              options={[
                { label: "Technical Issue", value: "technical" },
                { label: "Billing & Subscription", value: "billing" },
                { label: "Diet Plan Query", value: "diet_plan" },
                { label: "Order Status", value: "order" },
                { label: "Other", value: "other" },
              ]}
              {...register("topic")}
              error={errors.topic?.message}
            />
            
            <Textarea
              label="Describe your issue"
              placeholder="Please provide as much detail as possible so we can help you better..."
              className="min-h-[200px]"
              {...register("description")}
              error={errors.description?.message}
            />

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="pt-4">
              <Button 
                type="submit" 
                size="lg" 
                disabled={isSubmitting}
                className="w-full md:w-auto min-w-[200px]"
              >
                {isSubmitting ? "Sending..." : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Support Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
        <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
          <h4 className="font-bold text-zinc-900 dark:text-white mb-2">Email Support</h4>
          <p className="text-sm text-zinc-500">Fast response via email within 24h.</p>
        </div>
        <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
          <h4 className="font-bold text-zinc-900 dark:text-white mb-2">Technical Help</h4>
          <p className="text-sm text-zinc-500">Assistance with app and features.</p>
        </div>
        <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
          <h4 className="font-bold text-zinc-900 dark:text-white mb-2">Billing Queries</h4>
          <p className="text-sm text-zinc-500">Help with subscriptions & payments.</p>
        </div>
      </div>
    </div>
  );
}
