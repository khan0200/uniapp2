const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'students', '[id]', 'StudentDetailClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Chunk 1: State Variables
content = content.replace(
  /const \[savingMajor, setSavingMajor\] = useState\(false\)/,
  `const [savingMajor, setSavingMajor] = useState(false)

  // Certificate modal states
  const [isCertModalOpen, setIsCertModalOpen] = useState(false)
  const [certModalLabel, setCertModalLabel] = useState('')
  const [certEditingField, setCertEditingField] = useState<'language_certificate' | 'language_certificate_2' | 'language_certificate_3' | null>(null)
  
  const [tempCertType, setTempCertType] = useState('')
  const [tempCertScore, setTempCertScore] = useState('')
  const [tempCertTestDate, setTempCertTestDate] = useState('')
  const [tempCertValidDate, setTempCertValidDate] = useState('')
  const [savingCert, setSavingCert] = useState(false)`
);

// Chunk 2: renderCertificateCard Signature
content = content.replace(
  /const renderCertificateCard = \([\s\S]*?const isMissing = !certVal \|\| certVal === 'NO CERTIFICATE' \|\| certVal\.trim\(\) === ''/,
  `const renderCertificateCard = (
    label: string,
    certField: keyof Student,
    scoreField: keyof Student,
    testDateField: keyof Student,
    validDateField: keyof Student,
    certsAllowed: string[],
    certColor: string = 'bg-[#de350b]',
    options: {
      compact?: boolean
      onAdd?: () => void
      addTitle?: string
      onRemove?: () => void
      removeTitle?: string
    } = {}
  ) => {
    const isEditing = false;
    const certVal = selectedStudent?.[certField] as string
    const scoreVal = selectedStudent?.[scoreField] as string
    const testDateVal = selectedStudent?.[testDateField] as string
    const validDateVal = selectedStudent?.[validDateField] as string
    const isMissing = !certVal || certVal === 'NO CERTIFICATE' || certVal.trim() === ''`
);

// Chunk 3: Pencil Button
content = content.replace(
  /handleStartEditing\(String\(certField\), certVal, certsAllowed\[0\]\);/,
  `setCertModalLabel(label);
                  setCertEditingField(certField as any);
                  setTempCertType(certVal && certVal !== 'NO CERTIFICATE' ? certVal : '');
                  setTempCertScore(scoreVal || '');
                  setTempCertTestDate(testDateVal || '');
                  setTempCertValidDate(validDateVal || '');
                  setIsCertModalOpen(true);`
);

// Chunk 4: Display block
// I will replace the entire renderCertificateCard function body from `return (` to the end of the component.
// Wait, replacing a huge block is dangerous.
// Let's replace just the `isEditing ? ( ... ) : ( ... )` part inside `renderCertificateCard`.
const startSearchStr = '{isEditing ? (';
const endSearchStr = `        </div>
      </div>
    )
  }

  // Render University status card (Now with copy & edit support)`;

// I'll manually construct the replacement string using substring index
const editingStartIndex = content.indexOf(startSearchStr);
const nextFunctionIndex = content.indexOf(endSearchStr);

if (editingStartIndex !== -1 && nextFunctionIndex !== -1) {
  const replacement = `
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex-1 min-w-0">
              {certVal && certVal !== 'NO CERTIFICATE' ? (
                <div className="flex flex-col gap-1">
                  <div className="inline-flex flex-wrap items-center text-[13px] font-bold rounded-[4px] overflow-hidden shadow-sm">
                    <span className={\`\${certColor} text-white px-1.5 py-0.5 uppercase\`}>{certVal}</span>
                    <span className="bg-[#0052cc] text-white px-1.5 py-0.5">SCORE: {scoreVal || '—'}</span>
                  </div>
                  {(testDateVal || validDateVal) && (
                    <div className="flex items-center gap-2 text-[11px] text-[var(--foreground-muted)] font-medium mt-1">
                      {testDateVal && <span><span className="font-bold">Test:</span> {testDateVal}</span>}
                      {validDateVal && <span><span className="font-bold">Valid:</span> {validDateVal}</span>}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-[14px] font-semibold text-[#B91C1C]">Not provided</span>
              )}
            </div>
            {copiedField === String(certField) && (
              <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0 animate-in fade-in zoom-in-75 duration-200" />
            )}
          </div>
`;
  content = content.substring(0, editingStartIndex) + replacement + content.substring(nextFunctionIndex);
}

// Chunk 5: renderCertificateCard Calls
content = content.replace(
  /renderCertificateCard\('Language Certificate 1', 'language_certificate', 'certificate_score', \['TOPIK'/g,
  `renderCertificateCard('Language Certificate 1', 'language_certificate', 'certificate_score', 'certificate_test_date', 'certificate_valid_date', ['TOPIK'`
);

content = content.replace(
  /renderCertificateCard\('Language Certificate 2', 'language_certificate_2', 'certificate_score_2', \['TOPIK'/g,
  `renderCertificateCard('Language Certificate 2', 'language_certificate_2', 'certificate_score_2', 'certificate_2_test_date', 'certificate_2_valid_date', ['TOPIK'`
);

content = content.replace(
  /renderCertificateCard\('Language Certificate 3', 'language_certificate_3', 'certificate_score_3', \['TOPIK'/g,
  `renderCertificateCard('Language Certificate 3', 'language_certificate_3', 'certificate_score_3', 'certificate_3_test_date', 'certificate_3_valid_date', ['TOPIK'`
);

content = content.replace(
  /\['language_certificate_2', 'certificate_score_2'\]/g,
  `['language_certificate_2', 'certificate_score_2', 'certificate_2_test_date', 'certificate_2_valid_date']`
);

content = content.replace(
  /\['language_certificate_3', 'certificate_score_3'\]/g,
  `['language_certificate_3', 'certificate_score_3', 'certificate_3_test_date', 'certificate_3_valid_date']`
);


// Chunk 6: Add Modal
const certModal = `
      {/* Certificate Editing Modal */}
      {isCertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCertModalOpen(false)}
          />
          {/* Modal Container */}
          <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-2xl p-6 w-full max-w-md mx-4 z-10 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsCertModalOpen(false)}
              className="absolute right-4 top-4 text-[var(--foreground-muted)] hover:text-[var(--foreground)] p-1 hover:bg-[var(--border-subtle)] rounded transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-[17px] font-bold text-[var(--foreground)] mb-6 pr-6">
              Edit {certModalLabel}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[var(--foreground-muted)] uppercase mb-1.5">
                  Certificate Type
                </label>
                <select
                  value={tempCertType}
                  onChange={(e) => setTempCertType(e.target.value)}
                  className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] px-3 py-2 rounded-lg outline-none focus:border-[var(--accent)] transition-colors text-[14px]"
                >
                  <option value="">-- Select Certificate --</option>
                  <option value="NO CERTIFICATE">NO CERTIFICATE</option>
                  {['TOPIK', 'IELTS', 'TOEFL', 'CEFR', 'SAT', 'SKA'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {tempCertType && tempCertType !== 'NO CERTIFICATE' && (
                <>
                  <div>
                    <label className="block text-[12px] font-semibold text-[var(--foreground-muted)] uppercase mb-1.5">
                      Score
                    </label>
                    <input
                      type="text"
                      value={tempCertScore}
                      onChange={(e) => setTempCertScore(e.target.value)}
                      placeholder="e.g. 6.0"
                      className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] px-3 py-2 rounded-lg outline-none focus:border-[var(--accent)] transition-colors text-[14px]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold text-[var(--foreground-muted)] uppercase mb-1.5">
                        Test Date
                      </label>
                      <input
                        type="date"
                        value={tempCertTestDate}
                        onChange={(e) => setTempCertTestDate(e.target.value)}
                        className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] px-3 py-2 rounded-lg outline-none focus:border-[var(--accent)] transition-colors text-[14px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-[var(--foreground-muted)] uppercase mb-1.5">
                        Valid Date
                      </label>
                      <input
                        type="date"
                        value={tempCertValidDate}
                        onChange={(e) => setTempCertValidDate(e.target.value)}
                        className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] px-3 py-2 rounded-lg outline-none focus:border-[var(--accent)] transition-colors text-[14px]"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-8">
              <button
                onClick={() => setIsCertModalOpen(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] transition-colors"
                disabled={savingCert}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedStudent || !certEditingField) return;
                  setSavingCert(true);
                  try {
                    const isNoCert = tempCertType === 'NO CERTIFICATE' || tempCertType === '';
                    
                    const scoreField = certEditingField === 'language_certificate' ? 'certificate_score' : certEditingField.replace('language_certificate_', 'certificate_score_') as keyof Student;
                    const testDateField = certEditingField === 'language_certificate' ? 'certificate_test_date' : certEditingField.replace('language_', 'certificate_').replace('_certificate', '') + '_test_date' as keyof Student;
                    const validDateField = certEditingField === 'language_certificate' ? 'certificate_valid_date' : certEditingField.replace('language_', 'certificate_').replace('_certificate', '') + '_valid_date' as keyof Student;

                    const certToSave = isNoCert ? (tempCertType === 'NO CERTIFICATE' ? 'NO CERTIFICATE' : null) : tempCertType;
                    const scoreToSave = isNoCert || tempCertScore === '' ? null : tempCertScore;
                    const testDateToSave = isNoCert || tempCertTestDate === '' ? null : tempCertTestDate;
                    const validDateToSave = isNoCert || tempCertValidDate === '' ? null : tempCertValidDate;

                    const updates = {
                      [certEditingField]: certToSave,
                      [scoreField]: scoreToSave,
                      [testDateField]: testDateToSave,
                      [validDateField]: validDateToSave
                    };
                    
                    const nextStudent = { ...selectedStudent, ...updates } as any;
                    const syncedPick = syncMissingDocuments(nextStudent);
                    
                    const { error } = await (supabase.from('students') as any)
                      .update({ ...updates, pick_needed: syncedPick })
                      .eq('id', selectedStudent.id);
                      
                    if (error) throw error;
                    
                    const updated = { ...selectedStudent, ...updates, pick_needed: syncedPick } as any;
                    setSelectedStudent(updated);
                    setIsCertModalOpen(false);
                  } catch (err: any) {
                    alert('Error saving certificate: ' + err.message);
                  } finally {
                    setSavingCert(false);
                  }
                }}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity flex items-center gap-2"
                disabled={savingCert}
              >
                {savingCert ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(
  /\{\/\* Major Editing Modal \*\/\}/,
  certModal + '\n      {/* Major Editing Modal */}'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully refactored StudentDetailClient.tsx (safely)');
