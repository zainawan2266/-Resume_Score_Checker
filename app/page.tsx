"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { FileText, Target, CheckCircle, AlertCircle, XCircle, Zap, Shield, FileUp, Clipboard } from "lucide-react"
import { useTheme } from "next-themes"

interface ScoreBreakdown {
  keywordMatch: number
  structure: number
  formatting: number
  impact: number
  readability: number
  relevance: number
}

interface AnalysisResult {
  overallScore: number
  breakdown: ScoreBreakdown
  recommendations: Array<{
    category: string
    issue: string
    fix: string
    impact: number
  }>
  keywordAnalysis: {
    matched: string[]
    missing: string[]
    hardSkills: string[]
    softSkills: string[]
  }
  sections: {
    found: string[]
    missing: string[]
  }
  formattingIssues: string[]
}

export default function ATSResumeChecker() {
  const { theme, setTheme } = useTheme()
  const [resumeText, setResumeText] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Simple keyword extraction and analysis
  const extractKeywords = useCallback((text: string) => {
    const commonSkills = [
      "javascript",
      "python",
      "java",
      "react",
      "node.js",
      "sql",
      "html",
      "css",
      "leadership",
      "communication",
      "teamwork",
      "problem-solving",
      "analytical",
      "project management",
      "agile",
      "scrum",
      "git",
      "aws",
      "docker",
      "kubernetes",
    ]

    const words = text.toLowerCase().match(/\b\w+\b/g) || []
    const found = commonSkills.filter((skill) => words.some((word) => word.includes(skill.replace(/[.\s]/g, ""))))

    return found
  }, [])

  // Analyze resume structure
  const analyzeStructure = useCallback((text: string) => {
    const sections = ["contact", "summary", "experience", "education", "skills", "projects"]

    const found = sections.filter((section) => {
      const patterns = {
        contact: /(?:email|phone|linkedin|github)/i,
        summary: /(?:summary|objective|profile)/i,
        experience: /(?:experience|employment|work history)/i,
        education: /(?:education|degree|university|college)/i,
        skills: /(?:skills|technologies|competencies)/i,
        projects: /(?:projects|portfolio)/i,
      }
      return patterns[section as keyof typeof patterns]?.test(text)
    })

    const missing = sections.filter((s) => !found.includes(s))
    return { found, missing }
  }, [])

  // Check formatting issues
  const checkFormatting = useCallback((text: string) => {
    const issues = []

    if (text.length < 500) issues.push("Resume appears too short")
    if (text.length > 5000) issues.push("Resume appears too long")
    if (!/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(text)) issues.push("No phone number detected")
    if (!/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text)) issues.push("No email address detected")
    if (text.split("\n").length < 10) issues.push("May have formatting issues - too few line breaks")

    return issues
  }, [])

  // Main analysis function
  const analyzeResume = useCallback(() => {
    if (!resumeText.trim()) return

    setIsAnalyzing(true)

    // Simulate processing time for better UX
    setTimeout(() => {
      const resumeKeywords = extractKeywords(resumeText)
      const jdKeywords = jobDescription ? extractKeywords(jobDescription) : []

      const matched = resumeKeywords.filter((kw) => jdKeywords.includes(kw))
      const missing = jdKeywords.filter((kw) => !resumeKeywords.includes(kw))

      const sections = analyzeStructure(resumeText)
      const formattingIssues = checkFormatting(resumeText)

      // Calculate scores
      const keywordScore = jdKeywords.length > 0 ? (matched.length / jdKeywords.length) * 35 : 25
      const structureScore = (sections.found.length / 6) * 20
      const formattingScore = Math.max(0, 15 - formattingIssues.length * 3)
      const impactScore = (resumeText.match(/\d+%|\$\d+|\d+\+/g)?.length || 0) * 2
      const readabilityScore = resumeText.length > 800 && resumeText.length < 2000 ? 10 : 5
      const relevanceScore = resumeKeywords.length > 5 ? 10 : 5

      const breakdown: ScoreBreakdown = {
        keywordMatch: Math.round(keywordScore),
        structure: Math.round(structureScore),
        formatting: Math.round(formattingScore),
        impact: Math.min(10, Math.round(impactScore)),
        readability: Math.round(readabilityScore),
        relevance: Math.round(relevanceScore),
      }

      const overallScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0)

      // Generate recommendations
      const recommendations = []
      if (breakdown.keywordMatch < 20) {
        recommendations.push({
          category: "Keywords",
          issue: "Low keyword match with job description",
          fix: "Add more relevant skills and technologies from the job posting",
          impact: 15,
        })
      }
      if (sections.missing.length > 2) {
        recommendations.push({
          category: "Structure",
          issue: "Missing key resume sections",
          fix: `Add missing sections: ${sections.missing.join(", ")}`,
          impact: 10,
        })
      }
      if (formattingIssues.length > 0) {
        recommendations.push({
          category: "Formatting",
          issue: "ATS parsing issues detected",
          fix: formattingIssues[0],
          impact: 8,
        })
      }

      const result: AnalysisResult = {
        overallScore: Math.round(overallScore),
        breakdown,
        recommendations: recommendations.slice(0, 5),
        keywordAnalysis: {
          matched,
          missing: missing.slice(0, 10),
          hardSkills: resumeKeywords.filter((kw) =>
            ["javascript", "python", "java", "react", "sql", "aws"].includes(kw),
          ),
          softSkills: resumeKeywords.filter((kw) =>
            ["leadership", "communication", "teamwork", "analytical"].includes(kw),
          ),
        },
        sections,
        formattingIssues,
      }

      setAnalysisResult(result)
      setIsAnalyzing(false)
    }, 1500)
  }, [resumeText, jobDescription, extractKeywords, analyzeStructure, checkFormatting])

  useEffect(() => {
    // Load PDF.js
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
      }
    }
    document.head.appendChild(script)

    // Load mammoth.js for DOCX parsing
    const mammothScript = document.createElement("script")
    mammothScript.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"
    document.head.appendChild(mammothScript)

    return () => {
      document.head.removeChild(script)
      document.head.removeChild(mammothScript)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  const extractPDFText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer
          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
          let fullText = ""

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            const pageText = textContent.items.map((item: any) => item.str).join(" ")
            fullText += pageText + "\n"
          }

          resolve(fullText.trim())
        } catch (error) {
          console.error("[v0] PDF parsing error:", error)
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  const extractDOCXText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer
          const result = await window.mammoth.extractRawText({ arrayBuffer })
          resolve(result.value)
        } catch (error) {
          console.error("[v0] DOCX parsing error:", error)
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadedFileName(file.name)
    setIsParsingFile(true)

    try {
      let extractedText = ""

      if (file.type === "application/pdf") {
        extractedText = await extractPDFText(file)
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        extractedText = await extractDOCXText(file)
      } else {
        alert("Please upload a PDF or DOCX file")
        setIsParsingFile(false)
        return
      }

      if (extractedText.trim()) {
        setResumeText(extractedText)
      } else {
        alert("Could not extract text from the file. Please try a different file or paste the text manually.")
      }
    } catch (error) {
      console.error("[v0] File parsing failed:", error)
      alert("Failed to parse the file. Please try pasting the text manually.")
    } finally {
      setIsParsingFile(false)
    }
  }, [])

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { label: "Excellent", variant: "default" as const, icon: CheckCircle }
    if (score >= 60) return { label: "Good", variant: "secondary" as const, icon: AlertCircle }
    if (score >= 40) return { label: "Fair", variant: "outline" as const, icon: AlertCircle }
    return { label: "Poor", variant: "destructive" as const, icon: XCircle }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/10 animate-pulse"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 via-blue-500/5 to-indigo-600/10"></div>

      <header className="relative z-10 luxury-card border-b border-white/10 shadow-2xl">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-2xl border border-white/20 luxury-border-gradient">
                <div className="relative">
                  <Target className="h-10 w-10 text-white drop-shadow-lg transform hover:rotate-12 transition-transform duration-300" />
                  <Zap className="h-5 w-5 text-white absolute -top-1 -right-1 animate-pulse drop-shadow-md" />
                </div>
              </div>
              <div className="absolute -inset-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
            </div>
            <div>
              <h1
                className="text-4xl font-bold luxury-text-gradient drop-shadow-2xl"
                style={{ textShadow: "0 4px 8px rgba(99, 102, 241, 0.5)" }}
              >
                ATS Resume Checker
              </h1>
              <p className="text-lg text-gray-300 font-medium mt-1">Powered by AI • Privacy First</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-white luxury-card px-4 py-3 rounded-xl border border-white/20">
            <Shield className="h-5 w-5 text-indigo-400" />
            <span className="font-semibold">100% Private</span>
          </div>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-10">
          <div className="space-y-8 fade-in-up">
            <Card className="luxury-card luxury-border-gradient rounded-2xl hover:shadow-indigo-500/20 transition-all duration-500 hover:scale-[1.02]">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-400/20 via-blue-500/20 to-indigo-600/20 luxury-border-gradient">
                    <FileUp className="h-6 w-6 text-cyan-400" />
                  </div>
                  <span
                    className="text-2xl font-bold text-white drop-shadow-lg"
                    style={{ textShadow: "0 2px 4px rgba(59, 130, 246, 0.5)" }}
                  >
                    Upload Resume
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center luxury-card hover:border-indigo-400/50 transition-all duration-300">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-4 luxury-button-primary text-white font-semibold rounded-xl px-8 py-3 shadow-2xl border-0"
                    disabled={isParsingFile}
                  >
                    <FileText className="h-5 w-5 mr-2 hover:rotate-12 transition-transform duration-300" />
                    {isParsingFile ? "Parsing..." : "Choose File"}
                  </Button>
                  <p className="text-gray-300 text-lg">
                    {isParsingFile ? (
                      <span className="animate-pulse">Extracting text from file...</span>
                    ) : (
                      uploadedFileName || "Upload PDF or DOCX file"
                    )}
                  </p>
                </div>

                <div className="space-y-4">
                  <label
                    className="flex items-center gap-3 text-lg font-bold luxury-text-gradient"
                    style={{ textShadow: "0 2px 4px rgba(147, 51, 234, 0.5)" }}
                  >
                    <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                      <Clipboard className="h-5 w-5 text-purple-400" />
                    </div>
                    Or paste resume text:
                  </label>
                  <Textarea
                    placeholder="Paste your resume text here..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    className="min-h-[200px] luxury-textbox text-white placeholder:text-gray-400 rounded-xl text-lg"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="luxury-card luxury-border-gradient rounded-2xl hover:shadow-purple-500/20 transition-all duration-500 hover:scale-[1.02]">
              <CardHeader>
                <CardTitle
                  className="text-2xl font-bold luxury-text-gold drop-shadow-lg"
                  style={{ textShadow: "0 2px 4px rgba(251, 191, 36, 0.5)" }}
                >
                  Job Description (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Paste the job description to get targeted keyword analysis..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[150px] luxury-textbox text-white placeholder:text-amber-400/80 rounded-xl text-lg"
                />
              </CardContent>
            </Card>

            <Button
              onClick={analyzeResume}
              disabled={!resumeText.trim() || isAnalyzing || isParsingFile}
              className="w-full luxury-button-primary text-white font-bold rounded-xl px-10 py-6 shadow-2xl disabled:opacity-50 disabled:hover:scale-100 text-xl border-0"
              size="lg"
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Analyzing...
                </span>
              ) : isParsingFile ? (
                <span className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing File...
                </span>
              ) : (
                "Analyze Resume"
              )}
            </Button>
          </div>

          <div className="space-y-8 fade-in-up-delay">
            {analysisResult && (
              <>
                <Card className="luxury-card luxury-border-gradient rounded-2xl hover:shadow-pink-500/20 transition-all duration-500">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold luxury-text-gradient text-center">ATS Score</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-8">
                    <div className="relative">
                      <div className="w-40 h-40 mx-auto relative">
                        <svg className="w-40 h-40 transform -rotate-90 luxury-score-ring" viewBox="0 0 120 120">
                          <circle
                            cx="60"
                            cy="60"
                            r="50"
                            stroke="rgba(255, 255, 255, 0.1)"
                            strokeWidth="8"
                            fill="none"
                          />
                          <circle
                            cx="60"
                            cy="60"
                            r="50"
                            stroke="url(#luxuryScoreGradient)"
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${(analysisResult.overallScore / 100) * 314} 314`}
                            className="transition-all duration-2000 ease-out"
                          />
                          <defs>
                            <linearGradient id="luxuryScoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#6366f1" />
                              <stop offset="50%" stopColor="#8b5cf6" />
                              <stop offset="100%" stopColor="#ec4899" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-5xl font-bold text-white drop-shadow-2xl animate-pulse">
                            {analysisResult.overallScore}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      {(() => {
                        const badge = getScoreBadge(analysisResult.overallScore)
                        const Icon = badge.icon
                        return (
                          <Badge
                            variant={badge.variant}
                            className="flex items-center gap-3 px-6 py-3 text-lg font-bold luxury-card border border-white/20 text-white hover:scale-105 transition-transform duration-300"
                          >
                            <Icon className="h-5 w-5 animate-pulse" />
                            {badge.label}
                          </Badge>
                        )
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {!analysisResult && (
              <Card className="luxury-card luxury-border-gradient rounded-2xl hover:shadow-amber-500/20 transition-all duration-500">
                <CardContent className="text-center py-20">
                  <div className="p-6 rounded-full bg-gradient-to-r from-amber-400/20 via-yellow-500/20 to-orange-500/20 w-fit mx-auto mb-8 luxury-border-gradient">
                    <Target className="h-20 w-20 text-amber-400 animate-pulse" />
                  </div>
                  <h3
                    className="text-3xl font-bold mb-6 luxury-text-gold drop-shadow-lg"
                    style={{ textShadow: "0 4px 8px rgba(251, 191, 36, 0.5)" }}
                  >
                    Ready to Analyze
                  </h3>
                  <p className="text-gray-300 text-xl leading-relaxed">
                    Upload your resume or paste the text to get started with ATS analysis.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="mt-20 text-center">
          <div className="luxury-card luxury-border-gradient rounded-2xl p-8 inline-block shadow-2xl">
            <p className="text-white flex items-center gap-4 text-xl font-semibold">
              <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20">
                <Shield className="h-8 w-8 text-indigo-400" />
              </div>
              Your resume is processed entirely in your browser. No data is sent to our servers.
            </p>
          </div>
        </div>
      </div>

      <footer className="relative z-10 mt-24 luxury-card border-t border-white/10">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-2xl border border-white/20 luxury-border-gradient">
                <Zap className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <h3 className="text-3xl font-bold luxury-text-gradient drop-shadow-lg">MZA Technologies</h3>
            </div>
            <p className="text-gray-300 max-w-lg mx-auto text-lg font-medium leading-relaxed">
              Empowering careers through innovative AI-powered tools. Built with privacy and performance in mind.
            </p>
            <div className="flex items-center justify-center gap-8 text-gray-400 font-semibold">
              <span>© 2024 MZA Technologies</span>
              <span>•</span>
              <span>Privacy First</span>
              <span>•</span>
              <span>AI Powered</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

declare global {
  interface Window {
    pdfjsLib: any
    mammoth: any
  }
}
