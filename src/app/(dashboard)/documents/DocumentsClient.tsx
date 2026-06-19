'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, ShieldAlert, CheckCircle2, User, Users, Landmark, 
  Sparkles, FileCheck, CheckSquare, HelpCircle, GraduationCap, Info
} from 'lucide-react'

export function DocumentsClient() {
  const [activeTab, setActiveTab] = useState<'university' | 'visa'>('university')

  const universityDocsScan = [
    "Talabaning pasporti — ID (yoki 'yashil' pasport)",
    "Xorijiy pasport (zagran pasport)",
    "Ota-onaning pasporti",
    "Ota-onaning nikoh guvohnomasi",
    "IELTS, TOPIK yoki SKA sertifikati (agar mavjud bo'lsa)",
    "Tug'ilganlik haqida guvohnoma (metrka)",
    "Rasm — 3.5 × 4.5 (1 ta elektron rasm va 8 ta chiqarilgan)"
  ]

  const visaStudentDocs = [
    "Zagran pasport aslini va rangli nusxasi (2 ta)",
    "Biometrik pasport yoki ID kartaning nusxasi (oldi va orqa tomoni)",
    "Admission (Taklifnoma — Universitet tomonidan beriladi)",
    "Business Registration (Universitet litsenziyasi — Universitet beradi)",
    "Eng oxirgi o'qish joyidan olingan bitiruv hujjati (Diplom yoki Shahodatnoma apostil bilan, QR-kod, imzo va muhr bo'lishi shart)",
    "Talaba nomidagi 1 oylik KDB bank hisobi ma'lumotnomasi ($12,500 - $15,500 oralig'ida, shahar va universitet talabidan kelib chiqib)",
    "Til bilish sertifikati (TOPIK 3, SKA 321 ball, Sejong 1-darajadan yuqori yoki IELTS 5.5 dan yuqori)",
    "Tug'ilganlik haqida guvohnoma (Metrka) — rasmiy tarjimasi bilan",
    "Ota-onasining nikoh guvohnomasi (ZAGS) — rasmiy tarjimasi bilan",
    "Nikohda turganligi yoki turmaganligi haqidagi ma'lumotnoma (rasmiy tarjimasi bilan)",
    "3.5 x 4.5 o'lchamdagi rasm (orqasi oq fonda, 2 ta)",
    "Study Plan (Koreys yoki ingliz tilida talaba tomonidan qo'lda yoziladi)"
  ]

  const visaParentDocs = [
    "Ota-onaning biometrik pasporti yoki ID nusxasi (oldi va orqa tomoni)",
    "Mehnat daftarchasidan ko'chirma (My.gov.uz dan yuklab olinadi) — rasmiy tarjimasi bilan",
    "Yillik daromad haqida ma'lumotnoma (oxirgi 1 yillik, My.gov.uz dan) — rasmiy tarjimasi bilan",
    "Ota-ona nomida yer yoki ko'chmas mulk bo'lsa, davreestr.uz portalidan kadastr ko'chirmasi — rasmiy tarjimasi bilan (agar mavjud bo'lsa)",
    "Shaxsiy avtotransport vositasi bo'lsa, texpasport nusxasi — rasmiy tarjimasi bilan (agar mavjud bo'lsa)",
    "QR-kodli ota-ona nomidagi 1 kunlik bank balansidan ko'chirma"
  ]

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Embassy Documents Warning Card */}
      <div 
        className="rounded-[var(--radius-lg)] border border-rose-500/25 bg-rose-500/5 p-4 shadow-[var(--shadow-sm)] flex items-start gap-3.5 relative overflow-hidden"
        style={{ backdropFilter: 'blur(8px)' }}
      >
        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-rose-500" />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <ShieldAlert className="h-5 w-5 animate-pulse" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide">Muhim Ogohlantirish</h4>
          <p className="mt-1 text-sm font-semibold text-rose-900 dark:text-rose-200/90 leading-relaxed">
            Elchixonaga taqdim etiladigan hujjatlar my.gov.uz portalidan olinganiga <span className="underline decoration-2 font-extrabold text-rose-600 dark:text-rose-400">1 oydan oshmagan</span> bo'lishi lozim!
          </p>
        </div>
      </div>

      {/* Tabs Controller */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl p-1 bg-[var(--surface-elevated)] border border-[var(--border)] relative shadow-sm select-none">
          <button
            type="button"
            onClick={() => setActiveTab('university')}
            className={`relative z-10 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-2 transition-all ${
              activeTab === 'university' 
                ? 'text-[var(--accent-foreground)]' 
                : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {activeTab === 'university' && (
              <motion.div 
                layoutId="activeTabIndicator" 
                className="absolute inset-0 bg-[var(--accent)] rounded-lg -z-10 shadow-sm"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <GraduationCap className="h-4.5 w-4.5" />
            Universitetga Topshirish
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('visa')}
            className={`relative z-10 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-2 transition-all ${
              activeTab === 'visa' 
                ? 'text-[var(--accent-foreground)]' 
                : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {activeTab === 'visa' && (
              <motion.div 
                layoutId="activeTabIndicator" 
                className="absolute inset-0 bg-[var(--accent)] rounded-lg -z-10 shadow-sm"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <FileCheck className="h-4.5 w-4.5" />
            D-2 Viza Hujjatlari
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {activeTab === 'university' ? (
          <motion.div
            key="university-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Scanned copies checklist */}
            <div className="md:col-span-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] flex flex-col gap-4">
              <div className="pb-3 border-b border-[var(--border)] flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center text-[var(--accent)]">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">Skaner Varianti Yetarli Hujjatlar</h3>
                  <p className="text-xs text-[var(--foreground-muted)]">Ofisga skaner variantini yuborish yoki aslini olib kelish kifoya</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {universityDocsScan.map((doc, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] hover:border-[var(--accent)]/30 hover:bg-[var(--surface-elevated)] transition-all">
                    <CheckCircle2 className="h-4.5 w-4.5 text-[var(--accent)] shrink-0 mt-0.5" />
                    <span className="text-xs font-semibold text-[var(--foreground)] tracking-wide">{doc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Originals checklist and warning cards */}
            <div className="flex flex-col gap-6">
              {/* Originals Card */}
              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] flex flex-col gap-4">
                <div className="pb-3 border-b border-[var(--border)] flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">Aslini Olib Kelish Shart</h3>
                    <p className="text-xs text-[var(--foreground-muted)]">Asl nusxada taqdim etiladigan hujjatlar</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-[var(--foreground)] tracking-wide">Diplom, Shahodatnoma yoki Attestat</span>
                    <p className="text-[10px] text-[var(--foreground-muted)] mt-1 font-semibold">Baholar varaqasi (ilova) bilan birga taqdim etiladi.</p>
                  </div>
                </div>
              </div>

              {/* Quality note card */}
              <div className="rounded-[var(--radius-lg)] border border-amber-500/25 bg-amber-500/5 p-5 shadow-[var(--shadow-sm)] flex flex-col gap-3">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="h-5 w-5 animate-bounce-slow" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Hujjatlar Sifati</h4>
                </div>
                <p className="text-xs font-semibold text-[var(--foreground)] leading-relaxed">
                  DIQQAT! Shikastlangan, yirtilgan yoki yozuvi ko'rinmaydigan hujjatlar yangi qilib berilishi shart!
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="visa-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Student Documents Card */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] flex flex-col gap-4">
              <div className="pb-3 border-b border-[var(--border)] flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center text-[var(--accent)]">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">Talaba Hujjatlari</h3>
                  <p className="text-xs text-[var(--foreground-muted)]">Viza arizachisi tomonidan tayyorlanadigan hujjatlar</p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[640px] overflow-y-auto pr-1">
                {visaStudentDocs.map((doc, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] hover:border-[var(--accent)]/30 hover:bg-[var(--surface-elevated)] transition-all">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] text-[10px] font-bold mt-0.5">
                      {idx + 1}
                    </div>
                    <span className="text-xs font-semibold text-[var(--foreground)] tracking-wide leading-relaxed">{doc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Parent Documents Card */}
            <div className="flex flex-col gap-6">
              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] flex flex-col gap-4">
                <div className="pb-3 border-b border-[var(--border)] flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">Ota-Ona Hujjatlari</h3>
                    <p className="text-xs text-[var(--foreground-muted)]">Ota-ona yoki kafil tomonidan taqdim etiladigan hujjatlar</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  {visaParentDocs.map((doc, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] hover:border-emerald-500/30 hover:bg-[var(--surface-elevated)] transition-all">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold mt-0.5">
                        {idx + 1}
                      </div>
                      <span className="text-xs font-semibold text-[var(--foreground)] tracking-wide leading-relaxed">{doc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time limits warning info card */}
              <div className="rounded-[var(--radius-lg)] border border-amber-500/25 bg-amber-500/5 p-4 shadow-[var(--shadow-sm)] flex items-start gap-3">
                <div className="h-8 w-8 shrink-0 rounded bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Info className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Mulkni Ro'yxatdan O'tkazish Muddati</span>
                  <p className="mt-1 text-xs font-semibold text-[var(--foreground)] leading-relaxed">
                    Yer, ko'chmas mulk hamda shaxsiy transport vositasini ota-ona nomiga ro'yxatdan o'tkazilganligiga <span className="underline decoration-2 font-bold text-amber-600 dark:text-amber-400">3 oydan ko'p bo'lishi kerak!</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
