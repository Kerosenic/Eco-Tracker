"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import {
  LayoutDashboard,
  MonitorPlay,
  Trophy,
  Gift,
  Leaf,
  Scale,
  Camera,
  ScanFace,
  UtensilsCrossed,
  ChevronRight,
  Zap,
  Award,
  Lock,
  Users,
  Target,
  TrendingDown,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  Legend,
  Bar,
} from "recharts"

// Weekly waste data (grams) - Mon to Fri only
const weeklyWasteData = [
  { day: "Mon", waste: 120 },
  { day: "Tue", waste: 95 },
  { day: "Wed", waste: 110 },
  { day: "Thu", waste: 85 },
  { day: "Fri", waste: 70 },
]

// Calculate trendline (linear regression)
const calculateTrendline = (data: { day: string; waste: number }[]) => {
  const n = data.length
  const sumX = data.reduce((sum, _, i) => sum + i, 0)
  const sumY = data.reduce((sum, d) => sum + d.waste, 0)
  const sumXY = data.reduce((sum, d, i) => sum + i * d.waste, 0)
  const sumX2 = data.reduce((sum, _, i) => sum + i * i, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  return data.map((d, i) => ({
    ...d,
    trend: Math.max(0, Math.round(intercept + slope * i)),
  }))
}

const wasteDataWithTrend = calculateTrendline(weeklyWasteData)

// Nutrition data
const nutritionData = [
  { name: "Protein", value: 28, color: "oklch(0.55 0.15 155)" },
  { name: "Carbs", value: 35, color: "oklch(0.75 0.12 85)" },
  { name: "Vegetables", value: 22, color: "oklch(0.65 0.13 155)" },
  { name: "Dairy", value: 10, color: "oklch(0.45 0.08 155)" },
  { name: "Fruits", value: 5, color: "oklch(0.85 0.08 155)" },
]

const individualLeaderboardSeed = [
  { rank: 1, name: "Emily Chen", class: "10A", credits: 2450, avatar: "/placeholder.svg?height=40&width=40" },
  { rank: 2, name: "Marcus Wong", class: "11B", credits: 2380, avatar: "/placeholder.svg?height=40&width=40" },
  { rank: 3, name: "Sofia Garcia", class: "9C", credits: 2290, avatar: "/placeholder.svg?height=40&width=40" },
  { rank: 4, name: "James Liu", class: "10B", credits: 2150, avatar: "/placeholder.svg?height=40&width=40" },
  { rank: 5, name: "Aisha Patel", class: "11A", credits: 2080, avatar: "/placeholder.svg?height=40&width=40" },
  { rank: 6, name: "Oliver Smith", class: "9A", credits: 1950, avatar: "/placeholder.svg?height=40&width=40" },
  { rank: 7, name: "Emma Johnson", class: "10C", credits: 1870, avatar: "/placeholder.svg?height=40&width=40" },
  { rank: 8, name: "Liam Brown", class: "11C", credits: 1780, avatar: "/placeholder.svg?height=40&width=40" },
]

const classLeaderboardSeed = [
  { rank: 1, name: "Class 10A", students: 28, credits: 45600 },
  { rank: 2, name: "Class 11B", students: 26, credits: 42300 },
  { rank: 3, name: "Class 9C", students: 30, credits: 39800 },
  { rank: 4, name: "Class 10B", students: 27, credits: 37500 },
  { rank: 5, name: "Class 11A", students: 25, credits: 35200 },
]

const achievements = [
  { name: "Zero Waste Week", icon: Award, unlocked: true, description: "7 consecutive days with minimal waste" },
  { name: "First 1000 Credits", icon: Zap, unlocked: true, description: "Reached 1000 eco-credits milestone" },
  { name: "Eco Champion", icon: Trophy, unlocked: true, description: "Ranked in top 10 for a month" },
  { name: "Green Leader", icon: Leaf, unlocked: false, description: "Help 5 classmates reduce waste" },
  { name: "Sustainability Star", icon: Award, unlocked: false, description: "Achieve 5000 eco-credits" },
  { name: "Planet Protector", icon: Leaf, unlocked: false, description: "Save 100kg of CO2" },
]

const rewardsSeed = [
  { name: "Eco Water Bottle", credits: 500, stock: 15, image: "/placeholder.svg?height=100&width=100" },
  { name: "Eco-Tracker Notebook", credits: 200, stock: 42, image: "/placeholder.svg?height=100&width=100" },
  { name: "Plant Seed Kit", credits: 350, stock: 20, image: "/placeholder.svg?height=100&width=100" },
  { name: "Reusable Lunch Bag", credits: 450, stock: 12, image: "/placeholder.svg?height=100&width=100" },
  { name: "Eco Tote Bag", credits: 300, stock: 25, image: "/placeholder.svg?height=100&width=100" },
  { name: "Bamboo Utensil Set", credits: 400, stock: 18, image: "/placeholder.svg?height=100&width=100" },
  { name: "Solar Power Bank", credits: 1200, stock: 5, image: "/placeholder.svg?height=100&width=100" },
  { name: "School Merch Hoodie", credits: 1500, stock: 8, image: "/placeholder.svg?height=100&width=100" },
]

// Current user data (seed — swapped at runtime by useEffect below)
const currentUserSeed = {
  name: "Emily Chen",
  class: "10A",
  credits: 2450,
  avatar: "/placeholder.svg?height=80&width=80",
  wasteGoal: 100, // grams target
  currentWaste: 85, // grams actual
  rank: 1,
  totalStudents: 450,
}

// School-wide stats
const schoolStats = {
  totalWasteReduced: 1247,
  wasteChangePercent: -23,
  co2Saved: 3741,
  treesEquivalent: 150,
  activeUsers: 892,
  newUsersThisWeek: 12,
}

// Recent meal history data (seed — swapped at runtime by useEffect below)
const mealHistorySeed = [
  { date: "May 20, 2026", waste: "0.15kg", credits: 45, score: "2/12" },
  { date: "May 19, 2026", waste: "0.08kg", credits: 52, score: "1/12" },
  { date: "May 18, 2026", waste: "0.22kg", credits: 38, score: "3/12" },
  { date: "May 17, 2026", waste: "0.00kg", credits: 60, score: "0/12" },
  { date: "May 16, 2026", waste: "0.12kg", credits: 44, score: "2/12" },
]

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tracking", label: "Tracking Station", icon: MonitorPlay },
  { id: "leaderboards", label: "Leaderboards", icon: Trophy },
  { id: "users", label: "User Management", icon: Users },
  { id: "rewards", label: "Rewards", icon: Gift },
]

