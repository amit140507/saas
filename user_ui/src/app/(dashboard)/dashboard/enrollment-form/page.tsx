"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Textarea } from "@/components/forms/Textarea";
import { FileUpload } from "@/components/forms/FileUpload";
import { Calendar, User, Phone, Ruler, Weight, Camera, Activity, Salad, HeartPulse, HelpCircle, Mail } from "lucide-react";

// Form Schema
const formSchema = z.object({
    email: z.string().email("Invalid email address"),
    fullName: z.string().min(2, "Name is too short"),
    phoneNumber: z.string().min(10, "Invalid phone number"),
    dob: z.string().min(1, "Date of Birth is required"),
    height: z.string().min(1, "Height is required").transform(Number),
    weight: z.string().min(1, "Weight is required").transform(Number),

    // Progress Photos
    photoFront: z.any().refine((file) => file instanceof File, "Front photo is required"),
    photoLeft: z.any().refine((file) => file instanceof File, "Left side photo is required"),
    photoBack: z.any().refine((file) => file instanceof File, "Back photo is required"),
    photoRight: z.any().refine((file) => file instanceof File, "Right side photo is required"),

    // Goals & Training
    fitnessGoals: z.string().min(1, "Please select at least one goal"),
    trainingDays: z.string().min(1, "Required"),
    cardioDays: z.string().min(1, "Required"),
    trackSteps: z.string().min(1, "Required"),
    avgDailySteps: z.string().optional(),

    // Nutrition
    dietaryPreference: z.string().min(1, "Required"),
    daySpecificVeg: z.string().min(1, "Required"),
    allergic: z.string().min(1, "Required"),
    digestMilk: z.string().min(1, "Required"),
    foodsEnjoy: z.string().min(1, "Required"),
    foodsHate: z.string().min(1, "Required"),
    fruitsLike: z.string().min(1, "Required"),
    vegLike: z.string().min(1, "Required"),
    mealsPerDay: z.string().min(1, "Required"),

    // Timings
    wakeUpTime: z.string().min(1, "Required"),
    sleepTime: z.string().min(1, "Required"),
    workoutTime: z.string().min(1, "Required"),
    breakfastTime: z.string().min(1, "Required"),
    lunchTime: z.string().min(1, "Required"),
    dinnerTime: z.string().min(1, "Required"),
    dailyFoodIntake: z.string().min(1, "Required"),

    // Habits
    alcohol: z.string().min(1, "Required"),
    alcoholAmount: z.string().optional(),
    smoke: z.string().min(1, "Required"),
    supplements: z.string().min(1, "Required"),
    supplementDetails: z.string().optional(),

    // Medical
    injury: z.string().min(1, "Required"),
    constipation: z.string().min(1, "Required"),
    medication: z.string().min(1, "Required"),
    medicationDetails: z.string().optional(),
    medicalCondition: z.string().optional(),

    // Misc
    anythingElse: z.string().optional(),
    referral: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function EnrollmentForm() {
    const {
        register,
        handleSubmit,
        control,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

    const trackStepsValue = watch("trackSteps");

    const onSubmit = (data: FormValues) => {
        console.log("Form Submitted:", data);
        alert("Form submitted successfully! Check console for data.");
    };

    return (
        <div className="max-w-5xl mx-auto py-12 px-4 space-y-12">
            {/* Header Section */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white uppercase">
                    ABHIFITONLINE <span className="text-indigo-600">Assessment Form</span>
                </h1>
                <p className="max-w-2xl mx-auto text-zinc-600 dark:text-zinc-400">
                    Detailed Information Matters: Please fill out this questionnaire with as much detailed information as possible.
                    The more you share, the better we can create a plan that truly fits your needs.
                </p>
                <div className="flex flex-wrap justify-center gap-4 text-sm font-medium">
                    <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 px-4 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800 text-center">
                        Processing Time: Once submitted, it usually takes us about 7 to 10 days to create and send your initial plan, so please be patient as we work on it.
                    </span>
                    <span className="bg-zinc-50 dark:bg-zinc-900 text-zinc-600 px-4 py-2 rounded-lg border border-zinc-100 dark:border-zinc-800 text-center">
                        Consistent Email ID: For future check-ins and updates, please use the same email ID each time. Using a different email may lead to delays in processing your updates.
                    </span>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">

                {/* Personal Details Section */}
                <Card>
                    <CardHeader className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                            <User className="w-5 h-5 text-indigo-600" />
                        </div>
                        <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Full Name"
                            placeholder="John Doe"
                            {...register("fullName")}
                            error={errors.fullName?.message}
                        />
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="amitsingh100996@gmail.com"
                            {...register("email")}
                            error={errors.email?.message}
                        />
                        <Input
                            label="Phone Number"
                            placeholder="+91 00000 00000"
                            {...register("phoneNumber")}
                            error={errors.phoneNumber?.message}
                        />
                        <Input
                            label="Date of Birth"
                            type="date"
                            {...register("dob")}
                            error={errors.dob?.message}
                        />
                    </CardBody>
                </Card>

                {/* Body Stats Section */}
                <Card>
                    <CardHeader className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                            <Ruler className="w-5 h-5 text-indigo-600" />
                        </div>
                        <CardTitle>Body Measurements</CardTitle>
                    </CardHeader>
                    <CardBody>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <Input
                                    label="Height (Centimeters)"
                                    type="number"
                                    placeholder="175"
                                    {...register("height")}
                                    error={errors.height?.message}
                                />
                                <p className="text-xs text-zinc-500 italic">Please provide measurements in cm (1 inch = 2.54 cm)</p>
                            </div>
                            <div className="space-y-4">
                                <Input
                                    label="Weight (Kilograms)"
                                    type="number"
                                    placeholder="70"
                                    {...register("weight")}
                                    error={errors.weight?.message}
                                />
                                <p className="text-xs text-zinc-500 italic">Take this in the morning on an empty stomach.</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Progress Photos Section */}
                <Card>
                    <CardHeader className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                            <Camera className="w-5 h-5 text-indigo-600" />
                        </div>
                        <CardTitle>Progress Photos</CardTitle>
                    </CardHeader>
                    <CardBody className="space-y-8">
                        <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <h4 className="font-bold text-sm uppercase text-zinc-900 dark:text-white mb-4">Instructions</h4>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                                <li className="flex gap-2">• All pictures need to be full length (head to toe).</li>
                                <li className="flex gap-2">• Keep camera at waist height. Use a tripod.</li>
                                <li className="flex gap-2">• Ensure lighting and location are consistent.</li>
                                <li className="flex gap-2">• Wear similar clothing (Men: shorts, Women: sports bra).</li>
                                <li className="flex gap-2">• Stand straight with arms relaxed at sides.</li>
                                <li className="flex gap-2">• No twisting, maintain natural posture.</li>
                            </ul>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Controller
                                name="photoFront"
                                control={control}
                                render={({ field }) => (
                                    <FileUpload
                                        label="Front View"
                                        description="Stand straight, arms relaxed, facing forward."
                                        onChange={field.onChange}
                                        error={errors.photoFront?.message as string}
                                    />
                                )}
                            />
                            <Controller
                                name="photoLeft"
                                control={control}
                                render={({ field }) => (
                                    <FileUpload
                                        label="Left Side"
                                        description="Turn so your left side faces the camera."
                                        onChange={field.onChange}
                                        error={errors.photoLeft?.message as string}
                                    />
                                )}
                            />
                            <Controller
                                name="photoBack"
                                control={control}
                                render={({ field }) => (
                                    <FileUpload
                                        label="Back View"
                                        description="Stand with your back facing the camera."
                                        onChange={field.onChange}
                                        error={errors.photoBack?.message as string}
                                    />
                                )}
                            />
                            <Controller
                                name="photoRight"
                                control={control}
                                render={({ field }) => (
                                    <FileUpload
                                        label="Right Side"
                                        description="Turn so your right side faces the camera."
                                        onChange={field.onChange}
                                        error={errors.photoRight?.message as string}
                                    />
                                )}
                            />
                        </div>
                    </CardBody>
                </Card>

                {/* Lifestyle & Training Section */}
                <Card>
                    <CardHeader className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                            <Activity className="w-5 h-5 text-indigo-600" />
                        </div>
                        <CardTitle>Lifestyle & Training</CardTitle>
                    </CardHeader>
                    <CardBody className="space-y-8">
                        <p className="text-sm text-zinc-500 italic">
                            Please share your daily routines, workout preferences, and any past experiences with fitness.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select
                                label="Primary Fitness Goal"
                                options={[
                                    { label: "Muscle Gain", value: "muscle_gain" },
                                    { label: "Fat Loss", value: "fat_loss" },
                                    { label: "General Fitness", value: "general_fitness" },
                                    { label: "Other", value: "other" },
                                ]}
                                {...register("fitnessGoals")}
                                error={errors.fitnessGoals?.message}
                            />
                            <Select
                                label="Weight Training Frequency"
                                options={[
                                    ...Array.from({ length: 7 }, (_, i) => ({ label: `${i + 1} Days/Week`, value: String(i + 1) })),
                                    { label: "Don't train", value: "none" }
                                ]}
                                {...register("trainingDays")}
                                error={errors.trainingDays?.message}
                            />
                            <Select
                                label="Cardio Frequency"
                                options={[
                                    ...Array.from({ length: 7 }, (_, i) => ({ label: `${i + 1} Days/Week`, value: String(i + 1) })),
                                    { label: "Don't do cardio", value: "none" }
                                ]}
                                {...register("cardioDays")}
                                error={errors.cardioDays?.message}
                            />
                            <div className={`grid ${trackStepsValue === "yes" ? "grid-cols-2" : "grid-cols-1"} gap-4`}>
                                <Select
                                    label="Track Step Count?"
                                    options={[
                                        { label: "Yes", value: "yes" },
                                        { label: "No", value: "no" },
                                    ]}
                                    {...register("trackSteps")}
                                    error={errors.trackSteps?.message}
                                />
                                {trackStepsValue === "yes" && (
                                    <Input
                                        label="Avg Daily Steps"
                                        placeholder="e.g. 10000"
                                        {...register("avgDailySteps")}
                                    />
                                )}
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Nutrition Section */}
                <Card>
                    <CardHeader className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                            <Salad className="w-5 h-5 text-indigo-600" />
                        </div>
                        <CardTitle>Nutrition Preferences</CardTitle>
                    </CardHeader>
                    <CardBody className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select
                                label="Dietary Preference"
                                options={[
                                    { label: "Non Vegetarian", value: "non_veg" },
                                    { label: "Lacto Vegetarian (Milk products)", value: "lacto_veg" },
                                    { label: "Ovo Vegetarian (Eggs)", value: "ovo_veg" },
                                    { label: "Lacto Ovo Vegetarian (Milk & Eggs)", value: "lacto_ovo_veg" },
                                    { label: "Vegan", value: "vegan" },
                                ]}
                                {...register("dietaryPreference")}
                                error={errors.dietaryPreference?.message}
                            />
                            <Select
                                label="Are you day specific vegetarian?"
                                options={[
                                    { label: "No", value: "no" },
                                    { label: "Monday", value: "mon" },
                                    { label: "Tuesday", value: "tue" },
                                    { label: "Wednesday", value: "wed" },
                                    { label: "Thursday", value: "thu" },
                                    { label: "Friday", value: "fri" },
                                    { label: "Saturday", value: "sat" },
                                    { label: "Sunday", value: "sun" },
                                ]}
                                {...register("daySpecificVeg")}
                                error={errors.daySpecificVeg?.message}
                            />
                            <Select
                                label="Any Food Allergies?"
                                options={[
                                    { label: "No", value: "no" },
                                    { label: "Yes", value: "yes" },
                                ]}
                                {...register("allergic")}
                                error={errors.allergic?.message}
                            />
                            <Select
                                label="Can you digest milk products?"
                                options={[
                                    { label: "Yes", value: "yes" },
                                    { label: "No", value: "no" },
                                ]}
                                {...register("digestMilk")}
                                error={errors.digestMilk?.message}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Textarea
                                label="Foods You Enjoy Most & would like to be added in the plan"
                                description="Please list the foods you enjoy the most, especially those you like to eat at home. This will help me incorporate them into your plan as much as possible, making it more enjoyable and sustainable for you. The more specific you are, the easier it will be for me to design a plan that aligns with your preferences while supporting your goals. Feel free to mention your favorite meals, ingredients, or snacks!"
                                placeholder="List your favorite meals..."
                                {...register("foodsEnjoy")}
                                error={errors.foodsEnjoy?.message}
                            />
                            <Textarea
                                label="Foods You Hate & would not like to be added in the plan"
                                description="Please list any foods you dislike or would prefer not to include in your plan. This helps me avoid items that won’t work for you, making the plan more enjoyable and personalized. Be as specific as possible about any ingredients, meals, or flavors you don’t enjoy, so I can ensure they’re not a part of your plan."
                                placeholder="Any ingredients or flavors you don't enjoy..."
                                {...register("foodsHate")}
                                error={errors.foodsHate?.message}
                            />
                            <Textarea
                                label="5-10 Favorite Fruits"
                                placeholder="Mention fruits you like the most..."
                                {...register("fruitsLike")}
                                error={errors.fruitsLike?.message}
                            />
                            <Textarea
                                label="5-10 Favorite Vegetables"
                                placeholder="Mention vegetables you like the most..."
                                {...register("vegLike")}
                                error={errors.vegLike?.message}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                            <Select
                                label="Meals per Day"
                                options={[
                                    ...Array.from({ length: 6 }, (_, i) => ({ label: String(i + 1), value: String(i + 1) })),
                                    { label: "Other", value: "other" }
                                ]}
                                {...register("mealsPerDay")}
                                error={errors.mealsPerDay?.message}
                            />
                            <div className="space-y-4">
                                <p className="text-sm font-bold uppercase text-zinc-500">Daily Timing Schedule</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Wake up" type="time" {...register("wakeUpTime")} error={errors.wakeUpTime?.message} />
                                    <Input label="Sleep" type="time" {...register("sleepTime")} error={errors.sleepTime?.message} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Input label="Workout" type="time" {...register("workoutTime")} error={errors.workoutTime?.message} />
                            <Input label="Breakfast" type="time" {...register("breakfastTime")} error={errors.breakfastTime?.message} />
                            <Input label="Lunch" type="time" {...register("lunchTime")} error={errors.lunchTime?.message} />
                            <Input label="Dinner" type="time" {...register("dinnerTime")} error={errors.dinnerTime?.message} />
                        </div>

                        <Textarea
                            label="Typical Daily Food Intake (with Timings)"
                            placeholder="List everything you eat in a typical day, include all snacks and beverages..."
                            className="min-h-[150px]"
                            {...register("dailyFoodIntake")}
                            error={errors.dailyFoodIntake?.message}
                        />
                    </CardBody>
                </Card>

                {/* Habits & Supplements Section */}
                <Card>
                    <CardHeader className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                            <HelpCircle className="w-5 h-5 text-indigo-600" />
                        </div>
                        <CardTitle>Habits & Supplements</CardTitle>
                    </CardHeader>
                    <CardBody className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <Select
                                    label="Do you consume alcohol?"
                                    options={[
                                        { label: "Yes", value: "yes" },
                                        { label: "No", value: "no" },
                                    ]}
                                    {...register("alcohol")}
                                    error={errors.alcohol?.message}
                                />
                                <Input
                                    label="If yes, how much per week?"
                                    placeholder="e.g. 2-3 drinks"
                                    {...register("alcoholAmount")}
                                />
                            </div>
                            <Select
                                label="Do you smoke?"
                                options={[
                                    { label: "Yes", value: "yes" },
                                    { label: "No", value: "no" },
                                ]}
                                {...register("smoke")}
                                error={errors.smoke?.message}
                            />
                            <Select
                                label="Supplements Usage"
                                options={[
                                    { label: "Yes, currently taking", value: "yes" },
                                    { label: "No, but willing to take", value: "willing" },
                                    { label: "No, and want to avoid", value: "avoid" },
                                ]}
                                {...register("supplements")}
                                error={errors.supplements?.message}
                            />
                            <Textarea
                                label="Mention supplements if any"
                                placeholder="List brand and dosage if possible..."
                                {...register("supplementDetails")}
                            />
                        </div>
                    </CardBody>
                </Card>

                {/* Medical History Section */}
                <Card>
                    <CardHeader className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                            <HeartPulse className="w-5 h-5 text-indigo-600" />
                        </div>
                        <CardTitle>Medical History</CardTitle>
                    </CardHeader>
                    <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Select
                            label="Any current injuries?"
                            options={[
                                { label: "No", value: "no" },
                                { label: "Yes", value: "yes" },
                            ]}
                            {...register("injury")}
                            error={errors.injury?.message}
                        />
                        <Select
                            label="History of constipation?"
                            options={[
                                { label: "No", value: "no" },
                                { label: "Yes", value: "yes" },
                            ]}
                            {...register("constipation")}
                            error={errors.constipation?.message}
                        />
                        <div className="space-y-4">
                            <Select
                                label="Any prescribed medication?"
                                options={[
                                    { label: "No", value: "no" },
                                    { label: "Yes", value: "yes" },
                                ]}
                                {...register("medication")}
                                error={errors.medication?.message}
                            />
                            <Input
                                label="Mention medication details"
                                placeholder="What ones are you taking?"
                                {...register("medicationDetails")}
                            />
                        </div>
                        <Textarea
                            label="Any diagnosed medical conditions?"
                            placeholder="e.g. Thyroid, PCOD, BP, etc."
                            {...register("medicalCondition")}
                        />
                    </CardBody>
                </Card>

                {/* Miscellaneous Section */}
                <Card>
                    <CardHeader className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                            <HelpCircle className="w-5 h-5 text-indigo-600" />
                        </div>
                        <CardTitle>Miscellaneous</CardTitle>
                    </CardHeader>
                    <CardBody className="space-y-6">
                        <Textarea
                            label="Anything else you would want to mention?"
                            description="Feel free to share any additional information that you think might be helpful. This could include specific goals, dietary preferences, lifestyle factors, health conditions, or any other details you believe are important. The more I know, the more I can tailor the plan to fit your unique needs and support your progress effectively."
                            placeholder="Goals, preferences, lifestyle factors..."
                            {...register("anythingElse")}
                        />
                        <Input
                            label="How did you hear about us?"
                            placeholder="Social Media, Friend, Family, etc."
                            {...register("referral")}
                            error={errors.referral?.message}
                        />
                    </CardBody>
                </Card>

                <div className="pt-8">
                    <Button type="submit" size="lg" fullWidth className="h-14 text-lg shadow-xl shadow-indigo-200 dark:shadow-none">
                        Submit Assessment Form
                    </Button>
                    <p className="text-center text-xs text-zinc-400 mt-4">
                        By submitting, you agree to our terms and conditions. Your data is handled securely.
                    </p>
                </div>
            </form>
        </div>
    );
}