// Calculate eco-credits based on score (0-18)
function calculateEcoCredits(score: number): number {
  if (score === 0) return 100
  if (score >= 1 && score <= 16) {
    // Linear interpolation from 95 (score 1) to 20 (score 16)
    return Math.round(95 - ((score - 1) * (95 - 20)) / 15)
  }
  if (score === 17) return 10
  if (score >= 18) return 0
  return 0
}

// Calculate CO2 saved based on waste score (0-18)
function calculateCO2Saved(score: number): number {
  // Lower score = more CO2 saved (max 0.5kg, min 0kg)
  return Math.round((1 - score / 18) * 500) / 1000
}

export default function EcoTrackerDashboard() {
  const [activeView, setActiveView] = useState("dashboard")
  const [leaderboardType, setLeaderboardType] = useState("individual")
  const [leaderboardPeriod, setLeaderboardPeriod] = useState("all-time")
  const [individualLeaderboard, setIndividualLeaderboard] = useState(individualLeaderboardSeed)
  const [classLeaderboard, setClassLeaderboard] = useState(classLeaderboardSeed)
  const [rewards, setRewards] = useState(rewardsSeed)
  const [currentUser, setCurrentUser] = useState(currentUserSeed)
  const [mealHistory, setMealHistory] = useState(mealHistorySeed)

  useEffect(() => {
    supabase
      .from("students")
      .select("name, class, total_credits")
      .order("total_credits", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (error) {
          console.error(
            "Supabase leaderboard fetch failed:",
            JSON.stringify(error, null, 2),
            "\nmessage:", error.message,
            "\ndetails:", error.details,
            "\nhint:", error.hint,
            "\ncode:", error.code,
          )
          return
        }
        if (!data) return
        setIndividualLeaderboard(
          data.map((row, i) => ({
            rank: i + 1,
            name: row.name,
            class: row.class,
            credits: row.total_credits,
            avatar: "/placeholder.svg?height=40&width=40",
          })),
        )

        const byClass = new Map<string, { students: number; credits: number }>()
        for (const row of data) {
          const entry = byClass.get(row.class) ?? { students: 0, credits: 0 }
          entry.students += 1
          entry.credits += row.total_credits ?? 0
          byClass.set(row.class, entry)
        }
        const classes = Array.from(byClass.entries())
          .map(([cls, agg]) => ({ name: `Class ${cls}`, ...agg }))
          .sort((a, b) => b.credits - a.credits)
          .map((c, i) => ({ rank: i + 1, ...c }))
        setClassLeaderboard(classes)
      })
  }, [])

  // Rewards catalog
  useEffect(() => {
    supabase
      .from("rewards")
      .select("name, cost_credits, stock, image_url")
      .eq("active", true)
      .order("cost_credits", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("Supabase rewards fetch failed:", error.message, error.details, error.hint)
          return
        }
        if (!data) return
        setRewards(
          data.map((r) => ({
            name: r.name,
            credits: r.cost_credits,
            stock: r.stock,
            image: r.image_url ?? "/placeholder.svg?height=100&width=100",
          })),
        )
      })
  }, [])

  // Logged-in user (hardcoded to Emily Chen for now — replaced with Supabase auth in a later step)
  useEffect(() => {
    supabase
      .from("students")
      .select("id, name, class, total_credits")
      .eq("name", "Emily Chen")
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("Supabase currentUser fetch failed:", error.message, error.details, error.hint)
          return
        }
        if (!data) return
        setCurrentUser((prev) => ({
          ...prev,
          id: data.id,
          name: data.name,
          class: data.class,
          credits: data.total_credits,
        }))

        supabase
          .from("meals")
          .select("weight_g, eco_credits, total_score, created_at")
          .eq("student_id", data.id)
          .order("created_at", { ascending: false })
          .limit(5)
          .then(({ data: meals, error: mealsError }) => {
            if (mealsError) {
              console.error(
                "Supabase mealHistory fetch failed:",
                mealsError.message,
                mealsError.details,
                mealsError.hint,
              )
              return
            }
            if (!meals) return
            setMealHistory(
              meals.map((m) => ({
                date: new Date(m.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }),
                waste: `${((m.weight_g ?? 0) / 1000).toFixed(2)}kg`,
                credits: m.eco_credits,
                score: `${m.total_score}/18`,
              })),
            )
          })
      })

    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => {
        if (typeof count === "number") {
          setCurrentUser((prev) => ({ ...prev, totalStudents: count }))
        }
      })
  }, [])

  // (meal history is fetched inside the currentUser effect above so it can use the resolved student id)

  // Webcam states
  const [faceCamActive, setFaceCamActive] = useState(false)
  const [trayCamActive, setTrayCamActive] = useState(false)
  const [faceScanning, setFaceScanning] = useState(false)
  const [userDetected, setUserDetected] = useState(false)
  const faceCamRef = useRef<HTMLVideoElement>(null)
  const trayCamRef = useRef<HTMLVideoElement>(null)
  const faceCamStreamRef = useRef<MediaStream | null>(null)
  const trayCamStreamRef = useRef<MediaStream | null>(null)

  // Tracking station states
  const [scaleWeight, setScaleWeight] = useState(0)
  const [scanComplete, setScanComplete] = useState(false)
  const [compartmentScores, setCompartmentScores] = useState([0, 0, 0, 0, 0]) // 0-3 each, auto-calculated
  const [totalScore, setTotalScore] = useState(0)

  const stopFaceCam = useCallback(() => {
    if (faceCamStreamRef.current) {
      faceCamStreamRef.current.getTracks().forEach((track) => track.stop())
      faceCamStreamRef.current = null
    }
    if (faceCamRef.current) {
      faceCamRef.current.srcObject = null
    }
    setFaceCamActive(false)
    setFaceScanning(false)
    setUserDetected(false)
  }, [])

  const stopTrayCam = useCallback(() => {
    if (trayCamStreamRef.current) {
      trayCamStreamRef.current.getTracks().forEach((track) => track.stop())
      trayCamStreamRef.current = null
    }
    if (trayCamRef.current) {
      trayCamRef.current.srcObject = null
    }
    setTrayCamActive(false)
  }, [])

  const startFaceCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      faceCamStreamRef.current = stream
      if (faceCamRef.current) {
        faceCamRef.current.srcObject = stream
      }
      setFaceCamActive(true)
      setFaceScanning(true)
      // Simulate face detection after 2 seconds
      setTimeout(() => {
        setUserDetected(true)
        setFaceScanning(false)
      }, 2000)
    } catch (err) {
      console.error("Error accessing face camera:", err)
    }
  }

  const startTrayCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      trayCamStreamRef.current = stream
      if (trayCamRef.current) {
        trayCamRef.current.srcObject = stream
      }
      setTrayCamActive(true)
    } catch (err) {
      console.error("Error accessing tray camera:", err)
    }
  }

  // Simulate tray scan completion with auto-generated scores and weight
  const simulateTrayScan = () => {
    // Simulate AI-generated compartment scores (0-3 each)
    const newScores = [
      Math.floor(Math.random() * 4),
      Math.floor(Math.random() * 4),
      Math.floor(Math.random() * 4),
      Math.floor(Math.random() * 4),
      Math.floor(Math.random() * 4),
    ]
    setCompartmentScores(newScores)

    // Calculate total score: first 4 compartments worth 1x, last (large) worth 2x
    const total = newScores[0] + newScores[1] + newScores[2] + newScores[3] + newScores[4] * 2
    setTotalScore(total)

    // Auto-inject scale weight based on score (simulates automatic scale reading)
    const simulatedWeight = 0.05 + (total / 18) * 0.6 // Range: 0.05kg to 0.65kg
    setScaleWeight(Math.round(simulatedWeight * 100) / 100)

    setScanComplete(true)
  }

  const resetScan = () => {
    setScanComplete(false)
    setCompartmentScores([0, 0, 0, 0, 0])
    setTotalScore(0)
    setScaleWeight(0)
    setUserDetected(false)
    setFaceScanning(false)
    stopFaceCam()
    stopTrayCam()
  }

  // Cleanup webcams on unmount
  useEffect(() => {
    return () => {
      stopFaceCam()
      stopTrayCam()
    }
  }, [stopFaceCam, stopTrayCam])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-foreground">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-background">Eco-Tracker</h1>
              <p className="text-xs text-background/70">Student Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-background/10 px-4 py-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-semibold text-background">{currentUser.credits.toLocaleString()}</span>
              <span className="text-sm text-background/70">credits</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-background">{currentUser.name}</p>
                <p className="text-xs text-background/70">Class {currentUser.class}</p>
              </div>
              <Avatar className="h-10 w-10 border-2 border-background/20">
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                <AvatarFallback className="bg-background text-foreground">EC</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <aside className="fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r border-sidebar-border bg-sidebar">
          <nav className="flex flex-col gap-1 p-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeView === item.id
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="ml-64 flex-1 p-8">
          {/* Dashboard View */}
          {activeView === "dashboard" && (
            <div className="space-y-6">
              {/* Page Title */}
              <div>
                <h2 className="text-2xl font-bold text-foreground">Dashboard and Analytics</h2>
                <p className="text-muted-foreground">Track your eco-impact and performance</p>
              </div>

              {/* Stats Cards Row */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Waste Reduced */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-muted-foreground">Total Waste Reduced</p>
                      <TrendingDown className="h-5 w-5 text-primary" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-foreground">
                      {schoolStats.totalWasteReduced.toLocaleString()} kg
                    </p>
                    <p className="mt-1 text-sm text-primary">
                      {schoolStats.wasteChangePercent}% from last month
                    </p>
                  </CardContent>
                </Card>

                {/* CO2 Saved */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-muted-foreground">
                        CO<sub>2</sub> Saved
                      </p>
                      <Leaf className="h-5 w-5 text-primary" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-foreground">
                      {schoolStats.co2Saved.toLocaleString()} kg
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Equivalent to {schoolStats.treesEquivalent} trees planted
                    </p>
                  </CardContent>
                </Card>

                {/* Active Users */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-foreground">{schoolStats.activeUsers}</p>
                    <p className="mt-1 text-sm text-primary">+{schoolStats.newUsersThisWeek} new this week</p>
                  </CardContent>
                </Card>

                {/* Your Rank */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-muted-foreground">Your Rank</p>
                      <Trophy className="h-5 w-5 text-accent" />
                    </div>
                    <p className="mt-3 text-3xl font-bold text-foreground">#{currentUser.rank}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      out of {currentUser.totalStudents} students
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Waste Goal Tracker */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Daily Waste Goal Tracker
                  </CardTitle>
                  <CardDescription>
                    Your target is {currentUser.wasteGoal}g - Current waste: {currentUser.currentWaste}g
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {/* Progress bar container */}
                    <div className="relative h-8 w-full overflow-hidden rounded-full bg-secondary">
                      {/* Actual waste bar */}
                      <div
                        className={`h-full transition-all duration-500 ${
                          currentUser.currentWaste <= currentUser.wasteGoal ? "bg-primary" : "bg-destructive"
                        }`}
                        style={{ width: `${Math.min((currentUser.currentWaste / 150) * 100, 100)}%` }}
                      />
                      {/* Goal strike-through line */}
                      <div
                        className="absolute top-0 h-full w-1 bg-foreground"
                        style={{ left: `${(currentUser.wasteGoal / 150) * 100}%` }}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background">
                          Goal: {currentUser.wasteGoal}g
                        </div>
                      </div>
                    </div>
                    {/* Scale labels */}
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                      <span>0g</span>
                      <span>50g</span>
                      <span>100g</span>
                      <span>150g</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    {currentUser.currentWaste <= currentUser.wasteGoal ? (
                      <Badge className="bg-primary/20 text-primary">Under Goal - Great job!</Badge>
                    ) : (
                      <Badge variant="destructive">Over Goal by {currentUser.currentWaste - currentUser.wasteGoal}g</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Charts Row */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Weekly Waste Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Food Waste Trend</CardTitle>
                    <CardDescription>Your waste in grams (Mon-Fri) with trendline</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={wasteDataWithTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.02 155)" />
                          <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="oklch(0.5 0.02 155)" />
                          <YAxis tick={{ fontSize: 12 }} stroke="oklch(0.5 0.02 155)" unit="g" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "oklch(1 0 0)",
                              border: "1px solid oklch(0.9 0.02 155)",
                              borderRadius: "8px",
                            }}
                            formatter={(value: number, name: string) => [
                              `${value}g`,
                              name === "waste" ? "Waste" : "Trend",
                            ]}
                          />
                          <Bar dataKey="waste" fill="oklch(0.55 0.15 155)" radius={[4, 4, 0, 0]} />
                          <Line
                            type="monotone"
                            dataKey="trend"
                            stroke="oklch(0.75 0.12 85)"
                            strokeWidth={3}
                            dot={false}
                            connectNulls
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Nutrition Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Consumed Nutrition Breakdown</CardTitle>
                    <CardDescription>Distribution of nutrients in your meals</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={nutritionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}%`}
                            labelLine={false}
                          >
                            {nutritionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Legend verticalAlign="bottom" height={36} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "oklch(1 0 0)",
                              border: "1px solid oklch(0.9 0.02 155)",
                              borderRadius: "8px",
                            }}
                            formatter={(value: number) => [`${value}%`, "Percentage"]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Tracking Station View */}
          {activeView === "tracking" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Tracking Station</h2>
                <p className="text-muted-foreground">Scan your face and tray to log your meal</p>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Camera Feeds */}
                <div className="space-y-4">
                  {/* Face Scan Camera */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ScanFace className="h-5 w-5 text-primary" />
                        Camera 1 - Face Scan
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative aspect-video overflow-hidden rounded-lg border-2 border-dashed border-primary/30 bg-muted/30">
                        {faceCamActive ? (
                          <>
                            <video
                              ref={faceCamRef}
                              autoPlay
                              playsInline
                              muted
                              className="h-full w-full object-cover"
                            />
                            {/* Scanning overlay with corner brackets */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="relative h-28 w-28">
                                {/* Animated corner brackets */}
                                <svg viewBox="0 0 100 100" className={`absolute inset-0 h-full w-full ${faceScanning ? "animate-pulse" : ""}`}>
                                  {/* Top-left corner */}
                                  <path d="M5 25 L5 5 L25 5" fill="none" stroke="oklch(0.55 0.15 155)" strokeWidth="3" strokeLinecap="round" />
                                  {/* Top-right corner */}
                                  <path d="M75 5 L95 5 L95 25" fill="none" stroke="oklch(0.55 0.15 155)" strokeWidth="3" strokeLinecap="round" />
                                  {/* Bottom-left corner */}
                                  <path d="M5 75 L5 95 L25 95" fill="none" stroke="oklch(0.55 0.15 155)" strokeWidth="3" strokeLinecap="round" />
                                  {/* Bottom-right corner */}
                                  <path d="M75 95 L95 95 L95 75" fill="none" stroke="oklch(0.55 0.15 155)" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                                {/* Face icon in center */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="rounded-full bg-primary/20 p-3">
                                    <ScanFace className="h-8 w-8 text-primary" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center py-8">
                            {/* Face scan icon with corner brackets */}
                            <div className="relative h-24 w-24">
                              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                                {/* Top-left corner */}
                                <path d="M5 25 L5 5 L25 5" fill="none" stroke="oklch(0.55 0.15 155)" strokeWidth="3" strokeLinecap="round" />
                                {/* Top-right corner */}
                                <path d="M75 5 L95 5 L95 25" fill="none" stroke="oklch(0.55 0.15 155)" strokeWidth="3" strokeLinecap="round" />
                                {/* Bottom-left corner */}
                                <path d="M5 75 L5 95 L25 95" fill="none" stroke="oklch(0.55 0.15 155)" strokeWidth="3" strokeLinecap="round" />
                                {/* Bottom-right corner */}
                                <path d="M75 95 L95 95 L95 75" fill="none" stroke="oklch(0.55 0.15 155)" strokeWidth="3" strokeLinecap="round" />
                              </svg>
                              {/* Smiley face icon */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <svg viewBox="0 0 50 50" className="h-12 w-12 text-primary">
                                  <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
                                  <circle cx="18" cy="20" r="2" fill="currentColor" />
                                  <circle cx="32" cy="20" r="2" fill="currentColor" />
                                  <path d="M16 32 Q25 38 34 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                              </div>
                            </div>
                            <p className="mt-4 text-sm text-muted-foreground">Click Scan to begin</p>
                          </div>
                        )}
                        {/* Status overlay when active */}
                        {faceCamActive && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-center">
                            {faceScanning ? (
                              <p className="text-sm font-medium text-primary animate-pulse">Scanning Face for Identity...</p>
                            ) : userDetected ? (
                              <>
                                <p className="text-sm font-medium text-white">User Detected: {currentUser.name}</p>
                                <Badge className="mt-2 bg-primary text-primary-foreground">Class {currentUser.class}</Badge>
                              </>
                            ) : null}
                          </div>
                        )}
                      </div>
                      <Button
                        className="mt-4 w-full"
                        onClick={faceCamActive ? stopFaceCam : startFaceCam}
                        variant={faceCamActive ? "destructive" : "default"}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        {faceCamActive ? "Stop" : "Scan"}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Tray Scan Camera */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UtensilsCrossed className="h-5 w-5 text-primary" />
                        Camera 2 - Overhead Tray View
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative aspect-video overflow-hidden rounded-lg border-2 border-dashed border-primary/30 bg-muted/30">
                        {trayCamActive ? (
                          <video
                            ref={trayCamRef}
                            autoPlay
                            playsInline
                            muted
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center p-6">
                            {/* Tray layout preview - 3 on top, 1 small + 1 large on bottom */}
                            <div className="w-full max-w-sm">
                              <svg viewBox="0 0 300 200" className="h-full w-full">
                                {/* Tray outline */}
                                <rect
                                  x="5"
                                  y="5"
                                  width="290"
                                  height="190"
                                  rx="8"
                                  fill="none"
                                  stroke="oklch(0.5 0.02 155)"
                                  strokeWidth="2"
                                />
                                {/* Top row - 3 equal compartments */}
                                <rect x="15" y="15" width="86" height="80" rx="4" fill="oklch(0.55 0.15 155 / 0.2)" stroke="oklch(0.55 0.15 155)" strokeWidth="1" />
                                <text x="58" y="60" textAnchor="middle" fontSize="10" fill="oklch(0.5 0.02 155)">Comp 1</text>
                                
                                <rect x="107" y="15" width="86" height="80" rx="4" fill="oklch(0.55 0.15 155 / 0.2)" stroke="oklch(0.55 0.15 155)" strokeWidth="1" />
                                <text x="150" y="60" textAnchor="middle" fontSize="10" fill="oklch(0.5 0.02 155)">Comp 2</text>
                                
                                <rect x="199" y="15" width="86" height="80" rx="4" fill="oklch(0.55 0.15 155 / 0.2)" stroke="oklch(0.55 0.15 155)" strokeWidth="1" />
                                <text x="242" y="60" textAnchor="middle" fontSize="10" fill="oklch(0.5 0.02 155)">Comp 3</text>
                                
                                {/* Bottom row - 1 small + 1 large (2x width) */}
                                <rect x="15" y="105" width="86" height="80" rx="4" fill="oklch(0.55 0.15 155 / 0.2)" stroke="oklch(0.55 0.15 155)" strokeWidth="1" />
                                <text x="58" y="150" textAnchor="middle" fontSize="10" fill="oklch(0.5 0.02 155)">Comp 4</text>
                                
                                {/* Large compartment - spans 2x width */}
                                <rect x="107" y="105" width="178" height="80" rx="6" fill="oklch(0.75 0.12 85 / 0.2)" stroke="oklch(0.75 0.12 85)" strokeWidth="2" />
                                <text x="196" y="145" textAnchor="middle" fontSize="11" fill="oklch(0.5 0.02 155)">Large (2x)</text>
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                      <Button
                        className="mt-4 w-full"
                        onClick={trayCamActive ? stopTrayCam : startTrayCam}
                        variant={trayCamActive ? "destructive" : "default"}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        {trayCamActive ? "Stop" : "Scan"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Tray Layout, Scale & Scoring */}
                <div className="space-y-4">
                  {/* Tray Scoring & Calculations */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Tray Scoring & Calculations</CardTitle>
                      <CardDescription>Understanding your eco-credit calculation</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Legend / Tray Setup Info */}
                      <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">Tray Setup:</p>
                        <p>5 compartments (4 small, 1 large - weighted 2x in scoring). Max raw score = 18.</p>
                      </div>
                      
                      {/* Scoring Metric Guide */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">Scoring Metric Guide:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2 rounded bg-primary/10 px-3 py-2 text-sm">
                            <span className="font-bold text-primary">0</span>
                            <span className="text-muted-foreground">= No waste</span>
                          </div>
                          <div className="flex items-center gap-2 rounded bg-primary/10 px-3 py-2 text-sm">
                            <span className="font-bold text-primary">1</span>
                            <span className="text-muted-foreground">= A bit of waste</span>
                          </div>
                          <div className="flex items-center gap-2 rounded bg-accent/20 px-3 py-2 text-sm">
                            <span className="font-bold text-accent-foreground">2</span>
                            <span className="text-muted-foreground">= Some waste</span>
                          </div>
                          <div className="flex items-center gap-2 rounded bg-destructive/10 px-3 py-2 text-sm">
                            <span className="font-bold text-destructive">3</span>
                            <span className="text-muted-foreground">= Full waste</span>
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Post-Scan Breakdown */}
                      {scanComplete ? (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-foreground">Scan Results Breakdown:</p>
                          <div className="rounded-lg border border-border overflow-hidden">
                            <table className="w-full text-sm">
                              <tbody>
                                <tr className="border-b border-border">
                                  <td className="px-3 py-2 text-muted-foreground">Top Left Compartment</td>
                                  <td className="px-3 py-2 text-right font-medium">{compartmentScores[0]}/3</td>
                                </tr>
                                <tr className="border-b border-border">
                                  <td className="px-3 py-2 text-muted-foreground">Top Middle Compartment</td>
                                  <td className="px-3 py-2 text-right font-medium">{compartmentScores[1]}/3</td>
                                </tr>
                                <tr className="border-b border-border">
                                  <td className="px-3 py-2 text-muted-foreground">Top Right Compartment</td>
                                  <td className="px-3 py-2 text-right font-medium">{compartmentScores[2]}/3</td>
                                </tr>
                                <tr className="border-b border-border">
                                  <td className="px-3 py-2 text-muted-foreground">Bottom Left Compartment</td>
                                  <td className="px-3 py-2 text-right font-medium">{compartmentScores[3]}/3</td>
                                </tr>
                                <tr className="border-b border-border bg-accent/10">
                                  <td className="px-3 py-2 text-muted-foreground">Bottom Right (Large) <span className="text-xs">(x2 Weight)</span></td>
                                  <td className="px-3 py-2 text-right font-medium">{compartmentScores[4]}/3 x 2 = {compartmentScores[4] * 2}</td>
                                </tr>
                                <tr className="border-b border-border bg-muted/50">
                                  <td className="px-3 py-2 font-medium text-foreground">Total Raw Score</td>
                                  <td className="px-3 py-2 text-right font-bold text-foreground">{totalScore}/18</td>
                                </tr>
                                <tr className="bg-primary/10">
                                  <td className="px-3 py-2 font-medium text-primary">Eco-Credits Earned</td>
                                  <td className="px-3 py-2 text-right font-bold text-primary">+{calculateEcoCredits(totalScore)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border p-6 text-center">
                          <p className="text-sm text-muted-foreground">Complete a tray scan to see your detailed scoring breakdown</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Digital Scale */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Scale className="h-5 w-5 text-primary" />
                        Digital Scale
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg bg-foreground p-6 text-center text-background">
                        <p className="text-xs uppercase tracking-wider opacity-60">Total Waste Weight</p>
                        <div className="mt-2 flex items-center justify-center gap-2">
                          <span className="font-mono text-4xl font-bold">{scaleWeight.toFixed(2)}</span>
                          <span className="text-2xl font-bold">kg</span>
                        </div>
                        <p className="mt-2 text-xs opacity-60">
                          {scanComplete ? "Weight captured automatically" : "Awaiting scan..."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Feedback after Scan */}
                  <Card className="border-primary/30 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-primary">
                        <Zap className="h-5 w-5" />
                        {scanComplete ? "Feedback" : "Awaiting Scan"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!scanComplete ? (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground mb-4">
                            Activate both cameras and complete the tray scan to see your results
                          </p>
                          <Button onClick={simulateTrayScan} disabled={!faceCamActive && !trayCamActive}>
                            Simulate Tray Scan
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-lg bg-background p-4 text-center">
                              <p className="text-xs text-muted-foreground">Waste Score</p>
                              <p className="text-3xl font-bold text-foreground">
                                {Math.round((1 - totalScore / 18) * 100)}%
                              </p>
                              <Progress value={(1 - totalScore / 18) * 100} className="mt-2 h-2" />
                            </div>
                            <div className="rounded-lg bg-background p-4 text-center">
                              <p className="text-xs text-muted-foreground">Eco-Credits Earned</p>
                              <p className="text-3xl font-bold text-primary">+{calculateEcoCredits(totalScore)}</p>
                            </div>
                          </div>
                          {/* CO2 Saved Callout */}
                          <div className="rounded-lg bg-background p-4 text-center">
                            <Leaf className="mx-auto h-8 w-8 text-primary" />
                            <p className="mt-2 text-sm text-muted-foreground">CO2 Saved Today</p>
                            <p className="text-2xl font-bold text-foreground">{calculateCO2Saved(totalScore)} kg</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {totalScore <= 6
                                ? "Excellent job! Minimal waste detected!"
                                : totalScore <= 12
                                  ? "Good effort! Keep reducing waste."
                                  : "Room for improvement. Try to waste less next time!"}
                            </p>
                          </div>
                          <Button variant="outline" className="w-full" onClick={resetScan}>
                            Reset and Scan Again
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboards View */}
          {activeView === "leaderboards" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Leaderboards</h2>
                <p className="text-muted-foreground">{"See who's leading the charge for sustainability"}</p>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle>Eco-Credit Rankings</CardTitle>
                        <div className="flex gap-2">
                          <Tabs value={leaderboardType} onValueChange={setLeaderboardType}>
                            <TabsList>
                              <TabsTrigger value="individual">Individual</TabsTrigger>
                              <TabsTrigger value="class">Class</TabsTrigger>
                            </TabsList>
                          </Tabs>
                          <Tabs value={leaderboardPeriod} onValueChange={setLeaderboardPeriod}>
                            <TabsList>
                              <TabsTrigger value="all-time">All-Time</TabsTrigger>
                              <TabsTrigger value="monthly">Monthly</TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {leaderboardType === "individual" ? (
                        <div className="space-y-3">
                          {individualLeaderboard.map((user) => (
                            <div
                              key={user.rank}
                              className={`flex items-center gap-4 rounded-lg p-3 transition-colors ${
                                user.rank <= 3 ? "bg-primary/10" : "bg-secondary/50"
                              }`}
                            >
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                                  user.rank === 1
                                    ? "bg-accent text-accent-foreground"
                                    : user.rank === 2
                                      ? "bg-muted-foreground/30 text-foreground"
                                      : user.rank === 3
                                        ? "bg-accent/60 text-accent-foreground"
                                        : "bg-secondary text-secondary-foreground"
                                }`}
                              >
                                {user.rank}
                              </div>
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback>
                                  {user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-medium text-foreground">{user.name}</p>
                                <p className="text-sm text-muted-foreground">Class {user.class}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-primary">{user.credits.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">credits</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {classLeaderboard.map((cls) => (
                            <div
                              key={cls.rank}
                              className={`flex items-center gap-4 rounded-lg p-3 transition-colors ${
                                cls.rank <= 3 ? "bg-primary/10" : "bg-secondary/50"
                              }`}
                            >
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                                  cls.rank === 1
                                    ? "bg-accent text-accent-foreground"
                                    : cls.rank === 2
                                      ? "bg-muted-foreground/30 text-foreground"
                                      : cls.rank === 3
                                        ? "bg-accent/60 text-accent-foreground"
                                        : "bg-secondary text-secondary-foreground"
                                }`}
                              >
                                {cls.rank}
                              </div>
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                                <Users className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-foreground">{cls.name}</p>
                                <p className="text-sm text-muted-foreground">{cls.students} students</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-primary">{cls.credits.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">total credits</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Achievements</CardTitle>
                    <CardDescription>Badges and milestones</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {achievements.map((achievement) => (
                        <div
                          key={achievement.name}
                          className={`flex flex-col items-center gap-2 rounded-lg p-4 text-center ${
                            achievement.unlocked
                              ? "bg-primary/10 border border-primary/30"
                              : "bg-secondary/50 opacity-60"
                          }`}
                        >
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-full ${
                              achievement.unlocked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {achievement.unlocked ? (
                              <achievement.icon className="h-6 w-6" />
                            ) : (
                              <Lock className="h-5 w-5" />
                            )}
                          </div>
                          <p className="text-xs font-medium">{achievement.name}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* User Management View */}
          {activeView === "users" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">User Management & Accounts</h2>
                <p className="text-muted-foreground">Manage student profiles and face authentication</p>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Student Profile */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Student Profile</CardTitle>
                    <CardDescription>Current user information and settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Profile Info */}
                    <div className="flex items-start gap-6">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                        <AvatarFallback className="text-2xl">EC</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">English Name</p>
                          <p className="font-semibold text-foreground">{currentUser.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Username</p>
                          <p className="font-semibold text-foreground">emily.chen.10a</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Class</p>
                          <p className="font-semibold text-foreground">{currentUser.class}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Student ID</p>
                          <p className="font-semibold text-foreground">STU-2024-0847</p>
                        </div>
                      </div>
                    </div>

                    {/* Face Authentication */}
                    <div className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                            <ScanFace className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Face Authentication</p>
                            <p className="text-sm text-muted-foreground">Status: Registered</p>
                          </div>
                        </div>
                        <Badge className="bg-primary/20 text-primary">Verified</Badge>
                      </div>
                    </div>

                    {/* Credit Balance */}
                    <div className="rounded-lg border border-border bg-primary/5 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Current Eco-Credit Balance</p>
                          <p className="text-4xl font-bold text-primary">{currentUser.credits.toLocaleString()}</p>
                        </div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20">
                          <Zap className="h-7 w-7 text-primary" />
                        </div>
                      </div>
                    </div>

                    {/* Register Button */}
                    <Button variant="outline" className="w-full">
                      <ScanFace className="mr-2 h-4 w-4" />
                      Register New Face Scan (One-time registration)
                    </Button>
                  </CardContent>
                </Card>

                {/* Recent Meal History */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Meal History</CardTitle>
                    <CardDescription>Your last tracked meals</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {mealHistory.map((meal, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border border-border p-3"
                        >
                          <div>
                            <p className="font-medium text-foreground">{meal.date}</p>
                            <p className="text-sm text-muted-foreground">Waste: {meal.waste}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">+{meal.credits}</p>
                            <p className="text-xs text-muted-foreground">Score: {meal.score}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Rewards View */}
          {activeView === "rewards" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Rewards Redemption</h2>
                <p className="text-muted-foreground">Redeem your eco-credits for exciting prizes</p>
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                      <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Your Balance</p>
                      <p className="text-2xl font-bold text-primary">{currentUser.credits.toLocaleString()} Eco-Credits</p>
                    </div>
                  </div>
                  <Button variant="outline">
                    View History
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {rewards.map((reward) => (
                  <Card key={reward.name} className="overflow-hidden">
                    <div className="aspect-square bg-secondary/50 p-6 flex items-center justify-center">
                      <Gift className="h-16 w-16 text-primary/40" />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground">{reward.name}</h3>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Zap className="h-4 w-4 text-primary" />
                          <span className="font-bold text-primary">{reward.credits}</span>
                        </div>
                        <Badge variant="secondary">{reward.stock} left</Badge>
                      </div>
                      <Button className="mt-3 w-full" disabled={reward.credits > currentUser.credits}>
                        {reward.credits > currentUser.credits ? "Not Enough Credits" : "Redeem"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
